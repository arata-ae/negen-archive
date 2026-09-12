/**
 * Host half for @negen/archive.
 *
 * The harness has no session deletion or unarchive RPC, so this plugin owns a
 * small HTTP API beside the existing gateway. It uses only the services the
 * web profile already mounts: the webserver for routes, the workspace registry
 * for the archive set, and session persistence to locate session artifacts.
 *
 * The goal is deliberately modest:
 * - list threads currently hidden by the archive set
 * - restore one by removing it from the archive set
 * - delete one by moving its session directory to the OS trash
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import type { Context } from "@deepseek-ai/cordis";
import type {} from "@deepseek-ai/dsh-host-webserver";
import type {} from "@deepseek-ai/dsh-workspace";
import type {} from "@deepseek-ai/dsh-session-persistence";
import type {} from "@deepseek-ai/dsh-storage-domain";
import type { SessionHeader, SessionId } from "@deepseek-ai/dsh-session";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, basename } from "node:path";
import {
  existsSync,
  mkdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";

export const name = "negen-archive";
export const inject = [
  "webServer",
  "workspaceRegistry",
  "sessionPersistence",
  "storageDomain",
  "agents",
];

/** how long delete waits for a live agent to stop before giving up */
const AGENT_STOP_TIMEOUT_MS = 30_000;

/** @param ctx - Host cordis context. */
export function apply(ctx: Context): void {
  const server = ctx.webServer;
  const guard = (
    handler: (
      context: Context,
      req: IncomingMessage,
      res: ServerResponse,
    ) => Promise<void>,
  ): (req: IncomingMessage, res: ServerResponse) => void =>
    (req, res) => {
      void handler(ctx, req, res).catch((error: unknown) => {
        console.error("negen-archive: route failed", error);
        if (!res.headersSent) {
          json(res, 500, {
            error: error instanceof Error ? error.message : String(error),
          });
        } else {
          res.destroy();
        }
      });
    };

  const disposers = [
    server.register({
      kind: "exact",
      path: "/api/negen-archive/archived",
      handler: guard(handleArchived),
    }),
    server.register({
      kind: "exact",
      path: "/api/negen-archive/restore",
      handler: guard(handleRestore),
    }),
    server.register({
      kind: "exact",
      path: "/api/negen-archive/delete",
      handler: guard(handleDelete),
    }),
  ];

  ctx.effect(
    () => () => {
      for (const dispose of disposers) dispose();
    },
    "negen-archive: http routes",
  );
}

const handleArchived = async (
  ctx: Context,
  _req: IncomingMessage,
  res: ServerResponse,
): Promise<void> => {
  const headers = await safeList(ctx);
  const archived = ctx.workspaceRegistry.archivedSessionIds.filter((id) =>
    headers.some((header) => header.id === id),
  );
  const items = archived.map((id) => {
    const header = headers.find((candidate) => candidate.id === id);
    return {
      id,
      title: header === undefined ? String(id) : basename(header.cwd ?? String(id)),
      createdAt: header?.createdAt,
      cwd: header?.cwd,
    };
  });
  json(res, 200, { items });
};

const handleRestore = async (
  ctx: Context,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> => {
  const { sessionId } = await readBody<{ sessionId?: string }>(req);
  if (sessionId === undefined) {
    json(res, 400, { error: "sessionId is required" });
    return;
  }
  const id = sessionId as SessionId;

  // Restore is unarchive: the session keeps its files where they are and only
  // the registry-global archive set changes. An already active id is a no-op.
  if (!ctx.workspaceRegistry.archivedSessionIds.includes(id)) {
    json(res, 200, { ok: true });
    return;
  }
  await removeFromArchive(ctx, id);
  json(res, 200, { ok: true });
};

/**
 * How one delete attempt ended; the route maps this onto an HTTP status.
 *
 * `missing` and `unsupported` are decided before anything is mutated, so a
 * client that sees either one still has a complete session on disk.
 */
export type DeleteOutcome =
  | { readonly kind: "deleted" }
  | { readonly kind: "missing" }
  | { readonly kind: "unsupported" };

/** Move one path to the operating system's trash. */
export type TrashMove = (target: string) => void;

/**
 * Stop, detach, drain, then trash one session and drop it from the archive set.
 *
 * The order is the whole point. `session/disposed` is what makes the
 * persistence backend close the session's write handle, and closing drains the
 * handle's buffered events through the *original* path with recursive `mkdir`,
 * so a drain that lands after the move re-creates the log and the deleted
 * thread comes back on the next list refresh. Detaching first, then waiting the
 * drain out, is what keeps the move final.
 * @param ctx - Host cordis context.
 * @param id - the session to delete.
 * @param move - the trash move, injectable so tests can run the sequence
 *   without moving anything to a real operating-system trash.
 * @returns how the attempt ended.
 */
export const deleteSession = async (
  ctx: Context,
  id: SessionId,
  move: TrashMove = moveToOsTrash,
): Promise<DeleteOutcome> => {
  // Stop any live agent before the session is taken apart. Cancelling clears
  // the active turn and waits for quiescence; the row can then be deleted
  // safely even when it was the currently open thread.
  const agent = ctx.get("agents")?.get(id) as
    | {
        cancel(cause: { kind: "user" }): void;
        whenIdle(): Promise<void>;
      }
    | undefined;
  if (agent !== undefined) {
    agent.cancel({ kind: "user" });
    await waitForAgentIdle(agent, id);
  }

  const header = await findHeader(ctx, id);
  if (header === undefined) return { kind: "missing" };

  // `locate` left the persistence service in 0.1.5; the JSONL backend still
  // holds it as a private helper, and it stays the only thing that knows where
  // one session's artifacts live. The optional call keeps every other backend
  // on the same 501 as before.
  const location = (
    ctx.sessionPersistence as unknown as {
      locate?(meta: SessionHeader): { kind: string; path: string } | undefined;
    }
  ).locate?.(header);
  if (location === undefined) return { kind: "unsupported" };

  detachLiveSession(ctx, id);
  await settleWrites(ctx, id);

  move(dirname(location.path));
  await removeFromArchive(ctx, id);
  return { kind: "deleted" };
};

const handleDelete = async (
  ctx: Context,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> => {
  const { sessionId } = await readBody<{ sessionId?: string }>(req);
  if (sessionId === undefined) {
    json(res, 400, { error: "sessionId is required" });
    return;
  }

  const outcome = await deleteSession(ctx, sessionId as SessionId);
  switch (outcome.kind) {
    case "deleted":
      json(res, 200, { ok: true });
      return;
    case "missing":
      json(res, 404, { error: "session-not-found" });
      return;
    case "unsupported":
      json(res, 501, {
        error: "this persistence backend has no per-session artifact to move",
      });
      return;
    default: {
      // Exhaustiveness guard: a new DeleteOutcome kind fails the build here
      // rather than falling through to a silently wrong status.
      const unhandled: never = outcome;
      throw new Error(`negen-archive: unhandled delete outcome ${JSON.stringify(unhandled)}`);
    }
  }
};

/**
 * Wait until a detached session can no longer write.
 *
 * Closing the write handle happens asynchronously behind `session/disposed` and
 * nobody awaits it, so the service-wide durability barrier is the only public
 * way to settle the drain before the files move. Absence from the backend's
 * writer set already means the drain finished; otherwise this waits on the same
 * handle. A failure is reported and ignored: another session's write fault must
 * not pin this one to disk, and this session's bytes are being deleted anyway.
 * @param ctx - Host cordis context.
 * @param id - the session that was just detached, named in the diagnostic.
 */
const settleWrites = async (ctx: Context, id: SessionId): Promise<void> => {
  try {
    await ctx.sessionPersistence.flush();
  } catch (error: unknown) {
    ctx.logger.warn(
      `negen-archive: could not confirm the final write for "${id}" before deleting it: ${String(error)}`,
    );
  }
};

/**
 * Remove a deleted session from the in-memory registries so the browser list
 * updates without restarting the harness, and so the persistence backend sees
 * the `session/disposed` edge that closes the session's write handle.
 *
 * This is intentionally a private-internals compatibility hook. Upstream keeps
 * the disposer as an owner-only capability — an agent's `dispose()` reaches
 * only whoever created it, and there is no public delete API — so this reaches
 * the same entry objects the harness itself uses.
 */
const detachLiveSession = (ctx: Context, id: SessionId): void => {
  const sessions = ctx.get("sessions") as unknown as {
    store?: Map<SessionId, { detach(): void }>;
  };
  sessions?.store?.get(id)?.detach();

  const agents = ctx.get("agents") as unknown as {
    store?: Map<SessionId, unknown>;
    detachEntered?: (entry: unknown) => void;
  };
  const entry = agents?.store?.get(id);
  if (entry !== undefined && agents?.detachEntered !== undefined) {
    agents.detachEntered(entry);
  }
};

/**
 * Remove one session from the registry-global archive set, which is what
 * "restore" means.
 *
 * Upstream has no public unarchive verb (0.1.5 exposes `archiveSession` and
 * nothing that takes an id back out), so this performs the registry's own
 * read-modify-write. It runs on the registry's private operation chain when
 * that chain is present, because the chain is what serializes it against a
 * concurrent `archiveSession` from the UI: a bare `domain.global.set` can read
 * a snapshot another archive already moved past and write back a set that drops
 * that other session. Without the chain the write still happens, exactly as it
 * did before, so a rename upstream costs the ordering and not the feature.
 * @param ctx - Host cordis context.
 * @param id - the session to unarchive.
 */
const removeFromArchive = async (ctx: Context, id: SessionId): Promise<void> => {
  const registry = ctx.workspaceRegistry as unknown as {
    state?: { archivedSessionIds: SessionId[] };
    enqueueOperation?<T>(operation: () => Promise<T>): Promise<T>;
  };
  const domain = (ctx.storageDomain as unknown as {
    get?: (name: string) => {
      global?: {
        get(): { archivedSessionIds: SessionId[] };
        set(value: { archivedSessionIds: SessionId[] }): Promise<void>;
      };
    };
  }).get?.("workspace");
  if (domain?.global === undefined) return;
  const global = domain.global;

  const unarchive = async (): Promise<void> => {
    const current = global.get();
    const nextIds = current.archivedSessionIds.filter((candidate) => candidate !== id);
    if (nextIds.length === current.archivedSessionIds.length) return;
    await global.set({ ...current, archivedSessionIds: nextIds });
    if (registry.state !== undefined) {
      registry.state = { ...registry.state, archivedSessionIds: nextIds };
    }
  };

  // Called as a registry method, not extracted first: the chain closes over the
  // registry's own tail and pending-mutation recovery.
  if (registry.enqueueOperation === undefined) {
    await unarchive();
    return;
  }
  await registry.enqueueOperation(unarchive);
};

const findHeader = async (ctx: Context, id: SessionId): Promise<SessionHeader | undefined> => {
  const headers = await safeList(ctx);
  return headers.find((header) => header.id === id);
};

// `list` answers with per-session snapshots since 0.1.5; the header is the
// only part this plugin reads.
const safeList = async (ctx: Context): Promise<SessionHeader[]> =>
  (await ctx.sessionPersistence.list()).map((snapshot) => snapshot.header);

/**
 * Wait for a cancelled agent to become idle, bounded so a wedged thread cannot
 * hang the delete request forever.
 */
const waitForAgentIdle = async (
  agent: { whenIdle(): Promise<void> },
  id: SessionId,
): Promise<void> => {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      agent.whenIdle(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`agent "${id}" did not stop within ${AGENT_STOP_TIMEOUT_MS}ms`)),
          AGENT_STOP_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
};

const readBody = <T>(req: IncomingMessage): Promise<T> =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += String(chunk);
      if (body.length > 1024 * 1024) {
        reject(new Error("request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body === "" ? "{}" : body) as T);
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });

const json = (res: ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(`${JSON.stringify(body)}\n`);
};

/**
 * Move a path into the operating system's native trash.
 *
 * The first attempted route is the platform's user-facing trash:
 * - macOS: Finder via osascript (fallback `~/.Trash`)
 * - Windows: Recycle Bin through PowerShell
 * - Linux/other: `gio trash`, then `trash`, then the XDG Trash directory
 *
 * A fallback `rename` into the platform trash directory keeps a failed
 * platform command from becoming data loss; a rename that still fails throws
 * and the API answers with an error instead of deleting anything.
 */
const moveToOsTrash = (target: string): void => {
  if (process.platform === "darwin") {
    const escaped = target.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
    const result = spawnSync("osascript", [
      "-e",
      `tell application "Finder" to delete (POSIX file "${escaped}" as alias)`,
    ], { encoding: "utf8" });
    if (result.status === 0) return;

    const fallbackDir = join(homedir(), ".Trash");
    mkdirSync(fallbackDir, { recursive: true });
    const base = basename(target);
    let fallback = join(fallbackDir, base);
    let suffix = 1;
    while (existsSync(fallback)) {
      fallback = join(fallbackDir, `${base}.${suffix}`);
      suffix += 1;
    }
    renameSync(target, fallback);
    return;
  }

  if (process.platform === "win32") {
    const escaped = target.replaceAll("'", "''");
    const script = `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${escaped}','OnlyErrorDialogs','SendToRecycleBin')`;
    const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", script], {
      encoding: "utf8",
    });
    if (result.status === 0) return;
    throw new Error("Windows recycle-bin move failed");
  }

  for (const [command, args] of [
    ["gio", ["trash", target]],
    ["trash", [target]],
  ] as const) {
    const result = spawnSync(command, [...args], { encoding: "utf8" });
    if (result.status === 0) return;
  }

  const dataHome = process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
  const files = join(dataHome, "Trash", "files");
  const info = join(dataHome, "Trash", "info");
  mkdirSync(files, { recursive: true });
  mkdirSync(info, { recursive: true });
  const base = basename(target);
  let candidate = join(files, base);
  let infoCandidate = join(info, `${base}.trashinfo`);
  let suffix = 1;
  while (existsSync(candidate) || existsSync(infoCandidate)) {
    candidate = join(files, `${base}.${suffix}`);
    infoCandidate = join(info, `${base}.${suffix}.trashinfo`);
    suffix += 1;
  }
  const deletionDate = new Date().toISOString().replaceAll(":", "T");
  renameSync(target, candidate);
  writeFileSync(
    infoCandidate,
    `[Trash Info]\nPath=${encodeURI(target)}\nDeletionDate=${deletionDate}\n`,
    "utf8",
  );
};

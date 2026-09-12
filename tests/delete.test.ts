/**
 * Delete-sequence tests for the host half.
 *
 * The regression these pin: detaching a live session is what makes the
 * persistence backend close the session's write handle, and closing drains the
 * handle's buffered events back through the log path with recursive `mkdir`.
 * When the files moved before that drain settled, the drain re-created the log
 * and the deleted thread came back on the next list refresh.
 *
 * So the stub backend below writes on drain, exactly like the JSONL one, and
 * the assertions are about the outcome (the session directory is still gone)
 * rather than only about call order.
 */

import assert from "node:assert/strict";
import { renameSync } from "node:fs";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { after, test } from "node:test";
import type { Context } from "@deepseek-ai/cordis";
import type { SessionId } from "@deepseek-ai/dsh-session";
import { deleteSession } from "../src/index.ts";

const SESSION_ID = "session-1" as SessionId;

/** Wait long enough for an unawaited drain to land, so a race shows up. */
const SETTLE_MS = 40;

interface Harness {
  readonly ctx: Context;
  /** Every observable step, in the order it happened. */
  readonly calls: string[];
  readonly sessionDir: string;
  readonly logPath: string;
  readonly root: string;
}

const exists = async (path: string): Promise<boolean> =>
  await stat(path).then(() => true, () => false);

const delay = async (ms: number): Promise<void> =>
  new Promise((resolve) => { setTimeout(resolve, ms) });

const cleanups: string[] = [];
after(async () => {
  for (const root of cleanups) await rm(root, { recursive: true, force: true });
});

/**
 * Build a stub host context that behaves like the parts of the harness this
 * plugin touches, including an asynchronous drain that re-creates the log.
 * @param options - `live` attaches the session to both in-memory stores;
 *   `locate` omits the private per-session path lookup a non-JSONL backend lacks.
 * @returns the context plus the paths and call log the tests assert on.
 */
const makeHarness = async (
  options: { readonly live: boolean; readonly locate: boolean },
): Promise<Harness> => {
  const root = await mkdtemp(join(tmpdir(), "negen-archive-"));
  cleanups.push(root);

  const sessionDir = join(root, "project", SESSION_ID);
  const logPath = join(sessionDir, "session.jsonl");
  await mkdir(join(root, "trash"), { recursive: true });
  // A materialized session always has its files; `live` only decides whether
  // this process also holds it in the in-memory stores.
  await mkdir(sessionDir, { recursive: true });
  await writeFile(logPath, "{\"type\":\"header\"}\n", "utf8");

  const calls: string[] = [];
  const header = { id: SESSION_ID, cwd: root, createdAt: 1, version: 1, isSeeded: false };

  // The real backend drains asynchronously behind `session/disposed` and nobody
  // awaits it. `flush` is the public barrier that waits that drain out, so the
  // stub records the write there and lets flush await it.
  let drain: Promise<void> | undefined;
  const detach = (): void => {
    calls.push("detach-session");
    drain = (async () => {
      await mkdir(sessionDir, { recursive: true });
      await writeFile(logPath, "{\"type\":\"drained\"}\n", "utf8");
      calls.push("drain-wrote");
    })();
  };

  const agents = {
    get: (): unknown => (options.live
      ? {
          cancel: (): void => { calls.push("cancel-agent"); },
          whenIdle: async (): Promise<void> => { calls.push("agent-idle"); },
        }
      : undefined),
    store: new Map<string, unknown>(options.live ? [[SESSION_ID, { id: SESSION_ID }]] : []),
    detachEntered: (entry: { id: string }): void => {
      calls.push("detach-agent");
      agents.store.delete(entry.id);
    },
  };

  const state = { initialized: true, workspaceIds: [] as string[], archivedSessionIds: [SESSION_ID] };
  const ctx = {
    get: (name: string): unknown => {
      if (name === "agents") return agents;
      if (name === "sessions") return { store: new Map(options.live ? [[SESSION_ID, { detach }]] : []) };
      return undefined;
    },
    workspaceRegistry: {
      state: { ...state },
      enqueueOperation: async <T>(operation: () => Promise<T>): Promise<T> => {
        calls.push("registry-operation");
        return await operation();
      },
    },
    storageDomain: {
      get: (): unknown => ({
        global: {
          get: (): typeof state => state,
          set: async (value: typeof state): Promise<void> => {
            calls.push("archive-set-write");
            Object.assign(state, value);
          },
        },
      }),
    },
    sessionPersistence: {
      list: async (): Promise<unknown[]> => [{ header }],
      flush: async (): Promise<void> => {
        calls.push("flush");
        if (drain !== undefined) await drain;
      },
      ...options.locate
        ? { locate: (): { kind: string; path: string } => ({ kind: "jsonl", path: logPath }) }
        : {},
    },
    logger: { warn: (): void => {} },
  };

  return { ctx: ctx as unknown as Context, calls, sessionDir, logPath, root };
};

/** Move a directory aside, standing in for the operating-system trash. */
const makeMover = (h: Harness): ((target: string) => void) =>
  (target: string): void => {
    h.calls.push("move");
    assert.equal(target, h.sessionDir, "delete must move the session directory, not the log file");
    renameSync(target, join(h.root, "trash", basename(target)));
  };

/** Position of one recorded step, failing loudly when it never happened. */
const stepIndex = (h: Harness, step: string): number => {
  const index = h.calls.indexOf(step);
  assert.notEqual(index, -1, `expected step "${step}" to happen; recorded: ${h.calls.join(", ")}`);
  return index;
};

test("a live session is drained before its files move", async () => {
  const h = await makeHarness({ live: true, locate: true });
  assert.deepEqual(await deleteSession(h.ctx, SESSION_ID, makeMover(h)), { kind: "deleted" });

  // The ordering, not a full transcript: each assertion is one half of the bug.
  assert.ok(stepIndex(h, "cancel-agent") < stepIndex(h, "detach-session"), "the agent stops first");
  assert.ok(stepIndex(h, "detach-session") < stepIndex(h, "flush"), "detaching is what triggers the drain");
  assert.ok(stepIndex(h, "flush") < stepIndex(h, "move"), "the drain settles before the files move");
  assert.ok(stepIndex(h, "drain-wrote") < stepIndex(h, "move"), "a buffered write must not land after the move");
  assert.ok(stepIndex(h, "move") < stepIndex(h, "archive-set-write"), "the archive set updates last");
  assert.ok(stepIndex(h, "registry-operation") < stepIndex(h, "archive-set-write"),
    "the archive write runs on the registry's serialized chain");
});

test("a deleted session stays deleted once a late write would have landed", async () => {
  const h = await makeHarness({ live: true, locate: true });
  await deleteSession(h.ctx, SESSION_ID, makeMover(h));

  // The whole point: nothing may re-create the log after the move. With the
  // move ordered before the drain, the unawaited drain rewrites the path here.
  await delay(SETTLE_MS);
  assert.equal(await exists(h.sessionDir), false, "the session directory came back");
  assert.equal(await exists(h.logPath), false, "the session log came back");
});

test("a deleted session leaves the archive set and both stores", async () => {
  const h = await makeHarness({ live: true, locate: true });
  await deleteSession(h.ctx, SESSION_ID, makeMover(h));

  const registry = (h.ctx as unknown as { workspaceRegistry: { state: { archivedSessionIds: SessionId[] } } })
    .workspaceRegistry;
  assert.deepEqual(registry.state.archivedSessionIds, []);
  assert.equal(h.calls.includes("detach-agent"), true);
});

test("an unknown session is reported missing without touching anything", async () => {
  const h = await makeHarness({ live: false, locate: true });
  assert.deepEqual(await deleteSession(h.ctx, "no-such-session" as SessionId, makeMover(h)), { kind: "missing" });

  assert.deepEqual(h.calls, []);
  assert.equal(await exists(h.logPath), true);
});

test("a backend with no per-session artifact is reported unsupported", async () => {
  const h = await makeHarness({ live: true, locate: false });
  assert.deepEqual(await deleteSession(h.ctx, SESSION_ID, makeMover(h)), { kind: "unsupported" });

  assert.equal(h.calls.includes("move"), false, "nothing may move when the backend cannot locate the artifact");
  assert.equal(await exists(h.logPath), true);
});

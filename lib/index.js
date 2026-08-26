// src/index.ts
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, basename } from "node:path";
import {
  existsSync,
  mkdirSync,
  renameSync,
  writeFileSync
} from "node:fs";
var name = "negen-archive";
var inject = [
  "webServer",
  "workspaceRegistry",
  "sessionPersistence",
  "storageDomain",
  "agents"
];
var AGENT_STOP_TIMEOUT_MS = 3e4;
function apply(ctx) {
  const server = ctx.webServer;
  const guard = (handler) => (req, res) => {
    void handler(ctx, req, res).catch((error) => {
      console.error("negen-archive: route failed", error);
      if (!res.headersSent) {
        json(res, 500, {
          error: error instanceof Error ? error.message : String(error)
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
      handler: guard(handleArchived)
    }),
    server.register({
      kind: "exact",
      path: "/api/negen-archive/restore",
      handler: guard(handleRestore)
    }),
    server.register({
      kind: "exact",
      path: "/api/negen-archive/delete",
      handler: guard(handleDelete)
    })
  ];
  ctx.effect(
    () => () => {
      for (const dispose of disposers) dispose();
    },
    "negen-archive: http routes"
  );
}
var handleArchived = async (ctx, _req, res) => {
  const headers = await safeList(ctx);
  const archived = ctx.workspaceRegistry.archivedSessionIds.filter(
    (id) => headers.some((header) => header.id === id)
  );
  const items = archived.map((id) => {
    const header = headers.find((candidate) => candidate.id === id);
    return {
      id,
      title: header === void 0 ? String(id) : basename(header.cwd ?? String(id)),
      createdAt: header?.createdAt,
      cwd: header?.cwd
    };
  });
  json(res, 200, { items });
};
var handleRestore = async (ctx, req, res) => {
  const { sessionId } = await readBody(req);
  if (sessionId === void 0) {
    json(res, 400, { error: "sessionId is required" });
    return;
  }
  const id = sessionId;
  if (!ctx.workspaceRegistry.archivedSessionIds.includes(id)) {
    json(res, 200, { ok: true });
    return;
  }
  await removeFromArchive(ctx, id);
  json(res, 200, { ok: true });
};
var handleDelete = async (ctx, req, res) => {
  const { sessionId } = await readBody(req);
  if (sessionId === void 0) {
    json(res, 400, { error: "sessionId is required" });
    return;
  }
  const id = sessionId;
  const agent = ctx.get("agents")?.get(id);
  if (agent !== void 0) {
    agent.cancel({ kind: "user" });
    await waitForAgentIdle(agent, id);
  }
  const header = await findHeader(ctx, id);
  if (header === void 0) {
    json(res, 404, { error: "session-not-found" });
    return;
  }
  const location = ctx.sessionPersistence.locate(header);
  if (location === void 0) {
    json(res, 501, {
      error: "this persistence backend has no per-session artifact to move"
    });
    return;
  }
  const source = dirname(location.path);
  moveToOsTrash(source);
  await removeFromArchive(ctx, id);
  detachLiveSession(ctx, id);
  json(res, 200, { ok: true });
};
var detachLiveSession = (ctx, id) => {
  const sessions = ctx.get("sessions");
  sessions?.store?.get(id)?.detach();
  const agents = ctx.get("agents");
  const entry = agents?.store?.get(id);
  if (entry !== void 0 && agents?.detachEntered !== void 0) {
    agents.detachEntered(entry);
  }
};
var removeFromArchive = async (ctx, id) => {
  const registry = ctx.workspaceRegistry;
  const domain = ctx.storageDomain.get?.("workspace");
  const current = domain?.global?.get();
  if (current === void 0) return;
  const nextIds = current.archivedSessionIds.filter((candidate) => candidate !== id);
  if (nextIds.length !== current.archivedSessionIds.length) {
    await domain?.global?.set({ ...current, archivedSessionIds: nextIds });
    if (registry.state !== void 0) {
      registry.state = { ...registry.state, archivedSessionIds: nextIds };
    }
  }
};
var findHeader = async (ctx, id) => {
  const headers = await safeList(ctx);
  return headers.find((header) => header.id === id);
};
var safeList = async (ctx) => ctx.sessionPersistence.list();
var waitForAgentIdle = async (agent, id) => {
  let timer;
  try {
    await Promise.race([
      agent.whenIdle(),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`agent "${id}" did not stop within ${AGENT_STOP_TIMEOUT_MS}ms`)),
          AGENT_STOP_TIMEOUT_MS
        );
      })
    ]);
  } finally {
    if (timer !== void 0) clearTimeout(timer);
  }
};
var readBody = (req) => new Promise((resolve, reject) => {
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
      resolve(JSON.parse(body === "" ? "{}" : body));
    } catch (error) {
      reject(error);
    }
  });
  req.on("error", reject);
});
var json = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(`${JSON.stringify(body)}
`);
};
var moveToOsTrash = (target) => {
  if (process.platform === "darwin") {
    const escaped = target.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
    const result = spawnSync("osascript", [
      "-e",
      `tell application "Finder" to delete (POSIX file "${escaped}" as alias)`
    ], { encoding: "utf8" });
    if (result.status === 0) return;
    const fallbackDir = join(homedir(), ".Trash");
    mkdirSync(fallbackDir, { recursive: true });
    const base2 = basename(target);
    let fallback = join(fallbackDir, base2);
    let suffix2 = 1;
    while (existsSync(fallback)) {
      fallback = join(fallbackDir, `${base2}.${suffix2}`);
      suffix2 += 1;
    }
    renameSync(target, fallback);
    return;
  }
  if (process.platform === "win32") {
    const escaped = target.replaceAll("'", "''");
    const script = `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${escaped}','OnlyErrorDialogs','SendToRecycleBin')`;
    const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", script], {
      encoding: "utf8"
    });
    if (result.status === 0) return;
    throw new Error("Windows recycle-bin move failed");
  }
  for (const [command, args] of [
    ["gio", ["trash", target]],
    ["trash", [target]]
  ]) {
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
  const deletionDate = (/* @__PURE__ */ new Date()).toISOString().replaceAll(":", "T");
  renameSync(target, candidate);
  writeFileSync(
    infoCandidate,
    `[Trash Info]
Path=${encodeURI(target)}
DeletionDate=${deletionDate}
`,
    "utf8"
  );
};
export {
  apply,
  inject,
  name
};
//# sourceMappingURL=index.js.map

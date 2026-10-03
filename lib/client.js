window.__ModuleLoader__.load({ id: "@negen/archive", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);

// src/client/ArchivePanel.tsx
var import_react = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime = require("react/jsx-runtime");
var STYLE_MODAL_BODY = {
  width: "100%",
  minHeight: 540,
  maxHeight: "calc(100vh - 160px)",
  overflowY: "auto",
  boxSizing: "border-box"
};
var STYLE_LIST = {
  padding: "10px 0"
};
var STYLE_ROW = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 18px"
};
var STYLE_MAIN = {
  minWidth: 0,
  flex: 1
};
var STYLE_TITLE = {
  fontSize: 14,
  fontWeight: 600,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis"
};
var STYLE_META = {
  fontSize: 12,
  color: "var(--dsw-alias-label-secondary)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis"
};
var STYLE_ACTIONS = {
  display: "flex",
  gap: 6,
  flexShrink: 0
};
var STYLE_EMPTY = {
  padding: 32,
  textAlign: "center",
  color: "var(--dsw-alias-label-secondary)"
};
var STYLE_ERROR = {
  padding: "8px 18px",
  color: "var(--dsw-alias-state-error-primary)",
  fontSize: 12
};
var buttonStyle = (wide) => ({
  flex: wide ? "1 1 auto" : "none",
  display: "flex",
  alignItems: "center",
  gap: wide ? 8 : 0,
  width: wide ? "100%" : 36,
  height: wide ? 42 : 36,
  margin: wide ? "4px -2px" : "8px 0 10px",
  padding: wide ? "0 10px 0 8px" : 0,
  boxSizing: "border-box",
  border: "none",
  borderRadius: wide ? 12 : "50%",
  background: "transparent",
  color: "var(--dsw-alias-label-primary, #ededed)",
  cursor: "pointer",
  overflow: "hidden",
  fontFamily: "inherit",
  fontSize: 14,
  lineHeight: "22px",
  justifyContent: wide ? "flex-start" : "center"
});
var call = async (path, body) => {
  const init = { method: body === void 0 ? "GET" : "POST" };
  if (body !== void 0) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const response = await fetch(path, init);
  const text = await response.text();
  let payload = {};
  if (text !== "") {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`server returned non-JSON response (${response.status})`);
    }
  }
  if (!response.ok) {
    throw new Error(payload.error ?? `request failed with ${response.status}`);
  }
  return payload;
};
var formatTime = (value) => value === void 0 ? "" : new Date(value).toLocaleString();
function ArchiveButton({
  wide,
  useSessions,
  useWorkspaces,
  onChanged,
  t
}) {
  const [open, setOpen] = (0, import_react.useState)(false);
  const [busy, setBusy] = (0, import_react.useState)(/* @__PURE__ */ new Set());
  const [error, setError] = (0, import_react.useState)(void 0);
  const workspaces = useWorkspaces((state) => state);
  const sessions = useSessions((state) => state);
  const archivedIds = workspaces.archivedSessionIds.filter(
    (id) => sessions.byId[id] !== void 0
  );
  const run = async (path, sessionId) => {
    if (busy.has(sessionId)) return;
    setBusy((current) => new Set(current).add(sessionId));
    setError(void 0);
    try {
      await call(path, { sessionId });
      await onChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy((current) => {
        const next = new Set(current);
        next.delete(sessionId);
        return next;
      });
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "contents" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `.negen-archive-modal{width:min(800px,calc(100vw - 48px))!important;}.negen-archive-trigger:hover{background:var(--dsw-alias-interactive-bg-hover)!important;}` }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", className: "negen-archive-trigger", style: buttonStyle(wide), onClick: () => {
      setOpen(true);
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconArchiveOutlineMedium, { size: wide ? 16 : 18 }),
      wide && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("button.archived") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      import_dsh_client_ui_primitives.Modal,
      {
        open,
        onClose: () => {
          setOpen(false);
        },
        title: t("panel.title"),
        closeLabel: t("close"),
        className: "negen-archive-modal",
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: STYLE_MODAL_BODY, children: [
          error === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: STYLE_ERROR, children: error }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: STYLE_LIST, children: archivedIds.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: STYLE_EMPTY, children: t("empty") }) : archivedIds.map((id) => {
            const summary = sessions.byId[id];
            return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: STYLE_ROW, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: STYLE_MAIN, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: STYLE_TITLE, children: summary === void 0 ? id : summary.displayTitle }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: STYLE_META, children: [
                  formatTime(summary?.updatedAt),
                  summary?.cwd === void 0 ? "" : ` · ${summary.cwd}`
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: STYLE_ACTIONS, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  import_dsh_client_ui_primitives.Button,
                  {
                    variant: "outline",
                    size: "sm",
                    icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconArchiveOutlineMedium, { size: 16 }),
                    disabled: busy.has(id),
                    onClick: () => {
                      void run("/api/negen-archive/restore", id);
                    },
                    children: t("action.restore")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  import_dsh_client_ui_primitives.Button,
                  {
                    variant: "outline",
                    size: "sm",
                    icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconTrashOutlineRegular, { size: 16 }),
                    disabled: busy.has(id),
                    style: { color: "var(--dsw-alias-state-error-primary)" },
                    onClick: () => {
                      void run("/api/negen-archive/delete", id);
                    },
                    children: t("action.delete")
                  }
                )
              ] })
            ] }, id);
          }) })
        ] })
      }
    )
  ] });
}

// src/client/SessionMenuItem.tsx
var import_react2 = require("react");
var import_dsh_client_ui_primitives2 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime2 = require("react/jsx-runtime");
var CHANGED_EVENT = "negen-archive: changed";
var deleteSession = async (sessionId) => {
  try {
    const response = await fetch("/api/negen-archive/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId })
    });
    if (response.ok) return void 0;
    const payload = await response.json().catch(() => ({}));
    return payload.error ?? `request failed with ${response.status}`;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};
function DeleteSessionMenuItem({
  sessionId,
  useMenuOpenState,
  t
}) {
  const [, setMenuOpen] = useMenuOpenState();
  const [confirmed, setConfirmed] = (0, import_react2.useState)(false);
  const [error, setError] = (0, import_react2.useState)(void 0);
  const remove = () => {
    setMenuOpen(false);
    void deleteSession(sessionId).then(
      (message) => {
        if (message !== void 0) {
          console.error("negen-archive: delete failed", message);
          setError(message);
          setConfirmed(false);
          return;
        }
        window.dispatchEvent(new Event(CHANGED_EVENT));
      }
    );
  };
  if (confirmed) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.MenuItemButton, { danger: true, onSelect: remove, children: t("menu.confirmDelete") });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    import_dsh_client_ui_primitives2.MenuItemButton,
    {
      danger: true,
      icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.IconTrashOutlineRegular, { size: 14 }),
      onSelect: () => {
        setError(void 0);
        setConfirmed(true);
      },
      children: error === void 0 ? t("action.delete") : `${t("action.delete")} — ${error}`
    }
  );
}

// src/client/locales.ts
var NS = "archive";
var en = {
  "button.archived": "Archived",
  "panel.title": "Archived",
  "empty": "No archived threads.",
  "action.restore": "Restore",
  "action.delete": "Delete",
  "menu.confirmDelete": "Delete permanently",
  "close": "Close"
};
var zh = {
  "button.archived": "已归档",
  "panel.title": "已归档",
  "empty": "没有已归档的线程。",
  "action.restore": "恢复",
  "action.delete": "删除",
  "menu.confirmDelete": "永久删除",
  "close": "关闭"
};

// src/client/index.ts
var name = "negen-archive";
var inject = ["slots", "sessions", "workspaces", "locale"];
var pullSessionList = async (ctx) => {
  const sessions = ctx.sessions;
  await sessions.refresh();
  await sessions.refresh();
};
function apply(ctx) {
  const locale = ctx.locale;
  ctx.effect(
    () => locale.register(NS, { zh, en }),
    "negen-archive: dictionaries"
  );
  const refreshAfterChange = () => {
    void pullSessionList(ctx).catch((error) => {
      console.error("negen-archive: refresh after change failed", error);
    });
  };
  window.addEventListener("negen-archive: changed", refreshAfterChange);
  ctx.effect(
    () => () => window.removeEventListener("negen-archive: changed", refreshAfterChange),
    "negen-archive: global refresh"
  );
  ctx.slots.inject(
    "sidebar.footer.action",
    () => ctx.slots.register(
      {
        name: "sidebar.footer.action",
        id: "negen-archive",
        locale: NS,
        registrant: "negen-archive",
        inject: () => ({
          onChanged: async () => {
            await pullSessionList(ctx);
          }
        })
      },
      ArchiveButton
    )
  );
  ctx.slots.inject(
    "sidebar.workspaces.session.menu.item",
    () => ctx.slots.register(
      {
        name: "sidebar.workspaces.session.menu.item",
        id: "negen-archive-delete",
        order: 500,
        locale: NS,
        registrant: "negen-archive"
      },
      DeleteSessionMenuItem
    )
  );
}
return module.exports; } });
//# sourceMappingURL=client.js.map

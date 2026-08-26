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
  onChanged: onChanged2,
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
      await onChanged2?.();
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
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconArchiveOutline20, { size: wide ? 16 : 18 }),
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
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: STYLE_TITLE, children: summary === void 0 ? id : summary.title !== "" ? summary.title : id }),
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
                    icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconArchiveOutline20, { size: 16 }),
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
                    icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconTrashOutline16, {}),
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

// src/client/locales.ts
var NS = "archive";
var en = {
  "button.archived": "Archived",
  "panel.title": "Archived",
  "empty": "No archived threads.",
  "action.restore": "Restore",
  "action.delete": "Delete",
  "close": "Close"
};
var zh = {
  "button.archived": "已归档",
  "panel.title": "已归档",
  "empty": "没有已归档的线程。",
  "action.restore": "恢复",
  "action.delete": "删除",
  "close": "关闭"
};

// src/client/menu-patch.ts
var MENU_SELECTOR = '[role="menu"]';
var MENU_ITEM_SELECTOR = '[role="menuitem"], button';
var DELETE_ATTR = "data-negen-archive-delete";
var sessionIdFromElement = (element) => {
  const key = Object.keys(element).find((name2) => name2.startsWith("__reactFiber$"));
  if (key === void 0) return void 0;
  let fiber = element[key];
  while (fiber !== null && fiber !== void 0) {
    const props = fiber.memoizedProps;
    if (props?.node?.id !== void 0) return String(props.node.id);
    if (props?.result?.id !== void 0) return String(props.result.id);
    fiber = fiber.return;
  }
  return void 0;
};
var deleteSession = async (sessionId) => {
  const response = await fetch("/api/negen-archive/delete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId })
  });
  if (!response.ok) {
    let message = `request failed with ${response.status}`;
    try {
      const payload = await response.json();
      if (payload.error !== void 0) message = payload.error;
    } catch {
    }
    throw new Error(message);
  }
};
var capturedSessionId;
var addDeleteItems = (getDeleteLabel) => {
  for (const menu of document.querySelectorAll(MENU_SELECTOR)) {
    if (menu.querySelector(`[${DELETE_ATTR}]`) !== null) continue;
    const items = [...menu.querySelectorAll(MENU_ITEM_SELECTOR)];
    if (items.length !== 3) continue;
    const archive = items.at(-1);
    if (archive === void 0) continue;
    const wrapper = archive.parentElement;
    if (wrapper === null) continue;
    if (capturedSessionId === void 0) {
      const fromMenu = sessionIdFromElement(archive);
      if (fromMenu === void 0) continue;
      capturedSessionId = fromMenu;
    }
    const deleteWrap = document.createElement("div");
    deleteWrap.className = wrapper.className;
    const deleteItem = document.createElement("button");
    deleteItem.type = "button";
    deleteItem.setAttribute(DELETE_ATTR, "");
    deleteItem.className = archive.className;
    deleteItem.role = "menuitem";
    deleteItem.style.color = "var(--dsw-alias-state-error-primary)";
    deleteItem.addEventListener("mouseenter", () => {
      deleteItem.style.background = "var(--dsw-alias-interactive-bg-hover-danger)";
    });
    deleteItem.addEventListener("mouseleave", () => {
      deleteItem.style.background = "";
    });
    const iconSpan = document.createElement("span");
    iconSpan.className = archive.querySelector("span")?.className ?? "";
    iconSpan.style.color = "var(--dsw-alias-state-error-primary)";
    iconSpan.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.4782 4.84067L14.2138 10.1152C14.1102 12.1872 14.067 13.0115 13.3866 13.9607C13.1044 14.3546 12.7498 14.6912 12.3424 14.9535C11.8239 15.2872 11.2415 15.4316 10.5585 15.4998C9.88727 15.5668 9.04946 15.5656 7.99998 15.5656C6.95051 15.5656 6.1127 15.5668 5.44142 15.4998C4.75851 15.4316 4.17602 15.2872 3.65753 14.9535C3.25012 14.6912 2.89559 14.3546 2.61332 13.9607C1.93296 13.0115 1.88979 12.1872 1.78619 10.1152L1.52179 4.84067L2.89006 4.77277L3.15343 10.0463C3.26221 12.2218 3.32452 12.6015 3.72646 13.1624C3.90825 13.4161 4.13686 13.6334 4.39927 13.8023C4.66204 13.9714 5.00263 14.0792 5.57825 14.1367C6.16562 14.1953 6.92298 14.1963 7.99998 14.1963C9.07699 14.1963 9.83434 14.1953 10.4217 14.1367C10.9973 14.0792 11.3379 13.9714 11.6007 13.8023C11.8631 13.6334 12.0917 13.4161 12.2735 13.1624C12.6755 12.6015 12.7378 12.2218 12.8465 10.0463L13.1099 4.77277L14.4782 4.84067ZM5.43011 6.22849H6.7994V11.3909H5.43011V6.22849ZM9.20056 6.22849H10.5699V11.3909H9.20056V6.22849ZM8.53597 0.434431C9.17976 0.434431 9.6522 0.426926 10.0966 0.571258C10.2357 0.616451 10.3717 0.672554 10.502 0.738948C10.9182 0.951107 11.2464 1.29099 11.7015 1.74612L12.4978 2.54136H15.3742V3.91169H0.625732V2.54136H3.50218L4.29845 1.74612C4.75358 1.29099 5.08174 0.951107 5.49801 0.738948C5.62831 0.672554 5.76425 0.616451 5.90334 0.571258C6.34776 0.426926 6.82021 0.434431 7.46399 0.434431H8.53597ZM7.46399 1.80476C6.73208 1.80476 6.51641 1.81187 6.32617 1.87369C6.25545 1.89667 6.18668 1.92533 6.12041 1.95907C5.96398 2.03878 5.82348 2.16253 5.44142 2.54136H10.5585C10.1765 2.16253 10.036 2.03878 9.87955 1.95907C9.81329 1.92533 9.74452 1.89667 9.6738 1.87369C9.48356 1.81187 9.26789 1.80476 8.53597 1.80476H7.46399Z" fill="currentColor"/></svg>`;
    const labelSpan = document.createElement("span");
    labelSpan.className = archive.querySelectorAll("span")[1]?.className ?? "";
    labelSpan.textContent = getDeleteLabel();
    deleteItem.append(iconSpan, labelSpan);
    deleteItem.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const id = capturedSessionId;
      if (id === void 0) return;
      void deleteSession(id).then(
        () => {
          document.querySelector(MENU_SELECTOR)?.remove();
          window.dispatchEvent(new Event("negen-archive: changed"));
        },
        () => {
          console.error("negen-archive: delete from row menu failed");
        }
      );
    });
    deleteWrap.append(deleteItem);
    wrapper.after(deleteWrap);
  }
};
var installed = false;
var onPointerDown = (event) => {
  const target = event.target;
  if (target === null) return;
  const row = target.closest('[role="treeitem"]');
  if (row !== null) {
    capturedSessionId = sessionIdFromElement(row) ?? capturedSessionId;
    return;
  }
  if (target.closest(MENU_SELECTOR) === null) {
    capturedSessionId = void 0;
  }
};
var onChanged = () => {
  document.querySelector(`[${DELETE_ATTR}]`)?.closest(MENU_SELECTOR)?.remove();
};
var installSessionMenuDelete = (getDeleteLabel) => {
  if (installed) return () => {
  };
  installed = true;
  document.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("negen-archive: changed", onChanged);
  const observer = new MutationObserver(() => {
    addDeleteItems(getDeleteLabel);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  addDeleteItems(getDeleteLabel);
  return () => {
    installed = false;
    document.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("negen-archive: changed", onChanged);
    observer.disconnect();
  };
};

// src/client/index.ts
var name = "negen-archive";
var inject = ["slots", "sessions", "workspaces", "locale"];
function apply(ctx) {
  const locale = ctx.locale;
  ctx.effect(
    () => locale.register(NS, { zh, en }),
    "negen-archive: dictionaries"
  );
  const t = locale.bind(NS);
  const refreshAfterChange = () => {
    void (async () => {
      try {
        await ctx.sessions.refresh();
        await ctx.workspaces.refresh();
      } catch (error) {
        console.error("negen-archive: refresh after change failed", error);
      }
    })();
  };
  window.addEventListener("negen-archive: changed", refreshAfterChange);
  ctx.effect(
    () => installSessionMenuDelete(() => t("action.delete")),
    "negen-archive: session row delete item"
  );
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
            await ctx.sessions.refresh();
            await ctx.workspaces.refresh();
          }
        })
      },
      ArchiveButton
    )
  );
}
return module.exports; } });
//# sourceMappingURL=client.js.map

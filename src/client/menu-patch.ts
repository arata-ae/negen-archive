/**
 * Add a "Delete" item to the sidebar session-row ellipsis menu.
 *
 * The vendored ui-workspace client owns that menu and exposes no plugin slot
 * for extra rows, so this reaches the rendered DOM instead: it inserts one
 * Delete button after the menu's Archive row while the menu is open, and reads
 * the owning session id from the menu's own React tree.
 *
 * The menu renders through `createPortal`, but a portal keeps the logical React
 * tree, so walking `fiber.return` from a menu item still reaches the row's
 * `SessionNodeItem` and its `node` prop. Resolving the id there, instead of
 * from a pointer event, is what stops a keyboard-opened menu from inheriting
 * whichever row was clicked last.
 *
 * This is intentionally a light compatibility layer, not a fork of the
 * workspace browser. If upstream ever adds a session-row action slot, this
 * module can be deleted and replaced by a normal slot registration.
 */

const MENU_SELECTOR = '[role="menu"]';
const MENU_ITEM_SELECTOR = '[role="menuitem"], button';
const DELETE_ATTR = 'data-negen-archive-delete';
const CHANGED_EVENT = "negen-archive: changed";

/** Rows in the session menu: Rename, Fork, Archive. The workspace menu has two. */
const SESSION_MENU_ITEM_COUNT = 3;

/** One React fiber, as far as this module reads it. */
interface FiberLike {
  readonly memoizedProps?: unknown;
  readonly return?: FiberLike | null;
}

/**
 * Whether a value is the browser's `SessionNode`, the only fiber prop carrying
 * a deletable session id.
 *
 * Field-by-field on purpose: these props come out of React internals, and a
 * shape that merely looks close enough would delete the wrong thread.
 * @param value - candidate fiber prop.
 * @returns true only for a complete `SessionNode`.
 */
const isSessionNode = (value: unknown): value is { readonly id: string } => {
  if (typeof value !== "object" || value === null) return false;
  const node = value as Record<string, unknown>;
  return (
    typeof node["id"] === "string"
    && typeof node["title"] === "string"
    && typeof node["updatedAt"] === "number"
    && typeof node["blank"] === "boolean"
    && typeof node["running"] === "boolean"
  );
};

/** Read the React fiber attached to a DOM node. */
const fiberOf = (element: Element): FiberLike | undefined => {
  const key = Object.keys(element).find((name) => name.startsWith("__reactFiber$"));
  if (key === undefined) return undefined;
  return (element as unknown as Record<string, unknown>)[key] as FiberLike;
};

/**
 * Walk up from a node inside the menu to the session row that owns it.
 * @param element - node inside the portaled menu list.
 * @returns the owning session id, or undefined when no session row owns this menu.
 */
const sessionIdFromMenu = (element: Element): string | undefined => {
  let fiber: FiberLike | null | undefined = fiberOf(element);
  while (fiber !== null && fiber !== undefined) {
    const props = fiber.memoizedProps as { readonly node?: unknown } | undefined;
    if (props !== undefined && isSessionNode(props.node)) return props.node.id;
    fiber = fiber.return;
  }
  return undefined;
};

/**
 * Close an open menu through its own dismissal path.
 *
 * `Menu` listens for Escape on `document` and calls its `onClose`, so React
 * unmounts the portaled list itself. Removing that node directly would tear a
 * React-owned element out from under the reconciler.
 * @param menu - the open menu list element.
 */
const closeMenu = (menu: Element): void => {
  if (!menu.isConnected) return;
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
};

const deleteSession = async (sessionId: string): Promise<void> => {
  const response = await fetch("/api/negen-archive/delete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  if (!response.ok) {
    let message = `request failed with ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error !== undefined) message = payload.error;
    } catch {
      // non-JSON error body; keep the status message
    }
    throw new Error(message);
  }
};

const addDeleteItems = (getDeleteLabel: () => string): void => {
  for (const menu of document.querySelectorAll(MENU_SELECTOR)) {
    if (menu.querySelector(`[${DELETE_ATTR}]`) !== null) continue;

    const items = [...menu.querySelectorAll(MENU_ITEM_SELECTOR)];
    // The session row menu is the only three-row action menu in the sidebar.
    // This guard keeps other menus elsewhere in the app untouched and avoids
    // relying on the locale-specific Archive label.
    if (items.length !== SESSION_MENU_ITEM_COUNT) continue;
    const archive = items.at(-1);
    if (archive === undefined) continue;

    // No resolved row means no injected Delete. A menu that cannot name its own
    // session must not offer to delete one, so the failure mode stays "the item
    // is missing" rather than "the item deletes someone else's thread".
    const sessionId = sessionIdFromMenu(archive);
    if (sessionId === undefined) continue;

    const wrapper = archive.parentElement;
    if (wrapper === null) continue;
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
      void deleteSession(sessionId).then(
        () => {
          closeMenu(menu);
          window.dispatchEvent(new Event(CHANGED_EVENT));
        },
        (error: unknown) => {
          // Menu interaction is fire-and-forget; a failure should at least
          // surface in console rather than silently doing nothing.
          console.error("negen-archive: delete from row menu failed", error);
        },
      );
    });
    deleteWrap.append(deleteItem);
    wrapper.after(deleteWrap);
  }
};

let installed = false;

const onChanged = (): void => {
  // If a delete happened elsewhere (the Archived panel), close any open row
  // menu carrying our injected item so it does not linger stale.
  const injected = document.querySelector(`[${DELETE_ATTR}]`);
  if (injected === null) return;
  const menu = injected.closest(MENU_SELECTOR);
  if (menu !== null) closeMenu(menu);
};

/** Install the menu patch; returns a disposer for plugin teardown. */
export const installSessionMenuDelete = (
  getDeleteLabel: () => string,
): (() => void) => {
  if (installed) return () => {};
  installed = true;
  window.addEventListener(CHANGED_EVENT, onChanged);
  const observer = new MutationObserver(() => {
    addDeleteItems(getDeleteLabel);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  addDeleteItems(getDeleteLabel);
  return () => {
    installed = false;
    window.removeEventListener(CHANGED_EVENT, onChanged);
    observer.disconnect();
  };
};

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
/** Install the menu patch; returns a disposer for plugin teardown. */
export declare const installSessionMenuDelete: (getDeleteLabel: () => string) => (() => void);

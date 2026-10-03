/**
 * The "Delete" row in a sidebar session-row menu, as a
 * `sidebar.workspaces.session.menu.item` registration.
 *
 * 0.2.0 gave every session-row action a real slot — the shipped Pin, Rename,
 * Fork and Archive rows are registrations into it — so this row is an ordinary
 * slot entry. It used to be a DOM patch that inserted a button after the
 * Archive row and read the owning session id back out of the React tree; that
 * patch is gone, and with it the failure mode it carried, where a menu whose
 * row count upstream changed stopped matching the selector and the Delete
 * action silently disappeared from the sidebar.
 *
 * Delete confirms first, unlike Archive: it is the one row here that moves
 * files. It sends the session to the operating system's trash rather than
 * removing it, and a backend with no per-session directory answers 501.
 */
import type * as React from "react";
import type { ArchiveKey } from "./locales.ts";
export interface SessionMenuItemProps {
    readonly sessionId: string;
    readonly useMenuOpenState: () => readonly [boolean, (open: boolean) => void];
    readonly t: (key: ArchiveKey) => string;
}
/** @param props - row identity, the menu's own open state, and the locale seat. */
export declare function DeleteSessionMenuItem({ sessionId, useMenuOpenState, t, }: SessionMenuItemProps): React.ReactElement;

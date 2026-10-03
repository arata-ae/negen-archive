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

import { useState } from "react";
import type * as React from "react";
import { MenuItemButton, IconTrashOutlineRegular } from "@deepseek-ai/dsh-client-ui-primitives";
import type { ArchiveKey } from "./locales.ts";

/** Announce that the session list and any open panel are stale. */
const CHANGED_EVENT = "negen-archive: changed";

export interface SessionMenuItemProps {
  readonly sessionId: string;
  readonly useMenuOpenState: () => readonly [boolean, (open: boolean) => void];
  readonly t: (key: ArchiveKey) => string;
}

/**
 * Host-side delete for one session. The route stops and drains a live session
 * before its files move, so this only has to report the outcome.
 * @param sessionId - the session to delete.
 * @returns the failure message, or undefined when the delete succeeded.
 */
const deleteSession = async (sessionId: string): Promise<string | undefined> => {
  try {
    const response = await fetch("/api/negen-archive/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    if (response.ok) return undefined;
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    return payload.error ?? `request failed with ${response.status}`;
  } catch (error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
};

/** @param props - row identity, the menu's own open state, and the locale seat. */
export function DeleteSessionMenuItem({
  sessionId,
  useMenuOpenState,
  t,
}: SessionMenuItemProps): React.ReactElement {
  const [, setMenuOpen] = useMenuOpenState();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const remove = (): void => {
    setMenuOpen(false);
    void deleteSession(sessionId).then(
      (message) => {
        if (message !== undefined) {
          // The menu is already closed, so the message waits on the row for the
          // next time this menu opens instead of vanishing with the click.
          console.error("negen-archive: delete failed", message);
          setError(message);
          setConfirmed(false);
          return;
        }
        window.dispatchEvent(new Event(CHANGED_EVENT));
      },
    );
  };

  // A menu row is one line, so the confirmation replaces the row instead of
  // expanding it.
  if (confirmed) {
    return (
      <MenuItemButton danger={true} onSelect={remove}>
        {t("menu.confirmDelete")}
      </MenuItemButton>
    );
  }
  return (
    <MenuItemButton
      danger={true}
      icon={<IconTrashOutlineRegular size={14} />}
      onSelect={() => {
        setError(undefined);
        setConfirmed(true);
      }}
    >
      {error === undefined ? t("action.delete") : `${t("action.delete")} — ${error}`}
    </MenuItemButton>
  );
}

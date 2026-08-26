/**
 * Sidebar footer button and the full-screen panel for archived threads.
 *
 * The panel is built from the client's normal workspace/session snapshots, so
 * it already knows the thread titles and update times. Restore is unarchive;
 * Delete sends the session to the operating system's trash.
 */

import { useState } from "react";
import type * as React from "react";
import {
  Button,
  IconArchiveOutline20,
  IconTrashOutline16,
  Modal,
} from "@deepseek-ai/dsh-client-ui-primitives";
import type { SessionId, SessionListState } from "@deepseek-ai/dsh-client-runtime/client";
import type { ArchiveKey } from "./locales.ts";

export interface ArchiveButtonProps {
  readonly wide: boolean;
  readonly useSessions: (selector: (state: SessionListState) => unknown) => unknown;
  readonly useWorkspaces: (selector: (state: {
    readonly archivedSessionIds: readonly string[];
    readonly items: readonly unknown[];
  }) => unknown) => unknown;
  readonly onChanged?: () => Promise<void>;
  readonly t: (key: ArchiveKey) => string;
}

const STYLE_MODAL_BODY: React.CSSProperties = {
  width: "100%",
  minHeight: 540,
  maxHeight: "calc(100vh - 160px)",
  overflowY: "auto",
  boxSizing: "border-box",
};

const STYLE_LIST: React.CSSProperties = {
  padding: "10px 0",
};

const STYLE_ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 18px",
};

const STYLE_MAIN: React.CSSProperties = {
  minWidth: 0,
  flex: 1,
};

const STYLE_TITLE: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const STYLE_META: React.CSSProperties = {
  fontSize: 12,
  color: "var(--dsw-alias-label-secondary)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const STYLE_ACTIONS: React.CSSProperties = {
  display: "flex",
  gap: 6,
  flexShrink: 0,
};

const STYLE_EMPTY: React.CSSProperties = {
  padding: 32,
  textAlign: "center",
  color: "var(--dsw-alias-label-secondary)",
};

const STYLE_ERROR: React.CSSProperties = {
  padding: "8px 18px",
  color: "var(--dsw-alias-state-error-primary)",
  fontSize: 12,
};

const buttonStyle = (wide: boolean): React.CSSProperties => ({
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
  justifyContent: wide ? "flex-start" : "center",
});

const call = async (
  path: string,
  body?: Record<string, unknown>,
): Promise<{ ok?: boolean; error?: string }> => {
  const init: RequestInit = { method: body === undefined ? "GET" : "POST" };
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const response = await fetch(path, init);
  const text = await response.text();
  let payload: { ok?: boolean; error?: string } = {};
  if (text !== "") {
    try {
      payload = JSON.parse(text) as { ok?: boolean; error?: string };
    } catch {
      throw new Error(`server returned non-JSON response (${response.status})`);
    }
  }
  if (!response.ok) {
    throw new Error(payload.error ?? `request failed with ${response.status}`);
  }
  return payload;
};

const formatTime = (value: number | undefined): string =>
  value === undefined ? "" : new Date(value).toLocaleString();

/** @param props - sidebar footer action props plus global session/workspace hooks. */
export function ArchiveButton({
  wide,
  useSessions,
  useWorkspaces,
  onChanged,
  t,
}: ArchiveButtonProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | undefined>(undefined);

  const workspaces = useWorkspaces((state) => state) as {
    archivedSessionIds: readonly string[];
  };
  const sessions = useSessions((state) => state) as SessionListState;

  const archivedIds = (workspaces.archivedSessionIds as readonly SessionId[]).filter(
    (id) => sessions.byId[id] !== undefined,
  );

  const run = async (path: string, sessionId: string): Promise<void> => {
    if (busy.has(sessionId)) return;
    setBusy((current) => new Set(current).add(sessionId));
    setError(undefined);
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

  return (
    <div style={{ display: "contents" }}>
      <style>{`.negen-archive-modal{width:min(800px,calc(100vw - 48px))!important;}.negen-archive-trigger:hover{background:var(--dsw-alias-interactive-bg-hover)!important;}`}</style>
      <button type="button" className="negen-archive-trigger" style={buttonStyle(wide)} onClick={() => { setOpen(true) }}>
        <IconArchiveOutline20 size={wide ? 16 : 18} />
        {wide && <span>{t("button.archived")}</span>}
      </button>
      <Modal
        open={open}
        onClose={() => { setOpen(false) }}
        title={t("panel.title")}
        closeLabel={t("close")}
        className="negen-archive-modal"
      >
        <div style={STYLE_MODAL_BODY}>
          {error === undefined ? null : <div style={STYLE_ERROR}>{error}</div>}
          <div style={STYLE_LIST}>
            {archivedIds.length === 0 ? (
            <div style={STYLE_EMPTY}>{t("empty")}</div>
          ) : archivedIds.map((id) => {
            const summary = sessions.byId[id as SessionId];
            return (
              <div key={id} style={STYLE_ROW}>
                <div style={STYLE_MAIN}>
                  <div style={STYLE_TITLE}>
                    {summary === undefined ? id : summary.title !== "" ? summary.title : id}
                  </div>
                  <div style={STYLE_META}>
                    {formatTime(summary?.updatedAt)}
                    {summary?.cwd === undefined ? "" : ` · ${summary.cwd}`}
                  </div>
                </div>
                <div style={STYLE_ACTIONS}>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<IconArchiveOutline20 size={16} />}
                    disabled={busy.has(id)}
                    onClick={() => { void run("/api/negen-archive/restore", id) }}
                  >
                    {t("action.restore")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<IconTrashOutline16 />}
                    disabled={busy.has(id)}
                    style={{ color: "var(--dsw-alias-state-error-primary)" }}
                    onClick={() => { void run("/api/negen-archive/delete", id) }}
                  >
                    {t("action.delete")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </Modal>
    </div>
  );
}

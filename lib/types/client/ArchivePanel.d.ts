/**
 * Sidebar footer button and the full-screen panel for archived threads.
 *
 * The panel is built from the client's normal workspace/session snapshots, so
 * it already knows the thread titles and update times. Restore is unarchive;
 * Delete sends the session to the operating system's trash.
 */
import type * as React from "react";
import type { SessionListState } from "@deepseek-ai/dsh-api-session-controller/client";
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
/** @param props - sidebar footer action props plus global session/workspace hooks. */
export declare function ArchiveButton({ wide, useSessions, useWorkspaces, onChanged, t, }: ArchiveButtonProps): React.ReactElement;

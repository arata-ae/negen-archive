/**
 * Browser half for @negen/archive: a sidebar footer action that opens a panel
 * over the archived thread list, plus a Delete row on every session-row menu.
 * Delete calls the host route registered by `src/index.ts`; no harness RPC is
 * widened.
 */

import type { Context as ClientContext } from "@deepseek-ai/cordis";
import type {} from "@deepseek-ai/dsh-client-ui-renderer/client";
import type {} from "@deepseek-ai/dsh-client-ui-sidebar/client";
import type {} from "@deepseek-ai/dsh-client-ui-workspace/client";
import { ArchiveButton } from "./ArchivePanel.tsx";
import { DeleteSessionMenuItem } from "./SessionMenuItem.tsx";
import { NS, en, zh } from "./locales.ts";

export const name = "negen-archive";
export const inject = ["slots", "sessions", "workspaces", "locale"];

/**
 * Pull the session list hard enough to observe a change that just happened.
 *
 * `sessions.refresh()` is single-flight: `manager.refreshList` joins a pull
 * already in flight and resolves with that older response rather than starting
 * a new one. Deleting a thread makes that reachable, because the host emits
 * `api-session/removed` while the delete request is still finishing and that
 * frame starts a pull of its own. The second call runs after the first settles,
 * so it cannot join a pull that began before the change.
 * @param ctx - Client cordis context.
 */
const pullSessionList = async (ctx: ClientContext): Promise<void> => {
  const sessions = ctx.sessions as unknown as { refresh(): Promise<void> };
  await sessions.refresh();
  await sessions.refresh();
};

/** @param ctx - Client cordis context. */
export function apply(ctx: ClientContext): void {
  const locale = (ctx as unknown as {
    locale: {
      register(ns: string, dicts: Record<string, Record<string, string>>): () => void;
    };
  }).locale;
  ctx.effect(
    () => locale.register(NS, { zh, en }),
    "negen-archive: dictionaries",
  );

  // Only the session list needs a pull: the archive set reaches the browser on
  // the workspace follow stream, which the host-side write already publishes.
  const refreshAfterChange = (): void => {
    void pullSessionList(ctx).catch((error: unknown) => {
      console.error("negen-archive: refresh after change failed", error);
    });
  };
  window.addEventListener("negen-archive: changed", refreshAfterChange);
  ctx.effect(
    () => () => window.removeEventListener("negen-archive: changed", refreshAfterChange),
    "negen-archive: global refresh",
  );

  ctx.slots.inject("sidebar.footer.action", () =>
    ctx.slots.register(
      {
        name: "sidebar.footer.action",
        id: "negen-archive",
        locale: NS,
        registrant: "negen-archive",
        inject: () => ({
          onChanged: async (): Promise<void> => {
            await pullSessionList(ctx);
          },
        }),
      },
      ArchiveButton,
    ),
  );

  // Order 500 places Delete after the shipped Archive row (400). The row reads
  // its own locale seat through the registration's namespace.
  ctx.slots.inject("sidebar.workspaces.session.menu.item", () =>
    ctx.slots.register(
      {
        name: "sidebar.workspaces.session.menu.item",
        id: "negen-archive-delete",
        order: 500,
        locale: NS,
        registrant: "negen-archive",
      },
      DeleteSessionMenuItem,
    ),
  );
}

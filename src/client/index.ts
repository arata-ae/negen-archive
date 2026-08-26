/**
 * Browser half for @negen/archive: a sidebar footer action that opens a panel
 * over the archived thread list. Restore and delete calls go to the host
 * routes registered by `src/index.ts`; no harness RPC is widened.
 */

import type { ClientContext } from "@deepseek-ai/dsh-client-runtime/client";
import type {} from "@deepseek-ai/dsh-client-ui-sidebar/client";
import { ArchiveButton } from "./ArchivePanel.tsx";
import { NS, en, zh } from "./locales.ts";
import { installSessionMenuDelete } from "./menu-patch.ts";

export const name = "negen-archive";
export const inject = ["slots", "sessions", "workspaces", "locale"];

/** @param ctx - Client cordis context. */
export function apply(ctx: ClientContext): void {
  const locale = (ctx as unknown as {
    locale: {
      register(ns: string, dicts: Record<string, Record<string, string>>): () => void;
      bind(ns: string): (key: string) => string;
    };
  }).locale;
  ctx.effect(
    () => locale.register(NS, { zh, en }),
    "negen-archive: dictionaries",
  );
  const t = locale.bind(NS);

  const refreshAfterChange = (): void => {
    void (async () => {
      try {
        await (ctx.sessions as unknown as { refresh(): Promise<void> }).refresh();
        await (ctx.workspaces as unknown as { refresh(): Promise<void> }).refresh();
      } catch (error) {
        console.error("negen-archive: refresh after change failed", error);
      }
    })();
  };
  window.addEventListener("negen-archive: changed", refreshAfterChange);
  ctx.effect(
    () => installSessionMenuDelete(() => t("action.delete")),
    "negen-archive: session row delete item",
  );
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
            await (ctx.sessions as unknown as { refresh(): Promise<void> }).refresh();
            await (ctx.workspaces as unknown as { refresh(): Promise<void> }).refresh();
          },
        }),
      },
      ArchiveButton,
    ),
  );
}

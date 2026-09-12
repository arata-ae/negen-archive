/**
 * Browser half for @negen/archive: a sidebar footer action that opens a panel
 * over the archived thread list. Restore and delete calls go to the host
 * routes registered by `src/index.ts`; no harness RPC is widened.
 */
import type { Context as ClientContext } from "@deepseek-ai/cordis";
export declare const name = "negen-archive";
export declare const inject: string[];
/** @param ctx - Client cordis context. */
export declare function apply(ctx: ClientContext): void;

/**
 * Host half for @negen/archive.
 *
 * The harness has no session deletion or unarchive RPC, so this plugin owns a
 * small HTTP API beside the existing gateway. It uses only the services the
 * web profile already mounts: the webserver for routes, the workspace registry
 * for the archive set, and session persistence to locate session artifacts.
 *
 * The goal is deliberately modest:
 * - list threads currently hidden by the archive set
 * - restore one by removing it from the archive set
 * - delete one by moving its session directory to the OS trash
 */
import type { Context } from "@deepseek-ai/cordis";
import type { SessionId } from "@deepseek-ai/dsh-session";
export declare const name = "negen-archive";
export declare const inject: string[];
/** @param ctx - Host cordis context. */
export declare function apply(ctx: Context): void;
/**
 * How one delete attempt ended; the route maps this onto an HTTP status.
 *
 * `missing` and `unsupported` are decided before anything is mutated, so a
 * client that sees either one still has a complete session on disk.
 */
export type DeleteOutcome = {
    readonly kind: "deleted";
} | {
    readonly kind: "missing";
} | {
    readonly kind: "unsupported";
};
/** Move one path to the operating system's trash. */
export type TrashMove = (target: string) => void;
/**
 * Stop, detach, drain, then trash one session and drop it from the archive set.
 *
 * The order is the whole point. `session/disposed` is what makes the
 * persistence backend close the session's write handle, and closing drains the
 * handle's buffered events through the *original* path with recursive `mkdir`,
 * so a drain that lands after the move re-creates the log and the deleted
 * thread comes back on the next list refresh. Detaching first, then waiting the
 * drain out, is what keeps the move final.
 * @param ctx - Host cordis context.
 * @param id - the session to delete.
 * @param move - the trash move, injectable so tests can run the sequence
 *   without moving anything to a real operating-system trash.
 * @returns how the attempt ended.
 */
export declare const deleteSession: (ctx: Context, id: SessionId, move?: TrashMove) => Promise<DeleteOutcome>;

# @negen/archive

A DeepSeek Harness plugin that adds a sidebar **Archived** action and a panel over the thread archive.

The harness already has an archive set (`workspace.archiveSession`), but no visible way to see archived threads, unarchive them, or delete them. This plugin is the missing surface:

- **Archived panel** — every thread the registry hides from the grouping views, with title, project path, and update time.
- **Restore** — removes a thread from the archive set, so it appears in the normal session tree again.
- **Delete** — moves the thread's session directory to the operating system's native trash: Finder/`~/.Trash` on macOS, Recycle Bin on Windows, `gio trash` or the XDG Trash directory on Linux.

It does not touch the vendored harness. The host half registers three small HTTP routes beside the existing gateway; the browser half is a footer action in the sidebar and a fourth Delete item in the session row ellipsis menu. It uses a small private-internals compatibility layer for unarchive and immediate live-session removal because upstream exposes no public API for those operations.

## Install

From this checkout while developing:

```sh
dsh plugin --profile web add link:../negen-archive
```

From a published package or git URL:

```sh
dsh plugin --profile web add @negen/archive
```

The bundle's `cordis.patch.yml` inserts one row after the web-app layer, so the host route and browser action activate as soon as the profile boots.

## Safety

- A live session is stopped first (the active turn is cancelled and awaited) before its files are moved to the OS trash.
- "Delete" moves the whole session directory to the OS trash, not directly to `rm`. On macOS the preferred route is Finder via `osascript`, with `~/.Trash` as fallback; on Windows it uses PowerShell's `SendToRecycleBin`; on Linux it tries `gio trash`, then `trash`, then the XDG trash layout.
- If the persistence backend has no per-session artifact (e.g. SQLite), delete is unavailable and returns `501`.

## Build

```sh
pnpm install
pnpm build
```

`lib/` is committed so a git install works without a build step on the user's machine — the same convention as `@negen/locale`.

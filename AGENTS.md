# AGENTS.md

`@negen/archive` is a DeepSeek Harness plugin. It does not fork or patch the harness; it composes over the web profile.

## Standing rules

- **The harness checkout is read-only.** This repository depends on the published `@deepseek-ai/*` packages. Most of it uses public APIs; the host unarchive/delete path and the session-row menu patch reach a small, documented private-internals surface because upstream has no public delete/unarchive API or row-action slot.
- **`lib/` is committed on purpose.** A git install should not need a build step on the far side. Run `pnpm build` in the same commit as a source change.
- **The host half owns the filesystem safety boundary.** Live sessions are cancelled and awaited before their files are moved; no route deletes while an agent is still running.
- **Delete goes to the operating system's trash, never to `rm` directly.** The host tries Finder, Recycle Bin, `gio trash`/`trash`, then the XDG trash layout before failing.

## Layout

| Path | What it owns |
| --- | --- |
| `src/index.ts` | host half: HTTP routes, archive-set update, restore/delete |
| `src/client/` | browser half: sidebar footer action and archived threads panel |
| `scripts/build.mjs` | builds `lib/` from `src/` |
| `cordis.patch.yml` | bundle patch inserting the one plugin row after `dsh-web-app` |

# @negen/archive

A DeepSeek Harness plugin that adds a sidebar **Archived** action, a panel over the thread archive, and a **Delete** item on every session row.

The harness keeps an archive set (`ctx.workspaceRegistry.archiveSession`) and no way to remove a thread from disk. Harness 0.2.0 added its own archived view (the sidebar's **Archived only** filter, plus Unarchive in search results and on archived rows), so this plugin no longer owns that ground — it keeps a dedicated surface for the whole set, and adds the one verb upstream does not have:

- **Archived panel.** Every hidden thread in one list, with title, project path, and update time.
- **Restore.** Puts a thread back in the normal session tree.
- **Delete.** Moves the session directory to the operating system's trash, so you can still pull it back out of Finder, the Recycle Bin, or the XDG trash.

## Install

```sh
dsh plugin --profile web add github:arata-ae/negen-archive
```

Reload the window. The Archived button appears in the sidebar, and Delete appears in the session row menu (behind a confirmation).

## Safety

- Delete goes to the system trash, never straight to `rm`. To get a thread back, restore the session directory from there.
- Running work is stopped and pending writes are flushed before anything moves, so a delete cannot corrupt the log it just detached. The stop goes through the registry's own stop providers, so a subagent, background job or scheduled reminder is stopped too — any one of those left running would write the log back after the move.
- If the persistence backend keeps no per-session directory, which means SQLite, Delete returns `501` and does nothing.

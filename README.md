# @negen/archive

A DeepSeek Harness plugin that adds a sidebar **Archived** action and a panel over the thread archive.

The harness keeps an archive set (`workspace.archiveSession`) and no way to see what is in it. This plugin is that view:

- **Archived panel.** Every hidden thread, with title, project path, and update time.
- **Restore.** Puts a thread back in the normal session tree.
- **Delete.** Moves the session directory to the operating system's trash, so you can still pull it back out of Finder, the Recycle Bin, or the XDG trash.

## Install

```sh
dsh plugin --profile web add github:arata-ae/negen-archive
```

Reload the window. The Archived button appears in the sidebar, and Delete appears in the session row menu.

## Safety

- Delete goes to the system trash, never straight to `rm`. To get a thread back, restore the session directory from there.
- A session that is still running is stopped and its pending writes are flushed before anything moves, so a delete cannot corrupt the log it just detached.
- If the persistence backend keeps no per-session directory, which means SQLite, Delete returns `501` and does nothing.

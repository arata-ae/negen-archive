/**
 * Locale dictionaries for @negen/archive.
 *
 * This package owns `en` and `zh` for its namespace. The multi-language
 * package backfills ja/ko/zh-TW against these keys, so every visible string
 * in the panel and the injected row menu must stay in this dictionary.
 */

export const NS = "archive";

export type ArchiveKey =
  | "button.archived"
  | "panel.title"
  | "empty"
  | "action.restore"
  | "action.delete"
  | "close";

export const en: Record<ArchiveKey, string> = {
  "button.archived": "Archived",
  "panel.title": "Archived",
  "empty": "No archived threads.",
  "action.restore": "Restore",
  "action.delete": "Delete",
  "close": "Close",
};

export const zh: Record<ArchiveKey, string> = {
  "button.archived": "已归档",
  "panel.title": "已归档",
  "empty": "没有已归档的线程。",
  "action.restore": "恢复",
  "action.delete": "删除",
  "close": "关闭",
};

declare module "@deepseek-ai/dsh-client-ui-slots" {
  interface LocaleNamespaceMap {
    archive: ArchiveKey;
  }
}

/**
 * Locale dictionaries for @negen/archive.
 *
 * This package owns `en` and `zh` for its namespace. The multi-language
 * package backfills ja/ko/zh-TW against these keys, so every visible string
 * in the panel and the injected row menu must stay in this dictionary.
 */
export declare const NS = "archive";
export type ArchiveKey = "button.archived" | "panel.title" | "empty" | "action.restore" | "action.delete" | "close";
export declare const en: Record<ArchiveKey, string>;
export declare const zh: Record<ArchiveKey, string>;
declare module "@deepseek-ai/dsh-client-ui-slots" {
    interface LocaleNamespaceMap {
        archive: ArchiveKey;
    }
}

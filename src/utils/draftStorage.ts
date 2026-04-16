export interface EntryDraft {
  yesterday: string;
  today: string;
  updatedAt: string;
}

export interface PageDraft {
  title: string;
  content: string;
  updatedAt: string;
}

const ENTRY_DRAFT_KEY_PREFIX = "devJournal_entry_draft_";
const PAGE_DRAFT_KEY_PREFIX = "devJournal_page_draft_";
const PAGE_TRACKER_DATA_KEY_PREFIX = "devJournal_page_task_trackers_";
const PAGE_TRACKER_VIEW_KEY_PREFIX = "devJournal_page_task_tracker_view_";

export type PageIdKey = number | "new";
export type PageTrackerView = "all" | "my" | "checklist";

export const getEntryDraftKey = (date: string): string => `${ENTRY_DRAFT_KEY_PREFIX}${date}`;
export const getPageDraftKey = (pageId: PageIdKey): string => `${PAGE_DRAFT_KEY_PREFIX}${pageId}`;
const getPageTrackerDataKey = (pageId: PageIdKey): string => `${PAGE_TRACKER_DATA_KEY_PREFIX}${pageId}`;
const getPageTrackerViewKey = (pageId: PageIdKey): string => `${PAGE_TRACKER_VIEW_KEY_PREFIX}${pageId}`;

export const readEntryDraft = (date: string): EntryDraft | null => {
  try {
    const raw = localStorage.getItem(getEntryDraftKey(date));
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<EntryDraft>;
    if (typeof draft.yesterday !== "string" || typeof draft.today !== "string") {
      return null;
    }
    return {
      yesterday: draft.yesterday,
      today: draft.today,
      updatedAt: typeof draft.updatedAt === "string" ? draft.updatedAt : "",
    };
  } catch {
    return null;
  }
};

export const persistEntryDraft = (date: string, draft: EntryDraft): void => {
  try {
    localStorage.setItem(getEntryDraftKey(date), JSON.stringify(draft));
  } catch {
    // Ignore storage write failures so draft autosave does not break the editor.
  }
};

export const removeEntryDraft = (date: string): void => {
  localStorage.removeItem(getEntryDraftKey(date));
};

export const readPageDraft = (pageId: PageIdKey): PageDraft | null => {
  try {
    const raw = localStorage.getItem(getPageDraftKey(pageId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<PageDraft>;
    return {
      title: typeof draft.title === "string" ? draft.title : "",
      content: typeof draft.content === "string" ? draft.content : "",
      updatedAt: typeof draft.updatedAt === "string" ? draft.updatedAt : "",
    };
  } catch {
    return null;
  }
};

export const persistPageDraft = (pageId: PageIdKey, draft: PageDraft): void => {
  try {
    localStorage.setItem(getPageDraftKey(pageId), JSON.stringify(draft));
  } catch {
    // Ignore storage write failures so draft autosave does not break the editor.
  }
};

export const removePageDraft = (pageId: PageIdKey): void => {
  localStorage.removeItem(getPageDraftKey(pageId));
};

export const readPageTrackerView = (pageId: PageIdKey): PageTrackerView => {
  try {
    const raw = localStorage.getItem(getPageTrackerViewKey(pageId));
    if (raw === "all" || raw === "my" || raw === "checklist") {
      return raw;
    }
    return "all";
  } catch {
    return "all";
  }
};

export const persistPageTrackerView = (pageId: PageIdKey, view: PageTrackerView): void => {
  try {
    localStorage.setItem(getPageTrackerViewKey(pageId), view);
  } catch {
    // Ignore storage write failures so view preference writes remain best-effort.
  }
};

export const removePageTrackerView = (pageId: PageIdKey): void => {
  localStorage.removeItem(getPageTrackerViewKey(pageId));
};

export const removePageTrackerData = (pageId: PageIdKey): void => {
  localStorage.removeItem(getPageTrackerDataKey(pageId));
};

export const removePageTrackerState = (pageId: PageIdKey): void => {
  removePageTrackerData(pageId);
  removePageTrackerView(pageId);
};

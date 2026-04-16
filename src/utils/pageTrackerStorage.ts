import type { PageIdKey } from "./draftStorage";
import type { TaskTrackerData } from "./pageEditorUtils";

const TRACKER_DATA_KEY_PREFIX = "devJournal_page_task_trackers_";

const getPageTrackerDataKey = (pageId: PageIdKey): string => `${TRACKER_DATA_KEY_PREFIX}${pageId}`;

export const readPageTaskTrackerDataById = (
  pageId: PageIdKey
): Record<string, Partial<TaskTrackerData>> => {
  try {
    const raw = localStorage.getItem(getPageTrackerDataKey(pageId));
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Partial<TaskTrackerData>>;
  } catch {
    return {};
  }
};

export const persistPageTaskTrackerDataById = (
  pageId: PageIdKey,
  data: Record<string, TaskTrackerData>
): void => {
  try {
    localStorage.setItem(getPageTrackerDataKey(pageId), JSON.stringify(data));
  } catch {
    // Ignore storage write failures so tracker autosave remains best-effort.
  }
};

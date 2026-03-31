export const FOCUS_SESSIONS_STORAGE_KEY = "devJournal_focus_sessions";
export const FOCUS_SESSIONS_UPDATED_EVENT = "devJournal:focusSessionsUpdated";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const readFocusSessionsMap = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(FOCUS_SESSIONS_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isPlainObject(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<Record<string, number>>((acc, [key, value]) => {
      if (key.length > 0 && typeof value === "number" && Number.isFinite(value)) {
        acc[key] = value;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
};

export const writeFocusSessionsMap = (value: Record<string, number>) => {
  localStorage.setItem(FOCUS_SESSIONS_STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(FOCUS_SESSIONS_UPDATED_EVENT));
};

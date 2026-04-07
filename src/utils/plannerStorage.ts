export const PLANNER_DAILY_WINS_STORAGE_KEY = "devJournal_daily_wins";
export const PLANNER_COLLAPSE_STORAGE_KEY = "devJournal_planner_collapsed_sections";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const readDailyWinsMap = (): Record<string, string[]> => {
  try {
    const raw = localStorage.getItem(PLANNER_DAILY_WINS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!isPlainObject(parsed)) return {};
    return Object.entries(parsed).reduce<Record<string, string[]>>((acc, [key, value]) => {
      if (key.length > 0 && isStringArray(value)) {
        acc[key] = value;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
};

export const persistDailyWinsMap = (value: Record<string, string[]>): void => {
  localStorage.setItem(PLANNER_DAILY_WINS_STORAGE_KEY, JSON.stringify(value));
};

export const readCollapsedSections = (): Record<string, boolean> => {
  try {
    const raw = localStorage.getItem(PLANNER_COLLAPSE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!isPlainObject(parsed)) return {};
    return Object.entries(parsed).reduce<Record<string, boolean>>((acc, [key, value]) => {
      if (key.length > 0 && typeof value === "boolean") {
        acc[key] = value;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
};

export const persistCollapsedSections = (value: Record<string, boolean>): void => {
  localStorage.setItem(PLANNER_COLLAPSE_STORAGE_KEY, JSON.stringify(value));
};

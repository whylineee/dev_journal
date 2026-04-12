import { TASKS_FILTER_EVENT, TASKS_OVERDUE_ONLY_STORAGE_KEY, readTasksPreferences } from "../utils/preferencesStorage";
import { usePersistentState } from "./usePersistentState";

export const useTasksPreferences = () => {
  const [showOverdueOnly, setShowOverdueOnly] = usePersistentState({
    storageKey: TASKS_OVERDUE_ONLY_STORAGE_KEY,
    parse: () => readTasksPreferences().showOverdueOnly,
    serialize: (value) => String(value),
    syncEvents: [TASKS_FILTER_EVENT],
  });

  return {
    showOverdueOnly,
    setShowOverdueOnly,
  };
};

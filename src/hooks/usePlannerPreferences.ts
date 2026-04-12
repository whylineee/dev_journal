import { useMemo } from "react";
import { PLANNER_COLLAPSE_STORAGE_KEY, PLANNER_DAILY_WINS_STORAGE_KEY, readPlannerPreferences } from "../utils/preferencesStorage";
import { usePersistentState } from "./usePersistentState";

export type PlannerSectionKey =
  | "tasksToday"
  | "overdueTasks"
  | "goalsNearDeadline"
  | "habitsToday"
  | "meetings"
  | "tomorrowPlan"
  | "focusSession"
  | "dailyWins";

const DEFAULT_COLLAPSED_SECTIONS: Partial<Record<PlannerSectionKey, boolean>> = {
  meetings: true,
  tomorrowPlan: true,
  dailyWins: true,
};

export const usePlannerPreferences = (today: string) => {
  const [dailyWinsMap, setDailyWinsMap] = usePersistentState<Record<string, string[]>>({
    storageKey: PLANNER_DAILY_WINS_STORAGE_KEY,
    parse: () => readPlannerPreferences().dailyWins,
    serialize: (value) => JSON.stringify(value),
  });
  const [collapsedSections, setCollapsedSections] = usePersistentState<
    Partial<Record<PlannerSectionKey, boolean>>
  >({
    storageKey: PLANNER_COLLAPSE_STORAGE_KEY,
    parse: () => {
      const stored = readPlannerPreferences().collapsedSections as Partial<
        Record<PlannerSectionKey, boolean>
      >;
      return Object.keys(stored).length > 0 ? stored : DEFAULT_COLLAPSED_SECTIONS;
    },
    serialize: (value) => JSON.stringify(value),
  });

  const dailyWins = useMemo(() => dailyWinsMap[today] ?? [], [dailyWinsMap, today]);

  const addDailyWin = (value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }

    setDailyWinsMap((previous) => ({
      ...previous,
      [today]: [normalized, ...(previous[today] ?? [])].slice(0, 7),
    }));
  };

  const removeDailyWin = (index: number) => {
    setDailyWinsMap((previous) => ({
      ...previous,
      [today]: (previous[today] ?? []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const isSectionCollapsed = (section: PlannerSectionKey) => Boolean(collapsedSections[section]);

  const toggleSection = (section: PlannerSectionKey) => {
    setCollapsedSections((previous) => ({
      ...previous,
      [section]: !previous[section],
    }));
  };

  return {
    collapsedSections,
    dailyWins,
    dailyWinsMap,
    addDailyWin,
    removeDailyWin,
    isSectionCollapsed,
    toggleSection,
  };
};

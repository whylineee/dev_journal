import { addDays, parseISO, startOfDay } from "date-fns";
import { Goal } from "../types";

/**
 * Checks whether a goal deadline falls within the next `thresholdDays` days.
 */
export const isGoalNearDeadline = (goal: Goal, thresholdDays: number) => {
  if (
    !goal.target_date ||
    goal.status === "completed" ||
    goal.status === "archived"
  ) {
    return false;
  }

  try {
    const target = startOfDay(parseISO(goal.target_date));
    const today = startOfDay(new Date());
    const threshold = startOfDay(addDays(today, thresholdDays));

    return target >= today && target <= threshold;
  } catch {
    return false;
  }
};

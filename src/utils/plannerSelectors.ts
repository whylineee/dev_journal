import {
  addDays,
  endOfWeek,
  format,
  isWithinInterval,
  parseISO,
  startOfWeek,
} from "date-fns";
import type { Entry, Goal, HabitWithLogs, Meeting, Task } from "../types";
import { expandMeetingOccurrences } from "./meetingUtils";
import { isGoalNearDeadline } from "./goalUtils";
import { isTaskDueToday, isTaskOverdue } from "./taskUtils";

export const getOverdueTasks = (tasks: Task[], limit = 6) =>
  tasks.filter((task) => isTaskOverdue(task)).slice(0, limit);

export const getDueTodayTasks = (tasks: Task[], limit = 6) =>
  tasks.filter((task) => isTaskDueToday(task)).slice(0, limit);

export const getNearGoals = (goals: Goal[], limit = 6) =>
  goals.filter((goal) => isGoalNearDeadline(goal, 14)).slice(0, limit);

export const getHabitsWithTodayState = (habits: HabitWithLogs[], today: string) =>
  habits.map((habit) => ({
    ...habit,
    doneToday: habit.completed_dates.includes(today),
  }));

export const getUpcomingMeetings = (meetings: Meeting[]) => {
  const now = new Date();
  return expandMeetingOccurrences(meetings, now, 14)
    .filter((occurrence) => occurrence.end.getTime() >= now.getTime() - 15 * 60 * 1000)
    .slice(0, 8);
};

export const getTodayMeetings = (
  upcomingMeetings: ReturnType<typeof expandMeetingOccurrences>,
  today: string
) => upcomingMeetings.filter((occurrence) => format(occurrence.start, "yyyy-MM-dd") === today);

export const getWeeklyMeetingOccurrences = (meetings: Meeting[]) =>
  expandMeetingOccurrences(meetings, new Date(), 7);

export const getMeetingDayBuckets = (
  weeklyMeetingOccurrences: ReturnType<typeof expandMeetingOccurrences>
) => {
  const days = Array.from({ length: 7 }, (_, index) =>
    format(addDays(new Date(), index), "yyyy-MM-dd")
  );
  const counts = new Map<string, number>();
  days.forEach((day) => counts.set(day, 0));

  weeklyMeetingOccurrences.forEach((occurrence) => {
    const dayKey = format(occurrence.start, "yyyy-MM-dd");
    if (counts.has(dayKey)) {
      counts.set(dayKey, (counts.get(dayKey) ?? 0) + 1);
    }
  });

  return days.map((day) => ({
    day,
    count: counts.get(day) ?? 0,
  }));
};

export const getJournalStreak = (entries: Entry[], today: string) => {
  let streak = 0;
  const sortedDates = entries
    .map((entry) => entry.date)
    .sort()
    .reverse();
  const dateSet = new Set(sortedDates);
  const current = new Date();
  if (!dateSet.has(today)) {
    current.setDate(current.getDate() - 1);
  }
  while (dateSet.has(format(current, "yyyy-MM-dd"))) {
    streak++;
    current.setDate(current.getDate() - 1);
  }
  return streak;
};

export const getPriorityTasks = (tasks: Task[], limit = 5) =>
  tasks
    .filter((task) => task.status !== "done")
    .sort((a, b) => {
      if (a.status === "in_progress" && b.status !== "in_progress") return -1;
      if (a.status !== "in_progress" && b.status === "in_progress") return 1;
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date && !b.due_date) return -1;
      if (!a.due_date && b.due_date) return 1;
      return b.updated_at.localeCompare(a.updated_at);
    })
    .slice(0, limit);

export const getCurrentWeekInterval = (today: string) => {
  const baseDate = parseISO(`${today}T00:00:00`);
  return {
    start: startOfWeek(baseDate, { weekStartsOn: 1 }),
    end: endOfWeek(baseDate, { weekStartsOn: 1 }),
  };
};

export const getWeeklyReview = ({
  currentWeekInterval,
  dailyWinsMap,
  entries,
  focusSessionsMap,
  habits,
  tasks,
  weeklyMeetingOccurrences,
}: {
  currentWeekInterval: { start: Date; end: Date };
  dailyWinsMap: Record<string, string[]>;
  entries: Entry[];
  focusSessionsMap: Record<string, number>;
  habits: HabitWithLogs[];
  tasks: Task[];
  weeklyMeetingOccurrences: ReturnType<typeof expandMeetingOccurrences>;
}) => {
  const completedTasks = tasks.filter((task) => {
    if (!task.completed_at) {
      return false;
    }
    try {
      return isWithinInterval(parseISO(task.completed_at), currentWeekInterval);
    } catch {
      return false;
    }
  });

  const journalEntries = entries.filter((entry) => {
    try {
      return isWithinInterval(parseISO(`${entry.date}T00:00:00`), currentWeekInterval);
    } catch {
      return false;
    }
  });

  const habitCompletions = habits.reduce((sum, habit) => {
    return (
      sum +
      habit.completed_dates.filter((date) => {
        try {
          return isWithinInterval(parseISO(`${date}T00:00:00`), currentWeekInterval);
        } catch {
          return false;
        }
      }).length
    );
  }, 0);

  const winsThisWeek = Object.entries(dailyWinsMap).reduce((sum, [date, items]) => {
    try {
      return isWithinInterval(parseISO(`${date}T00:00:00`), currentWeekInterval)
        ? sum + items.length
        : sum;
    } catch {
      return sum;
    }
  }, 0);

  const meetingsThisWeek = weeklyMeetingOccurrences.filter((occurrence) =>
    isWithinInterval(occurrence.start, currentWeekInterval)
  );

  const focusSessionsThisWeek = Object.entries(focusSessionsMap).reduce((sum, [date, count]) => {
    try {
      return isWithinInterval(parseISO(`${date}T00:00:00`), currentWeekInterval)
        ? sum + count
        : sum;
    } catch {
      return sum;
    }
  }, 0);

  return {
    completedTasks,
    focusSessionsThisWeek,
    habitCompletions,
    journalEntries,
    meetingsThisWeek,
    winsThisWeek,
  };
};

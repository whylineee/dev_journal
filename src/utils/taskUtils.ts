import { format, isBefore, isToday, parseISO, startOfDay } from "date-fns";
import { Task, TaskPriority } from "../types";

const priorityOrder: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Formats full timestamp for compact task metadata display.
 */
export const formatTaskDateTime = (value: string) => {
  try {
    return format(parseISO(value), "MMM d, HH:mm");
  } catch {
    return value;
  }
};

/**
 * Formats date-only value for due-date chips.
 */
export const formatTaskDateOnly = (value: string) => {
  try {
    return format(parseISO(value), "MMM d");
  } catch {
    return value;
  }
};

/**
 * Returns true if a task has a due date before today and is not completed.
 */
export const isTaskOverdue = (task: Task) => {
  if (!task.due_date || task.status === "done") {
    return false;
  }

  try {
    return isBefore(startOfDay(parseISO(task.due_date)), startOfDay(new Date()));
  } catch {
    return false;
  }
};

/**
 * Returns true if task due date is today.
 */
export const isTaskDueToday = (task: Task) => {
  if (!task.due_date || task.status === "done") {
    return false;
  }

  try {
    return isToday(parseISO(task.due_date));
  } catch {
    return false;
  }
};

const parseRfc3339 = (value: string | null) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

/**
 * Computes total elapsed seconds including currently running timer session.
 */
export const getTaskElapsedSeconds = (task: Task, nowMs: number) => {
  const startedAt = parseRfc3339(task.timer_started_at);
  const runningSeconds = startedAt
    ? Math.max(0, Math.floor((nowMs - startedAt.getTime()) / 1000))
    : 0;
  return Math.max(0, task.timer_accumulated_seconds + runningSeconds);
};

/**
 * Converts seconds to `HH:MM:SS` or `MM:SS` for timer chips.
 */
export const formatDuration = (totalSeconds: number) => {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
};

/**
 * Enforces safe input bounds for task estimate in minutes.
 */
export const normalizeEstimateMinutes = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(10080, Math.round(value)));
};

/**
 * Sorts tasks by priority -> due date -> last updated.
 */
export const compareTasks = (a: Task, b: Task) => {
  const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  if (a.due_date && b.due_date) {
    const byDue = a.due_date.localeCompare(b.due_date);
    if (byDue !== 0) {
      return byDue;
    }
  } else if (a.due_date && !b.due_date) {
    return -1;
  } else if (!a.due_date && b.due_date) {
    return 1;
  }

  return b.updated_at.localeCompare(a.updated_at);
};

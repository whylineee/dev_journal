import type { Task, TaskPriority, TaskStatus } from "../types";
import { compareTasks, isTaskDueToday, isTaskOverdue } from "./taskUtils";

export type GanttEntry = {
  task: Task;
  start: Date;
  end: Date;
  offsetDays: number;
  durationDays: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (value: string) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const diffDays = (from: Date, to: Date) =>
  Math.round((to.getTime() - from.getTime()) / DAY_MS);

export const formatDayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getTaskBoardStats = (tasks: Task[]) => {
  const overdue = tasks.filter((task) => isTaskOverdue(task)).length;
  const dueToday = tasks.filter((task) => isTaskDueToday(task)).length;
  const done = tasks.filter((task) => task.status === "done").length;
  const activeTimers = tasks.filter((task) => Boolean(task.timer_started_at)).length;
  return { overdue, dueToday, done, total: tasks.length, activeTimers };
};

export const getFilteredTasks = ({
  tasks,
  query,
  statusFilter,
  priorityFilter,
  projectFilter,
  showOverdueOnly,
}: {
  tasks: Task[];
  query: string;
  statusFilter: "all" | TaskStatus;
  priorityFilter: "all" | TaskPriority;
  projectFilter: "all" | number;
  showOverdueOnly: boolean;
}) => {
  const normalizedQuery = query.trim().toLowerCase();

  return tasks
    .filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }

      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }

      if (projectFilter !== "all" && task.project_id !== projectFilter) {
        return false;
      }

      if (showOverdueOnly && !isTaskOverdue(task)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        task.title.toLowerCase().includes(normalizedQuery) ||
        task.description.toLowerCase().includes(normalizedQuery)
      );
    })
    .sort(compareTasks);
};

export const groupTasksByStatus = (tasks: Task[]) => ({
  todo: tasks.filter((task) => task.status === "todo"),
  in_progress: tasks.filter((task) => task.status === "in_progress"),
  done: tasks.filter((task) => task.status === "done"),
});

export const buildTaskGantt = (tasks: Task[]) => {
  const source = tasks
    .filter((task) => Boolean(task.due_date))
    .map((task) => {
      const dueDate = startOfDay(task.due_date!);
      const createdDate = startOfDay(task.created_at);
      const estimateDays = Math.max(1, Math.ceil(task.time_estimate_minutes / (8 * 60)));
      const plannedStart = new Date(dueDate);
      plannedStart.setDate(plannedStart.getDate() - estimateDays + 1);
      const startDate = plannedStart < createdDate ? createdDate : plannedStart;
      return {
        task,
        start: startDate,
        end: dueDate,
      };
    })
    .filter((entry) => entry.start <= entry.end)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (source.length === 0) {
    return {
      entries: [] as GanttEntry[],
      rangeStart: null as Date | null,
      rangeEnd: null as Date | null,
      totalDays: 0,
    };
  }

  const rangeStart = source.reduce((min, entry) => (entry.start < min ? entry.start : min), source[0].start);
  const rangeEnd = source.reduce((max, entry) => (entry.end > max ? entry.end : max), source[0].end);
  const totalDays = Math.max(1, diffDays(rangeStart, rangeEnd) + 1);
  const entries: GanttEntry[] = source.map((entry) => {
    const offsetDays = Math.max(0, diffDays(rangeStart, entry.start));
    const durationDays = Math.max(1, diffDays(entry.start, entry.end) + 1);
    return { ...entry, offsetDays, durationDays };
  });

  return { entries, rangeStart, rangeEnd, totalDays };
};

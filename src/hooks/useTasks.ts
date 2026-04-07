import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";
import type { TaskPriority, TaskRecurrence, TaskStatus } from "../types";

const TASKS_QUERY_KEY = ["tasks"] as const;
const TASK_SUBTASKS_QUERY_KEY = ["task-subtasks"] as const;

const useInvalidateTasks = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: TASK_SUBTASKS_QUERY_KEY });
  };
};

export const useTasks = () => {
  return useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: api.getTasks,
  });
};

export const useCreateTask = () => {
  const invalidateTasks = useInvalidateTasks();

  return useMutation({
    mutationFn: ({
      title,
      description,
      status,
      priority,
      project_id,
      goal_id,
      due_date,
      recurrence,
      recurrence_until,
      time_estimate_minutes,
    }: {
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      project_id: number | null;
      goal_id: number | null;
      due_date: string | null;
      recurrence: TaskRecurrence;
      recurrence_until: string | null;
      time_estimate_minutes: number;
    }) =>
      api.createTask({
        title,
        description,
        status,
        priority,
        projectId: project_id,
        goalId: goal_id,
        dueDate: due_date,
        recurrence,
        recurrenceUntil: recurrence_until,
        timeEstimateMinutes: time_estimate_minutes,
      }),
    onSuccess: invalidateTasks,
  });
};

export const useUpdateTask = () => {
  const invalidateTasks = useInvalidateTasks();

  return useMutation({
    mutationFn: ({
      id,
      title,
      description,
      status,
      priority,
      project_id,
      goal_id,
      due_date,
      recurrence,
      recurrence_until,
      time_estimate_minutes,
    }: {
      id: number;
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      project_id: number | null;
      goal_id: number | null;
      due_date: string | null;
      recurrence: TaskRecurrence;
      recurrence_until: string | null;
      time_estimate_minutes: number;
    }) =>
      api.updateTask({
        id,
        title,
        description,
        status,
        priority,
        projectId: project_id,
        goalId: goal_id,
        dueDate: due_date,
        recurrence,
        recurrenceUntil: recurrence_until,
        timeEstimateMinutes: time_estimate_minutes,
      }),
    onSuccess: invalidateTasks,
  });
};

export const useUpdateTaskStatus = () => {
  const invalidateTasks = useInvalidateTasks();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskStatus }) =>
      api.updateTaskStatus(id, status),
    onSuccess: invalidateTasks,
  });
};

export const useStartTaskTimer = () => {
  const invalidateTasks = useInvalidateTasks();

  return useMutation({
    mutationFn: api.startTaskTimer,
    onSuccess: invalidateTasks,
  });
};

export const usePauseTaskTimer = () => {
  const invalidateTasks = useInvalidateTasks();

  return useMutation({
    mutationFn: api.pauseTaskTimer,
    onSuccess: invalidateTasks,
  });
};

export const useResetTaskTimer = () => {
  const invalidateTasks = useInvalidateTasks();

  return useMutation({
    mutationFn: api.resetTaskTimer,
    onSuccess: invalidateTasks,
  });
};

export const useDeleteTask = () => {
  const invalidateTasks = useInvalidateTasks();

  return useMutation({
    mutationFn: api.deleteTask,
    onSuccess: invalidateTasks,
  });
};

export const useTaskSubtasks = (taskId: number | null, enabled = true) => {
  return useQuery({
    queryKey: [...TASK_SUBTASKS_QUERY_KEY, taskId ?? "all"],
    queryFn: () => api.getTaskSubtasks(taskId),
    enabled,
  });
};

export const useCreateTaskSubtask = () => {
  const invalidateTasks = useInvalidateTasks();

  return useMutation({
    mutationFn: ({ task_id, title }: { task_id: number; title: string }) =>
      api.createTaskSubtask(task_id, title),
    onSuccess: invalidateTasks,
  });
};

export const useUpdateTaskSubtask = () => {
  const invalidateTasks = useInvalidateTasks();

  return useMutation({
    mutationFn: ({
      id,
      title,
      completed,
    }: {
      id: number;
      title?: string;
      completed?: boolean;
    }) => api.updateTaskSubtask(id, title ?? null, completed ?? null),
    onSuccess: invalidateTasks,
  });
};

export const useDeleteTaskSubtask = () => {
  const invalidateTasks = useInvalidateTasks();

  return useMutation({
    mutationFn: api.deleteTaskSubtask,
    onSuccess: invalidateTasks,
  });
};

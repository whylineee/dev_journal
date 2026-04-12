import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";
import type { TaskPriority, TaskRecurrence, TaskStatus } from "../types";
import { invalidateTaskDomain, queryKeys } from "./queryInvalidation";

const useInvalidateTasks = () => {
  const queryClient = useQueryClient();
  return () => invalidateTaskDomain(queryClient);
};

export const useTasks = () => {
  return useQuery({
    queryKey: queryKeys.tasks,
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
    queryKey: [...queryKeys.taskSubtasks, taskId ?? "all"],
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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Task, TaskPriority, TaskStatus } from "../types";

const TASKS_QUERY_KEY = ["tasks"] as const;

const useInvalidateTasks = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
};

/**
 * Loads all tasks with timer metadata from the local Tauri backend.
 */
export const useTasks = () => {
  return useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: async () => {
      return await invoke<Task[]>("get_tasks");
    },
  });
};

/**
 * Creates a task and stores estimate/timer defaults in DB.
 */
export const useCreateTask = () => {
  const invalidateTasks = useInvalidateTasks();

  return useMutation({
    mutationFn: async ({
      title,
      description,
      status,
      priority,
      due_date,
      time_estimate_minutes,
    }: {
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      due_date: string | null;
      time_estimate_minutes: number;
    }) => {
      return await invoke<Task>("create_task", {
        title,
        description,
        status,
        priority,
        dueDate: due_date,
        timeEstimateMinutes: time_estimate_minutes,
      });
    },
    onSuccess: invalidateTasks,
  });
};

/**
 * Updates full task payload (including estimate and status).
 */
export const useUpdateTask = () => {
  const invalidateTasks = useInvalidateTasks();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      description,
      status,
      priority,
      due_date,
      time_estimate_minutes,
    }: {
      id: number;
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      due_date: string | null;
      time_estimate_minutes: number;
    }) => {
      await invoke("update_task", {
        id,
        title,
        description,
        status,
        priority,
        dueDate: due_date,
        timeEstimateMinutes: time_estimate_minutes,
      });
    },
    onSuccess: invalidateTasks,
  });
};

/**
 * Performs fast status-only updates (used by board chips and checkboxes).
 */
export const useUpdateTaskStatus = () => {
  const invalidateTasks = useInvalidateTasks();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: TaskStatus }) => {
      await invoke("update_task_status", { id, status });
    },
    onSuccess: invalidateTasks,
  });
};

/**
 * Starts task timer and transitions `done` tasks back to `in_progress`.
 */
export const useStartTaskTimer = () => {
  const invalidateTasks = useInvalidateTasks();

  return useMutation({
    mutationFn: async (id: number) => {
      await invoke("start_task_timer", { id });
    },
    onSuccess: invalidateTasks,
  });
};

/**
 * Pauses active timer and persists elapsed seconds.
 */
export const usePauseTaskTimer = () => {
  const invalidateTasks = useInvalidateTasks();

  return useMutation({
    mutationFn: async (id: number) => {
      await invoke("pause_task_timer", { id });
    },
    onSuccess: invalidateTasks,
  });
};

/**
 * Resets elapsed timer state to zero.
 */
export const useResetTaskTimer = () => {
  const invalidateTasks = useInvalidateTasks();

  return useMutation({
    mutationFn: async (id: number) => {
      await invoke("reset_task_timer", { id });
    },
    onSuccess: invalidateTasks,
  });
};

/**
 * Deletes task by id.
 */
export const useDeleteTask = () => {
  const invalidateTasks = useInvalidateTasks();

  return useMutation({
    mutationFn: async (id: number) => {
      await invoke("delete_task", { id });
    },
    onSuccess: invalidateTasks,
  });
};

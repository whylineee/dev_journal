import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Task, TaskPriority, TaskRecurrence, TaskStatus, TaskSubtask } from "../types";

const TASKS_QUERY_KEY = ["tasks"] as const;
const TASK_SUBTASKS_QUERY_KEY = ["task-subtasks"] as const;

const useInvalidateTasks = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: TASK_SUBTASKS_QUERY_KEY });
  };
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
    }) => {
      return await invoke<Task>("create_task", {
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
    }) => {
      await invoke("update_task", {
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

/**
 * Loads subtasks for one task (or all tasks when `taskId` is null).
 */
export const useTaskSubtasks = (taskId: number | null, enabled = true) => {
  return useQuery({
    queryKey: [...TASK_SUBTASKS_QUERY_KEY, taskId ?? "all"],
    queryFn: async () => {
      return await invoke<TaskSubtask[]>("get_task_subtasks", { taskId });
    },
    enabled,
  });
};

/**
 * Creates a new subtask for the specified task.
 */
export const useCreateTaskSubtask = () => {
  const invalidateTasks = useInvalidateTasks();

  return useMutation({
    mutationFn: async ({ task_id, title }: { task_id: number; title: string }) => {
      return await invoke<TaskSubtask>("create_task_subtask", {
        taskId: task_id,
        title,
      });
    },
    onSuccess: invalidateTasks,
  });
};

/**
 * Updates title/completion state for a subtask.
 */
export const useUpdateTaskSubtask = () => {
  const invalidateTasks = useInvalidateTasks();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      completed,
    }: {
      id: number;
      title?: string;
      completed?: boolean;
    }) => {
      await invoke("update_task_subtask", {
        id,
        title: title ?? null,
        completed: completed ?? null,
      });
    },
    onSuccess: invalidateTasks,
  });
};

/**
 * Deletes a subtask by id.
 */
export const useDeleteTaskSubtask = () => {
  const invalidateTasks = useInvalidateTasks();

  return useMutation({
    mutationFn: async (id: number) => {
      await invoke("delete_task_subtask", { id });
    },
    onSuccess: invalidateTasks,
  });
};

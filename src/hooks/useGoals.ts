import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Goal, GoalMilestone, GoalStatus } from "../types";

const GOALS_QUERY_KEY = ["goals"] as const;
const GOAL_MILESTONES_QUERY_KEY = ["goal-milestones"] as const;

const invalidateGoals = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: GOAL_MILESTONES_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ["tasks"] });
};

export const useGoals = () => {
  return useQuery({
    queryKey: GOALS_QUERY_KEY,
    queryFn: async () => {
      return await invoke<Goal[]>("get_goals");
    },
  });
};

export const useGoalMilestones = (goalId: number | null) => {
  return useQuery({
    queryKey: [...GOAL_MILESTONES_QUERY_KEY, goalId ?? "all"],
    queryFn: async () => {
      return await invoke<GoalMilestone[]>("get_goal_milestones", { goalId });
    },
  });
};

export const useCreateGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      description,
      status,
      progress,
      project_id,
      target_date,
    }: {
      title: string;
      description: string;
      status: GoalStatus;
      progress: number;
      project_id: number | null;
      target_date: string | null;
    }) => {
      return await invoke<Goal>("create_goal", {
        title,
        description,
        status,
        progress,
        projectId: project_id,
        targetDate: target_date,
      });
    },
    onSuccess: () => {
      invalidateGoals(queryClient);
    },
  });
};

export const useUpdateGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      description,
      status,
      progress,
      project_id,
      target_date,
    }: {
      id: number;
      title: string;
      description: string;
      status: GoalStatus;
      progress: number;
      project_id: number | null;
      target_date: string | null;
    }) => {
      await invoke("update_goal", {
        id,
        title,
        description,
        status,
        progress,
        projectId: project_id,
        targetDate: target_date,
      });
    },
    onSuccess: () => {
      invalidateGoals(queryClient);
    },
  });
};

export const useDeleteGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await invoke("delete_goal", { id });
    },
    onSuccess: () => {
      invalidateGoals(queryClient);
    },
  });
};

export const useCreateGoalMilestone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      goal_id,
      title,
      due_date,
    }: {
      goal_id: number;
      title: string;
      due_date: string | null;
    }) => {
      return await invoke<GoalMilestone>("create_goal_milestone", {
        goalId: goal_id,
        title,
        dueDate: due_date,
      });
    },
    onSuccess: () => {
      invalidateGoals(queryClient);
    },
  });
};

export const useUpdateGoalMilestone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      completed,
      due_date,
    }: {
      id: number;
      title?: string | null;
      completed?: boolean | null;
      due_date?: string | null;
    }) => {
      await invoke("update_goal_milestone", {
        id,
        title: title ?? null,
        completed: completed ?? null,
        dueDate: due_date === undefined ? null : due_date ?? "",
      });
    },
    onSuccess: () => {
      invalidateGoals(queryClient);
    },
  });
};

export const useDeleteGoalMilestone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await invoke("delete_goal_milestone", { id });
    },
    onSuccess: () => {
      invalidateGoals(queryClient);
    },
  });
};

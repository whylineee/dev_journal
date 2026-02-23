import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Goal, GoalStatus } from "../types";

export const useGoals = () => {
  return useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      return await invoke<Goal[]>("get_goals");
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
      target_date,
    }: {
      title: string;
      description: string;
      status: GoalStatus;
      progress: number;
      target_date: string | null;
    }) => {
      return await invoke<Goal>("create_goal", {
        title,
        description,
        status,
        progress,
        targetDate: target_date,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
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
      target_date,
    }: {
      id: number;
      title: string;
      description: string;
      status: GoalStatus;
      progress: number;
      target_date: string | null;
    }) => {
      await invoke("update_goal", {
        id,
        title,
        description,
        status,
        progress,
        targetDate: target_date,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
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
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
};

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Habit, HabitWithLogs } from "../types";

export const useHabits = () => {
  return useQuery({
    queryKey: ["habits"],
    queryFn: async () => {
      return await invoke<HabitWithLogs[]>("get_habits");
    },
  });
};

export const useCreateHabit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      description,
      target_per_week,
      color,
    }: {
      title: string;
      description: string;
      target_per_week: number;
      color: string;
    }) => {
      return await invoke<Habit>("create_habit", {
        title,
        description,
        targetPerWeek: target_per_week,
        color,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
  });
};

export const useUpdateHabit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      description,
      target_per_week,
      color,
    }: {
      id: number;
      title: string;
      description: string;
      target_per_week: number;
      color: string;
    }) => {
      await invoke("update_habit", {
        id,
        title,
        description,
        targetPerWeek: target_per_week,
        color,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
  });
};

export const useDeleteHabit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await invoke("delete_habit", { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
  });
};

export const useToggleHabitCompletion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      habit_id,
      date,
      completed,
    }: {
      habit_id: number;
      date: string;
      completed: boolean;
    }) => {
      await invoke("toggle_habit_completion", {
        habitId: habit_id,
        date,
        completed,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
  });
};

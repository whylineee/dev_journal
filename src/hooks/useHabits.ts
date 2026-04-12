import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";
import { queryKeys } from "./queryInvalidation";

export const useHabits = () => {
  return useQuery({
    queryKey: queryKeys.habits,
    queryFn: api.getHabits,
  });
};

export const useCreateHabit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      title,
      description,
      target_per_week,
      color,
    }: {
      title: string;
      description: string;
      target_per_week: number;
      color: string;
    }) => api.createHabit(title, description, target_per_week, color),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.habits }),
  });
};

export const useUpdateHabit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
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
    }) => api.updateHabit(id, title, description, target_per_week, color),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.habits }),
  });
};

export const useDeleteHabit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteHabit,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.habits }),
  });
};

export const useToggleHabitCompletion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      habit_id,
      date,
      completed,
    }: {
      habit_id: number;
      date: string;
      completed: boolean;
    }) => api.toggleHabitCompletion(habit_id, date, completed),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.habits }),
  });
};

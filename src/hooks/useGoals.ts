import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";
import type { GoalStatus } from "../types";
import { invalidateGoalDomain, queryKeys } from "./queryInvalidation";

export const useGoals = () => {
  return useQuery({
    queryKey: queryKeys.goals,
    queryFn: api.getGoals,
  });
};

export const useGoalMilestones = (goalId: number | null) => {
  return useQuery({
    queryKey: [...queryKeys.goalMilestones, goalId ?? "all"],
    queryFn: () => api.getGoalMilestones(goalId),
  });
};

export const useCreateGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
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
    }) =>
      api.createGoal({
        title,
        description,
        status,
        progress,
        projectId: project_id,
        targetDate: target_date,
      }),
    onSuccess: () => invalidateGoalDomain(queryClient),
  });
};

export const useUpdateGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
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
    }) =>
      api.updateGoal({
        id,
        title,
        description,
        status,
        progress,
        projectId: project_id,
        targetDate: target_date,
      }),
    onSuccess: () => invalidateGoalDomain(queryClient),
  });
};

export const useDeleteGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteGoal,
    onSuccess: () => invalidateGoalDomain(queryClient),
  });
};

export const useCreateGoalMilestone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      goal_id,
      title,
      due_date,
    }: {
      goal_id: number;
      title: string;
      due_date: string | null;
    }) => api.createGoalMilestone(goal_id, title, due_date),
    onSuccess: () => invalidateGoalDomain(queryClient),
  });
};

export const useUpdateGoalMilestone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      title,
      completed,
      due_date,
    }: {
      id: number;
      title?: string | null;
      completed?: boolean | null;
      due_date?: string | null;
    }) =>
      api.updateGoalMilestone(
        id,
        title ?? null,
        completed ?? null,
        due_date === undefined ? null : due_date ?? ""
      ),
    onSuccess: () => invalidateGoalDomain(queryClient),
  });
};

export const useDeleteGoalMilestone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteGoalMilestone,
    onSuccess: () => invalidateGoalDomain(queryClient),
  });
};

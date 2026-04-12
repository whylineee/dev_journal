import type { QueryClient } from "@tanstack/react-query";

export const queryKeys = {
  entries: ["entries"] as const,
  entry: (date?: string) => (date ? (["entry", date] as const) : (["entry"] as const)),
  search: ["search"] as const,
  pages: ["pages"] as const,
  tasks: ["tasks"] as const,
  taskSubtasks: ["task-subtasks"] as const,
  goals: ["goals"] as const,
  goalMilestones: ["goal-milestones"] as const,
  habits: ["habits"] as const,
  projects: ["projects"] as const,
  projectBranches: ["project-branches"] as const,
  meetings: ["meetings"] as const,
} as const;

const invalidate = (queryClient: QueryClient, queryKey: readonly unknown[]) =>
  queryClient.invalidateQueries({ queryKey });

export const invalidateTaskDomain = (queryClient: QueryClient) => {
  invalidate(queryClient, queryKeys.tasks);
  invalidate(queryClient, queryKeys.taskSubtasks);
};

export const invalidateGoalDomain = (queryClient: QueryClient) => {
  invalidate(queryClient, queryKeys.goals);
  invalidate(queryClient, queryKeys.goalMilestones);
  invalidate(queryClient, queryKeys.tasks);
};

export const invalidateProjectDomain = (queryClient: QueryClient) => {
  invalidate(queryClient, queryKeys.projects);
  invalidate(queryClient, queryKeys.entries);
  invalidate(queryClient, queryKeys.tasks);
  invalidate(queryClient, queryKeys.goals);
  invalidate(queryClient, queryKeys.meetings);
  invalidate(queryClient, queryKeys.projectBranches);
};

export const invalidateProjectBranchesDomain = (
  queryClient: QueryClient,
  projectId: number
) => {
  invalidate(queryClient, ["project-branches", projectId]);
  invalidate(queryClient, queryKeys.projectBranches);
  invalidate(queryClient, queryKeys.projects);
};

export const invalidateMeetingDomain = (queryClient: QueryClient) => {
  invalidate(queryClient, queryKeys.meetings);
  invalidate(queryClient, queryKeys.projects);
  invalidate(queryClient, queryKeys.tasks);
};

export const invalidateEntryDomain = (queryClient: QueryClient, date?: string) => {
  invalidate(queryClient, queryKeys.entries);
  invalidate(queryClient, queryKeys.entry(date));
  invalidate(queryClient, queryKeys.search);
};

export const invalidateAllDomainQueries = (queryClient: QueryClient) => {
  invalidateEntryDomain(queryClient);
  invalidate(queryClient, queryKeys.pages);
  invalidateTaskDomain(queryClient);
  invalidate(queryClient, queryKeys.goals);
  invalidate(queryClient, queryKeys.goalMilestones);
  invalidate(queryClient, queryKeys.habits);
  invalidate(queryClient, queryKeys.projects);
  invalidate(queryClient, queryKeys.projectBranches);
  invalidate(queryClient, queryKeys.meetings);
};

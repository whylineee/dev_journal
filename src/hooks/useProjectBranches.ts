import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";
import type { ProjectBranchStatus } from "../types";
import { invalidateProjectBranchesDomain } from "./queryInvalidation";

const key = (projectId: number | null) => ["project-branches", projectId] as const;

export const useProjectBranches = (projectId: number | null, enabled = true) => {
  return useQuery({
    queryKey: key(projectId),
    queryFn: () => api.getProjectBranches(projectId),
    enabled,
  });
};

export const useCreateProjectBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      project_id,
      name,
      description,
      status,
    }: {
      project_id: number;
      name: string;
      description: string;
      status: ProjectBranchStatus;
    }) => api.createProjectBranch(project_id, name, description, status),
    onSuccess: (branch) => invalidateProjectBranchesDomain(queryClient, branch.project_id),
  });
};

export const useUpdateProjectBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      project_id,
      name,
      description,
      status,
    }: {
      id: number;
      project_id: number;
      name: string;
      description: string;
      status: ProjectBranchStatus;
    }) => {
      await api.updateProjectBranch(id, name, description, status);
      return { project_id };
    },
    onSuccess: ({ project_id }) => invalidateProjectBranchesDomain(queryClient, project_id),
  });
};

export const useDeleteProjectBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      project_id,
    }: {
      id: number;
      project_id: number;
    }) => {
      await api.deleteProjectBranch(id);
      return { project_id };
    },
    onSuccess: ({ project_id }) => invalidateProjectBranchesDomain(queryClient, project_id),
  });
};

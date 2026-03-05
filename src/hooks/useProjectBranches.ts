import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { ProjectBranch, ProjectBranchStatus } from "../types";

const key = (projectId: number | null) => ["project-branches", projectId] as const;

export const useProjectBranches = (projectId: number | null, enabled = true) => {
  return useQuery({
    queryKey: key(projectId),
    queryFn: async () => {
      return await invoke<ProjectBranch[]>("get_project_branches", { projectId });
    },
    enabled,
  });
};

const invalidateBranches = (
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: number
) => {
  queryClient.invalidateQueries({ queryKey: key(projectId) });
  queryClient.invalidateQueries({ queryKey: ["project-branches"] });
  queryClient.invalidateQueries({ queryKey: ["projects"] });
};

export const useCreateProjectBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      project_id,
      name,
      description,
      status,
    }: {
      project_id: number;
      name: string;
      description: string;
      status: ProjectBranchStatus;
    }) => {
      return await invoke<ProjectBranch>("create_project_branch", {
        projectId: project_id,
        name,
        description,
        status,
      });
    },
    onSuccess: (branch) => invalidateBranches(queryClient, branch.project_id),
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
      await invoke("update_project_branch", {
        id,
        name,
        description,
        status,
      });
      return { project_id };
    },
    onSuccess: ({ project_id }) => invalidateBranches(queryClient, project_id),
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
      await invoke("delete_project_branch", { id });
      return { project_id };
    },
    onSuccess: ({ project_id }) => invalidateBranches(queryClient, project_id),
  });
};

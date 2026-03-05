import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Project, ProjectStatus } from "../types";

const PROJECTS_QUERY_KEY = ["projects"] as const;

const invalidateRelatedQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ["entries"] });
  queryClient.invalidateQueries({ queryKey: ["tasks"] });
  queryClient.invalidateQueries({ queryKey: ["goals"] });
  queryClient.invalidateQueries({ queryKey: ["meetings"] });
};

export const useProjects = () => {
  return useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: async () => {
      return await invoke<Project[]>("get_projects");
    },
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      color,
      status,
    }: {
      name: string;
      description: string;
      color: string;
      status: ProjectStatus;
    }) => {
      return await invoke<Project>("create_project", {
        name,
        description,
        color,
        status,
      });
    },
    onSuccess: () => invalidateRelatedQueries(queryClient),
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      color,
      status,
    }: {
      id: number;
      name: string;
      description: string;
      color: string;
      status: ProjectStatus;
    }) => {
      await invoke("update_project", {
        id,
        name,
        description,
        color,
        status,
      });
    },
    onSuccess: () => invalidateRelatedQueries(queryClient),
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await invoke("delete_project", { id });
    },
    onSuccess: () => invalidateRelatedQueries(queryClient),
  });
};

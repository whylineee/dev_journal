import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";
import type { ProjectStatus } from "../types";

const PROJECTS_QUERY_KEY = ["projects"] as const;

const invalidateRelatedQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ["entries"] });
  queryClient.invalidateQueries({ queryKey: ["tasks"] });
  queryClient.invalidateQueries({ queryKey: ["goals"] });
  queryClient.invalidateQueries({ queryKey: ["meetings"] });
  queryClient.invalidateQueries({ queryKey: ["project-branches"] });
};

export const useProjects = () => {
  return useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: api.getProjects,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      description,
      color,
      status,
    }: {
      name: string;
      description: string;
      color: string;
      status: ProjectStatus;
    }) => api.createProject(name, description, color, status),
    onSuccess: () => invalidateRelatedQueries(queryClient),
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
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
    }) => api.updateProject(id, name, description, color, status),
    onSuccess: () => invalidateRelatedQueries(queryClient),
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteProject,
    onSuccess: () => invalidateRelatedQueries(queryClient),
  });
};

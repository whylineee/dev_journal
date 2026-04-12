import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";
import type { ProjectStatus } from "../types";
import { invalidateProjectDomain, queryKeys } from "./queryInvalidation";

export const useProjects = () => {
  return useQuery({
    queryKey: queryKeys.projects,
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
    onSuccess: () => invalidateProjectDomain(queryClient),
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
    onSuccess: () => invalidateProjectDomain(queryClient),
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteProject,
    onSuccess: () => invalidateProjectDomain(queryClient),
  });
};

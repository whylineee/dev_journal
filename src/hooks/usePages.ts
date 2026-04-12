import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";
import { queryKeys } from "./queryInvalidation";

export const usePages = () => {
  return useQuery({
    queryKey: queryKeys.pages,
    queryFn: api.getPages,
  });
};

export const usePage = (id: number | null) => {
  return useQuery({
    queryKey: [...queryKeys.pages, id],
    queryFn: () => (id === null ? Promise.resolve(null) : api.getPage(id)),
    enabled: id !== null,
  });
};

export const useCreatePage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ title, content }: { title: string; content: string }) =>
      api.createPage(title, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.pages }),
  });
};

export const useUpdatePage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, title, content }: { id: number; title: string; content: string }) =>
      api.updatePage(id, title, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pages });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.pages, variables.id] });
    },
  });
};

export const useDeletePage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deletePage,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.pages }),
  });
};

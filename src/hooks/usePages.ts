import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";

const PAGES_QUERY_KEY = ["pages"] as const;

export const usePages = () => {
  return useQuery({
    queryKey: PAGES_QUERY_KEY,
    queryFn: api.getPages,
  });
};

export const usePage = (id: number | null) => {
  return useQuery({
    queryKey: [...PAGES_QUERY_KEY, id],
    queryFn: () => (id === null ? Promise.resolve(null) : api.getPage(id)),
    enabled: id !== null,
  });
};

export const useCreatePage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ title, content }: { title: string; content: string }) =>
      api.createPage(title, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEY }),
  });
};

export const useUpdatePage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, title, content }: { id: number; title: string; content: string }) =>
      api.updatePage(id, title, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...PAGES_QUERY_KEY, variables.id] });
    },
  });
};

export const useDeletePage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deletePage,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEY }),
  });
};

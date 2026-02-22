import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Page } from "../types";

export const usePages = () => {
    return useQuery({
        queryKey: ["pages"],
        queryFn: async () => {
            const pages = await invoke<Page[]>("get_pages");
            return pages;
        },
    });
};

export const usePage = (id: number | null) => {
    return useQuery({
        queryKey: ["pages", id],
        queryFn: async () => {
            if (id === null) return null;
            const page = await invoke<Page | null>("get_page", { id });
            return page;
        },
        enabled: id !== null,
    });
};

export const useCreatePage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ title, content }: { title: string; content: string }) => {
            return await invoke<Page>("create_page", { title, content });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pages"] });
        },
    });
};

export const useUpdatePage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, title, content }: { id: number; title: string; content: string }) => {
            await invoke("update_page", { id, title, content });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["pages"] });
            queryClient.invalidateQueries({ queryKey: ["pages", variables.id] });
        },
    });
};

export const useDeletePage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            await invoke("delete_page", { id });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pages"] });
        },
    });
};

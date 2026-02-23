import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Task, TaskStatus } from "../types";

export const useTasks = () => {
    return useQuery({
        queryKey: ["tasks"],
        queryFn: async () => {
            return await invoke<Task[]>("get_tasks");
        },
    });
};

export const useCreateTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ title, description, status }: { title: string; description: string; status: TaskStatus }) => {
            return await invoke<Task>("create_task", { title, description, status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
    });
};

export const useUpdateTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, title, description, status }: { id: number; title: string; description: string; status: TaskStatus }) => {
            await invoke("update_task", { id, title, description, status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
    });
};

export const useUpdateTaskStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status }: { id: number; status: TaskStatus }) => {
            await invoke("update_task_status", { id, status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
    });
};

export const useDeleteTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            await invoke("delete_task", { id });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
    });
};

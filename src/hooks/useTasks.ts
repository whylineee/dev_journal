import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Task, TaskPriority, TaskStatus } from "../types";

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
        mutationFn: async ({
            title,
            description,
            status,
            priority,
            due_date,
            time_estimate_minutes,
        }: {
            title: string;
            description: string;
            status: TaskStatus;
            priority: TaskPriority;
            due_date: string | null;
            time_estimate_minutes: number;
        }) => {
            return await invoke<Task>("create_task", {
                title,
                description,
                status,
                priority,
                dueDate: due_date,
                timeEstimateMinutes: time_estimate_minutes,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
    });
};

export const useUpdateTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            title,
            description,
            status,
            priority,
            due_date,
            time_estimate_minutes,
        }: {
            id: number;
            title: string;
            description: string;
            status: TaskStatus;
            priority: TaskPriority;
            due_date: string | null;
            time_estimate_minutes: number;
        }) => {
            await invoke("update_task", {
                id,
                title,
                description,
                status,
                priority,
                dueDate: due_date,
                timeEstimateMinutes: time_estimate_minutes,
            });
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

export const useStartTaskTimer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            await invoke("start_task_timer", { id });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
    });
};

export const usePauseTaskTimer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            await invoke("pause_task_timer", { id });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
    });
};

export const useResetTaskTimer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            await invoke("reset_task_timer", { id });
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

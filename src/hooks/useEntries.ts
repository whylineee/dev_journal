import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

export const useEntries = () => {
    return useQuery({
        queryKey: ["entries"],
        queryFn: api.getEntries,
    });
};

export const useEntry = (date: string) => {
    return useQuery({
        queryKey: ["entry", date],
        queryFn: () => api.getEntry(date),
    });
};

export const useSearchEntries = (query: string) => {
    return useQuery({
        queryKey: ["search", query],
        queryFn: () => api.searchEntries(query),
        enabled: query.length > 0,
    });
};

export const useSaveEntry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ date, yesterday, today }: { date: string, yesterday: string, today: string }) => {
            return api.saveEntry(date, yesterday, today);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["entries"] });
            queryClient.invalidateQueries({ queryKey: ["entry", variables.date] });
        },
    });
};

export const useGitCommits = () => {
    return useQuery({
        queryKey: ["commits"],
        queryFn: api.getGitCommits,
    });
};

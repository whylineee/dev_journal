import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { BackupPayload } from "../types";
import { invalidateAllDomainQueries, invalidateEntryDomain, queryKeys } from "./queryInvalidation";

export const useEntries = () => {
    return useQuery({
        queryKey: queryKeys.entries,
        queryFn: api.getEntries,
    });
};

export const useEntry = (date: string) => {
    return useQuery({
        queryKey: queryKeys.entry(date),
        queryFn: () => api.getEntry(date),
    });
};

export const useSearchEntries = (query: string) => {
    return useQuery({
        queryKey: [...queryKeys.search, query],
        queryFn: () => api.searchEntries(query),
        enabled: query.length > 0,
    });
};

export const useSaveEntry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ date, yesterday, today, project_id }: { date: string, yesterday: string, today: string, project_id: number | null }) => {
            return api.saveEntry(date, yesterday, today, project_id);
        },
        onSuccess: (_, variables) => {
            invalidateEntryDomain(queryClient, variables.date);
        },
    });
};

export const useDeleteEntry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (date: string) => {
            return api.deleteEntry(date);
        },
        onSuccess: (_, date) => {
            invalidateEntryDomain(queryClient, date);
        },
    });
};

export const useGitCommits = () => {
    return useQuery({
        queryKey: ["commits"],
        queryFn: api.getGitCommits,
    });
};

export const useImportBackup = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ payload, replaceExisting }: { payload: BackupPayload, replaceExisting: boolean }) => {
            return api.importBackup(payload, replaceExisting);
        },
        onSuccess: () => {
            invalidateAllDomainQueries(queryClient);
        },
    });
};

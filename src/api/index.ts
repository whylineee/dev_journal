import { invoke } from "@tauri-apps/api/core";
import { BackupPayload, Entry } from "../types";

export const api = {
    getEntries: async (): Promise<Entry[]> => {
        return await invoke("get_entries");
    },

    getEntry: async (date: string): Promise<Entry | null> => {
        return await invoke("get_entry", { date });
    },

    saveEntry: async (date: string, yesterday: string, today: string): Promise<void> => {
        return await invoke("save_entry", { date, yesterday, today });
    },

    deleteEntry: async (date: string): Promise<void> => {
        return await invoke("delete_entry", { date });
    },

    searchEntries: async (query: string): Promise<Entry[]> => {
        return await invoke("search_entries", { query });
    },

    getGitCommits: async (): Promise<string[]> => {
        return await invoke("get_git_commits");
    },

    importBackup: async (payload: BackupPayload, replaceExisting: boolean): Promise<void> => {
        return await invoke("import_backup", { payload, replaceExisting });
    }
};

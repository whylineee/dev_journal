export interface Entry {
    id: number;
    date: string;
    yesterday: string;
    today: string;
    created_at: string;
}

export interface Page {
    id: number;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
}

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type GoalStatus = "active" | "paused" | "completed" | "archived";

export interface Task {
    id: number;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    due_date: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Goal {
    id: number;
    title: string;
    description: string;
    status: GoalStatus;
    progress: number;
    target_date: string | null;
    created_at: string;
    updated_at: string;
}

export interface BackupPayload {
    entries?: Array<{
        date: string;
        yesterday: string;
        today: string;
        created_at?: string;
    }>;
    pages?: Array<{
        id?: number;
        title: string;
        content: string;
        created_at?: string;
        updated_at?: string;
    }>;
    tasks?: Array<{
        id?: number;
        title: string;
        description: string;
        status: string;
        priority?: TaskPriority;
        due_date?: string | null;
        completed_at?: string | null;
        created_at?: string;
        updated_at?: string;
    }>;
    goals?: Array<{
        id?: number;
        title: string;
        description?: string;
        status?: GoalStatus;
        progress?: number;
        target_date?: string | null;
        created_at?: string;
        updated_at?: string;
    }>;
}

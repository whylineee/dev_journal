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

export interface Task {
    id: number;
    title: string;
    description: string;
    status: TaskStatus;
    created_at: string;
    updated_at: string;
}

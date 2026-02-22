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

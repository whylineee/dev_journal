export interface Entry {
    id: number;
    date: string;
    yesterday: string;
    today: string;
    project_id: number | null;
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
export type MeetingStatus = "planned" | "live" | "done" | "missed" | "cancelled";
export type MeetingRecurrence = "none" | "daily" | "weekdays" | "weekly";

export interface MeetingActionItem {
    id: string;
    title: string;
    completed: boolean;
    task_id: number | null;
}

export interface Task {
    id: number;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    project_id: number | null;
    goal_id: number | null;
    due_date: string | null;
    completed_at: string | null;
    time_estimate_minutes: number;
    timer_started_at: string | null;
    timer_accumulated_seconds: number;
    created_at: string;
    updated_at: string;
}

export interface TaskSubtask {
    id: number;
    task_id: number;
    title: string;
    completed: boolean;
    position: number;
    created_at: string;
    updated_at: string;
}

export interface Meeting {
    id: number;
    title: string;
    agenda: string;
    start_at: string;
    end_at: string;
    meet_url: string | null;
    calendar_event_url: string | null;
    project_id: number | null;
    participants: string[];
    notes: string;
    decisions: string;
    action_items: MeetingActionItem[];
    recurrence: MeetingRecurrence;
    recurrence_until: string | null;
    reminder_minutes: number;
    status: MeetingStatus;
    created_at: string;
    updated_at: string;
}

export interface Goal {
    id: number;
    title: string;
    description: string;
    status: GoalStatus;
    progress: number;
    project_id: number | null;
    target_date: string | null;
    created_at: string;
    updated_at: string;
}

export type ProjectStatus = "active" | "paused" | "completed" | "archived";
export type ProjectBranchStatus = "open" | "merged";

export interface Project {
    id: number;
    name: string;
    description: string;
    color: string;
    status: ProjectStatus;
    created_at: string;
    updated_at: string;
}

export interface ProjectBranch {
    id: number;
    project_id: number;
    name: string;
    description: string;
    status: ProjectBranchStatus;
    created_at: string;
    updated_at: string;
}

export interface Habit {
    id: number;
    title: string;
    description: string;
    target_per_week: number;
    color: string;
    created_at: string;
    updated_at: string;
}

export interface HabitWithLogs extends Habit {
    completed_dates: string[];
    current_streak: number;
    this_week_count: number;
}

export interface BackupPayload {
    entries?: Array<{
        date: string;
        yesterday: string;
        today: string;
        project_id?: number | null;
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
        project_id?: number | null;
        goal_id?: number | null;
        due_date?: string | null;
        completed_at?: string | null;
        time_estimate_minutes?: number;
        timer_started_at?: string | null;
        timer_accumulated_seconds?: number;
        created_at?: string;
        updated_at?: string;
    }>;
    task_subtasks?: Array<{
        id?: number;
        task_id: number;
        title: string;
        completed?: boolean;
        position?: number;
        created_at?: string;
        updated_at?: string;
    }>;
    goals?: Array<{
        id?: number;
        title: string;
        description?: string;
        status?: GoalStatus;
        progress?: number;
        project_id?: number | null;
        target_date?: string | null;
        created_at?: string;
        updated_at?: string;
    }>;
    projects?: Array<{
        id?: number;
        name: string;
        description?: string;
        color?: string;
        status?: ProjectStatus;
        created_at?: string;
        updated_at?: string;
    }>;
    project_branches?: Array<{
        id?: number;
        project_id: number;
        name: string;
        description?: string;
        status?: ProjectBranchStatus;
        created_at?: string;
        updated_at?: string;
    }>;
    habits?: Array<{
        id?: number;
        title: string;
        description?: string;
        target_per_week?: number;
        color?: string;
        created_at?: string;
        updated_at?: string;
    }>;
    habit_logs?: Array<{
        id?: number;
        habit_id: number;
        date: string;
        created_at?: string;
    }>;
    meetings?: Array<{
        id?: number;
        title: string;
        agenda?: string;
        start_at: string;
        end_at: string;
        meet_url?: string | null;
        calendar_event_url?: string | null;
        project_id?: number | null;
        participants?: string[];
        notes?: string;
        decisions?: string;
        action_items?: MeetingActionItem[];
        recurrence?: MeetingRecurrence;
        recurrence_until?: string | null;
        reminder_minutes?: number;
        status?: MeetingStatus;
        created_at?: string;
        updated_at?: string;
    }>;
}

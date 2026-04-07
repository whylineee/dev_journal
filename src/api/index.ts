import { invoke } from "@tauri-apps/api/core";
import type {
    BackupPayload,
    Entry,
    Goal,
    GoalMilestone,
    GoalStatus,
    Habit,
    HabitWithLogs,
    Meeting,
    MeetingActionItem,
    MeetingRecurrence,
    MeetingStatus,
    Page,
    Project,
    ProjectBranch,
    ProjectBranchStatus,
    ProjectStatus,
    Task,
    TaskPriority,
    TaskRecurrence,
    TaskStatus,
    TaskSubtask,
} from "../types";

// Entries
export const getEntries = (): Promise<Entry[]> => invoke("get_entries");
export const getEntry = (date: string): Promise<Entry | null> => invoke("get_entry", { date });
export const saveEntry = (date: string, yesterday: string, today: string, projectId?: number | null): Promise<void> =>
    invoke("save_entry", { date, yesterday, today, projectId });
export const deleteEntry = (date: string): Promise<void> => invoke("delete_entry", { date });
export const searchEntries = (query: string): Promise<Entry[]> => invoke("search_entries", { query });

// Git
export const getGitCommits = (): Promise<string[]> => invoke("get_git_commits");

// Backup
export const importBackup = (payload: BackupPayload, replaceExisting: boolean): Promise<void> =>
    invoke("import_backup", { payload, replaceExisting });

// Pages
export const getPages = (): Promise<Page[]> => invoke("get_pages");
export const getPage = (id: number): Promise<Page | null> => invoke("get_page", { id });
export const createPage = (title: string, content: string): Promise<Page> => invoke("create_page", { title, content });
export const updatePage = (id: number, title: string, content: string): Promise<void> =>
    invoke("update_page", { id, title, content });
export const deletePage = (id: number): Promise<void> => invoke("delete_page", { id });

// Tasks
export const getTasks = (): Promise<Task[]> => invoke("get_tasks");
export const createTask = (params: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    projectId: number | null;
    goalId: number | null;
    dueDate: string | null;
    recurrence: TaskRecurrence;
    recurrenceUntil: string | null;
    timeEstimateMinutes: number;
}): Promise<Task> => invoke("create_task", params);
export const updateTask = (params: {
    id: number;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    projectId: number | null;
    goalId: number | null;
    dueDate: string | null;
    recurrence: TaskRecurrence;
    recurrenceUntil: string | null;
    timeEstimateMinutes: number;
}): Promise<void> => invoke("update_task", params);
export const updateTaskStatus = (id: number, status: TaskStatus): Promise<void> =>
    invoke("update_task_status", { id, status });
export const deleteTask = (id: number): Promise<void> => invoke("delete_task", { id });
export const startTaskTimer = (id: number): Promise<void> => invoke("start_task_timer", { id });
export const pauseTaskTimer = (id: number): Promise<void> => invoke("pause_task_timer", { id });
export const resetTaskTimer = (id: number): Promise<void> => invoke("reset_task_timer", { id });

// Task Subtasks
export const getTaskSubtasks = (taskId: number | null): Promise<TaskSubtask[]> =>
    invoke("get_task_subtasks", { taskId });
export const createTaskSubtask = (taskId: number, title: string): Promise<TaskSubtask> =>
    invoke("create_task_subtask", { taskId, title });
export const updateTaskSubtask = (id: number, title: string | null, completed: boolean | null): Promise<void> =>
    invoke("update_task_subtask", { id, title, completed });
export const deleteTaskSubtask = (id: number): Promise<void> => invoke("delete_task_subtask", { id });

// Goals
export const getGoals = (): Promise<Goal[]> => invoke("get_goals");
export const createGoal = (params: {
    title: string;
    description: string;
    status: GoalStatus;
    progress: number;
    projectId: number | null;
    targetDate: string | null;
}): Promise<Goal> => invoke("create_goal", params);
export const updateGoal = (params: {
    id: number;
    title: string;
    description: string;
    status: GoalStatus;
    progress: number;
    projectId: number | null;
    targetDate: string | null;
}): Promise<void> => invoke("update_goal", params);
export const deleteGoal = (id: number): Promise<void> => invoke("delete_goal", { id });

// Goal Milestones
export const getGoalMilestones = (goalId: number | null): Promise<GoalMilestone[]> =>
    invoke("get_goal_milestones", { goalId });
export const createGoalMilestone = (goalId: number, title: string, dueDate: string | null): Promise<GoalMilestone> =>
    invoke("create_goal_milestone", { goalId, title, dueDate });
export const updateGoalMilestone = (
    id: number,
    title: string | null,
    completed: boolean | null,
    dueDate: string | null
): Promise<void> => invoke("update_goal_milestone", { id, title, completed, dueDate });
export const deleteGoalMilestone = (id: number): Promise<void> => invoke("delete_goal_milestone", { id });

// Habits
export const getHabits = (): Promise<HabitWithLogs[]> => invoke("get_habits");
export const createHabit = (title: string, description: string, targetPerWeek: number, color: string): Promise<Habit> =>
    invoke("create_habit", { title, description, targetPerWeek, color });
export const updateHabit = (
    id: number,
    title: string,
    description: string,
    targetPerWeek: number,
    color: string
): Promise<void> => invoke("update_habit", { id, title, description, targetPerWeek, color });
export const deleteHabit = (id: number): Promise<void> => invoke("delete_habit", { id });
export const toggleHabitCompletion = (habitId: number, date: string, completed: boolean): Promise<void> =>
    invoke("toggle_habit_completion", { habitId, date, completed });

// Projects
export const getProjects = (): Promise<Project[]> => invoke("get_projects");
export const createProject = (
    name: string,
    description: string,
    color: string,
    status: ProjectStatus
): Promise<Project> => invoke("create_project", { name, description, color, status });
export const updateProject = (
    id: number,
    name: string,
    description: string,
    color: string,
    status: ProjectStatus
): Promise<void> => invoke("update_project", { id, name, description, color, status });
export const deleteProject = (id: number): Promise<void> => invoke("delete_project", { id });

// Project Branches
export const getProjectBranches = (projectId: number | null): Promise<ProjectBranch[]> =>
    invoke("get_project_branches", { projectId });
export const createProjectBranch = (
    projectId: number,
    name: string,
    description: string,
    status: ProjectBranchStatus
): Promise<ProjectBranch> => invoke("create_project_branch", { projectId, name, description, status });
export const updateProjectBranch = (
    id: number,
    name: string,
    description: string,
    status: ProjectBranchStatus
): Promise<void> => invoke("update_project_branch", { id, name, description, status });
export const deleteProjectBranch = (id: number): Promise<void> => invoke("delete_project_branch", { id });

// Meetings
export const getMeetings = (): Promise<Meeting[]> => invoke("get_meetings");
export const createMeeting = (params: {
    title: string;
    agenda: string;
    startAt: string;
    endAt: string;
    meetUrl: string | null;
    calendarEventUrl: string | null;
    projectId: number | null;
    participants: string[];
    notes: string;
    decisions: string;
    actionItems: MeetingActionItem[];
    recurrence: MeetingRecurrence;
    recurrenceUntil: string | null;
    reminderMinutes: number;
    status: MeetingStatus;
}): Promise<Meeting> => invoke("create_meeting", params);
export const updateMeeting = (params: {
    id: number;
    title: string;
    agenda: string;
    startAt: string;
    endAt: string;
    meetUrl: string | null;
    calendarEventUrl: string | null;
    projectId: number | null;
    participants: string[];
    notes: string;
    decisions: string;
    actionItems: MeetingActionItem[];
    recurrence: MeetingRecurrence;
    recurrenceUntil: string | null;
    reminderMinutes: number;
    status: MeetingStatus;
}): Promise<void> => invoke("update_meeting", params);
export const deleteMeeting = (id: number): Promise<void> => invoke("delete_meeting", { id });
export const materializeMeetingActionItems = (meetingId: number, dueDate: string | null): Promise<Task[]> =>
    invoke("materialize_meeting_action_items", { meetingId, dueDate });

// Legacy object API for backward compatibility
export const api = {
    getEntries,
    getEntry,
    saveEntry,
    deleteEntry,
    searchEntries,
    getGitCommits,
    importBackup,
};

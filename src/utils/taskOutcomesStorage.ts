const TASK_OUTCOMES_STORAGE_KEY = "devJournal_task_outcomes";

export interface TaskOutcome {
  before: string;
  after: string;
}

export type TaskOutcomeMap = Record<string, TaskOutcome>;

export const readTaskOutcomes = (): TaskOutcomeMap => {
  try {
    const raw = localStorage.getItem(TASK_OUTCOMES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as TaskOutcomeMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const persistTaskOutcomes = (value: TaskOutcomeMap): void => {
  localStorage.setItem(TASK_OUTCOMES_STORAGE_KEY, JSON.stringify(value));
};

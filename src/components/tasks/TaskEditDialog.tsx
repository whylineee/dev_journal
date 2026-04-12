import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import type { TaskPriority, TaskRecurrence, TaskStatus } from "../../types";

interface TaskEditDialogProps {
  afterOutcome: string;
  beforeOutcome: string;
  busy: boolean;
  description: string;
  dueDate: string;
  editingTask: boolean;
  goalId: number | "";
  goals: Array<{ id: number; title: string }>;
  isDialogOpen: boolean;
  onAfterOutcomeChange: (value: string) => void;
  onBeforeOutcomeChange: (value: string) => void;
  onClose: () => void;
  onDescriptionChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onGoalIdChange: (value: number | "") => void;
  onPriorityChange: (value: TaskPriority) => void;
  onProjectIdChange: (value: number | "") => void;
  onRecurrenceChange: (value: TaskRecurrence) => void;
  onRecurrenceUntilChange: (value: string) => void;
  onSave: () => void;
  onStatusChange: (value: TaskStatus) => void;
  onTimeEstimateMinutesChange: (value: number) => void;
  onTitleChange: (value: string) => void;
  priority: TaskPriority;
  projectId: number | "";
  projects: Array<{ id: number; name: string }>;
  recurrence: TaskRecurrence;
  recurrenceUntil: string;
  status: TaskStatus;
  t: (key: string, variables?: Record<string, string | number>) => string;
  timeEstimateMinutes: number;
  title: string;
}

export const TaskEditDialog = ({
  afterOutcome,
  beforeOutcome,
  busy,
  description,
  dueDate,
  editingTask,
  goalId,
  goals,
  isDialogOpen,
  onAfterOutcomeChange,
  onBeforeOutcomeChange,
  onClose,
  onDescriptionChange,
  onDueDateChange,
  onGoalIdChange,
  onPriorityChange,
  onProjectIdChange,
  onRecurrenceChange,
  onRecurrenceUntilChange,
  onSave,
  onStatusChange,
  onTimeEstimateMinutesChange,
  onTitleChange,
  priority,
  projectId,
  projects,
  recurrence,
  recurrenceUntil,
  status,
  t,
  timeEstimateMinutes,
  title,
}: TaskEditDialogProps) => (
  <Dialog open={isDialogOpen} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>{editingTask ? t("Edit task") : t("Create task")}</DialogTitle>
    <DialogContent>
      <Stack spacing={2} sx={{ mt: 1 }}>
        <TextField label={t("Title")} value={title} onChange={(event) => onTitleChange(event.target.value)} autoFocus fullWidth />
        <TextField label={t("Description")} value={description} onChange={(event) => onDescriptionChange(event.target.value)} multiline minRows={3} fullWidth />

        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField select label={t("Status")} value={status} onChange={(event) => onStatusChange(event.target.value as TaskStatus)} SelectProps={{ native: true }} fullWidth>
            <option value="todo">{t("To Do")}</option>
            <option value="in_progress">{t("In Progress")}</option>
            <option value="done">{t("Done")}</option>
          </TextField>
          <TextField select label={t("Priority")} value={priority} onChange={(event) => onPriorityChange(event.target.value as TaskPriority)} SelectProps={{ native: true }} fullWidth>
            <option value="urgent">{t("Urgent")}</option>
            <option value="high">{t("High")}</option>
            <option value="medium">{t("Medium")}</option>
            <option value="low">{t("Low")}</option>
          </TextField>
        </Stack>

        <TextField
          select
          label={t("Project")}
          value={projectId === "" ? "" : String(projectId)}
          onChange={(event) => onProjectIdChange(event.target.value === "" ? "" : Number(event.target.value))}
          SelectProps={{ native: true }}
          InputLabelProps={{ shrink: true }}
          fullWidth
        >
          <option value="">{t("No project")}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </TextField>

        <TextField
          select
          label={t("Goal")}
          value={goalId === "" ? "" : String(goalId)}
          onChange={(event) => onGoalIdChange(event.target.value === "" ? "" : Number(event.target.value))}
          SelectProps={{ native: true }}
          InputLabelProps={{ shrink: true }}
          fullWidth
        >
          <option value="">{t("No goal")}</option>
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>
              {goal.title}
            </option>
          ))}
        </TextField>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField type="date" label={t("Due date")} value={dueDate} onChange={(event) => onDueDateChange(event.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField type="number" label={t("Time limit (minutes)")} value={timeEstimateMinutes} onChange={(event) => onTimeEstimateMinutesChange(Number(event.target.value))} inputProps={{ min: 0, max: 10080, step: 5 }} fullWidth />
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField select label={t("Repeat")} value={recurrence} onChange={(event) => onRecurrenceChange(event.target.value as TaskRecurrence)} SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} fullWidth>
            <option value="none">{t("Does not repeat")}</option>
            <option value="daily">{t("Daily")}</option>
            <option value="weekdays">{t("Weekdays")}</option>
            <option value="weekly">{t("Weekly")}</option>
          </TextField>
          <TextField type="date" label={t("Repeat until")} value={recurrenceUntil} onChange={(event) => onRecurrenceUntilChange(event.target.value)} InputLabelProps={{ shrink: true }} disabled={recurrence === "none"} fullWidth />
        </Stack>

        <TextField label={t("Before (planned outcome)")} value={beforeOutcome} onChange={(event) => onBeforeOutcomeChange(event.target.value)} multiline minRows={2} fullWidth />
        <TextField label={t("After (actual outcome)")} value={afterOutcome} onChange={(event) => onAfterOutcomeChange(event.target.value)} multiline minRows={2} fullWidth />
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>{t("Cancel")}</Button>
      <Button variant="contained" onClick={onSave} disabled={busy || title.trim().length === 0}>
        {editingTask ? t("Save") : t("Create")}
      </Button>
    </DialogActions>
  </Dialog>
);

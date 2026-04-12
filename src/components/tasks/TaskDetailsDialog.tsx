import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { Task, TaskPriority, TaskRecurrence, TaskStatus, TaskSubtask } from "../../types";

interface TaskDetailsDialogProps {
  activeTask: Task | null;
  activeTaskSubtasks: TaskSubtask[];
  busy: boolean;
  editingSubtaskId: number | null;
  editingSubtaskTitle: string;
  goalNameById: Map<number, string>;
  isOpen: boolean;
  newSubtaskTitle: string;
  onBeginSubtaskEdit: (subtask: TaskSubtask) => void;
  onCancelSubtaskEdit: () => void;
  onClose: () => void;
  onCreateSubtask: () => void;
  onDeleteSubtask: (subtaskId: number) => void;
  onEditSubtaskTitleChange: (value: string) => void;
  onEditTask: () => void;
  onNewSubtaskTitleChange: (value: string) => void;
  onSaveSubtaskEdit: (subtaskId: number) => void;
  onToggleSubtask: (subtaskId: number, completed: boolean) => void;
  outcome?: { before?: string; after?: string };
  priorityColor: Record<TaskPriority, "default" | "info" | "warning" | "error">;
  priorityLabel: Record<TaskPriority, string>;
  recurrenceLabel: Record<TaskRecurrence, string>;
  statusLabel: Record<TaskStatus, string>;
  t: (key: string, variables?: Record<string, string | number>) => string;
  formatTaskDateOnly: (value: string) => string;
}

export const TaskDetailsDialog = ({
  activeTask,
  activeTaskSubtasks,
  busy,
  editingSubtaskId,
  editingSubtaskTitle,
  goalNameById,
  isOpen,
  newSubtaskTitle,
  onBeginSubtaskEdit,
  onCancelSubtaskEdit,
  onClose,
  onCreateSubtask,
  onDeleteSubtask,
  onEditSubtaskTitleChange,
  onEditTask,
  onNewSubtaskTitleChange,
  onSaveSubtaskEdit,
  onToggleSubtask,
  outcome,
  priorityColor,
  priorityLabel,
  recurrenceLabel,
  statusLabel,
  t,
  formatTaskDateOnly,
}: TaskDetailsDialogProps) => (
  <Dialog open={isOpen && Boolean(activeTask)} onClose={onClose} fullWidth maxWidth="md">
    <DialogTitle>{t("Task card")}</DialogTitle>
    <DialogContent>
      {activeTask ? (
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between">
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {activeTask.title}
              </Typography>
              <Stack direction="row" spacing={0} sx={{ mt: 0.8, flexWrap: "wrap", gap: 0.75 }}>
                <Chip label={statusLabel[activeTask.status]} size="small" />
                <Chip label={priorityLabel[activeTask.priority]} size="small" color={priorityColor[activeTask.priority]} variant="outlined" />
                {activeTask.goal_id ? (
                  <Chip size="small" label={goalNameById.get(activeTask.goal_id) ?? `Goal #${activeTask.goal_id}`} color="success" variant="outlined" />
                ) : null}
                {activeTask.due_date ? <Chip size="small" label={t("Due: {date}", { date: formatTaskDateOnly(activeTask.due_date) })} variant="outlined" /> : null}
                {activeTask.recurrence !== "none" ? (
                  <Chip size="small" label={t("Repeats: {value}", { value: recurrenceLabel[activeTask.recurrence] })} color="secondary" variant="outlined" />
                ) : null}
              </Stack>
            </Box>

            <Button variant="outlined" onClick={onEditTask} disabled={busy}>
              {t("Edit task")}
            </Button>
          </Stack>

          {activeTask.description ? (
            <Typography variant="body2" color="text.secondary">
              {activeTask.description}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.disabled">
              {t("No description yet.")}
            </Typography>
          )}

          {outcome?.before ? (
            <Typography variant="body2" color="text.secondary">
              <strong>{t("Before:")}</strong> {outcome.before}
            </Typography>
          ) : null}
          {outcome?.after ? (
            <Typography variant="body2" color="text.secondary">
              <strong>{t("After:")}</strong> {outcome.after}
            </Typography>
          ) : null}

          <Divider />

          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Subtasks")}
            </Typography>
            <Chip size="small" label={`${activeTaskSubtasks.filter((subtask) => subtask.completed).length}/${activeTaskSubtasks.length} ${t("done")}`} color="info" variant="outlined" />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              value={newSubtaskTitle}
              onChange={(event) => onNewSubtaskTitleChange(event.target.value)}
              placeholder={t("New subtask")}
              fullWidth
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onCreateSubtask();
                }
              }}
            />
            <Button variant="contained" onClick={onCreateSubtask} disabled={busy || newSubtaskTitle.trim().length === 0}>
              {t("Add")}
            </Button>
          </Stack>

          <Stack spacing={1}>
            {activeTaskSubtasks.map((subtask) => (
              <Paper key={subtask.id} variant="outlined" sx={{ p: 1 }}>
                {editingSubtaskId === subtask.id ? (
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <TextField
                      value={editingSubtaskTitle}
                      onChange={(event) => onEditSubtaskTitleChange(event.target.value)}
                      fullWidth
                      size="small"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          onSaveSubtaskEdit(subtask.id);
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          onCancelSubtaskEdit();
                        }
                      }}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="contained" onClick={() => onSaveSubtaskEdit(subtask.id)} disabled={busy || editingSubtaskTitle.trim().length === 0}>
                        {t("Save")}
                      </Button>
                      <Button size="small" onClick={onCancelSubtaskEdit}>
                        {t("Cancel")}
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Checkbox size="small" checked={subtask.completed} onChange={(event) => onToggleSubtask(subtask.id, event.target.checked)} disabled={busy} />
                    <Typography
                      variant="body2"
                      sx={{
                        flex: 1,
                        textDecoration: subtask.completed ? "line-through" : "none",
                        color: subtask.completed ? "text.disabled" : "text.primary",
                      }}
                    >
                      {subtask.title}
                    </Typography>
                    <IconButton size="small" onClick={() => onBeginSubtaskEdit(subtask)} disabled={busy}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => onDeleteSubtask(subtask.id)} disabled={busy}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                )}
              </Paper>
            ))}
          </Stack>

          {activeTaskSubtasks.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("No subtasks yet.")}
            </Typography>
          ) : null}
        </Stack>
      ) : null}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>{t("Close")}</Button>
    </DialogActions>
  </Dialog>
);

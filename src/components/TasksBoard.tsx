import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddTaskIcon from "@mui/icons-material/AddTask";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchIcon from "@mui/icons-material/Search";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import TimerIcon from "@mui/icons-material/Timer";
import { format, isBefore, isToday, parseISO, startOfDay } from "date-fns";
import {
  useCreateTask,
  useDeleteTask,
  usePauseTaskTimer,
  useResetTaskTimer,
  useStartTaskTimer,
  useTasks,
  useUpdateTask,
  useUpdateTaskStatus,
} from "../hooks/useTasks";
import { Task, TaskPriority, TaskStatus } from "../types";

const columns: Array<{ status: TaskStatus; label: string; color: "default" | "warning" | "info" | "success" }> = [
  { status: "todo", label: "To Do", color: "warning" },
  { status: "in_progress", label: "In Progress", color: "info" },
  { status: "done", label: "Done", color: "success" },
];

const priorityOrder: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const priorityColor: Record<TaskPriority, "default" | "info" | "warning" | "error"> = {
  low: "default",
  medium: "info",
  high: "warning",
  urgent: "error",
};

const statusLabel: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const priorityLabel: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const formatDateTime = (value: string) => {
  try {
    return format(parseISO(value), "MMM d, HH:mm");
  } catch {
    return value;
  }
};

const formatDateOnly = (value: string) => {
  try {
    return format(parseISO(value), "MMM d");
  } catch {
    return value;
  }
};

const isTaskOverdue = (task: Task) => {
  if (!task.due_date || task.status === "done") {
    return false;
  }

  try {
    return isBefore(startOfDay(parseISO(task.due_date)), startOfDay(new Date()));
  } catch {
    return false;
  }
};

const parseRfc3339 = (value: string | null) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const getElapsedSeconds = (task: Task, nowMs: number) => {
  const startedAt = parseRfc3339(task.timer_started_at);
  const runningSeconds = startedAt ? Math.max(0, Math.floor((nowMs - startedAt.getTime()) / 1000)) : 0;
  return Math.max(0, task.timer_accumulated_seconds + runningSeconds);
};

const formatDuration = (totalSeconds: number) => {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const normalizeEstimateMinutes = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(10080, Math.round(value)));
};

const compareTasks = (a: Task, b: Task) => {
  const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  if (a.due_date && b.due_date) {
    const byDue = a.due_date.localeCompare(b.due_date);
    if (byDue !== 0) {
      return byDue;
    }
  } else if (a.due_date && !b.due_date) {
    return -1;
  } else if (!a.due_date && b.due_date) {
    return 1;
  }

  return b.updated_at.localeCompare(a.updated_at);
};

export const TasksBoard = () => {
  const { data: tasks = [], isLoading } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateStatus = useUpdateTaskStatus();
  const startTimer = useStartTaskTimer();
  const pauseTimer = usePauseTaskTimer();
  const resetTimer = useResetTaskTimer();
  const deleteTask = useDeleteTask();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>("all");
  const [showOverdueOnly, setShowOverdueOnly] = useState(() => localStorage.getItem("devJournal_tasks_overdue_only") === "true");
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [timeEstimateMinutes, setTimeEstimateMinutes] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const busy =
    createTask.isPending ||
    updateTask.isPending ||
    updateStatus.isPending ||
    startTimer.isPending ||
    pauseTimer.isPending ||
    resetTimer.isPending ||
    deleteTask.isPending;

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem("devJournal_tasks_overdue_only", String(showOverdueOnly));
  }, [showOverdueOnly]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ overdueOnly?: boolean }>;
      setShowOverdueOnly(Boolean(customEvent.detail?.overdueOnly));
    };

    window.addEventListener("devJournal:tasksFilter", handler);
    return () => window.removeEventListener("devJournal:tasksFilter", handler);
  }, []);

  const stats = useMemo(() => {
    const overdue = tasks.filter((task) => isTaskOverdue(task)).length;
    const dueToday = tasks.filter((task) => {
      if (!task.due_date || task.status === "done") {
        return false;
      }

      try {
        return isToday(parseISO(task.due_date));
      } catch {
        return false;
      }
    }).length;

    const done = tasks.filter((task) => task.status === "done").length;
    const activeTimers = tasks.filter((task) => Boolean(task.timer_started_at)).length;

    return { overdue, dueToday, done, total: tasks.length, activeTimers };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();

    return tasks
      .filter((task) => {
        if (statusFilter !== "all" && task.status !== statusFilter) {
          return false;
        }

        if (priorityFilter !== "all" && task.priority !== priorityFilter) {
          return false;
        }

        if (showOverdueOnly && !isTaskOverdue(task)) {
          return false;
        }

        if (!q) {
          return true;
        }

        return (
          task.title.toLowerCase().includes(q) ||
          task.description.toLowerCase().includes(q)
        );
      })
      .sort(compareTasks);
  }, [tasks, query, statusFilter, priorityFilter, showOverdueOnly]);

  const grouped = useMemo(() => {
    return {
      todo: filteredTasks.filter((task) => task.status === "todo"),
      in_progress: filteredTasks.filter((task) => task.status === "in_progress"),
      done: filteredTasks.filter((task) => task.status === "done"),
    };
  }, [filteredTasks]);

  const openCreateDialog = () => {
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setStatus("todo");
    setPriority("medium");
    setDueDate("");
    setTimeEstimateMinutes(0);
    setDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
    setPriority(task.priority);
    setDueDate(task.due_date ?? "");
    setTimeEstimateMinutes(task.time_estimate_minutes);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      return;
    }

    const normalizedTimeEstimate = normalizeEstimateMinutes(timeEstimateMinutes);

    if (editingTask) {
      updateTask.mutate({
        id: editingTask.id,
        title: cleanTitle,
        description: description.trim(),
        status,
        priority,
        due_date: dueDate || null,
        time_estimate_minutes: normalizedTimeEstimate,
      });
    } else {
      createTask.mutate({
        title: cleanTitle,
        description: description.trim(),
        status,
        priority,
        due_date: dueDate || null,
        time_estimate_minutes: normalizedTimeEstimate,
      });
    }

    setDialogOpen(false);
  };

  const handleDelete = (taskId: number) => {
    deleteTask.mutate(taskId);
  };

  const moveToStatus = (task: Task, nextStatus: TaskStatus) => {
    if (task.status === nextStatus) {
      return;
    }
    updateStatus.mutate({ id: task.id, status: nextStatus });
  };

  const toggleDone = (task: Task, checked: boolean) => {
    updateStatus.mutate({ id: task.id, status: checked ? "done" : "todo" });
  };

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto", mt: 1 }}>
      <Paper sx={{ p: 3 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Tasks Board
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Prioritize, track deadlines, and keep delivery predictable.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddTaskIcon />}
            onClick={openCreateDialog}
            disabled={busy}
          >
            New Task
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
          <Chip label={`Total: ${stats.total}`} variant="outlined" size="small" />
          <Chip label={`Done: ${stats.done}`} color="success" variant="outlined" size="small" />
          <Chip label={`Due today: ${stats.dueToday}`} color="info" variant="outlined" size="small" />
          <Chip label={`Overdue: ${stats.overdue}`} color={stats.overdue > 0 ? "error" : "default"} variant="outlined" size="small" />
          <Chip label={`Active timers: ${stats.activeTimers}`} color={stats.activeTimers > 0 ? "warning" : "default"} variant="outlined" size="small" />
        </Stack>

        <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ mt: 2 }}>
          <TextField
            placeholder="Search tasks"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            select
            label="Status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | TaskStatus)}
            sx={{ minWidth: 170 }}
            SelectProps={{ native: true }}
          >
            <option value="all">All statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </TextField>

          <TextField
            select
            label="Priority"
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value as "all" | TaskPriority)}
            sx={{ minWidth: 170 }}
            SelectProps={{ native: true }}
          >
            <option value="all">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </TextField>

          <Button
            variant={showOverdueOnly ? "contained" : "outlined"}
            color={showOverdueOnly ? "error" : "inherit"}
            onClick={() => setShowOverdueOnly((prev) => !prev)}
            startIcon={<WarningAmberIcon />}
          >
            Overdue Only
          </Button>
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ mt: 2 }}>
        {columns.map((column) => (
          <Paper key={column.status} sx={{ p: 2, flex: 1, minHeight: 340 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {column.label}
              </Typography>
              <Chip
                label={grouped[column.status].length}
                size="small"
                color={column.color}
                variant="outlined"
              />
            </Stack>

            <Stack spacing={1.5}>
              {grouped[column.status].map((task) => {
                const overdue = isTaskOverdue(task);
                const isRunning = Boolean(task.timer_started_at);
                const elapsedSeconds = getElapsedSeconds(task, nowMs);
                const estimatedSeconds = task.time_estimate_minutes * 60;
                const remainingSeconds = estimatedSeconds - elapsedSeconds;

                return (
                  <Paper
                    key={task.id}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderColor: overdue ? "error.main" : "rgba(255,255,255,0.1)",
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Checkbox
                            size="small"
                            checked={task.status === "done"}
                            onChange={(event) => toggleDone(task, event.target.checked)}
                            disabled={busy}
                          />
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 700,
                              textDecoration: task.status === "done" ? "line-through" : "none",
                            }}
                            noWrap
                          >
                            {task.title}
                          </Typography>
                        </Stack>

                        {task.description ? (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {task.description}
                          </Typography>
                        ) : null}

                        <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: "wrap", gap: 0.75 }}>
                          <Chip
                            size="small"
                            label={priorityLabel[task.priority]}
                            color={priorityColor[task.priority]}
                            variant="outlined"
                          />
                          {task.due_date ? (
                            <Chip
                              size="small"
                              label={overdue ? `Overdue: ${formatDateOnly(task.due_date)}` : `Due: ${formatDateOnly(task.due_date)}`}
                              color={overdue ? "error" : "default"}
                              variant="outlined"
                            />
                          ) : null}
                          <Chip
                            size="small"
                            icon={<TimerIcon fontSize="small" />}
                            label={`Spent: ${formatDuration(elapsedSeconds)}`}
                            color={isRunning ? "warning" : "default"}
                            variant="outlined"
                          />
                          {task.time_estimate_minutes > 0 ? (
                            <>
                              <Chip
                                size="small"
                                label={`Target: ${task.time_estimate_minutes}m`}
                                variant="outlined"
                              />
                              <Chip
                                size="small"
                                label={remainingSeconds >= 0 ? `Left: ${formatDuration(remainingSeconds)}` : `Over: ${formatDuration(Math.abs(remainingSeconds))}`}
                                color={remainingSeconds < 0 ? "error" : "success"}
                                variant="outlined"
                              />
                            </>
                          ) : null}
                        </Stack>

                        <Stack direction="row" spacing={0.75} sx={{ mt: 1.2, flexWrap: "wrap", gap: 0.75 }}>
                          <Tooltip title={isRunning ? "Pause timer" : "Start timer"}>
                            <span>
                              <IconButton
                                size="small"
                                color={isRunning ? "warning" : "primary"}
                                onClick={() => (isRunning ? pauseTimer.mutate(task.id) : startTimer.mutate(task.id))}
                                disabled={busy || task.status === "done"}
                              >
                                {isRunning ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Reset timer">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => resetTimer.mutate(task.id)}
                                disabled={busy || elapsedSeconds === 0}
                              >
                                <RestartAltIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>

                        <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 1 }}>
                          Updated: {formatDateTime(task.updated_at)}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" onClick={() => openEditDialog(task)} disabled={busy}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(task.id)}
                          disabled={busy}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>

                    <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: "wrap" }}>
                      {columns.map((nextColumn) => (
                        <Chip
                          key={nextColumn.status}
                          label={statusLabel[nextColumn.status]}
                          size="small"
                          color={task.status === nextColumn.status ? nextColumn.color : "default"}
                          variant={task.status === nextColumn.status ? "filled" : "outlined"}
                          onClick={() => moveToStatus(task, nextColumn.status)}
                          clickable
                        />
                      ))}
                    </Stack>
                  </Paper>
                );
              })}

              {!isLoading && grouped[column.status].length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                  No tasks in this column.
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        ))}
      </Stack>

      <Dialog open={isDialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingTask ? "Edit task" : "Create task"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
              fullWidth
            />

            <TextField
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              multiline
              minRows={3}
              fullWidth
            />

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                select
                label="Status"
                value={status}
                onChange={(event) => setStatus(event.target.value as TaskStatus)}
                SelectProps={{ native: true }}
                fullWidth
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </TextField>

              <TextField
                select
                label="Priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as TaskPriority)}
                SelectProps={{ native: true }}
                fullWidth
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </TextField>
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                type="date"
                label="Due date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />

              <TextField
                type="number"
                label="Time limit (minutes)"
                value={timeEstimateMinutes}
                onChange={(event) => setTimeEstimateMinutes(normalizeEstimateMinutes(Number(event.target.value)))}
                inputProps={{ min: 0, max: 10080, step: 5 }}
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={busy || title.trim().length === 0}
          >
            {editingTask ? "Save" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
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
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SearchIcon from "@mui/icons-material/Search";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import TimerIcon from "@mui/icons-material/Timer";
import {
  useCreateTaskSubtask,
  useCreateTask,
  useDeleteTaskSubtask,
  useDeleteTask,
  usePauseTaskTimer,
  useResetTaskTimer,
  useStartTaskTimer,
  useTaskSubtasks,
  useUpdateTaskSubtask,
  useTasks,
  useUpdateTask,
  useUpdateTaskStatus,
} from "../hooks/useTasks";
import { useProjects } from "../hooks/useProjects";
import { Task, TaskPriority, TaskStatus, TaskSubtask } from "../types";
import {
  compareTasks,
  formatDuration,
  formatTaskDateOnly,
  formatTaskDateTime,
  getTaskElapsedSeconds,
  isTaskDueToday,
  isTaskOverdue,
  normalizeEstimateMinutes,
} from "../utils/taskUtils";
import { useI18n } from "../i18n/I18nContext";
import { useAppNotifications } from "../notifications/AppNotifications";

const columns: Array<{ status: TaskStatus; label: string; color: "default" | "warning" | "info" | "success" }> = [
  { status: "todo", label: "To Do", color: "warning" },
  { status: "in_progress", label: "In Progress", color: "info" },
  { status: "done", label: "Done", color: "success" },
];

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

const TASK_OUTCOMES_STORAGE_KEY = "devJournal_task_outcomes";

type TaskOutcomeMap = Record<string, { before: string; after: string }>;

const readTaskOutcomes = (): TaskOutcomeMap => {
  try {
    const raw = localStorage.getItem(TASK_OUTCOMES_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as TaskOutcomeMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const persistTaskOutcomes = (value: TaskOutcomeMap) => {
  localStorage.setItem(TASK_OUTCOMES_STORAGE_KEY, JSON.stringify(value));
};

export const TasksBoard = () => {
  const { t } = useI18n();
  const { notify } = useAppNotifications();
  // `nowMs` is updated every second to render live timer values without round-trips.
  const { data: tasks = [], isLoading } = useTasks();
  const { data: projects = [] } = useProjects();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateStatus = useUpdateTaskStatus();
  const startTimer = useStartTaskTimer();
  const pauseTimer = usePauseTaskTimer();
  const resetTimer = useResetTaskTimer();
  const deleteTask = useDeleteTask();
  const createTaskSubtask = useCreateTaskSubtask();
  const updateTaskSubtask = useUpdateTaskSubtask();
  const deleteTaskSubtask = useDeleteTaskSubtask();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>("all");
  const [projectFilter, setProjectFilter] = useState<"all" | number>("all");
  const [showOverdueOnly, setShowOverdueOnly] = useState(() => localStorage.getItem("devJournal_tasks_overdue_only") === "true");
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [isTaskDetailsOpen, setTaskDetailsOpen] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<number | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [projectId, setProjectId] = useState<number | "">("");
  const [dueDate, setDueDate] = useState("");
  const [timeEstimateMinutes, setTimeEstimateMinutes] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [beforeOutcome, setBeforeOutcome] = useState("");
  const [afterOutcome, setAfterOutcome] = useState("");
  const [taskOutcomes, setTaskOutcomes] = useState<TaskOutcomeMap>(() => readTaskOutcomes());
  const activeTask = useMemo(() => tasks.find((task) => task.id === activeTaskId) ?? null, [tasks, activeTaskId]);
  const { data: activeTaskSubtasks = [] } = useTaskSubtasks(
    activeTaskId,
    isTaskDetailsOpen && activeTaskId !== null
  );

  const busy =
    createTask.isPending ||
    updateTask.isPending ||
    updateStatus.isPending ||
    startTimer.isPending ||
    pauseTimer.isPending ||
    resetTimer.isPending ||
    deleteTask.isPending ||
    createTaskSubtask.isPending ||
    updateTaskSubtask.isPending ||
    deleteTaskSubtask.isPending;

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

  useEffect(() => {
    if (!isTaskDetailsOpen || activeTaskId === null) {
      return;
    }

    if (!activeTask) {
      setTaskDetailsOpen(false);
      setActiveTaskId(null);
      setEditingSubtaskId(null);
      setEditingSubtaskTitle("");
      setNewSubtaskTitle("");
    }
  }, [isTaskDetailsOpen, activeTaskId, activeTask]);

  const stats = useMemo(() => {
    const overdue = tasks.filter((task) => isTaskOverdue(task)).length;
    const dueToday = tasks.filter((task) => isTaskDueToday(task)).length;

    const done = tasks.filter((task) => task.status === "done").length;
    const activeTimers = tasks.filter((task) => Boolean(task.timer_started_at)).length;

    return { overdue, dueToday, done, total: tasks.length, activeTimers };
  }, [tasks]);

  const projectNameById = useMemo(() => {
    const map = new Map<number, string>();
    projects.forEach((project) => map.set(project.id, project.name));
    return map;
  }, [projects]);

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

        if (projectFilter !== "all" && task.project_id !== projectFilter) {
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
  }, [tasks, query, statusFilter, priorityFilter, projectFilter, showOverdueOnly]);

  const grouped = useMemo(() => {
    return {
      todo: filteredTasks.filter((task) => task.status === "todo"),
      in_progress: filteredTasks.filter((task) => task.status === "in_progress"),
      done: filteredTasks.filter((task) => task.status === "done"),
    };
  }, [filteredTasks]);

  const openCreateDialog = (initialStatus: TaskStatus = "todo") => {
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setStatus(initialStatus);
    setPriority("medium");
    setProjectId("");
    setDueDate("");
    setTimeEstimateMinutes(0);
    setBeforeOutcome("");
    setAfterOutcome("");
    setDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
    setPriority(task.priority);
    setProjectId(task.project_id ?? "");
    setDueDate(task.due_date ?? "");
    setTimeEstimateMinutes(task.time_estimate_minutes);
    const outcome = taskOutcomes[String(task.id)];
    setBeforeOutcome(outcome?.before ?? "");
    setAfterOutcome(outcome?.after ?? "");
    setDialogOpen(true);
  };

  const openTaskDetails = (task: Task) => {
    setActiveTaskId(task.id);
    setTaskDetailsOpen(true);
    setNewSubtaskTitle("");
    setEditingSubtaskId(null);
    setEditingSubtaskTitle("");
  };

  const closeTaskDetails = () => {
    setTaskDetailsOpen(false);
    setEditingSubtaskId(null);
    setEditingSubtaskTitle("");
    setNewSubtaskTitle("");
  };

  const saveTaskOutcome = (taskId: number) => {
    const key = String(taskId);
    const nextBefore = beforeOutcome.trim();
    const nextAfter = afterOutcome.trim();
    const updated = { ...taskOutcomes };

    if (!nextBefore && !nextAfter) {
      delete updated[key];
    } else {
      updated[key] = { before: nextBefore, after: nextAfter };
    }

    setTaskOutcomes(updated);
    persistTaskOutcomes(updated);
  };

  const handleSave = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      return;
    }

    const normalizedTimeEstimate = normalizeEstimateMinutes(timeEstimateMinutes);

    if (editingTask) {
      updateTask.mutate(
        {
          id: editingTask.id,
          title: cleanTitle,
          description: description.trim(),
          status,
          priority,
          project_id: projectId === "" ? null : projectId,
          due_date: dueDate || null,
          time_estimate_minutes: normalizedTimeEstimate,
        },
        {
          onSuccess: () => {
            saveTaskOutcome(editingTask.id);
            notify("Task updated.", "success");
          },
        }
      );
    } else {
      createTask.mutate(
        {
          title: cleanTitle,
          description: description.trim(),
          status,
          priority,
          project_id: projectId === "" ? null : projectId,
          due_date: dueDate || null,
          time_estimate_minutes: normalizedTimeEstimate,
        },
        {
          onSuccess: (createdTask) => {
            saveTaskOutcome(createdTask.id);
            notify("Task created.", "success");
          },
        }
      );
    }

    setDialogOpen(false);
  };

  const handleDelete = (taskId: number) => {
    deleteTask.mutate(taskId);
    notify("Task deleted.", "info");
    if (taskOutcomes[String(taskId)]) {
      const updated = { ...taskOutcomes };
      delete updated[String(taskId)];
      setTaskOutcomes(updated);
      persistTaskOutcomes(updated);
    }
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

  const openEditFromTaskDetails = () => {
    if (!activeTask) {
      return;
    }
    closeTaskDetails();
    openEditDialog(activeTask);
  };

  const handleCreateSubtask = () => {
    if (!activeTaskId) {
      return;
    }

    const cleanTitle = newSubtaskTitle.trim();
    if (!cleanTitle) {
      return;
    }

    createTaskSubtask.mutate(
      { task_id: activeTaskId, title: cleanTitle },
      {
        onSuccess: () => {
          setNewSubtaskTitle("");
          notify("Subtask created.", "success");
        },
      }
    );
  };

  const handleToggleSubtask = (subtaskId: number, completed: boolean) => {
    updateTaskSubtask.mutate({ id: subtaskId, completed });
  };

  const beginSubtaskEdit = (subtask: TaskSubtask) => {
    setEditingSubtaskId(subtask.id);
    setEditingSubtaskTitle(subtask.title);
  };

  const cancelSubtaskEdit = () => {
    setEditingSubtaskId(null);
    setEditingSubtaskTitle("");
  };

  const saveSubtaskEdit = (subtaskId: number) => {
    const cleanTitle = editingSubtaskTitle.trim();
    if (!cleanTitle) {
      return;
    }

    updateTaskSubtask.mutate(
      { id: subtaskId, title: cleanTitle },
      {
        onSuccess: () => {
          cancelSubtaskEdit();
          notify("Subtask updated.", "success");
        },
      }
    );
  };

  const handleDeleteSubtask = (subtaskId: number) => {
    deleteTaskSubtask.mutate(
      subtaskId,
      {
        onSuccess: () => notify("Subtask deleted.", "info"),
      }
    );
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
              {t("Tasks Board")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("Switch to tasks management view")}
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddTaskIcon />}
            onClick={() => openCreateDialog()}
            disabled={busy}
          >
            {t("Add Task")}
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
          <Chip label={`Total: ${stats.total}`} variant="outlined" size="small" />
          <Chip label={`Done: ${stats.done}`} color="success" variant="outlined" size="small" />
          <Chip label={`${t("Due today")}: ${stats.dueToday}`} color="info" variant="outlined" size="small" />
          <Chip label={`Overdue: ${stats.overdue}`} color={stats.overdue > 0 ? "error" : "default"} variant="outlined" size="small" />
          <Chip label={`Active timers: ${stats.activeTimers}`} color={stats.activeTimers > 0 ? "warning" : "default"} variant="outlined" size="small" />
        </Stack>

        <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ mt: 2 }}>
          <TextField
            placeholder={t("Search...")}
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
            label={t("Status")}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | TaskStatus)}
            sx={{ minWidth: 170 }}
            SelectProps={{ native: true }}
          >
            <option value="all">{t("All statuses")}</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </TextField>

          <TextField
            select
            label={t("Priority")}
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value as "all" | TaskPriority)}
            sx={{ minWidth: 170 }}
            SelectProps={{ native: true }}
          >
            <option value="all">{t("All priorities")}</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </TextField>

          <TextField
            select
            label={t("Project")}
            value={projectFilter === "all" ? "all" : String(projectFilter)}
            onChange={(event) => {
              const value = event.target.value;
              setProjectFilter(value === "all" ? "all" : Number(value));
            }}
            sx={{ minWidth: 190 }}
            SelectProps={{ native: true }}
          >
            <option value="all">{t("All projects")}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </TextField>

          <Button
            variant={showOverdueOnly ? "contained" : "outlined"}
            color={showOverdueOnly ? "error" : "inherit"}
            onClick={() => setShowOverdueOnly((prev) => !prev)}
            startIcon={<WarningAmberIcon />}
          >
            {t("Overdue Only")}
          </Button>
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ mt: 2 }}>
        {columns.map((column) => (
          <Paper key={column.status} sx={{ p: 2, flex: 1, minHeight: 340 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
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

              <Button
                size="small"
                variant="text"
                onClick={() => openCreateDialog(column.status)}
                disabled={busy}
              >
                + {t("Add Task")}
              </Button>
            </Stack>

            <Stack spacing={1.5}>
              {grouped[column.status].map((task) => {
                const overdue = isTaskOverdue(task);
                const isRunning = Boolean(task.timer_started_at);
                const elapsedSeconds = getTaskElapsedSeconds(task, nowMs);
                const estimatedSeconds = task.time_estimate_minutes * 60;
                const remainingSeconds = estimatedSeconds - elapsedSeconds;
                const outcome = taskOutcomes[String(task.id)];

                return (
                  <Paper
                    key={task.id}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderColor: overdue ? "error.main" : "divider",
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
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
                              cursor: "pointer",
                            }}
                            onClick={() => openTaskDetails(task)}
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
                        {outcome?.before ? (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                            <strong>Before:</strong> {outcome.before}
                          </Typography>
                        ) : null}
                        {outcome?.after ? (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            <strong>After:</strong> {outcome.after}
                          </Typography>
                        ) : null}

                        <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: "wrap", gap: 0.75 }}>
                          <Chip
                            size="small"
                            label={priorityLabel[task.priority]}
                            color={priorityColor[task.priority]}
                            variant="outlined"
                          />
                          {task.project_id ? (
                            <Chip
                              size="small"
                              label={projectNameById.get(task.project_id) ?? `#${task.project_id}`}
                              color="info"
                              variant="outlined"
                            />
                          ) : null}
                          {task.due_date ? (
                            <Chip
                              size="small"
                              label={
                                overdue
                                  ? `Overdue: ${formatTaskDateOnly(task.due_date)}`
                                  : `Due: ${formatTaskDateOnly(task.due_date)}`
                              }
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
                          Updated: {formatTaskDateTime(task.updated_at)}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Open card">
                          <span>
                            <IconButton size="small" onClick={() => openTaskDetails(task)} disabled={busy}>
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
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

      <Dialog
        open={isTaskDetailsOpen && Boolean(activeTask)}
        onClose={closeTaskDetails}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{t("Task card")}</DialogTitle>
        <DialogContent>
          {activeTask ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                alignItems={{ xs: "flex-start", md: "center" }}
                justifyContent="space-between"
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {activeTask.title}
                  </Typography>
                  <Stack direction="row" spacing={0.75} sx={{ mt: 0.8, flexWrap: "wrap", gap: 0.75 }}>
                    <Chip label={statusLabel[activeTask.status]} size="small" />
                    <Chip
                      label={priorityLabel[activeTask.priority]}
                      size="small"
                      color={priorityColor[activeTask.priority]}
                      variant="outlined"
                    />
                    {activeTask.due_date ? (
                      <Chip size="small" label={`Due: ${formatTaskDateOnly(activeTask.due_date)}`} variant="outlined" />
                    ) : null}
                  </Stack>
                </Box>

                <Button variant="outlined" onClick={openEditFromTaskDetails} disabled={busy}>
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

              {taskOutcomes[String(activeTask.id)]?.before ? (
                <Typography variant="body2" color="text.secondary">
                  <strong>Before:</strong> {taskOutcomes[String(activeTask.id)]?.before}
                </Typography>
              ) : null}
              {taskOutcomes[String(activeTask.id)]?.after ? (
                <Typography variant="body2" color="text.secondary">
                  <strong>After:</strong> {taskOutcomes[String(activeTask.id)]?.after}
                </Typography>
              ) : null}

              <Divider />

              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {t("Subtasks")}
                </Typography>
                <Chip
                  size="small"
                  label={`${activeTaskSubtasks.filter((subtask) => subtask.completed).length}/${activeTaskSubtasks.length} ${t("done")}`}
                  color="info"
                  variant="outlined"
                />
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField
                  value={newSubtaskTitle}
                  onChange={(event) => setNewSubtaskTitle(event.target.value)}
                  placeholder={t("New subtask")}
                  fullWidth
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleCreateSubtask();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleCreateSubtask}
                  disabled={busy || newSubtaskTitle.trim().length === 0}
                >
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
                          onChange={(event) => setEditingSubtaskTitle(event.target.value)}
                          fullWidth
                          size="small"
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              saveSubtaskEdit(subtask.id);
                            }
                            if (event.key === "Escape") {
                              event.preventDefault();
                              cancelSubtaskEdit();
                            }
                          }}
                        />
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => saveSubtaskEdit(subtask.id)}
                            disabled={busy || editingSubtaskTitle.trim().length === 0}
                          >
                            {t("Save")}
                          </Button>
                          <Button size="small" onClick={cancelSubtaskEdit}>
                            {t("Cancel")}
                          </Button>
                        </Stack>
                      </Stack>
                    ) : (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Checkbox
                          size="small"
                          checked={subtask.completed}
                          onChange={(event) => handleToggleSubtask(subtask.id, event.target.checked)}
                          disabled={busy}
                        />
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
                        <IconButton size="small" onClick={() => beginSubtaskEdit(subtask)} disabled={busy}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteSubtask(subtask.id)}
                          disabled={busy}
                        >
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
          <Button onClick={closeTaskDetails}>{t("Close")}</Button>
        </DialogActions>
      </Dialog>

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

            <TextField
              select
              label={t("Project")}
              value={projectId === "" ? "" : String(projectId)}
              onChange={(event) => {
                const nextValue = event.target.value;
                setProjectId(nextValue === "" ? "" : Number(nextValue));
              }}
              SelectProps={{ native: true }}
              fullWidth
            >
              <option value="">{t("No project")}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </TextField>

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

            <TextField
              label="Before (planned outcome)"
              value={beforeOutcome}
              onChange={(event) => setBeforeOutcome(event.target.value)}
              multiline
              minRows={2}
              fullWidth
            />

            <TextField
              label="After (actual outcome)"
              value={afterOutcome}
              onChange={(event) => setAfterOutcome(event.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
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

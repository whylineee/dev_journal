import { ReactNode, useEffect, useMemo, useState } from "react";
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
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import { alpha, useTheme } from "@mui/material/styles";
import {
  closestCorners,
  DndContext,
  DragCancelEvent,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
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
import { useGoals } from "../hooks/useGoals";
import { Task, TaskPriority, TaskRecurrence, TaskStatus, TaskSubtask } from "../types";
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

const columns: Array<{ status: TaskStatus; color: "default" | "warning" | "info" | "success" }> = [
  { status: "todo", color: "default" },
  { status: "in_progress", color: "default" },
  { status: "done", color: "default" },
];

const priorityColor: Record<TaskPriority, "default" | "info" | "warning" | "error"> = {
  low: "default",
  medium: "default",
  high: "warning",
  urgent: "error",
};

const statusLabelKey: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const priorityLabelKey: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const recurrenceLabelKey: Record<TaskRecurrence, string> = {
  none: "Does not repeat",
  daily: "Daily",
  weekdays: "Weekdays",
  weekly: "Weekly",
};

const TASK_OUTCOMES_STORAGE_KEY = "devJournal_task_outcomes";

type TaskOutcomeMap = Record<string, { before: string; after: string }>;
type GanttEntry = {
  task: Task;
  start: Date;
  end: Date;
  offsetDays: number;
  durationDays: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (value: string) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const diffDays = (from: Date, to: Date) => {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
};

const formatDayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDraggedTaskId = (id: string | number): number | null => {
  if (typeof id === "number") {
    return Number.isFinite(id) ? id : null;
  }
  if (id.startsWith("task-")) {
    const parsed = Number(id.slice(5));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

interface DroppableColumnProps {
  status: TaskStatus;
  children: ReactNode;
}

const DroppableColumn = ({ status, children }: DroppableColumnProps) => {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <Paper
      ref={setNodeRef}
      variant="outlined"
      sx={{
        p: 2,
        flex: 1,
        minHeight: 340,
        borderRadius: 2.5,
        borderStyle: isOver ? "dashed" : "solid",
        borderColor: (theme) =>
          isOver
            ? theme.palette.primary.main
            : theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.07)"
              : "rgba(0,0,0,0.07)",
        transition: "all 0.2s ease",
        backgroundColor: (theme) =>
          isOver
            ? theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.01)"
            : "transparent",
        boxShadow: "none",
      }}
    >
      {children}
    </Paper>
  );
};

interface DraggableTaskCardProps {
  taskId: number;
  disabled: boolean;
  children: ReactNode;
}

const DraggableTaskCard = ({ taskId, disabled, children }: DraggableTaskCardProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${taskId}`,
    disabled,
  });

  const styleTransform = transform
    ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
    : undefined;

  return (
    <Box
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      sx={{
        transform: styleTransform,
        zIndex: isDragging ? 2 : "auto",
        position: "relative",
        touchAction: "none",
        cursor: disabled ? "default" : "grab",
      }}
    >
      {children}
    </Box>
  );
};

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
  const muiTheme = useTheme();
  const { t } = useI18n();
  const { notify } = useAppNotifications();
  const statusLabel: Record<TaskStatus, string> = useMemo(
    () => ({
      todo: t(statusLabelKey.todo),
      in_progress: t(statusLabelKey.in_progress),
      done: t(statusLabelKey.done),
    }),
    [t]
  );
  const priorityLabel: Record<TaskPriority, string> = useMemo(
    () => ({
      low: t(priorityLabelKey.low),
      medium: t(priorityLabelKey.medium),
      high: t(priorityLabelKey.high),
      urgent: t(priorityLabelKey.urgent),
    }),
    [t]
  );
  const recurrenceLabel: Record<TaskRecurrence, string> = useMemo(
    () => ({
      none: t(recurrenceLabelKey.none),
      daily: t(recurrenceLabelKey.daily),
      weekdays: t(recurrenceLabelKey.weekdays),
      weekly: t(recurrenceLabelKey.weekly),
    }),
    [t]
  );
  // `nowMs` is updated every second to render live timer values without round-trips.
  const { data: tasks = [], isLoading } = useTasks();
  const { data: projects = [] } = useProjects();
  const { data: goals = [] } = useGoals();
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
  const [goalId, setGoalId] = useState<number | "">("");
  const [dueDate, setDueDate] = useState("");
  const [recurrence, setRecurrence] = useState<TaskRecurrence>("none");
  const [recurrenceUntil, setRecurrenceUntil] = useState("");
  const [timeEstimateMinutes, setTimeEstimateMinutes] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [beforeOutcome, setBeforeOutcome] = useState("");
  const [afterOutcome, setAfterOutcome] = useState("");
  const [taskOutcomes, setTaskOutcomes] = useState<TaskOutcomeMap>(() => readTaskOutcomes());
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
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

  const dndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );
  const isDark = muiTheme.palette.mode === "dark";
  const boardSurfaceSx = {
    border: "1px solid",
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
    backgroundColor: isDark ? "rgba(255,255,255,0.024)" : "rgba(255,255,255,0.78)",
    backdropFilter: "blur(22px)",
    WebkitBackdropFilter: "blur(22px)",
    boxShadow: isDark ? "0 18px 44px rgba(0,0,0,0.24)" : "0 16px 34px rgba(0,0,0,0.06)",
  };

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

  const goalNameById = useMemo(() => {
    const map = new Map<number, string>();
    goals.forEach((goal) => map.set(goal.id, goal.title));
    return map;
  }, [goals]);

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

  const gantt = useMemo(() => {
    const source = tasks
      .filter((task) => Boolean(task.due_date))
      .map((task) => {
        const dueDate = startOfDay(task.due_date!);
        const createdDate = startOfDay(task.created_at);
        const estimateDays = Math.max(1, Math.ceil(task.time_estimate_minutes / (8 * 60)));
        const plannedStart = new Date(dueDate);
        plannedStart.setDate(plannedStart.getDate() - estimateDays + 1);
        const startDate = plannedStart < createdDate ? createdDate : plannedStart;
        return {
          task,
          start: startDate,
          end: dueDate,
        };
      })
      .filter((entry) => entry.start <= entry.end)
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    if (source.length === 0) {
      return {
        entries: [] as GanttEntry[],
        rangeStart: null as Date | null,
        rangeEnd: null as Date | null,
        totalDays: 0,
      };
    }

    const rangeStart = source.reduce((min, entry) => (entry.start < min ? entry.start : min), source[0].start);
    const rangeEnd = source.reduce((max, entry) => (entry.end > max ? entry.end : max), source[0].end);
    const totalDays = Math.max(1, diffDays(rangeStart, rangeEnd) + 1);
    const entries: GanttEntry[] = source.map((entry) => {
      const offsetDays = Math.max(0, diffDays(rangeStart, entry.start));
      const durationDays = Math.max(1, diffDays(entry.start, entry.end) + 1);
      return { ...entry, offsetDays, durationDays };
    });

    return { entries, rangeStart, rangeEnd, totalDays };
  }, [tasks]);

  const openCreateDialog = (initialStatus: TaskStatus = "todo") => {
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setStatus(initialStatus);
    setPriority("medium");
    setProjectId("");
    setGoalId("");
    setDueDate("");
    setRecurrence("none");
    setRecurrenceUntil("");
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
    setGoalId(task.goal_id ?? "");
    setDueDate(task.due_date ?? "");
    setRecurrence(task.recurrence);
    setRecurrenceUntil(task.recurrence_until ?? "");
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
      notify(t("Task title is required."), "warning");
      return;
    }
    if (recurrence !== "none" && !dueDate) {
      notify(t("Recurring tasks require a due date."), "warning");
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
          goal_id: goalId === "" ? null : goalId,
          due_date: dueDate || null,
          recurrence,
          recurrence_until: recurrence === "none" ? null : recurrenceUntil || null,
          time_estimate_minutes: normalizedTimeEstimate,
        },
        {
          onSuccess: () => {
            saveTaskOutcome(editingTask.id);
            notify(t("Task updated."), "success");
            setDialogOpen(false);
          },
          onError: () => {
            notify(t("Failed to update task. Please try again."), "error");
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
          goal_id: goalId === "" ? null : goalId,
          due_date: dueDate || null,
          recurrence,
          recurrence_until: recurrence === "none" ? null : recurrenceUntil || null,
          time_estimate_minutes: normalizedTimeEstimate,
        },
        {
          onSuccess: (createdTask) => {
            saveTaskOutcome(createdTask.id);
            notify(t("Task created."), "success");
            setDialogOpen(false);
          },
          onError: () => {
            notify(t("Failed to create task. Please try again."), "error");
          },
        }
      );
    }
  };

  const handleDelete = (taskId: number) => {
    deleteTask.mutate(taskId);
    notify(t("Task deleted."), "info");
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

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = parseDraggedTaskId(event.active.id);
    setDraggedTaskId(taskId);
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    setDraggedTaskId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const taskId = parseDraggedTaskId(event.active.id);
    const overId = event.over?.id;
    setDraggedTaskId(null);

    if (busy || taskId === null || !overId || typeof overId !== "string") {
      return;
    }
    if (!columns.some((column) => column.status === overId)) {
      return;
    }
    const nextStatus = overId as TaskStatus;

    const draggedTask = tasks.find((task) => task.id === taskId);
    if (!draggedTask || draggedTask.status === nextStatus) {
      return;
    }

    moveToStatus(draggedTask, nextStatus);
    notify(t("Task moved to {status}.", { status: statusLabel[nextStatus] }), "info");
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
      <Box sx={{ p: { xs: 1, md: 2 } }}>
        <Paper
          variant="outlined"
          sx={{
            ...boardSurfaceSx,
            p: { xs: 1.5, md: 1.9 },
            borderRadius: 4,
            background: isDark
              ? `radial-gradient(circle at top left, ${alpha(muiTheme.palette.primary.main, 0.2)}, transparent 32%), linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))`
              : `radial-gradient(circle at top left, ${alpha(muiTheme.palette.primary.main, 0.1)}, transparent 32%), linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.8))`,
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <Box>
              <Typography sx={{ color: "text.secondary", fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", mb: 0.45 }}>
                {t("Execution board")}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {t("Tasks Board")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("Plan, filter, and move work across the board without losing delivery context.")}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", justifyContent: { md: "flex-end" } }}>
              <Chip
                size="small"
                icon={<CalendarMonthOutlinedIcon sx={{ fontSize: "0.95rem !important" }} />}
                label={t("Due today: {count}", { count: stats.dueToday })}
                variant="outlined"
              />
              <Button
                variant="contained"
                startIcon={<AddTaskIcon />}
                onClick={() => openCreateDialog()}
                disabled={busy}
                sx={{ minHeight: 42, px: 2.3, borderRadius: 2.8 }}
              >
                {t("Add Task")}
              </Button>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={0} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
            <Chip label={t("Total: {count}", { count: stats.total })} variant="outlined" size="small" />
            <Chip label={t("Done: {count}", { count: stats.done })} color="default" variant="outlined" size="small" />
            <Chip label={`${t("Due today")}: ${stats.dueToday}`} color="default" variant="outlined" size="small" />
            <Chip
              label={t("Overdue: {count}", { count: stats.overdue })}
              color={stats.overdue > 0 ? "error" : "default"}
              variant="outlined"
              size="small"
            />
            <Chip
              label={t("Active timers: {count}", { count: stats.activeTimers })}
              color={stats.activeTimers > 0 ? "warning" : "default"}
              variant="outlined"
              size="small"
            />
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
              InputLabelProps={{ shrink: true }}
            >
              <option value="all">{t("All statuses")}</option>
              <option value="todo">{t("To Do")}</option>
              <option value="in_progress">{t("In Progress")}</option>
              <option value="done">{t("Done")}</option>
            </TextField>

            <TextField
              select
              label={t("Priority")}
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as "all" | TaskPriority)}
              sx={{ minWidth: 170 }}
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
            >
              <option value="all">{t("All priorities")}</option>
              <option value="urgent">{t("Urgent")}</option>
              <option value="high">{t("High")}</option>
              <option value="medium">{t("Medium")}</option>
              <option value="low">{t("Low")}</option>
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
              InputLabelProps={{ shrink: true }}
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
      </Box>

      <DndContext
        sensors={dndSensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ mt: 2 }}>
          {columns.map((column) => (
            <DroppableColumn key={column.status} status={column.status}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {statusLabel[column.status]}
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
                  <Box key={task.id} sx={{ opacity: draggedTaskId === task.id ? 0.55 : 1 }}>
                    <DraggableTaskCard taskId={task.id} disabled={busy}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        borderColor: (theme) =>
                          overdue
                            ? "error.main"
                            : theme.palette.mode === "dark"
                              ? "rgba(255,255,255,0.08)"
                              : "rgba(0,0,0,0.08)",
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(255,255,255,0.02)"
                            : "rgba(0,0,0,0.01)",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          transform: "translateY(-1px)",
                          borderColor: (theme) =>
                            theme.palette.mode === "dark"
                              ? "rgba(255,255,255,0.15)"
                              : "rgba(0,0,0,0.15)",
                          boxShadow: (theme) =>
                            theme.palette.mode === "dark"
                              ? "0 2px 8px rgba(0,0,0,0.3)"
                              : "0 2px 8px rgba(0,0,0,0.08)",
                        },
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
                            <strong>{t("Before:")}</strong> {outcome.before}
                          </Typography>
                        ) : null}
                        {outcome?.after ? (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            <strong>{t("After:")}</strong> {outcome.after}
                          </Typography>
                        ) : null}

                        <Stack direction="row" spacing={0} sx={{ mt: 1, flexWrap: "wrap", gap: 0.75 }}>
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
                              color="default"
                              variant="outlined"
                            />
                          ) : null}
                          {task.goal_id ? (
                            <Chip
                              size="small"
                              label={goalNameById.get(task.goal_id) ?? `Goal #${task.goal_id}`}
                              color="default"
                              variant="outlined"
                            />
                          ) : null}
                          {task.due_date ? (
                            <Chip
                              size="small"
                              label={
                                overdue
                                  ? t("Overdue: {date}", { date: formatTaskDateOnly(task.due_date) })
                                  : t("Due: {date}", { date: formatTaskDateOnly(task.due_date) })
                              }
                              color={overdue ? "error" : "default"}
                              variant="outlined"
                            />
                          ) : null}
                          {task.recurrence !== "none" ? (
                            <Chip
                              size="small"
                              label={recurrenceLabel[task.recurrence]}
                              color="default"
                              variant="outlined"
                            />
                          ) : null}
                          <Chip
                            size="small"
                            icon={<TimerIcon fontSize="small" />}
                            label={t("Spent: {duration}", { duration: formatDuration(elapsedSeconds) })}
                            color={isRunning ? "warning" : "default"}
                            variant="outlined"
                          />
                          {task.time_estimate_minutes > 0 ? (
                            <>
                              <Chip
                                size="small"
                                label={t("Target: {minutes}m", { minutes: task.time_estimate_minutes })}
                                variant="outlined"
                              />
                              <Chip
                                size="small"
                                label={
                                  remainingSeconds >= 0
                                    ? t("Left: {duration}", { duration: formatDuration(remainingSeconds) })
                                    : t("Over: {duration}", { duration: formatDuration(Math.abs(remainingSeconds)) })
                                }
                                color={remainingSeconds < 0 ? "error" : "success"}
                                variant="outlined"
                              />
                            </>
                          ) : null}
                        </Stack>

                        <Stack direction="row" spacing={0} sx={{ mt: 1.2, flexWrap: "wrap", gap: 0.75 }}>
                          <Tooltip title={isRunning ? t("Pause timer") : t("Start timer")}>
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
                          <Tooltip title={t("Reset timer")}>
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
                          {t("Updated: {datetime}", { datetime: formatTaskDateTime(task.updated_at) })}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title={t("Drag")}>
                          <span>
                            <IconButton size="small" disabled={busy} sx={{ cursor: busy ? "default" : "grab" }}>
                              <DragIndicatorIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={t("Open card")}>
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
                    </DraggableTaskCard>
                  </Box>
                );
              })}

              {!isLoading && grouped[column.status].length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                  {t("No tasks in this column.")}
                </Typography>
              ) : null}
            </Stack>
            </DroppableColumn>
          ))}
        </Stack>
      </DndContext>

      <Paper variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 2.5, borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={1}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {t("Gantt timeline")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("Tasks by planned duration and due date")}
            </Typography>
          </Box>
          {gantt.rangeStart && gantt.rangeEnd ? (
            <Chip
              size="small"
              variant="outlined"
              label={`${formatTaskDateOnly(formatDayKey(gantt.rangeStart))} - ${formatTaskDateOnly(formatDayKey(gantt.rangeEnd))}`}
            />
          ) : null}
        </Stack>

        {gantt.entries.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {t("Add due dates to tasks to see Gantt chart.")}
          </Typography>
        ) : (
          <Stack spacing={1.35} sx={{ mt: 1.5 }}>
            {gantt.entries.map((entry) => {
              const left = (entry.offsetDays / gantt.totalDays) * 100;
              const width = (entry.durationDays / gantt.totalDays) * 100;

              return (
                <Box key={entry.task.id}>
                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {entry.task.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatTaskDateOnly(formatDayKey(entry.start))} - {formatTaskDateOnly(formatDayKey(entry.end))}
                    </Typography>
                  </Stack>

                  <Box
                    sx={{
                      position: "relative",
                      mt: 0.5,
                      height: 14,
                      borderRadius: 999,
                      backgroundColor: "action.selected",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        left: `${left}%`,
                        width: `${Math.max(width, 2)}%`,
                        top: 0,
                        bottom: 0,
                        borderRadius: 999,
                        backgroundColor:
                          entry.task.status === "done"
                            ? "success.main"
                            : entry.task.status === "in_progress"
                              ? "info.main"
                              : "warning.main",
                      }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </Paper>

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
                  <Stack direction="row" spacing={0} sx={{ mt: 0.8, flexWrap: "wrap", gap: 0.75 }}>
                    <Chip label={statusLabel[activeTask.status]} size="small" />
                    <Chip
                      label={priorityLabel[activeTask.priority]}
                      size="small"
                      color={priorityColor[activeTask.priority]}
                      variant="outlined"
                    />
                    {activeTask.goal_id ? (
                      <Chip
                        size="small"
                        label={goalNameById.get(activeTask.goal_id) ?? `Goal #${activeTask.goal_id}`}
                        color="success"
                        variant="outlined"
                      />
                    ) : null}
                    {activeTask.due_date ? (
                      <Chip
                        size="small"
                        label={t("Due: {date}", { date: formatTaskDateOnly(activeTask.due_date) })}
                        variant="outlined"
                      />
                    ) : null}
                    {activeTask.recurrence !== "none" ? (
                      <Chip
                        size="small"
                        label={t("Repeats: {value}", { value: recurrenceLabel[activeTask.recurrence] })}
                        color="secondary"
                        variant="outlined"
                      />
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
                  <strong>{t("Before:")}</strong> {taskOutcomes[String(activeTask.id)]?.before}
                </Typography>
              ) : null}
              {taskOutcomes[String(activeTask.id)]?.after ? (
                <Typography variant="body2" color="text.secondary">
                  <strong>{t("After:")}</strong> {taskOutcomes[String(activeTask.id)]?.after}
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
        <DialogTitle>{editingTask ? t("Edit task") : t("Create task")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t("Title")}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
              fullWidth
            />

            <TextField
              label={t("Description")}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              multiline
              minRows={3}
              fullWidth
            />

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                select
                label={t("Status")}
                value={status}
                onChange={(event) => setStatus(event.target.value as TaskStatus)}
                SelectProps={{ native: true }}
                fullWidth
              >
                <option value="todo">{t("To Do")}</option>
                <option value="in_progress">{t("In Progress")}</option>
                <option value="done">{t("Done")}</option>
              </TextField>

              <TextField
                select
                label={t("Priority")}
                value={priority}
                onChange={(event) => setPriority(event.target.value as TaskPriority)}
                SelectProps={{ native: true }}
                fullWidth
              >
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
              onChange={(event) => {
                const nextValue = event.target.value;
                setProjectId(nextValue === "" ? "" : Number(nextValue));
              }}
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
              onChange={(event) => {
                const nextValue = event.target.value;
                setGoalId(nextValue === "" ? "" : Number(nextValue));
              }}
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
              <TextField
                type="date"
                label={t("Due date")}
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />

              <TextField
                type="number"
                label={t("Time limit (minutes)")}
                value={timeEstimateMinutes}
                onChange={(event) => setTimeEstimateMinutes(normalizeEstimateMinutes(Number(event.target.value)))}
                inputProps={{ min: 0, max: 10080, step: 5 }}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                select
                label={t("Repeat")}
                value={recurrence}
                onChange={(event) => setRecurrence(event.target.value as TaskRecurrence)}
                SelectProps={{ native: true }}
                InputLabelProps={{ shrink: true }}
                fullWidth
              >
                <option value="none">{t("Does not repeat")}</option>
                <option value="daily">{t("Daily")}</option>
                <option value="weekdays">{t("Weekdays")}</option>
                <option value="weekly">{t("Weekly")}</option>
              </TextField>

              <TextField
                type="date"
                label={t("Repeat until")}
                value={recurrenceUntil}
                onChange={(event) => setRecurrenceUntil(event.target.value)}
                InputLabelProps={{ shrink: true }}
                disabled={recurrence === "none"}
                fullWidth
              />
            </Stack>

            <TextField
              label={t("Before (planned outcome)")}
              value={beforeOutcome}
              onChange={(event) => setBeforeOutcome(event.target.value)}
              multiline
              minRows={2}
              fullWidth
            />

            <TextField
              label={t("After (actual outcome)")}
              value={afterOutcome}
              onChange={(event) => setAfterOutcome(event.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t("Cancel")}</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={busy || title.trim().length === 0}
          >
            {editingTask ? t("Save") : t("Create")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

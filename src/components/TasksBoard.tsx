import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import TimerIcon from "@mui/icons-material/Timer";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
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
import { TaskDetailsDialog } from "./tasks/TaskDetailsDialog";
import { TaskEditDialog } from "./tasks/TaskEditDialog";
import { TasksBoardToolbar } from "./tasks/TasksBoardToolbar";
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
import { useTasksPreferences } from "../hooks/useTasksPreferences";
import { Task, TaskPriority, TaskRecurrence, TaskStatus, TaskSubtask } from "../types";
import {
  formatDuration,
  formatTaskDateOnly,
  formatTaskDateTime,
  getTaskStatusForDoneToggle,
  getTaskElapsedSeconds,
  isTaskOverdue,
  normalizeEstimateMinutes,
} from "../utils/taskUtils";
import {
  buildTaskGantt,
  formatDayKey,
  getFilteredTasks,
  getTaskBoardStats,
  groupTasksByStatus,
} from "../utils/tasksBoardSelectors";
import { useI18n } from "../i18n/I18nContext";
import { useAppNotifications } from "../notifications/AppNotifications";
import { TASKS_FILTER_EVENT } from "../utils/preferencesStorage";
import {
  type TaskOutcomeMap,
  persistTaskOutcomes,
  readTaskOutcomes,
} from "../utils/taskOutcomesStorage";

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
        p: { xs: 1.25, md: 1.5 },
        flex: 1,
        minHeight: 340,
        borderRadius: 2.5,
        borderStyle: isOver ? "dashed" : "solid",
        borderColor: (theme) =>
          isOver
            ? theme.palette.primary.main
            : theme.palette.divider,
        transition: "border-color 0.15s ease, background-color 0.15s ease",
        backgroundColor: (theme) =>
          isOver
            ? theme.palette.action.hover
            : theme.palette.background.paper,
        boxShadow: (theme) => (isOver ? theme.shadows[1] : "none"),
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
        transition: "opacity 0.12s ease",
      }}
    >
      {children}
    </Box>
  );
};

export const TasksBoard = () => {
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
  const { showOverdueOnly, setShowOverdueOnly } = useTasksPreferences();
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
  const boardSurfaceSx = {
    border: "1px solid",
    borderColor: "divider",
    backgroundColor: "background.paper",
    boxShadow: "none",
  };

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ overdueOnly?: boolean; resetFilters?: boolean }>;
      if (customEvent.detail?.resetFilters) {
        setQuery("");
        setStatusFilter("all");
        setPriorityFilter("all");
        setProjectFilter("all");
      }
    };

    window.addEventListener(TASKS_FILTER_EVENT, handler);
    return () => {
      window.removeEventListener(TASKS_FILTER_EVENT, handler);
    };
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

  const stats = useMemo(() => getTaskBoardStats(tasks), [tasks]);

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

  const filteredTasks = useMemo(
    () =>
      getFilteredTasks({
        tasks,
        query,
        statusFilter,
        priorityFilter,
        projectFilter,
        showOverdueOnly,
      }),
    [tasks, query, statusFilter, priorityFilter, projectFilter, showOverdueOnly]
  );

  const grouped = useMemo(() => groupTasksByStatus(filteredTasks), [filteredTasks]);
  const gantt = useMemo(() => buildTaskGantt(tasks), [tasks]);

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setProjectFilter("all");
    setShowOverdueOnly(false);
  };

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
    const normalizedQuery = query.trim().toLowerCase();

    const ensureCreatedTaskVisible = (createdTask: Task) => {
      const hiddenByStatus = statusFilter !== "all" && createdTask.status !== statusFilter;
      const hiddenByPriority = priorityFilter !== "all" && createdTask.priority !== priorityFilter;
      const hiddenByProject = projectFilter !== "all" && createdTask.project_id !== projectFilter;
      const hiddenByOverdueOnly = showOverdueOnly && !isTaskOverdue(createdTask);
      const hiddenByQuery =
        normalizedQuery.length > 0 &&
        !createdTask.title.toLowerCase().includes(normalizedQuery) &&
        !createdTask.description.toLowerCase().includes(normalizedQuery);

      const needsReset =
        hiddenByStatus ||
        hiddenByPriority ||
        hiddenByProject ||
        hiddenByOverdueOnly ||
        hiddenByQuery;

      if (!needsReset) {
        return false;
      }

      if (hiddenByStatus) {
        setStatusFilter("all");
      }
      if (hiddenByPriority) {
        setPriorityFilter("all");
      }
      if (hiddenByProject) {
        setProjectFilter("all");
      }
      if (hiddenByOverdueOnly) {
        setShowOverdueOnly(false);
      }
      if (hiddenByQuery) {
        setQuery("");
      }

      return true;
    };

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
            const filtersReset = ensureCreatedTaskVisible(createdTask);
            saveTaskOutcome(createdTask.id);
            notify(
              filtersReset
                ? t("Task created. Filters were reset so you can see it.")
                : t("Task created."),
              "success"
            );
            setDialogOpen(false);
          },
          onError: (error) => {
            const details =
              error instanceof Error ? error.message : typeof error === "string" ? error : "";
            notify(
              details
                ? t("Failed to create task: {message}", { message: details })
                : t("Failed to create task. Please try again."),
              "error"
            );
          },
        }
      );
    }
  };

  const handleDelete = (taskId: number) => {
    const confirmed = window.confirm(t("Delete this task?"));
    if (!confirmed) {
      return;
    }
    deleteTask.mutate(taskId, {
      onSuccess: () => {
        notify(t("Task deleted."), "info");
        if (taskOutcomes[String(taskId)]) {
          const updated = { ...taskOutcomes };
          delete updated[String(taskId)];
          setTaskOutcomes(updated);
          persistTaskOutcomes(updated);
        }
      },
      onError: (error) => {
        const details =
          error instanceof Error ? error.message : typeof error === "string" ? error : "";
        notify(
          details
            ? t("Failed to delete task: {message}", { message: details })
            : t("Failed to delete task. Please try again."),
          "error"
        );
      },
    });
  };

  const moveToStatus = (task: Task, nextStatus: TaskStatus) => {
    if (task.status === nextStatus) {
      return;
    }
    updateStatus.mutate({ id: task.id, status: nextStatus });
  };

  const toggleDone = (task: Task, checked: boolean) => {
    updateStatus.mutate({
      id: task.id,
      status: getTaskStatusForDoneToggle(task, checked),
    });
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
          notify(t("Subtask created."), "success");
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
          notify(t("Subtask updated."), "success");
        },
      }
    );
  };

  const handleDeleteSubtask = (subtaskId: number) => {
    const confirmed = window.confirm(t("Delete this subtask?"));
    if (!confirmed) {
      return;
    }
    deleteTaskSubtask.mutate(
      subtaskId,
      {
        onSuccess: () => notify(t("Subtask deleted."), "info"),
      }
    );
  };

  return (
    <Box sx={{ maxWidth: 1500, mx: "auto", mt: { xs: 0, md: 0.5 } }}>
      <TasksBoardToolbar
        boardSurfaceSx={boardSurfaceSx}
        busy={busy}
        filteredCount={filteredTasks.length}
        onCreateTask={() => openCreateDialog()}
        onPriorityFilterChange={setPriorityFilter}
        onProjectFilterChange={setProjectFilter}
        onQueryChange={setQuery}
        onResetFilters={resetFilters}
        onStatusFilterChange={setStatusFilter}
        onToggleOverdueOnly={() => setShowOverdueOnly((prev) => !prev)}
        priorityFilter={priorityFilter}
        projectFilter={projectFilter}
        projects={projects}
        query={query}
        showOverdueOnly={showOverdueOnly}
        stats={stats}
        statusFilter={statusFilter}
        t={t}
      />

      <DndContext
        sensors={dndSensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} sx={{ mt: 1.5 }}>
          {columns.map((column) => (
            <DroppableColumn key={column.status} status={column.status}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
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
                sx={{ minHeight: 30 }}
              >
                + {t("Add Task")}
              </Button>
            </Stack>

            <Stack spacing={1}>
              {grouped[column.status].map((task) => {
                const overdue = isTaskOverdue(task);
                const isRunning = Boolean(task.timer_started_at);
                const elapsedSeconds = getTaskElapsedSeconds(task, nowMs);
                const estimatedSeconds = task.time_estimate_minutes * 60;
                const remainingSeconds = estimatedSeconds - elapsedSeconds;
                const outcome = taskOutcomes[String(task.id)];

                return (
                  <Box
                    key={task.id}
                    sx={{
                      opacity: draggedTaskId === task.id ? 0.55 : 1,
                      transition: "opacity 0.12s ease",
                    }}
                  >
                    <DraggableTaskCard taskId={task.id} disabled={busy}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.35,
                        borderRadius: 2,
                        borderColor: (theme) =>
                          overdue
                            ? "error.main"
                            : theme.palette.divider,
                        bgcolor: "background.paper",
                        transition: "border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease",
                        "&:hover": {
                          borderColor: "text.secondary",
                          boxShadow: (theme) =>
                            theme.palette.mode === "dark"
                              ? "0 2px 8px rgba(0,0,0,0.3)"
                              : "0 2px 8px rgba(0,0,0,0.06)",
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
                              lineHeight: 1.25,
                            }}
                            onClick={() => openTaskDetails(task)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                openTaskDetails(task);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            noWrap
                          >
                            {task.title}
                          </Typography>
                        </Stack>

                        {task.description ? (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              mt: 0.5,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
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

                        <Stack direction="row" spacing={0} sx={{ mt: 1, flexWrap: "wrap", gap: 0.55 }}>
                          <Chip
                            size="small"
                            label={priorityLabel[task.priority]}
                            color={priorityColor[task.priority]}
                            variant="outlined"
                          />
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
                        {(task.project_id || task.goal_id || task.recurrence !== "none") ? (
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.6 }}>
                            {[
                              task.project_id ? `${t("Project")}: ${projectNameById.get(task.project_id) ?? `#${task.project_id}`}` : "",
                              task.goal_id ? `${t("Goal")}: ${goalNameById.get(task.goal_id) ?? `#${task.goal_id}`}` : "",
                              task.recurrence !== "none" ? `${t("Repeat")}: ${recurrenceLabel[task.recurrence]}` : "",
                            ].filter(Boolean).join(" • ")}
                          </Typography>
                        ) : null}

                        <Stack direction="row" spacing={0} sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}>
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

                    <Stack direction="row" spacing={0.55} sx={{ mt: 1.25, flexWrap: "wrap" }}>
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
                <Box
                  sx={{
                    border: "1px dashed",
                    borderColor: "divider",
                    borderRadius: 2,
                    px: 1.25,
                    py: 1.5,
                    bgcolor: "background.default",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {t("No tasks in this column.")}
                  </Typography>
                </Box>
              ) : null}
            </Stack>
            </DroppableColumn>
          ))}
        </Stack>
      </DndContext>

      <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, mt: 1.5, borderRadius: 2.5, borderColor: "divider", boxShadow: "none" }}>
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

      <TaskDetailsDialog
        activeTask={activeTask}
        activeTaskSubtasks={activeTaskSubtasks}
        busy={busy}
        editingSubtaskId={editingSubtaskId}
        editingSubtaskTitle={editingSubtaskTitle}
        goalNameById={goalNameById}
        isOpen={isTaskDetailsOpen}
        newSubtaskTitle={newSubtaskTitle}
        onBeginSubtaskEdit={beginSubtaskEdit}
        onCancelSubtaskEdit={cancelSubtaskEdit}
        onClose={closeTaskDetails}
        onCreateSubtask={handleCreateSubtask}
        onDeleteSubtask={handleDeleteSubtask}
        onEditSubtaskTitleChange={setEditingSubtaskTitle}
        onEditTask={openEditFromTaskDetails}
        onNewSubtaskTitleChange={setNewSubtaskTitle}
        onSaveSubtaskEdit={saveSubtaskEdit}
        onToggleSubtask={handleToggleSubtask}
        outcome={activeTask ? taskOutcomes[String(activeTask.id)] : undefined}
        priorityColor={priorityColor}
        priorityLabel={priorityLabel}
        recurrenceLabel={recurrenceLabel}
        statusLabel={statusLabel}
        t={t}
        formatTaskDateOnly={formatTaskDateOnly}
      />

      <TaskEditDialog
        afterOutcome={afterOutcome}
        beforeOutcome={beforeOutcome}
        busy={busy}
        description={description}
        dueDate={dueDate}
        editingTask={Boolean(editingTask)}
        goalId={goalId}
        goals={goals}
        isDialogOpen={isDialogOpen}
        onAfterOutcomeChange={setAfterOutcome}
        onBeforeOutcomeChange={setBeforeOutcome}
        onClose={() => setDialogOpen(false)}
        onDescriptionChange={setDescription}
        onDueDateChange={setDueDate}
        onGoalIdChange={setGoalId}
        onPriorityChange={setPriority}
        onProjectIdChange={setProjectId}
        onRecurrenceChange={setRecurrence}
        onRecurrenceUntilChange={setRecurrenceUntil}
        onSave={handleSave}
        onStatusChange={setStatus}
        onTimeEstimateMinutesChange={(value) =>
          setTimeEstimateMinutes(normalizeEstimateMinutes(value))
        }
        onTitleChange={setTitle}
        priority={priority}
        projectId={projectId}
        projects={projects}
        recurrence={recurrence}
        recurrenceUntil={recurrenceUntil}
        status={status}
        t={t}
        timeEstimateMinutes={timeEstimateMinutes}
        title={title}
      />
    </Box>
  );
};

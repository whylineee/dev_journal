import { useMemo, useState } from "react";
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
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import FlagCircleIcon from "@mui/icons-material/FlagCircle";
import AddTaskIcon from "@mui/icons-material/AddTask";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchIcon from "@mui/icons-material/Search";
import { format, isBefore, parseISO, startOfDay } from "date-fns";
import { Goal, GoalStatus, Task } from "../types";
import {
  useCreateGoal,
  useCreateGoalMilestone,
  useDeleteGoal,
  useDeleteGoalMilestone,
  useGoalMilestones,
  useGoals,
  useUpdateGoal,
  useUpdateGoalMilestone,
} from "../hooks/useGoals";
import { useProjects } from "../hooks/useProjects";
import { useTasks } from "../hooks/useTasks";
import { useI18n } from "../i18n/I18nContext";

const statusLabel: Record<GoalStatus, string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};

const statusColor: Record<GoalStatus, "success" | "warning" | "info" | "default"> = {
  active: "info",
  paused: "warning",
  completed: "success",
  archived: "default",
};

const formatDate = (value: string) => {
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
};

const isOverdue = (goal: Goal) => {
  if (!goal.target_date || goal.status === "completed" || goal.status === "archived") {
    return false;
  }

  try {
    return isBefore(startOfDay(parseISO(goal.target_date)), startOfDay(new Date()));
  } catch {
    return false;
  }
};

const compareGoals = (a: Goal, b: Goal) => {
  const statusOrder: Record<GoalStatus, number> = {
    active: 0,
    paused: 1,
    completed: 2,
    archived: 3,
  };

  const statusDiff = statusOrder[a.status] - statusOrder[b.status];
  if (statusDiff !== 0) {
    return statusDiff;
  }

  if (a.target_date && b.target_date) {
    const dueDiff = a.target_date.localeCompare(b.target_date);
    if (dueDiff !== 0) {
      return dueDiff;
    }
  } else if (a.target_date && !b.target_date) {
    return -1;
  } else if (!a.target_date && b.target_date) {
    return 1;
  }

  return b.updated_at.localeCompare(a.updated_at);
};

const normalizeProgress = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export const GoalsBoard = () => {
  const { t } = useI18n();
  const { data: goals = [], isLoading } = useGoals();
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: milestones = [] } = useGoalMilestones(null);
  const createGoal = useCreateGoal();
  const createGoalMilestone = useCreateGoalMilestone();
  const updateGoal = useUpdateGoal();
  const updateGoalMilestone = useUpdateGoalMilestone();
  const deleteGoalMilestone = useDeleteGoalMilestone();
  const deleteGoal = useDeleteGoal();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | GoalStatus>("all");
  const [projectFilter, setProjectFilter] = useState<"all" | number>("all");
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<GoalStatus>("active");
  const [progress, setProgress] = useState(0);
  const [projectId, setProjectId] = useState<number | "">("");
  const [targetDate, setTargetDate] = useState("");
  const [newMilestoneTitles, setNewMilestoneTitles] = useState<Record<number, string>>({});
  const [newMilestoneDueDates, setNewMilestoneDueDates] = useState<Record<number, string>>({});

  const busy =
    createGoal.isPending ||
    updateGoal.isPending ||
    deleteGoal.isPending ||
    createGoalMilestone.isPending ||
    updateGoalMilestone.isPending ||
    deleteGoalMilestone.isPending;

  const stats = useMemo(() => {
    const completed = goals.filter((goal) => goal.status === "completed").length;
    const active = goals.filter((goal) => goal.status === "active").length;
    const overdue = goals.filter((goal) => isOverdue(goal)).length;
    return { total: goals.length, completed, active, overdue };
  }, [goals]);

  const projectNameById = useMemo(() => {
    const map = new Map<number, string>();
    projects.forEach((project) => map.set(project.id, project.name));
    return map;
  }, [projects]);

  const tasksByGoal = useMemo(() => {
    const map = new Map<number, Task[]>();
    tasks.forEach((task) => {
      if (!task.goal_id) {
        return;
      }
      const current = map.get(task.goal_id) ?? [];
      current.push(task);
      map.set(task.goal_id, current);
    });
    map.forEach((goalTasks, goalId) => {
      map.set(goalId, goalTasks.sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
    });
    return map;
  }, [tasks]);

  const milestonesByGoal = useMemo(() => {
    const map = new Map<number, typeof milestones>();
    milestones.forEach((milestone) => {
      const current = map.get(milestone.goal_id) ?? [];
      current.push(milestone);
      map.set(milestone.goal_id, current);
    });
    map.forEach((items, goalId) => {
      map.set(
        goalId,
        [...items].sort((a, b) => {
          if (a.position !== b.position) {
            return a.position - b.position;
          }
          return a.id - b.id;
        })
      );
    });
    return map;
  }, [milestones]);

  const filteredGoals = useMemo(() => {
    const q = query.trim().toLowerCase();

    return goals
      .filter((goal) => {
        if (statusFilter !== "all" && goal.status !== statusFilter) {
          return false;
        }

        if (projectFilter !== "all" && goal.project_id !== projectFilter) {
          return false;
        }

        if (!q) {
          return true;
        }

        return (
          goal.title.toLowerCase().includes(q) ||
          goal.description.toLowerCase().includes(q)
        );
      })
      .sort(compareGoals);
  }, [goals, query, statusFilter, projectFilter]);

  const openCreateDialog = () => {
    setEditingGoal(null);
    setTitle("");
    setDescription("");
    setStatus("active");
    setProgress(0);
    setProjectId("");
    setTargetDate("");
    setDialogOpen(true);
  };

  const openEditDialog = (goal: Goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setDescription(goal.description);
    setStatus(goal.status);
    setProgress(goal.progress);
    setProjectId(goal.project_id ?? "");
    setTargetDate(goal.target_date ?? "");
    setDialogOpen(true);
  };

  const handleSave = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      return;
    }

    const normalizedProgress = normalizeProgress(progress);
    const normalizedStatus = normalizedProgress === 100 ? "completed" : status;

    if (editingGoal) {
      updateGoal.mutate({
        id: editingGoal.id,
        title: cleanTitle,
        description: description.trim(),
        status: normalizedStatus,
        progress: normalizedProgress,
        project_id: projectId === "" ? null : projectId,
        target_date: targetDate || null,
      });
    } else {
      createGoal.mutate({
        title: cleanTitle,
        description: description.trim(),
        status: normalizedStatus,
        progress: normalizedProgress,
        project_id: projectId === "" ? null : projectId,
        target_date: targetDate || null,
      });
    }

    setDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    deleteGoal.mutate(id);
  };

  const handleAddMilestone = (goalId: number) => {
    const title = (newMilestoneTitles[goalId] ?? "").trim();
    if (!title) {
      return;
    }

    createGoalMilestone.mutate(
      {
        goal_id: goalId,
        title,
        due_date: newMilestoneDueDates[goalId] || null,
      },
      {
        onSuccess: () => {
          setNewMilestoneTitles((prev) => ({ ...prev, [goalId]: "" }));
          setNewMilestoneDueDates((prev) => ({ ...prev, [goalId]: "" }));
        },
      }
    );
  };

  const quickUpdate = (goal: Goal, nextStatus: GoalStatus, nextProgress: number) => {
    updateGoal.mutate({
      id: goal.id,
      title: goal.title,
      description: goal.description,
      status: nextStatus,
      progress: normalizeProgress(nextProgress),
      project_id: goal.project_id,
      target_date: goal.target_date,
    });
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", mt: 1 }}>
      <Paper sx={{ p: 3 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {t("Goals")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("Switch to long-term goals tracking")}
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<FlagCircleIcon />}
            onClick={openCreateDialog}
            disabled={busy}
          >
            {t("New Goal")}
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
          <Chip label={`Total: ${stats.total}`} variant="outlined" size="small" />
          <Chip label={`Active: ${stats.active}`} color="info" variant="outlined" size="small" />
          <Chip label={`Completed: ${stats.completed}`} color="success" variant="outlined" size="small" />
          <Chip label={`Overdue: ${stats.overdue}`} color={stats.overdue > 0 ? "error" : "default"} variant="outlined" size="small" />
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2 }}>
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
            onChange={(event) => setStatusFilter(event.target.value as "all" | GoalStatus)}
            sx={{ minWidth: 180 }}
            SelectProps={{ native: true }}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </TextField>

          <TextField
            select
            label={t("Project")}
            value={projectFilter === "all" ? "all" : String(projectFilter)}
            onChange={(event) => {
              const value = event.target.value;
              setProjectFilter(value === "all" ? "all" : Number(value));
            }}
            sx={{ minWidth: 180 }}
            SelectProps={{ native: true }}
          >
            <option value="all">{t("All projects")}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </TextField>
        </Stack>
      </Paper>

      <Stack spacing={1.5} sx={{ mt: 2 }}>
        {filteredGoals.map((goal) => {
          const overdue = isOverdue(goal);
          const linkedTasks = tasksByGoal.get(goal.id) ?? [];
          const completedLinkedTasks = linkedTasks.filter((task) => task.status === "done").length;
          const goalMilestones = milestonesByGoal.get(goal.id) ?? [];
          const completedMilestones = goalMilestones.filter((milestone) => milestone.completed).length;
          const displayProgress =
            goalMilestones.length > 0
              ? Math.round((completedMilestones / goalMilestones.length) * 100)
              : goal.progress;

          return (
            <Paper
              key={goal.id}
              variant="outlined"
              sx={{
                p: 2,
                borderColor: overdue ? "error.main" : "divider",
              }}
            >
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {goal.title}
                    </Typography>
                    <Chip size="small" label={statusLabel[goal.status]} color={statusColor[goal.status]} variant="outlined" />
                    {goal.project_id ? (
                      <Chip
                        size="small"
                        label={projectNameById.get(goal.project_id) ?? `#${goal.project_id}`}
                        color="info"
                        variant="outlined"
                      />
                    ) : null}
                    {goal.target_date ? (
                      <Chip
                        size="small"
                        label={overdue ? `Overdue: ${formatDate(goal.target_date)}` : `Target: ${formatDate(goal.target_date)}`}
                        color={overdue ? "error" : "default"}
                        variant="outlined"
                      />
                    ) : null}
                    <Chip
                      size="small"
                      label={`Tasks: ${completedLinkedTasks}/${linkedTasks.length}`}
                      color={linkedTasks.length > 0 ? "success" : "default"}
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label={`Milestones: ${completedMilestones}/${goalMilestones.length}`}
                      color={goalMilestones.length > 0 ? "secondary" : "default"}
                      variant="outlined"
                    />
                  </Stack>

                  {goal.description ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                      {goal.description}
                    </Typography>
                  ) : null}

                  {linkedTasks.length > 0 ? (
                    <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: "wrap", gap: 0.75 }}>
                      {linkedTasks.slice(0, 4).map((task) => (
                        <Chip
                          key={task.id}
                          size="small"
                          label={task.title}
                          color={task.status === "done" ? "success" : "default"}
                          variant={task.status === "done" ? "filled" : "outlined"}
                        />
                      ))}
                      {linkedTasks.length > 4 ? (
                        <Chip size="small" variant="outlined" label={`+${linkedTasks.length - 4}`} />
                      ) : null}
                    </Stack>
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block" }}>
                      Link tasks to this goal from Tasks Board.
                    </Typography>
                  )}

                  <Box sx={{ mt: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Progress
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {displayProgress}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={displayProgress}
                      color={goal.status === "completed" ? "success" : "primary"}
                      sx={{ height: 8, borderRadius: 5 }}
                    />
                  </Box>

                  <Box
                    sx={{
                      mt: 1.5,
                      p: 1.25,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "background.default",
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {t("Milestones")}
                      </Typography>
                      {goalMilestones.length > 0 ? (
                        <Chip size="small" label={`${completedMilestones}/${goalMilestones.length} done`} variant="outlined" />
                      ) : null}
                    </Stack>

                    <Stack spacing={0.8}>
                      {goalMilestones.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">
                          No milestones yet. Add the first checkpoint below.
                        </Typography>
                      ) : (
                        goalMilestones.map((milestone) => (
                          <Stack
                            key={milestone.id}
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ py: 0.35 }}
                          >
                            <Checkbox
                              size="small"
                              checked={milestone.completed}
                              disabled={busy}
                              onChange={(event) =>
                                updateGoalMilestone.mutate({
                                  id: milestone.id,
                                  completed: event.target.checked,
                                })
                              }
                            />
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  textDecoration: milestone.completed ? "line-through" : "none",
                                  color: milestone.completed ? "text.secondary" : "text.primary",
                                }}
                              >
                                {milestone.title}
                              </Typography>
                              {milestone.due_date ? (
                                <Typography variant="caption" color="text.secondary">
                                  Due: {formatDate(milestone.due_date)}
                                </Typography>
                              ) : null}
                            </Box>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => deleteGoalMilestone.mutate(milestone.id)}
                              disabled={busy}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        ))
                      )}
                    </Stack>

                    <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mt: 1.2 }}>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="New milestone"
                        value={newMilestoneTitles[goal.id] ?? ""}
                        onChange={(event) =>
                          setNewMilestoneTitles((prev) => ({ ...prev, [goal.id]: event.target.value }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleAddMilestone(goal.id);
                          }
                        }}
                      />
                      <TextField
                        size="small"
                        type="date"
                        value={newMilestoneDueDates[goal.id] ?? ""}
                        onChange={(event) =>
                          setNewMilestoneDueDates((prev) => ({ ...prev, [goal.id]: event.target.value }))
                        }
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 170 }}
                      />
                      <Button
                        variant="outlined"
                        startIcon={<AddTaskIcon />}
                        onClick={() => handleAddMilestone(goal.id)}
                        disabled={busy || (newMilestoneTitles[goal.id] ?? "").trim().length === 0}
                      >
                        Add
                      </Button>
                    </Stack>
                  </Box>

                  <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: "wrap", gap: 0.75 }}>
                    {goalMilestones.length === 0 ? (
                      <>
                        <Chip
                          label="-10%"
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            quickUpdate(
                              goal,
                              goal.progress <= 10 && goal.status === "completed" ? "active" : goal.status,
                              goal.progress - 10
                            )
                          }
                          clickable
                        />
                        <Chip
                          label="+10%"
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            quickUpdate(
                              goal,
                              goal.progress + 10 >= 100 ? "completed" : goal.status,
                              goal.progress + 10
                            )
                          }
                          clickable
                        />
                      </>
                    ) : (
                      <Chip label="Auto progress from milestones" size="small" color="secondary" variant="outlined" />
                    )}
                    <Chip
                      label="Mark Completed"
                      size="small"
                      color="success"
                      variant={goal.status === "completed" ? "filled" : "outlined"}
                      onClick={() => quickUpdate(goal, "completed", 100)}
                      clickable
                    />
                    <Chip
                      label="Pause"
                      size="small"
                      color={goal.status === "paused" ? "warning" : "default"}
                      variant={goal.status === "paused" ? "filled" : "outlined"}
                      onClick={() => quickUpdate(goal, "paused", goal.progress)}
                      clickable
                    />
                    <Chip
                      label="Activate"
                      size="small"
                      color={goal.status === "active" ? "info" : "default"}
                      variant={goal.status === "active" ? "filled" : "outlined"}
                      onClick={() => quickUpdate(goal, "active", goal.progress)}
                      clickable
                    />
                  </Stack>
                </Box>

                <Stack direction="row" spacing={0.5}>
                  <IconButton size="small" onClick={() => openEditDialog(goal)} disabled={busy}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(goal.id)}
                    disabled={busy}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </Paper>
          );
        })}

        {!isLoading && filteredGoals.length === 0 ? (
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No goals match current filters.
            </Typography>
          </Paper>
        ) : null}
      </Stack>

      <Dialog open={isDialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingGoal ? "Edit goal" : "Create goal"}</DialogTitle>
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
                onChange={(event) => setStatus(event.target.value as GoalStatus)}
                SelectProps={{ native: true }}
                fullWidth
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </TextField>

              <TextField
                type="number"
                label="Progress %"
                value={progress}
                onChange={(event) => setProgress(normalizeProgress(Number(event.target.value)))}
                inputProps={{ min: 0, max: 100, step: 1 }}
                fullWidth
              />
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

            <TextField
              type="date"
              label="Target date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={busy}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

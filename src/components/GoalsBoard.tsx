import { useMemo, useState } from "react";
import {
  Box,
  Button,
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
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchIcon from "@mui/icons-material/Search";
import { format, isBefore, parseISO, startOfDay } from "date-fns";
import { Goal, GoalStatus } from "../types";
import { useCreateGoal, useDeleteGoal, useGoals, useUpdateGoal } from "../hooks/useGoals";

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
  const { data: goals = [], isLoading } = useGoals();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | GoalStatus>("all");
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<GoalStatus>("active");
  const [progress, setProgress] = useState(0);
  const [targetDate, setTargetDate] = useState("");

  const busy = createGoal.isPending || updateGoal.isPending || deleteGoal.isPending;

  const stats = useMemo(() => {
    const completed = goals.filter((goal) => goal.status === "completed").length;
    const active = goals.filter((goal) => goal.status === "active").length;
    const overdue = goals.filter((goal) => isOverdue(goal)).length;
    return { total: goals.length, completed, active, overdue };
  }, [goals]);

  const filteredGoals = useMemo(() => {
    const q = query.trim().toLowerCase();

    return goals
      .filter((goal) => {
        if (statusFilter !== "all" && goal.status !== statusFilter) {
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
  }, [goals, query, statusFilter]);

  const openCreateDialog = () => {
    setEditingGoal(null);
    setTitle("");
    setDescription("");
    setStatus("active");
    setProgress(0);
    setTargetDate("");
    setDialogOpen(true);
  };

  const openEditDialog = (goal: Goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setDescription(goal.description);
    setStatus(goal.status);
    setProgress(goal.progress);
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
        target_date: targetDate || null,
      });
    } else {
      createGoal.mutate({
        title: cleanTitle,
        description: description.trim(),
        status: normalizedStatus,
        progress: normalizedProgress,
        target_date: targetDate || null,
      });
    }

    setDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    deleteGoal.mutate(id);
  };

  const quickUpdate = (goal: Goal, nextStatus: GoalStatus, nextProgress: number) => {
    updateGoal.mutate({
      id: goal.id,
      title: goal.title,
      description: goal.description,
      status: nextStatus,
      progress: normalizeProgress(nextProgress),
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
              Goals & Milestones
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Plan long-term outcomes and track progress by target dates.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<FlagCircleIcon />}
            onClick={openCreateDialog}
            disabled={busy}
          >
            New Goal
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
            placeholder="Search goals"
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
        </Stack>
      </Paper>

      <Stack spacing={1.5} sx={{ mt: 2 }}>
        {filteredGoals.map((goal) => {
          const overdue = isOverdue(goal);

          return (
            <Paper
              key={goal.id}
              variant="outlined"
              sx={{
                p: 2,
                borderColor: overdue ? "error.main" : "rgba(255,255,255,0.1)",
              }}
            >
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {goal.title}
                    </Typography>
                    <Chip size="small" label={statusLabel[goal.status]} color={statusColor[goal.status]} variant="outlined" />
                    {goal.target_date ? (
                      <Chip
                        size="small"
                        label={overdue ? `Overdue: ${formatDate(goal.target_date)}` : `Target: ${formatDate(goal.target_date)}`}
                        color={overdue ? "error" : "default"}
                        variant="outlined"
                      />
                    ) : null}
                  </Stack>

                  {goal.description ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                      {goal.description}
                    </Typography>
                  ) : null}

                  <Box sx={{ mt: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Progress
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {goal.progress}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={goal.progress}
                      color={goal.status === "completed" ? "success" : "primary"}
                      sx={{ height: 8, borderRadius: 5 }}
                    />
                  </Box>

                  <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: "wrap", gap: 0.75 }}>
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

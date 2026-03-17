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
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import RepeatIcon from "@mui/icons-material/Repeat";
import { format, subDays } from "date-fns";
import {
  useCreateHabit,
  useDeleteHabit,
  useHabits,
  useToggleHabitCompletion,
  useUpdateHabit,
} from "../hooks/useHabits";
import { HabitWithLogs } from "../types";
import { useI18n } from "../i18n/I18nContext";

const computeWeekDates = () =>
  Array.from({ length: 7 }, (_, index) =>
    format(subDays(new Date(), 6 - index), "yyyy-MM-dd")
  );

const toDayLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(5);
  }

  return format(date, "EEE d");
};

const normalizeWeeklyTarget = (value: number) => Math.max(1, Math.min(14, Math.round(value)));

const compareHabits = (a: HabitWithLogs, b: HabitWithLogs) => {
  const aRatio = a.this_week_count / a.target_per_week;
  const bRatio = b.this_week_count / b.target_per_week;
  if (aRatio !== bRatio) {
    return aRatio - bRatio;
  }

  if (a.current_streak !== b.current_streak) {
    return b.current_streak - a.current_streak;
  }

  return b.updated_at.localeCompare(a.updated_at);
};

export const HabitsBoard = () => {
  const { t } = useI18n();
  const weekDates = useMemo(computeWeekDates, []);
  const { data: habits = [], isLoading } = useHabits();
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();
  const toggleCompletion = useToggleHabitCompletion();

  const [query, setQuery] = useState("");
  const [onlyNeedsAttention, setOnlyNeedsAttention] = useState(false);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitWithLogs | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetPerWeek, setTargetPerWeek] = useState(5);
  const [color, setColor] = useState("#60a5fa");
  const [dialogError, setDialogError] = useState("");

  const busy =
    createHabit.isPending ||
    updateHabit.isPending ||
    deleteHabit.isPending ||
    toggleCompletion.isPending;

  const stats = useMemo(() => {
    const targetReached = habits.filter(
      (habit) => habit.this_week_count >= habit.target_per_week
    ).length;
    const totalStreak = habits.reduce((sum, habit) => sum + habit.current_streak, 0);
    const avgStreak = habits.length > 0 ? (totalStreak / habits.length).toFixed(1) : "0.0";

    return {
      total: habits.length,
      targetReached,
      avgStreak,
    };
  }, [habits]);

  const filteredHabits = useMemo(() => {
    const q = query.trim().toLowerCase();

    return habits
      .filter((habit) => {
        if (onlyNeedsAttention && habit.this_week_count >= habit.target_per_week) {
          return false;
        }

        if (!q) {
          return true;
        }

        return (
          habit.title.toLowerCase().includes(q) ||
          habit.description.toLowerCase().includes(q)
        );
      })
      .sort(compareHabits);
  }, [habits, onlyNeedsAttention, query]);

  const openCreateDialog = () => {
    setEditingHabit(null);
    setTitle("");
    setDescription("");
    setTargetPerWeek(5);
    setColor("#60a5fa");
    setDialogError("");
    setDialogOpen(true);
  };

  const openEditDialog = (habit: HabitWithLogs) => {
    setEditingHabit(habit);
    setTitle(habit.title);
    setDescription(habit.description);
    setTargetPerWeek(habit.target_per_week);
    setColor(habit.color);
    setDialogError("");
    setDialogOpen(true);
  };

  const handleSave = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setDialogError(t("Title is required."));
      return;
    }
    setDialogError("");

    if (editingHabit) {
      updateHabit.mutate(
        {
          id: editingHabit.id,
          title: cleanTitle,
          description: description.trim(),
          target_per_week: normalizeWeeklyTarget(targetPerWeek),
          color,
        },
        {
          onSuccess: () => {
            setDialogOpen(false);
            setDialogError("");
          },
          onError: () => {
            setDialogError(t("Failed to save habit. Please try again."));
          },
        }
      );
    } else {
      createHabit.mutate(
        {
          title: cleanTitle,
          description: description.trim(),
          target_per_week: normalizeWeeklyTarget(targetPerWeek),
          color,
        },
        {
          onSuccess: () => {
            setDialogOpen(false);
            setDialogError("");
          },
          onError: () => {
            setDialogError(t("Failed to save habit. Please try again."));
          },
        }
      );
    }
  };

  const handleToggle = (habit: HabitWithLogs, date: string) => {
    const completed = habit.completed_dates.includes(date);
    toggleCompletion.mutate({
      habit_id: habit.id,
      date,
      completed: !completed,
    });
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", mt: 1 }}>
      <Box sx={{ p: { xs: 1, md: 2 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {t("Open Habits Tracker")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("Switch to routine and streak tracking")}
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<RepeatIcon />}
            onClick={openCreateDialog}
            disabled={busy}
          >
            {t("New Habit")}
          </Button>
        </Stack>

        <Stack direction="row" spacing={0} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
          <Chip label={t("Total: {count}", { count: stats.total })} variant="outlined" size="small" />
          <Chip
            label={t("Targets met: {count}", { count: stats.targetReached })}
            color="default"
            variant="outlined"
            size="small"
          />
          <Chip label={t("Avg streak: {count}d", { count: stats.avgStreak })} color="default" variant="outlined" size="small" />
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
          <Button
            variant={onlyNeedsAttention ? "contained" : "outlined"}
            color={onlyNeedsAttention ? "warning" : "inherit"}
            onClick={() => setOnlyNeedsAttention((prev) => !prev)}
          >
            {t("Needs Attention")}
          </Button>
        </Stack>
      </Box>

      <Stack spacing={1.5} sx={{ mt: 2 }}>
        {filteredHabits.map((habit) => {
          const weekProgress = Math.min(100, Math.round((habit.this_week_count / habit.target_per_week) * 100));

          return (
            <Paper key={habit.id} variant="outlined" sx={{
              p: 2,
              borderRadius: 3,
              borderColor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.08)",
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.02)"
                  : "rgba(0,0,0,0.02)",
              transition: "all 0.2s ease",
              "&:hover": {
                transform: "translateY(-1px)",
                boxShadow: "none",
              },
            }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" spacing={0} alignItems="center" sx={{ flexWrap: "wrap", gap: 1 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        bgcolor: habit.color,
                        border: "1px solid",
                        borderColor: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(255,255,255,0.15)"
                            : "rgba(0,0,0,0.10)",
                      }}
                    />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {habit.title}
                    </Typography>
                    <Chip size="small" label={`Streak: ${habit.current_streak}d`} color="info" variant="outlined" />
                    <Chip
                      size="small"
                      label={`This week: ${habit.this_week_count}/${habit.target_per_week}`}
                      color={habit.this_week_count >= habit.target_per_week ? "success" : "warning"}
                      variant="outlined"
                    />
                  </Stack>

                  {habit.description ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                      {habit.description}
                    </Typography>
                  ) : null}

                  <Box sx={{ mt: 1.5 }}>
                    <LinearProgress
                      variant="determinate"
                      value={weekProgress}
                      color={habit.this_week_count >= habit.target_per_week ? "success" : "primary"}
                      sx={{ height: 8, borderRadius: 5 }}
                    />
                  </Box>

                  <Stack direction="row" spacing={0} sx={{ mt: 1.5, flexWrap: "wrap", gap: 0.75 }}>
                    {weekDates.map((date) => {
                      const completed = habit.completed_dates.includes(date);

                      return (
                        <Chip
                          key={`${habit.id}-${date}`}
                          size="small"
                          label={toDayLabel(date)}
                          color={completed ? "success" : "default"}
                          variant={completed ? "filled" : "outlined"}
                          onClick={() => handleToggle(habit, date)}
                          clickable
                        />
                      );
                    })}
                  </Stack>
                </Box>

                <Stack direction="row" spacing={0.5}>
                  <IconButton size="small" onClick={() => openEditDialog(habit)} disabled={busy}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => deleteHabit.mutate(habit.id)}
                    disabled={busy}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </Paper>
          );
        })}

        {!isLoading && filteredHabits.length === 0 ? (
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t("No habits match current filters.")}
            </Typography>
          </Paper>
        ) : null}
      </Stack>

      <Dialog open={isDialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingHabit ? t("Edit habit") : t("Create habit")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t("Title")}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (dialogError) {
                  setDialogError("");
                }
              }}
              error={Boolean(dialogError)}
              helperText={dialogError || " "}
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
                type="number"
                label={t("Target / week")}
                value={targetPerWeek}
                onChange={(event) => setTargetPerWeek(normalizeWeeklyTarget(Number(event.target.value)))}
                inputProps={{ min: 1, max: 14, step: 1 }}
                fullWidth
              />
              <TextField
                type="color"
                label={t("Color")}
                value={color}
                onChange={(event) => setColor(event.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            {t("Cancel")}
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={busy || title.trim().length === 0}>
            {t("Save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

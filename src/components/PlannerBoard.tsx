import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import TodayIcon from "@mui/icons-material/Today";
import ChecklistIcon from "@mui/icons-material/Checklist";
import FlagIcon from "@mui/icons-material/Flag";
import RepeatIcon from "@mui/icons-material/Repeat";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AddTaskIcon from "@mui/icons-material/AddTask";
import { alpha, useTheme } from "@mui/material/styles";
import { format } from "date-fns";
import { useEntries } from "../hooks/useEntries";
import { useGoals } from "../hooks/useGoals";
import { useHabits, useToggleHabitCompletion } from "../hooks/useHabits";
import { useCreateTask, useTasks, useUpdateTaskStatus } from "../hooks/useTasks";
import { isGoalNearDeadline } from "../utils/goalUtils";
import { isTaskDueToday, isTaskOverdue } from "../utils/taskUtils";
import { useI18n } from "../i18n/I18nContext";

interface PlannerBoardProps {
  onOpenJournalToday: () => void;
  onOpenTasks: () => void;
  onOpenGoals: () => void;
  onOpenHabits: () => void;
}

export const PlannerBoard = ({
  onOpenJournalToday,
  onOpenTasks,
  onOpenGoals,
  onOpenHabits,
}: PlannerBoardProps) => {
  const { t } = useI18n();
  const muiTheme = useTheme();
  const today = format(new Date(), "yyyy-MM-dd");
  const toggleHabitCompletion = useToggleHabitCompletion();
  const updateTaskStatus = useUpdateTaskStatus();
  const createTask = useCreateTask();

  const { data: entries = [] } = useEntries();
  const { data: tasks = [] } = useTasks();
  const { data: goals = [] } = useGoals();
  const { data: habits = [] } = useHabits();

  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [quickDueToday, setQuickDueToday] = useState(true);
  const [quickTaskFeedback, setQuickTaskFeedback] = useState("");

  const todayEntryExists = useMemo(
    () => entries.some((entry) => entry.date === today),
    [entries, today]
  );

  const overdueTasks = useMemo(
    () => tasks.filter((task) => isTaskOverdue(task)).slice(0, 6),
    [tasks]
  );

  const dueTodayTasks = useMemo(
    () => tasks.filter((task) => isTaskDueToday(task)).slice(0, 6),
    [tasks]
  );

  const nearGoals = useMemo(
    () => goals.filter((goal) => isGoalNearDeadline(goal, 14)).slice(0, 6),
    [goals]
  );

  const habitsWithTodayState = useMemo(
    () =>
      habits.map((habit) => ({
        ...habit,
        doneToday: habit.completed_dates.includes(today),
      })),
    [habits, today]
  );

  const busy =
    toggleHabitCompletion.isPending ||
    updateTaskStatus.isPending ||
    createTask.isPending;

  const handleQuickAddTask = () => {
    const title = quickTaskTitle.trim();
    if (!title) {
      return;
    }

    createTask.mutate(
      {
        title,
        description: "",
        status: "todo",
        priority: "medium",
        due_date: quickDueToday ? today : null,
        time_estimate_minutes: 0,
      },
      {
        onSuccess: () => {
          setQuickTaskTitle("");
          setQuickTaskFeedback(t("Task added to board."));
        },
      }
    );
  };

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto", mt: 1 }}>
      <Paper
        sx={{
          p: 3,
          background: `linear-gradient(145deg, ${alpha(
            muiTheme.palette.primary.main,
            0.08
          )} 0%, ${alpha(muiTheme.palette.background.paper, 0.9)} 70%)`,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {t("Planner")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("Daily command center for journal, tasks, goals, and habits.")}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            <Button variant="outlined" onClick={onOpenJournalToday} startIcon={<TodayIcon />}>
              {t("Journal Today")}
            </Button>
            <Button variant="outlined" onClick={onOpenTasks} startIcon={<ChecklistIcon />}>
              {t("Open Tasks")}
            </Button>
            <Button variant="outlined" onClick={onOpenGoals} startIcon={<FlagIcon />}>
              {t("Open Goals")}
            </Button>
            <Button variant="outlined" onClick={onOpenHabits} startIcon={<RepeatIcon />}>
              {t("Open Habits")}
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
          <Chip
            label={`${t("Journal")}: ${todayEntryExists ? t("Done") : t("Missing")}`}
            color={todayEntryExists ? "success" : "warning"}
            variant="outlined"
            size="small"
          />
          <Chip label={`${t("Due today")}: ${dueTodayTasks.length}`} color="info" variant="outlined" size="small" />
          <Chip label={`${t("Overdue")}: ${overdueTasks.length}`} color={overdueTasks.length > 0 ? "error" : "default"} variant="outlined" size="small" />
          <Chip label={`${t("Goals in 14d")}: ${nearGoals.length}`} color="secondary" variant="outlined" size="small" />
          <Chip
            label={`${t("Habits done today")}: ${habitsWithTodayState.filter((habit) => habit.doneToday).length}/${habitsWithTodayState.length}`}
            color="primary"
            variant="outlined"
            size="small"
          />
        </Stack>

        <Paper
          variant="outlined"
          sx={{
            mt: 2,
            p: 2,
            borderStyle: "dashed",
            borderColor: "divider",
            bgcolor: alpha(muiTheme.palette.background.default, 0.45),
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {t("Quick Capture")}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
            {t("Capture a task without leaving the planner.")}
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <TextField
              fullWidth
              value={quickTaskTitle}
              onChange={(event) => setQuickTaskTitle(event.target.value)}
              placeholder={t("Quick task title")}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleQuickAddTask();
                }
              }}
            />
            <Button
              variant={quickDueToday ? "contained" : "outlined"}
              color={quickDueToday ? "primary" : "inherit"}
              onClick={() => setQuickDueToday((prev) => !prev)}
            >
              {t("Due today")}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddTaskIcon />}
              disabled={busy || quickTaskTitle.trim().length === 0}
              onClick={handleQuickAddTask}
            >
              {t("Add Task")}
            </Button>
          </Stack>
          {quickTaskFeedback ? (
            <Typography variant="caption" color="success.main" sx={{ display: "block", mt: 1 }}>
              {quickTaskFeedback}
            </Typography>
          ) : null}
        </Paper>
      </Paper>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ mt: 2 }}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Tasks Due Today")}
            </Typography>
            <Button size="small" onClick={onOpenTasks} endIcon={<OpenInNewIcon fontSize="small" />}>
              {t("View All")}
            </Button>
          </Stack>

          <Stack spacing={1} sx={{ mt: 1.25 }}>
            {dueTodayTasks.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t("No tasks due today.")}
              </Typography>
            ) : (
              dueTodayTasks.map((task) => (
                <Stack key={task.id} direction="row" alignItems="center" spacing={1}>
                  <Checkbox
                    size="small"
                    checked={task.status === "done"}
                    disabled={busy}
                    onChange={(event) =>
                      updateTaskStatus.mutate({
                        id: task.id,
                        status: event.target.checked ? "done" : "todo",
                      })
                    }
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{ textDecoration: task.status === "done" ? "line-through" : "none" }}
                    >
                      {task.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t("Priority: {priority}", { priority: task.priority })}
                    </Typography>
                  </Box>
                </Stack>
              ))
            )}
          </Stack>
        </Paper>

        <Paper sx={{ p: 2, flex: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Overdue Tasks")}
            </Typography>
            <Button size="small" onClick={onOpenTasks} endIcon={<OpenInNewIcon fontSize="small" />}>
              {t("Resolve")}
            </Button>
          </Stack>

          <Stack spacing={1} sx={{ mt: 1.25 }}>
            {overdueTasks.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t("No overdue tasks.")}
              </Typography>
            ) : (
              overdueTasks.map((task) => (
                <Stack key={task.id} direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                    {task.title}
                  </Typography>
                  <Chip label={task.due_date ?? t("No date")} color="error" variant="outlined" size="small" />
                </Stack>
              ))
            )}
          </Stack>
        </Paper>
      </Stack>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ mt: 2 }}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Goals Near Deadline")}
            </Typography>
            <Button size="small" onClick={onOpenGoals} endIcon={<OpenInNewIcon fontSize="small" />}>
              {t("Manage")}
            </Button>
          </Stack>

          <Stack spacing={1} sx={{ mt: 1.25 }}>
            {nearGoals.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t("No active goals with deadlines in next 14 days.")}
              </Typography>
            ) : (
              nearGoals.map((goal) => (
                <Stack key={goal.id} direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {goal.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Progress: {goal.progress}%
                    </Typography>
                  </Box>
                  <Chip label={goal.target_date ?? t("No date")} variant="outlined" size="small" />
                </Stack>
              ))
            )}
          </Stack>
        </Paper>

        <Paper sx={{ p: 2, flex: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Habits Today")}
            </Typography>
            <Button size="small" onClick={onOpenHabits} endIcon={<OpenInNewIcon fontSize="small" />}>
              {t("Track")}
            </Button>
          </Stack>

          <Stack spacing={1} sx={{ mt: 1.25 }}>
            {habitsWithTodayState.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t("No habits configured yet.")}
              </Typography>
            ) : (
              habitsWithTodayState.map((habit) => (
                <Stack key={habit.id} direction="row" alignItems="center" spacing={1}>
                  <Checkbox
                    size="small"
                    checked={habit.doneToday}
                    disabled={busy}
                    onChange={(event) =>
                      toggleHabitCompletion.mutate({
                        habit_id: habit.id,
                        date: today,
                        completed: event.target.checked,
                      })
                    }
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" noWrap>
                      {habit.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Weekly: {habit.this_week_count}/{habit.target_per_week} | Streak: {habit.current_streak}d
                    </Typography>
                  </Box>
                </Stack>
              ))
            )}
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
};

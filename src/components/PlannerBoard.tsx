import { useMemo } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import TodayIcon from "@mui/icons-material/Today";
import ChecklistIcon from "@mui/icons-material/Checklist";
import FlagIcon from "@mui/icons-material/Flag";
import RepeatIcon from "@mui/icons-material/Repeat";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { addDays, format, isBefore, parseISO, startOfDay } from "date-fns";
import { useEntries } from "../hooks/useEntries";
import { useGoals } from "../hooks/useGoals";
import { useHabits, useToggleHabitCompletion } from "../hooks/useHabits";
import { useTasks, useUpdateTaskStatus } from "../hooks/useTasks";
import { Goal, Task } from "../types";

interface PlannerBoardProps {
  onOpenJournalToday: () => void;
  onOpenTasks: () => void;
  onOpenGoals: () => void;
  onOpenHabits: () => void;
}

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

const isTaskDueToday = (task: Task) => {
  if (!task.due_date || task.status === "done") {
    return false;
  }

  return task.due_date === format(new Date(), "yyyy-MM-dd");
};

const isGoalNearDeadline = (goal: Goal, thresholdDays: number) => {
  if (!goal.target_date || goal.status === "completed" || goal.status === "archived") {
    return false;
  }

  try {
    const target = startOfDay(parseISO(goal.target_date));
    const today = startOfDay(new Date());
    const threshold = startOfDay(addDays(today, thresholdDays));

    return target >= today && target <= threshold;
  } catch {
    return false;
  }
};

export const PlannerBoard = ({
  onOpenJournalToday,
  onOpenTasks,
  onOpenGoals,
  onOpenHabits,
}: PlannerBoardProps) => {
  const today = format(new Date(), "yyyy-MM-dd");
  const toggleHabitCompletion = useToggleHabitCompletion();
  const updateTaskStatus = useUpdateTaskStatus();

  const { data: entries = [] } = useEntries();
  const { data: tasks = [] } = useTasks();
  const { data: goals = [] } = useGoals();
  const { data: habits = [] } = useHabits();

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

  const busy = toggleHabitCompletion.isPending || updateTaskStatus.isPending;

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
              Planner
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Daily command center for journal, tasks, goals, and habits.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            <Button variant="outlined" onClick={onOpenJournalToday} startIcon={<TodayIcon />}>
              Journal Today
            </Button>
            <Button variant="outlined" onClick={onOpenTasks} startIcon={<ChecklistIcon />}>
              Open Tasks
            </Button>
            <Button variant="outlined" onClick={onOpenGoals} startIcon={<FlagIcon />}>
              Open Goals
            </Button>
            <Button variant="outlined" onClick={onOpenHabits} startIcon={<RepeatIcon />}>
              Open Habits
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
          <Chip label={todayEntryExists ? "Journal: Done" : "Journal: Missing"} color={todayEntryExists ? "success" : "warning"} variant="outlined" size="small" />
          <Chip label={`Due today: ${dueTodayTasks.length}`} color="info" variant="outlined" size="small" />
          <Chip label={`Overdue: ${overdueTasks.length}`} color={overdueTasks.length > 0 ? "error" : "default"} variant="outlined" size="small" />
          <Chip label={`Goals in 14d: ${nearGoals.length}`} color="secondary" variant="outlined" size="small" />
          <Chip
            label={`Habits done today: ${habitsWithTodayState.filter((habit) => habit.doneToday).length}/${habitsWithTodayState.length}`}
            color="primary"
            variant="outlined"
            size="small"
          />
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ mt: 2 }}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Tasks Due Today
            </Typography>
            <Button size="small" onClick={onOpenTasks} endIcon={<OpenInNewIcon fontSize="small" />}>
              View All
            </Button>
          </Stack>

          <Stack spacing={1} sx={{ mt: 1.25 }}>
            {dueTodayTasks.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No tasks due today.
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
                      Priority: {task.priority}
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
              Overdue Tasks
            </Typography>
            <Button size="small" onClick={onOpenTasks} endIcon={<OpenInNewIcon fontSize="small" />}>
              Resolve
            </Button>
          </Stack>

          <Stack spacing={1} sx={{ mt: 1.25 }}>
            {overdueTasks.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No overdue tasks.
              </Typography>
            ) : (
              overdueTasks.map((task) => (
                <Stack key={task.id} direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                    {task.title}
                  </Typography>
                  <Chip label={task.due_date ?? "No date"} color="error" variant="outlined" size="small" />
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
              Goals Near Deadline
            </Typography>
            <Button size="small" onClick={onOpenGoals} endIcon={<OpenInNewIcon fontSize="small" />}>
              Manage
            </Button>
          </Stack>

          <Stack spacing={1} sx={{ mt: 1.25 }}>
            {nearGoals.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No active goals with deadlines in next 14 days.
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
                  <Chip label={goal.target_date ?? "No date"} variant="outlined" size="small" />
                </Stack>
              ))
            )}
          </Stack>
        </Paper>

        <Paper sx={{ p: 2, flex: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Habits Today
            </Typography>
            <Button size="small" onClick={onOpenHabits} endIcon={<OpenInNewIcon fontSize="small" />}>
              Track
            </Button>
          </Stack>

          <Stack spacing={1} sx={{ mt: 1.25 }}>
            {habitsWithTodayState.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No habits configured yet.
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

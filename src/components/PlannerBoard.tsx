import { useEffect, useMemo, useState } from "react";
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
import { addDays, format } from "date-fns";
import { useEntries } from "../hooks/useEntries";
import { useGoals } from "../hooks/useGoals";
import { useHabits, useToggleHabitCompletion } from "../hooks/useHabits";
import { useCreateTask, useTasks, useUpdateTaskStatus } from "../hooks/useTasks";
import { isGoalNearDeadline } from "../utils/goalUtils";
import { isTaskDueToday, isTaskOverdue } from "../utils/taskUtils";
import { useI18n } from "../i18n/I18nContext";
import { useAppNotifications } from "../notifications/AppNotifications";
import { sendNotification } from "@tauri-apps/plugin-notification";

const DAILY_WINS_STORAGE_KEY = "devJournal_daily_wins";

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
  const { notify } = useAppNotifications();
  const muiTheme = useTheme();
  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const toggleHabitCompletion = useToggleHabitCompletion();
  const updateTaskStatus = useUpdateTaskStatus();
  const createTask = useCreateTask();

  const { data: entries = [] } = useEntries();
  const { data: tasks = [] } = useTasks();
  const { data: goals = [] } = useGoals();
  const { data: habits = [] } = useHabits();

  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [quickDueMode, setQuickDueMode] = useState<"today" | "tomorrow" | "none">("today");
  const [quickTaskFeedback, setQuickTaskFeedback] = useState("");
  const [focusSecondsLeft, setFocusSecondsLeft] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  const [dailyWinsInput, setDailyWinsInput] = useState("");
  const [dailyWinsMap, setDailyWinsMap] = useState<Record<string, string[]>>(() => {
    try {
      const raw = localStorage.getItem(DAILY_WINS_STORAGE_KEY);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw) as Record<string, string[]>;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });

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

  const dueTomorrowTasks = useMemo(
    () => tasks.filter((task) => task.due_date === tomorrow && task.status !== "done").slice(0, 6),
    [tasks, tomorrow]
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

  const dailyWins = dailyWinsMap[today] ?? [];
  const plannerCardSx = {
    p: { xs: 2, sm: 2.5 },
    border: "1px solid",
    borderColor: "divider",
    bgcolor: alpha(muiTheme.palette.background.paper, 0.88),
    backdropFilter: "blur(4px)",
  };

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
        due_date: quickDueMode === "today" ? today : quickDueMode === "tomorrow" ? tomorrow : null,
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

  const formatFocusTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const sec = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${sec}`;
  };

  const persistDailyWins = (nextMap: Record<string, string[]>) => {
    setDailyWinsMap(nextMap);
    localStorage.setItem(DAILY_WINS_STORAGE_KEY, JSON.stringify(nextMap));
  };

  const handleAddDailyWin = () => {
    const value = dailyWinsInput.trim();
    if (!value) {
      return;
    }
    const nextMap = { ...dailyWinsMap, [today]: [value, ...dailyWins].slice(0, 7) };
    persistDailyWins(nextMap);
    setDailyWinsInput("");
  };

  const handleRemoveDailyWin = (index: number) => {
    const nextWins = dailyWins.filter((_, itemIndex) => itemIndex !== index);
    const nextMap = { ...dailyWinsMap, [today]: nextWins };
    persistDailyWins(nextMap);
  };

  useEffect(() => {
    let timer: number | undefined;
    if (focusRunning) {
      timer = window.setInterval(() => {
        setFocusSecondsLeft((prev) => {
          if (prev <= 1) {
            if (timer) {
              window.clearInterval(timer);
            }
            setFocusRunning(false);
            notify("Focus session completed.", "success");
            sendNotification({
              title: "Dev Journal",
              body: "Focus session completed.",
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, [focusRunning, notify]);

  return (
    <Box sx={{ maxWidth: 1360, mx: "auto", mt: { xs: 1.5, md: 2 }, pb: 2 }}>
      <Paper
        sx={{
          p: { xs: 2.25, md: 3.25 },
          border: "1px solid",
          borderColor: "divider",
          background: `linear-gradient(145deg, ${alpha(
            muiTheme.palette.primary.main,
            0.08
          )} 0%, ${alpha(muiTheme.palette.background.paper, 0.9)} 70%)`,
          boxShadow: `0 18px 34px ${alpha(muiTheme.palette.common.black, 0.12)}`,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 2, md: 3 }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <Box sx={{ maxWidth: 600 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {t("Planner")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("Daily command center for journal, tasks, goals, and habits.")}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              width: { xs: "100%", md: 560 },
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
              gap: 1.25,
            }}
          >
            <Button
              variant="outlined"
              onClick={onOpenJournalToday}
              startIcon={<TodayIcon />}
              sx={{ justifyContent: "flex-start", py: 1.1 }}
            >
              {t("Journal Today")}
            </Button>
            <Button
              variant="outlined"
              onClick={onOpenTasks}
              startIcon={<ChecklistIcon />}
              sx={{ justifyContent: "flex-start", py: 1.1 }}
            >
              {t("Open Tasks")}
            </Button>
            <Button
              variant="outlined"
              onClick={onOpenGoals}
              startIcon={<FlagIcon />}
              sx={{ justifyContent: "flex-start", py: 1.1 }}
            >
              {t("Open Goals")}
            </Button>
            <Button
              variant="outlined"
              onClick={onOpenHabits}
              startIcon={<RepeatIcon />}
              sx={{ justifyContent: "flex-start", py: 1.1 }}
            >
              {t("Open Habits")}
            </Button>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2.5, flexWrap: "wrap", rowGap: 1, columnGap: 1 }}>
          <Chip
            label={`${t("Journal")}: ${todayEntryExists ? t("Done") : t("Missing")}`}
            color={todayEntryExists ? "success" : "warning"}
            variant="outlined"
            size="small"
          />
          <Chip label={`${t("Due today")}: ${dueTodayTasks.length}`} color="info" variant="outlined" size="small" />
          <Chip label={`${t("Due tomorrow")}: ${dueTomorrowTasks.length}`} color="secondary" variant="outlined" size="small" />
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
            mt: 2.5,
            p: { xs: 2, md: 2.5 },
            borderStyle: "dashed",
            borderColor: alpha(muiTheme.palette.primary.main, 0.32),
            bgcolor: alpha(muiTheme.palette.background.default, 0.55),
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {t("Quick Capture")}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.75 }}>
            {t("Capture a task without leaving the planner.")}
          </Typography>
          <Stack spacing={1.5}>
            <TextField
              fullWidth
              size="medium"
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
            <Stack direction={{ xs: "column", lg: "row" }} spacing={1.25}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
                  gap: 1.25,
                  flex: 1,
                }}
              >
                <Button
                  fullWidth
                  variant={quickDueMode === "today" ? "contained" : "outlined"}
                  color={quickDueMode === "today" ? "primary" : "inherit"}
                  onClick={() => setQuickDueMode("today")}
                  sx={{ py: 1 }}
                >
                  {t("Due today")}
                </Button>
                <Button
                  fullWidth
                  variant={quickDueMode === "tomorrow" ? "contained" : "outlined"}
                  color={quickDueMode === "tomorrow" ? "secondary" : "inherit"}
                  onClick={() => setQuickDueMode("tomorrow")}
                  sx={{ py: 1 }}
                >
                  {t("Due tomorrow")}
                </Button>
                <Button
                  fullWidth
                  variant={quickDueMode === "none" ? "contained" : "outlined"}
                  color="inherit"
                  onClick={() => setQuickDueMode("none")}
                  sx={{ py: 1 }}
                >
                  {t("No due date")}
                </Button>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddTaskIcon />}
                disabled={busy || quickTaskTitle.trim().length === 0}
                onClick={handleQuickAddTask}
                sx={{ minWidth: { lg: 176 }, py: 1.1 }}
              >
                {t("Add Task")}
              </Button>
            </Stack>
          </Stack>
          {quickTaskFeedback ? (
            <Typography variant="caption" color="success.main" sx={{ display: "block", mt: 1 }}>
              {quickTaskFeedback}
            </Typography>
          ) : null}
        </Paper>
      </Paper>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5} sx={{ mt: 2.5 }}>
        <Paper sx={{ ...plannerCardSx, flex: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Tasks Due Today")}
            </Typography>
            <Button size="small" onClick={onOpenTasks} endIcon={<OpenInNewIcon fontSize="small" />}>
              {t("View All")}
            </Button>
          </Stack>

          <Stack spacing={1.25} sx={{ mt: 1.5 }}>
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

        <Paper sx={{ ...plannerCardSx, flex: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Overdue Tasks")}
            </Typography>
            <Button size="small" onClick={onOpenTasks} endIcon={<OpenInNewIcon fontSize="small" />}>
              {t("Resolve")}
            </Button>
          </Stack>

          <Stack spacing={1.25} sx={{ mt: 1.5 }}>
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

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5} sx={{ mt: 2.5 }}>
        <Paper sx={{ ...plannerCardSx, flex: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Goals Near Deadline")}
            </Typography>
            <Button size="small" onClick={onOpenGoals} endIcon={<OpenInNewIcon fontSize="small" />}>
              {t("Manage")}
            </Button>
          </Stack>

          <Stack spacing={1.25} sx={{ mt: 1.5 }}>
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

        <Paper sx={{ ...plannerCardSx, flex: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Habits Today")}
            </Typography>
            <Button size="small" onClick={onOpenHabits} endIcon={<OpenInNewIcon fontSize="small" />}>
              {t("Track")}
            </Button>
          </Stack>

          <Stack spacing={1.25} sx={{ mt: 1.5 }}>
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

      <Paper sx={{ ...plannerCardSx, mt: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t("Tomorrow Plan")}
          </Typography>
          <Chip size="small" color="secondary" variant="outlined" label={`${dueTomorrowTasks.length} ${t("Tasks")}`} />
        </Stack>
        <Stack spacing={1.25} sx={{ mt: 1.5 }}>
          {dueTomorrowTasks.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("No tasks planned for tomorrow yet.")}
            </Typography>
          ) : (
            dueTomorrowTasks.map((task) => (
              <Stack key={task.id} direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                  {task.title}
                </Typography>
                <Chip size="small" variant="outlined" label={task.priority} />
              </Stack>
            ))
          )}
        </Stack>
      </Paper>

      <Paper sx={{ ...plannerCardSx, mt: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t("Focus Session")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t("Run a focused 25-minute sprint directly from planner.")}
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "stretch", sm: "center" }}>
          <Chip size="medium" color={focusRunning ? "warning" : "default"} label={formatFocusTime(focusSecondsLeft)} />
          <Button variant={focusRunning ? "outlined" : "contained"} onClick={() => setFocusRunning((prev) => !prev)}>
            {focusRunning ? t("Pause") : t("Start Focus")}
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setFocusRunning(false);
              setFocusSecondsLeft(25 * 60);
            }}
          >
            {t("Reset")}
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ ...plannerCardSx, mt: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t("Daily Wins")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t("Log small wins to keep momentum visible and measurable.")}
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
          <TextField
            fullWidth
            size="small"
            value={dailyWinsInput}
            onChange={(event) => setDailyWinsInput(event.target.value)}
            placeholder={t("Example: shipped onboarding empty-state fix")}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAddDailyWin();
              }
            }}
          />
          <Button variant="contained" onClick={handleAddDailyWin} disabled={dailyWinsInput.trim().length === 0}>
            {t("Add win")}
          </Button>
        </Stack>
        <Stack spacing={0.9} sx={{ mt: 1.5 }}>
          {dailyWins.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("No wins logged yet today.")}
            </Typography>
          ) : (
            dailyWins.map((item, index) => (
              <Stack key={`${item}-${index}`} direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Typography variant="body2" sx={{ minWidth: 0 }}>
                  • {item}
                </Typography>
                <Button size="small" color="error" onClick={() => handleRemoveDailyWin(index)}>
                  {t("Delete")}
                </Button>
              </Stack>
            ))
          )}
        </Stack>
      </Paper>
    </Box>
  );
};

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AddTaskIcon from "@mui/icons-material/AddTask";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { alpha, useTheme } from "@mui/material/styles";
import { addDays, format } from "date-fns";
import { useEntries } from "../hooks/useEntries";
import { useGoals } from "../hooks/useGoals";
import { useHabits, useToggleHabitCompletion } from "../hooks/useHabits";
import { useProjects } from "../hooks/useProjects";
import { useCreateTask, useTasks, useUpdateTaskStatus } from "../hooks/useTasks";
import { isGoalNearDeadline } from "../utils/goalUtils";
import { isTaskDueToday, isTaskOverdue } from "../utils/taskUtils";
import { useI18n } from "../i18n/I18nContext";
import { useAppNotifications } from "../notifications/AppNotifications";
import { sendNotification } from "@tauri-apps/plugin-notification";

const DAILY_WINS_STORAGE_KEY = "devJournal_daily_wins";
const PLANNER_COLLAPSE_STORAGE_KEY = "devJournal_planner_collapsed_sections";

type PlannerSectionKey =
  | "tasksToday"
  | "overdueTasks"
  | "goalsNearDeadline"
  | "habitsToday"
  | "tomorrowPlan"
  | "focusSession"
  | "dailyWins";

interface PlannerBoardProps {
  onOpenTasks: () => void;
  onOpenGoals: () => void;
  onOpenHabits: () => void;
  onOpenProjects: () => void;
}

export const PlannerBoard = ({
  onOpenTasks,
  onOpenGoals,
  onOpenHabits,
  onOpenProjects,
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
  const { data: projects = [] } = useProjects();

  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [quickDueMode, setQuickDueMode] = useState<"today" | "tomorrow" | "none">("today");
  const [quickProjectId, setQuickProjectId] = useState<number | "">("");
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
  const [collapsedSections, setCollapsedSections] = useState<Partial<Record<PlannerSectionKey, boolean>>>(() => {
    try {
      const raw = localStorage.getItem(PLANNER_COLLAPSE_STORAGE_KEY);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw) as Partial<Record<PlannerSectionKey, boolean>>;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });



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

  const projectHubItems = useMemo(() => {
    return projects
      .filter((project) => project.status !== "archived")
      .map((project) => {
        const projectTasks = tasks.filter((task) => task.project_id === project.id);
        const openTasks = projectTasks.filter((task) => task.status !== "done").length;
        const doneTasks = projectTasks.filter((task) => task.status === "done").length;
        const projectGoals = goals.filter((goal) => goal.project_id === project.id).length;
        const projectEntries = entries.filter((entry) => entry.project_id === project.id).length;
        return {
          id: project.id,
          name: project.name,
          color: project.color,
          openTasks,
          doneTasks,
          projectGoals,
          projectEntries,
        };
      })
      .sort((a, b) => b.openTasks - a.openTasks)
      .slice(0, 6);
  }, [entries, goals, projects, tasks]);

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
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
    border: "1px solid",
    borderColor: "divider",
    bgcolor: alpha(muiTheme.palette.background.paper, 0.7),
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
        project_id: quickProjectId === "" ? null : quickProjectId,
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

  const isSectionCollapsed = (section: PlannerSectionKey) => Boolean(collapsedSections[section]);

  const toggleSection = (section: PlannerSectionKey) => {
    setCollapsedSections((previous) => {
      const next = { ...previous, [section]: !previous[section] };
      localStorage.setItem(PLANNER_COLLAPSE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const renderSectionToggle = (section: PlannerSectionKey) => (
    <IconButton
      size="small"
      onClick={() => toggleSection(section)}
      aria-label={isSectionCollapsed(section) ? t("Expand section") : t("Collapse section")}
      title={isSectionCollapsed(section) ? t("Expand section") : t("Collapse section")}
      sx={{ opacity: 0.5, "&:hover": { opacity: 1 } }}
    >
      {isSectionCollapsed(section) ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
    </IconButton>
  );

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
    <Box sx={{ maxWidth: 1200, mx: "auto", mt: { xs: 1, md: 1.5 }, pb: 4 }}>
      {/* ── Header ── */}
      <Box sx={{ mb: { xs: 3, md: 4 } }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          {t("Planner")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("Daily command center for journal, tasks, goals, and habits.")}
        </Typography>
      </Box>

      {/* ── Quick Capture (compact, inline) ── */}
      <Box
        sx={{
          mb: { xs: 3, md: 4 },
          p: { xs: 2, md: 2.5 },
          borderRadius: 3,
          border: "1px solid",
          borderColor: alpha(muiTheme.palette.primary.main, 0.18),
          bgcolor: alpha(muiTheme.palette.background.paper, 0.7),
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
          {t("Quick Capture")}
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "flex-start" }}>
          <TextField
            fullWidth
            size="small"
            value={quickTaskTitle}
            onChange={(event) => setQuickTaskTitle(event.target.value)}
            placeholder={t("Quick task title")}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleQuickAddTask();
              }
            }}
            sx={{ flex: 2 }}
          />
          <TextField
            select
            size="small"
            value={quickProjectId === "" ? "" : String(quickProjectId)}
            onChange={(event) => {
              const nextValue = event.target.value;
              setQuickProjectId(nextValue === "" ? "" : Number(nextValue));
            }}
            SelectProps={{ native: true }}
            sx={{ minWidth: 160, flex: 0.8 }}
          >
            <option value="">{t("No project")}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </TextField>
          <Stack direction="row" spacing={0.5}>
            {(["today", "tomorrow", "none"] as const).map((mode) => (
              <Chip
                key={mode}
                label={mode === "today" ? t("Today") : mode === "tomorrow" ? t("Tomorrow") : t("No date")}
                size="small"
                color={quickDueMode === mode ? "primary" : "default"}
                variant={quickDueMode === mode ? "filled" : "outlined"}
                onClick={() => setQuickDueMode(mode)}
                sx={{ cursor: "pointer" }}
              />
            ))}
          </Stack>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddTaskIcon />}
            disabled={busy || quickTaskTitle.trim().length === 0}
            onClick={handleQuickAddTask}
            sx={{ minWidth: 120, whiteSpace: "nowrap" }}
          >
            {t("Add Task")}
          </Button>
        </Stack>
        {quickTaskFeedback ? (
          <Typography variant="caption" color="success.main" sx={{ display: "block", mt: 1 }}>
            {quickTaskFeedback}
          </Typography>
        ) : null}
      </Box>

      {/* ── Project Hub (only if projects exist) ── */}
      {projectHubItems.length > 0 && (
        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Project Hub")}
            </Typography>
            <Button size="small" onClick={onOpenProjects} sx={{ textTransform: "none" }}>
              {t("View All")} ({projects.length})
            </Button>
          </Stack>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" },
              gap: 2,
            }}
          >
            {projectHubItems.map((project) => (
              <Box
                key={project.id}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  border: "1px solid",
                  borderColor: alpha(project.color || muiTheme.palette.divider, 0.4),
                  borderLeft: `3px solid ${project.color || muiTheme.palette.primary.main}`,
                  bgcolor: alpha(muiTheme.palette.background.paper, 0.6),
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                  {project.name}
                </Typography>
                <Stack direction="row" spacing={1.5}>
                  <Typography variant="caption" color="text.secondary">
                    {t("Open Tasks")}: {project.openTasks}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t("Done")}: {project.doneTasks}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t("Goals")}: {project.projectGoals}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* ── Dashboard Grid ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: { xs: 2.5, md: 3 },
        }}
      >
        {/* Tasks Due Today */}
        <Box sx={{ ...plannerCardSx }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Tasks Due Today")}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Button size="small" onClick={onOpenTasks} endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />} sx={{ textTransform: "none" }}>
                {t("View All")}
              </Button>
              {renderSectionToggle("tasksToday")}
            </Stack>
          </Stack>
          <Collapse in={!isSectionCollapsed("tasksToday")} timeout="auto" unmountOnExit>
            <Stack spacing={1} sx={{ mt: 2 }}>
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
                        {task.priority}
                      </Typography>
                    </Box>
                  </Stack>
                ))
              )}
            </Stack>
          </Collapse>
        </Box>

        {/* Overdue Tasks */}
        <Box sx={{ ...plannerCardSx }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Overdue Tasks")}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Button size="small" onClick={onOpenTasks} endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />} sx={{ textTransform: "none" }}>
                {t("Resolve")}
              </Button>
              {renderSectionToggle("overdueTasks")}
            </Stack>
          </Stack>
          <Collapse in={!isSectionCollapsed("overdueTasks")} timeout="auto" unmountOnExit>
            <Stack spacing={1} sx={{ mt: 2 }}>
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
          </Collapse>
        </Box>

        {/* Goals Near Deadline */}
        <Box sx={{ ...plannerCardSx }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Goals Near Deadline")}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Button size="small" onClick={onOpenGoals} endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />} sx={{ textTransform: "none" }}>
                {t("Manage")}
              </Button>
              {renderSectionToggle("goalsNearDeadline")}
            </Stack>
          </Stack>
          <Collapse in={!isSectionCollapsed("goalsNearDeadline")} timeout="auto" unmountOnExit>
            <Stack spacing={1} sx={{ mt: 2 }}>
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
                        {goal.progress}%
                      </Typography>
                    </Box>
                    <Chip label={goal.target_date ?? t("No date")} variant="outlined" size="small" />
                  </Stack>
                ))
              )}
            </Stack>
          </Collapse>
        </Box>

        {/* Habits Today */}
        <Box sx={{ ...plannerCardSx }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Habits Today")}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Button size="small" onClick={onOpenHabits} endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />} sx={{ textTransform: "none" }}>
                {t("Track")}
              </Button>
              {renderSectionToggle("habitsToday")}
            </Stack>
          </Stack>
          <Collapse in={!isSectionCollapsed("habitsToday")} timeout="auto" unmountOnExit>
            <Stack spacing={1} sx={{ mt: 2 }}>
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
                        {habit.this_week_count}/{habit.target_per_week} weekly · {habit.current_streak}d streak
                      </Typography>
                    </Box>
                  </Stack>
                ))
              )}
            </Stack>
          </Collapse>
        </Box>
      </Box>

      {/* ── Tomorrow Plan ── */}
      <Box sx={{ ...plannerCardSx, mt: { xs: 2.5, md: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t("Tomorrow Plan")}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="caption" color="text.secondary">
              {dueTomorrowTasks.length} {t("Tasks")}
            </Typography>
            {renderSectionToggle("tomorrowPlan")}
          </Stack>
        </Stack>
        <Collapse in={!isSectionCollapsed("tomorrowPlan")} timeout="auto" unmountOnExit>
          <Stack spacing={1} sx={{ mt: 2 }}>
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
        </Collapse>
      </Box>

      {/* ── Focus & Wins side-by-side ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: { xs: 2.5, md: 3 },
          mt: { xs: 2.5, md: 3 },
        }}
      >
        {/* Focus Session */}
        <Box sx={{ ...plannerCardSx }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Focus Session")}
            </Typography>
            {renderSectionToggle("focusSession")}
          </Stack>
          <Collapse in={!isSectionCollapsed("focusSession")} timeout="auto" unmountOnExit>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2 }}>
              <Chip size="medium" color={focusRunning ? "warning" : "default"} label={formatFocusTime(focusSecondsLeft)} />
              <Button size="small" variant={focusRunning ? "outlined" : "contained"} onClick={() => setFocusRunning((prev) => !prev)}>
                {focusRunning ? t("Pause") : t("Start Focus")}
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setFocusRunning(false);
                  setFocusSecondsLeft(25 * 60);
                }}
              >
                {t("Reset")}
              </Button>
            </Stack>
          </Collapse>
        </Box>

        {/* Daily Wins */}
        <Box sx={{ ...plannerCardSx }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Daily Wins")}
            </Typography>
            {renderSectionToggle("dailyWins")}
          </Stack>
          <Collapse in={!isSectionCollapsed("dailyWins")} timeout="auto" unmountOnExit>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
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
              <Button variant="contained" size="small" onClick={handleAddDailyWin} disabled={dailyWinsInput.trim().length === 0}>
                {t("Add win")}
              </Button>
            </Stack>
            <Stack spacing={0.75} sx={{ mt: 1.5 }}>
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
          </Collapse>
        </Box>
      </Box>
    </Box>
  );
};

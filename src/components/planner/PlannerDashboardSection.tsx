import AddTaskIcon from "@mui/icons-material/AddTask";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { format } from "date-fns";
import type { Task } from "../../types";

interface PlannerDashboardSectionProps {
  busy: boolean;
  focusSessionsToday: number;
  habitsWithTodayState: Array<{
    id: number;
    title: string;
    target_per_week: number;
    this_week_count: number;
    current_streak: number;
    doneToday: boolean;
  }>;
  isDark: boolean;
  onHabitToggle: (habitId: number, completed: boolean) => void;
  onOpenFocus: () => void;
  onOpenHabits: () => void;
  onOpenTasks: () => void;
  onQuickTaskProjectChange: (value: string) => void;
  onQuickTaskTitleChange: (value: string) => void;
  onQuickTaskDueModeChange: (value: "today" | "tomorrow" | "none") => void;
  onSubmitQuickTask: () => void;
  plannerInsetCardSx: SxProps<Theme>;
  plannerOverviewStats: Array<{ label: string; value: string | number }>;
  plannerSurfaceSx: SxProps<Theme>;
  priorityTasks: Task[];
  projects: Array<{ id: number; name: string }>;
  quickDueMode: "today" | "tomorrow" | "none";
  quickProjectId: number | "";
  quickTaskFeedback: string;
  quickTaskFeedbackTone: "success" | "error";
  quickTaskTitle: string;
  t: (key: string, variables?: Record<string, string | number>) => string;
  todayMeetings: Array<{
    title: string;
    start: Date;
    end: Date;
    meeting: { participants: string[] };
  }>;
  updateTaskStatus: (task: Task, checked: boolean) => void;
}

export const PlannerDashboardSection = ({
  busy,
  focusSessionsToday,
  habitsWithTodayState,
  isDark,
  onHabitToggle,
  onOpenFocus,
  onOpenHabits,
  onOpenTasks,
  onQuickTaskProjectChange,
  onQuickTaskTitleChange,
  onQuickTaskDueModeChange,
  onSubmitQuickTask,
  plannerInsetCardSx,
  plannerOverviewStats,
  plannerSurfaceSx,
  priorityTasks,
  projects,
  quickDueMode,
  quickProjectId,
  quickTaskFeedback,
  quickTaskFeedbackTone,
  quickTaskTitle,
  t,
  todayMeetings,
  updateTaskStatus,
}: PlannerDashboardSectionProps) => {
  return (
    <Box sx={{ ...plannerSurfaceSx, p: { xs: 2, sm: 2.25 }, mb: { xs: 1.75, md: 2.25 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {t("Today Dashboard")}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
          {format(new Date(), "EEE, MMM d")}
        </Typography>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
          },
          gap: 0.95,
        }}
      >
        {plannerOverviewStats.map((card) => (
          <Box
            key={card.label}
            sx={{
              p: { xs: 1, sm: 1.1 },
              minHeight: { xs: 84, sm: 94 },
              borderRadius: 2.6,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: "0.64rem", lineHeight: 1.15, letterSpacing: "0.08em", textTransform: "uppercase" }}
            >
              {card.label}
            </Typography>
            <Typography
              variant="body1"
              sx={{ fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: "tabular-nums", fontSize: { xs: "1.35rem", sm: "1.5rem" }, letterSpacing: "-0.04em" }}
            >
              {card.value}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          mt: 1.5,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1.2fr) minmax(320px, 0.9fr)" },
          gap: 1.25,
        }}
      >
        <Box sx={plannerInsetCardSx}>
          <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.65, display: "block", letterSpacing: "0.08em", textTransform: "uppercase", color: "text.secondary" }}>
            {t("Priority Stack")}
          </Typography>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t("Open Tasks")}: {priorityTasks.length}
            </Typography>
            <Button size="small" onClick={onOpenTasks} endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />} sx={{ textTransform: "none" }}>
              {t("View All")}
            </Button>
          </Stack>
          <Stack spacing={0.75}>
            {priorityTasks.slice(0, 4).map((task) => (
              <Stack key={task.id} direction="row" alignItems="center" spacing={1}>
                <Checkbox
                  size="small"
                  checked={task.status === "done"}
                  disabled={busy}
                  onChange={(event) => updateTaskStatus(task, event.target.checked)}
                />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                    {task.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {task.due_date ? t("Due: {date}", { date: task.due_date }) : t(task.priority)}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  variant={task.status === "in_progress" ? "filled" : "outlined"}
                  color={task.status === "in_progress" ? "primary" : task.priority === "urgent" ? "error" : "default"}
                  label={task.status === "in_progress" ? t("In Progress") : t(task.priority)}
                  sx={{ height: 22 }}
                />
              </Stack>
            ))}
            {priorityTasks.length === 0 ? (
              <Typography variant="caption" color="text.secondary">
                {t("No open tasks to focus on right now.")}
              </Typography>
            ) : null}
            {priorityTasks.length > 4 ? (
              <Typography variant="caption" color="text.secondary">
                +{priorityTasks.length - 4}
              </Typography>
            ) : null}
          </Stack>
        </Box>

        <Stack spacing={1.25}>
          <Box sx={plannerInsetCardSx}>
            <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.8, display: "block", letterSpacing: "0.08em", textTransform: "uppercase", color: "text.secondary" }}>
              {t("Quick Capture")}
            </Typography>
            <Box
              sx={{
                display: "grid",
                gap: 1,
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                },
              }}
            >
              <TextField
                fullWidth
                size="small"
                value={quickTaskTitle}
                onChange={(event) => onQuickTaskTitleChange(event.target.value)}
                placeholder={t("Quick task title")}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSubmitQuickTask();
                  }
                }}
                sx={{ gridColumn: { sm: "1 / -1" } }}
              />
              <TextField
                select
                size="small"
                value={quickProjectId === "" ? "" : String(quickProjectId)}
                onChange={(event) => onQuickTaskProjectChange(event.target.value)}
                SelectProps={{ native: true }}
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
                size="small"
                label={t("Due")}
                value={quickDueMode}
                onChange={(event) => onQuickTaskDueModeChange(event.target.value as "today" | "tomorrow" | "none")}
                SelectProps={{ native: true }}
              >
                <option value="today">{t("Today")}</option>
                <option value="tomorrow">{t("Tomorrow")}</option>
                <option value="none">{t("No date")}</option>
              </TextField>
            </Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
              {quickTaskFeedback ? (
                <Typography variant="caption" color={quickTaskFeedbackTone === "error" ? "error.main" : "success.main"}>
                  {quickTaskFeedback}
                </Typography>
              ) : (
                <span />
              )}
              <Button
                variant="contained"
                size="small"
                startIcon={<AddTaskIcon />}
                disabled={busy || quickTaskTitle.trim().length === 0}
                onClick={onSubmitQuickTask}
              >
                {t("Add Task")}
              </Button>
            </Stack>
          </Box>

          <Box sx={plannerInsetCardSx}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, display: "block", letterSpacing: "0.08em", textTransform: "uppercase", color: "text.secondary" }}>
                {t("Next Meeting")}
              </Typography>
              <Button size="small" onClick={onOpenFocus} sx={{ textTransform: "none" }}>
                {t("Focus Session")}
              </Button>
            </Stack>
            {todayMeetings[0] ? (
              <Box sx={{ mb: 1.2 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {todayMeetings[0].title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {format(todayMeetings[0].start, "HH:mm")} – {format(todayMeetings[0].end, "HH:mm")}
                  {todayMeetings[0].meeting.participants.length > 0 && ` · ${todayMeetings[0].meeting.participants.slice(0, 2).join(", ")}`}
                </Typography>
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.2 }}>
                {t("No meetings scheduled for today.")}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              {t("Focus sessions today")}: {focusSessionsToday}
            </Typography>
          </Box>

          <Box sx={plannerInsetCardSx}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, display: "block", letterSpacing: "0.08em", textTransform: "uppercase", color: "text.secondary" }}>
                {t("Habits Today")}
              </Typography>
              <Button size="small" onClick={onOpenHabits} endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />} sx={{ textTransform: "none" }}>
                {t("Track")}
              </Button>
            </Stack>
            <Stack spacing={0.75}>
              {habitsWithTodayState.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t("No habits configured yet.")}
                </Typography>
              ) : (
                habitsWithTodayState.slice(0, 4).map((habit) => (
                  <Stack key={habit.id} direction="row" alignItems="center" spacing={1}>
                    <Checkbox
                      size="small"
                      checked={habit.doneToday}
                      disabled={busy}
                      onChange={(event) => onHabitToggle(habit.id, event.target.checked)}
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
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};

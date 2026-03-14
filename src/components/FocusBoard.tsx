import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Chip,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { addDays, format, startOfWeek } from "date-fns";
import { useTasks, useUpdateTaskStatus } from "../hooks/useTasks";
import { useI18n } from "../i18n/I18nContext";
import { useAppNotifications } from "../notifications/AppNotifications";
import { sendNotification } from "@tauri-apps/plugin-notification";
import { invoke } from "@tauri-apps/api/core";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SkipNextRoundedIcon from "@mui/icons-material/SkipNextRounded";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";

const FOCUS_SESSIONS_STORAGE_KEY = "devJournal_focus_sessions";

const FOCUS_DURATION_PRESETS = [
  { label: "25m", minutes: 25 },
  { label: "50m", minutes: 50 },
  { label: "90m", minutes: 90 },
] as const;

const BREAK_DURATION_PRESETS = [
  { label: "5m", minutes: 5 },
  { label: "10m", minutes: 10 },
  { label: "15m", minutes: 15 },
] as const;

export const FocusBoard = () => {
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === "dark";
  const { t } = useI18n();
  const { notify } = useAppNotifications();
  const { data: tasks = [] } = useTasks();
  const updateTaskStatus = useUpdateTaskStatus();

  const today = format(new Date(), "yyyy-MM-dd");

  const [focusSecondsLeft, setFocusSecondsLeft] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusDurationMinutes, setFocusDurationMinutes] = useState(25);
  const [breakDurationMinutes, setBreakDurationMinutes] = useState(5);
  const [isBreakMode, setIsBreakMode] = useState(false);
  const [breakPending, setBreakPending] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState<number | "">("");
  const [completedAnimation, setCompletedAnimation] = useState(false);
  const [sessionsMap, setSessionsMap] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem(FOCUS_SESSIONS_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, number>;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });

  const persistSessions = useCallback((nextMap: Record<string, number>) => {
    setSessionsMap(nextMap);
    localStorage.setItem(FOCUS_SESSIONS_STORAGE_KEY, JSON.stringify(nextMap));
  }, []);

  const focusCandidates = useMemo(
    () =>
      tasks
        .filter((task) => task.status !== "done")
        .sort((a, b) => {
          if (a.status === "in_progress" && b.status !== "in_progress") return -1;
          if (a.status !== "in_progress" && b.status === "in_progress") return 1;
          if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
          if (a.due_date && !b.due_date) return -1;
          if (!a.due_date && b.due_date) return 1;
          return b.updated_at.localeCompare(a.updated_at);
        })
        .slice(0, 20),
    [tasks],
  );

  const selectedFocusTask = useMemo(
    () => focusCandidates.find((task) => task.id === focusTaskId) ?? null,
    [focusCandidates, focusTaskId],
  );

  const sessionsToday = sessionsMap[today] ?? 0;

  const weeklyData = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => {
      const date = format(addDays(weekStart, i), "yyyy-MM-dd");
      return {
        day: format(addDays(weekStart, i), "EEE"),
        date,
        count: sessionsMap[date] ?? 0,
        isToday: date === today,
      };
    });
  }, [sessionsMap, today]);

  const totalThisWeek = weeklyData.reduce((sum, d) => sum + d.count, 0);
  const maxWeekDay = Math.max(1, ...weeklyData.map((d) => d.count));

  const totalDuration = (isBreakMode ? breakDurationMinutes : focusDurationMinutes) * 60;
  const elapsed = totalDuration - focusSecondsLeft;
  const progress = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
  const activeDurationPresets = isBreakMode ? BREAK_DURATION_PRESETS : FOCUS_DURATION_PRESETS;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const updateTrayTimer = useCallback((text: string | null) => {
    invoke("set_tray_timer", { text }).catch(() => {});
  }, []);

  const completeFocusSession = useCallback(
    (notifyMessage: string) => {
      const nextMap = { ...sessionsMap, [today]: (sessionsMap[today] ?? 0) + 1 };
      persistSessions(nextMap);
      setFocusRunning(false);
      setBreakPending(true);
      setIsBreakMode(true);
      setFocusSecondsLeft(breakDurationMinutes * 60);
      updateTrayTimer(null);
      notify(notifyMessage, "success");
    },
    [breakDurationMinutes, notify, persistSessions, sessionsMap, today, updateTrayTimer]
  );

  const handleToggleFocus = () => {
    if (focusRunning) {
      setFocusRunning(false);
      updateTrayTimer(null);
      return;
    }

    if (isBreakMode) {
      if (focusSecondsLeft <= 0 || breakPending) {
        setFocusSecondsLeft(breakDurationMinutes * 60);
      }
      setBreakPending(false);
      setFocusRunning(true);
      return;
    }

    if (focusSecondsLeft <= 0) {
      setFocusSecondsLeft(focusDurationMinutes * 60);
    }

    if (selectedFocusTask && selectedFocusTask.status === "todo") {
      updateTaskStatus.mutate({ id: selectedFocusTask.id, status: "in_progress" });
    }
    setFocusRunning(true);
  };

  const handleResetFocus = () => {
    setFocusRunning(false);
    setIsBreakMode(false);
    setBreakPending(false);
    setFocusSecondsLeft(focusDurationMinutes * 60);
    updateTrayTimer(null);
  };

  const handleSkip = () => {
    if (isBreakMode) {
      setFocusRunning(false);
      setIsBreakMode(false);
      setBreakPending(false);
      setFocusSecondsLeft(focusDurationMinutes * 60);
      updateTrayTimer(null);
      notify(t("Break skipped."), "info");
      return;
    }

    setFocusRunning(false);
    completeFocusSession(t("Session marked as complete."));
  };

  useEffect(() => {
    let timer: number | undefined;
    if (focusRunning) {
      updateTrayTimer(
        isBreakMode ? `${t("Break")} ${formatTime(focusSecondsLeft)}` : formatTime(focusSecondsLeft)
      );
      timer = window.setInterval(() => {
        setFocusSecondsLeft((prev) => {
          if (prev <= 1) {
            if (timer) window.clearInterval(timer);
            if (isBreakMode) {
              setFocusRunning(false);
              setIsBreakMode(false);
              setBreakPending(false);
              setFocusSecondsLeft(focusDurationMinutes * 60);
              updateTrayTimer(null);
              notify(t("Break completed!"), "success");
              sendNotification({ title: "Dev Journal", body: t("Break completed!") });
              return 0;
            }

            completeFocusSession(t("Focus session completed!"));
            setCompletedAnimation(true);
            setTimeout(() => setCompletedAnimation(false), 2400);
            sendNotification({ title: "Dev Journal", body: t("Focus session completed!") });
            return 0;
          }
          const next = prev - 1;
          updateTrayTimer(isBreakMode ? `${t("Break")} ${formatTime(next)}` : formatTime(next));
          return next;
        });
      }, 1000);
    }
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [
    breakPending,
    completeFocusSession,
    focusDurationMinutes,
    focusRunning,
    isBreakMode,
    notify,
    t,
    updateTrayTimer,
    focusSecondsLeft,
  ]);

  useEffect(() => {
    if (!focusRunning && !isBreakMode) {
      setFocusSecondsLeft(focusDurationMinutes * 60);
    }
  }, [focusDurationMinutes, focusRunning, isBreakMode]);

  useEffect(() => {
    if (!focusRunning && isBreakMode) {
      setFocusSecondsLeft(breakDurationMinutes * 60);
    }
  }, [breakDurationMinutes, focusRunning, isBreakMode]);

  useEffect(() => {
    return () => { updateTrayTimer(null); };
  }, [updateTrayTimer]);

  const glassSx = {
    borderRadius: 3.5,
    border: "1px solid",
    borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.50)",
    bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.40)",
    backdropFilter: "blur(20px) saturate(1.4)",
    WebkitBackdropFilter: "blur(20px) saturate(1.4)",
    boxShadow: isDark
      ? "0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)"
      : "0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.60)",
  };

  const ringSize = 260;
  const strokeWidth = 10;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (progress / 100) * circumference;

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto", mt: { xs: 1, md: 1.5 }, pb: 4 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: { xs: 2.5, md: 3 },
        }}
      >
        {/* Timer */}
        <Box sx={{ ...glassSx, p: { xs: 3, sm: 4 }, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Box
            sx={{
              position: "relative",
              width: ringSize,
              height: ringSize,
              mb: 3,
              transition: "transform 0.3s ease",
              transform: completedAnimation ? "scale(1.06)" : "scale(1)",
            }}
          >
            <svg width={ringSize} height={ringSize} style={{ transform: "rotate(-90deg)" }}>
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}
                strokeWidth={strokeWidth}
              />
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke={`url(#focusGradient)`}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                style={{ transition: "stroke-dashoffset 0.4s ease" }}
              />
              <defs>
                <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={muiTheme.palette.primary.main} />
                  <stop offset="100%" stopColor={muiTheme.palette.secondary.main} />
                </linearGradient>
              </defs>
            </svg>
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: "3.2rem",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  background: focusRunning
                    ? `linear-gradient(135deg, ${muiTheme.palette.primary.main}, ${muiTheme.palette.secondary.main})`
                    : "none",
                  color: focusRunning ? "transparent" : "text.primary",
                  WebkitBackgroundClip: focusRunning ? "text" : undefined,
                  backgroundClip: focusRunning ? "text" : undefined,
                }}
              >
                {formatTime(focusSecondsLeft)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                {focusRunning
                  ? (isBreakMode ? t("Break in progress...") : t("Focusing..."))
                  : (isBreakMode ? t("Break ready") : focusSecondsLeft === 0 ? t("Done!") : t("Ready"))}
              </Typography>
            </Box>
          </Box>

          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              width: "100%",
              height: 4,
              borderRadius: 2,
              mb: 3,
              bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
              "& .MuiLinearProgress-bar": {
                borderRadius: 2,
                background: `linear-gradient(90deg, ${muiTheme.palette.primary.main}, ${muiTheme.palette.secondary.main})`,
              },
            }}
          />

          {/* Controls */}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconButton
              onClick={handleToggleFocus}
              aria-label={focusRunning ? t("Pause focus timer") : t("Start focus timer")}
              title={focusRunning ? t("Pause focus timer") : t("Start focus timer")}
              sx={{
                width: 56,
                height: 56,
                background: focusRunning
                  ? isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
                  : `linear-gradient(135deg, ${muiTheme.palette.primary.main}, ${muiTheme.palette.secondary.main})`,
                color: focusRunning ? "text.primary" : muiTheme.palette.primary.contrastText,
                boxShadow: focusRunning
                  ? "none"
                  : `0 4px 20px ${alpha(muiTheme.palette.primary.main, 0.35)}`,
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "scale(1.08)",
                  boxShadow: focusRunning
                    ? `0 2px 12px ${alpha(muiTheme.palette.primary.main, 0.15)}`
                    : `0 6px 28px ${alpha(muiTheme.palette.primary.main, 0.45)}`,
                },
              }}
            >
              {focusRunning ? <PauseRoundedIcon sx={{ fontSize: 28 }} /> : <PlayArrowRoundedIcon sx={{ fontSize: 28 }} />}
            </IconButton>
            <IconButton
              onClick={handleResetFocus}
              aria-label={t("Reset focus timer")}
              title={t("Reset focus timer")}
              sx={{
                width: 42,
                height: 42,
                border: "1px solid",
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                transition: "all 0.2s ease",
                "&:hover": { borderColor: alpha(muiTheme.palette.primary.main, 0.3) },
              }}
            >
              <RestartAltRoundedIcon fontSize="small" />
            </IconButton>
            <IconButton
              onClick={handleSkip}
              aria-label={isBreakMode ? t("Skip break") : t("Mark complete")}
              sx={{
                width: 42,
                height: 42,
                border: "1px solid",
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                transition: "all 0.2s ease",
                "&:hover": { borderColor: alpha(muiTheme.palette.primary.main, 0.3) },
              }}
              title={isBreakMode ? t("Skip break") : t("Mark complete")}
            >
              <SkipNextRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>

          {/* Duration presets */}
          <Stack spacing={0.75} sx={{ mt: 2.5, alignItems: "center" }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
              {isBreakMode ? t("Break time") : t("Focus duration")}
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", justifyContent: "center" }}>
              {activeDurationPresets.map((preset) => (
              <Chip
                key={preset.minutes}
                size="small"
                label={preset.label}
                color={(isBreakMode ? breakDurationMinutes : focusDurationMinutes) === preset.minutes ? "primary" : "default"}
                variant={(isBreakMode ? breakDurationMinutes : focusDurationMinutes) === preset.minutes ? "filled" : "outlined"}
                onClick={() => {
                  if (isBreakMode) {
                    setBreakDurationMinutes(preset.minutes);
                    return;
                  }
                  setFocusDurationMinutes(preset.minutes);
                }}
                disabled={focusRunning}
                sx={{ cursor: "pointer", transition: "all 0.2s ease" }}
              />
              ))}
            </Stack>
          </Stack>
        </Box>

        {/* Task picker & status */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2.5, md: 3 } }}>
          {/* Active task */}
          <Box sx={{ ...glassSx, p: { xs: 2.5, sm: 3 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <TimerOutlinedIcon fontSize="small" sx={{ opacity: 0.6 }} />
              {t("Focus task")}
            </Typography>
            <TextField
              select
              size="small"
              value={focusTaskId === "" ? "" : String(focusTaskId)}
              onChange={(e) => {
                const v = e.target.value;
                setFocusTaskId(v === "" ? "" : Number(v));
              }}
              SelectProps={{ native: true }}
              fullWidth
              disabled={focusRunning}
            >
              <option value="">{t("No task selected")}</option>
              {focusCandidates.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </TextField>
            {selectedFocusTask && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: 2.5,
                  border: "1px solid",
                  borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                  bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.30)",
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {selectedFocusTask.title}
                </Typography>
                <Stack direction="row" spacing={0} sx={{ mt: 1, flexWrap: "wrap", gap: 0.75 }}>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={selectedFocusTask.status}
                    color={selectedFocusTask.status === "in_progress" ? "warning" : "default"}
                  />
                  <Chip size="small" variant="outlined" label={selectedFocusTask.priority} />
                  {selectedFocusTask.due_date && (
                    <Chip size="small" variant="outlined" label={selectedFocusTask.due_date} />
                  )}
                </Stack>
                {selectedFocusTask.description && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                    {selectedFocusTask.description.slice(0, 120)}
                    {selectedFocusTask.description.length > 120 ? "..." : ""}
                  </Typography>
                )}
              </Box>
            )}
            {!selectedFocusTask && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                {t("Pick a task or run a free-focus session.")}
              </Typography>
            )}
          </Box>

          {/* Today stats */}
          <Box sx={{ ...glassSx, p: { xs: 2.5, sm: 3 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <CheckCircleOutlineIcon fontSize="small" sx={{ opacity: 0.6 }} />
              {t("Today")}
            </Typography>
            <Stack direction="row" spacing={0} sx={{ flexWrap: "wrap", gap: 1.5 }}>
              {Array.from({ length: Math.max(sessionsToday, 0) }, (_, i) => (
                <Box
                  key={i}
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: `linear-gradient(135deg, ${alpha(muiTheme.palette.primary.main, 0.18)}, ${alpha(muiTheme.palette.secondary.main, 0.18)})`,
                    border: "1px solid",
                    borderColor: alpha(muiTheme.palette.primary.main, 0.2),
                    transition: "all 0.2s ease",
                  }}
                >
                  <LocalFireDepartmentIcon sx={{ fontSize: 18, color: muiTheme.palette.primary.main }} />
                </Box>
              ))}
              {sessionsToday === 0 && (
                <Typography variant="body2" color="text.secondary">
                  {t("No sessions yet. Start your first focus!")}
                </Typography>
              )}
            </Stack>
            {sessionsToday > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                {sessionsToday} {t("sessions completed today")}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* Weekly overview */}
      <Box sx={{ ...glassSx, p: { xs: 2.5, sm: 3 }, mt: { xs: 2.5, md: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
            <BarChartRoundedIcon fontSize="small" sx={{ opacity: 0.6 }} />
            {t("Weekly overview")}
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            label={`${totalThisWeek} ${t("this week")}`}
          />
        </Stack>
        <Stack
          direction="row"
          spacing={0}
          sx={{
            gap: { xs: 1, sm: 1.5 },
            justifyContent: "space-between",
            alignItems: "flex-end",
            minHeight: 140,
          }}
        >
          {weeklyData.map((day) => (
            <Box
              key={day.date}
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.75,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  color: day.isToday ? "primary.main" : "text.secondary",
                }}
              >
                {day.count}
              </Typography>
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 48,
                  borderRadius: 2,
                  minHeight: 8,
                  height: `${Math.max(8, (day.count / maxWeekDay) * 96)}px`,
                  background: day.isToday
                    ? `linear-gradient(180deg, ${muiTheme.palette.primary.main}, ${muiTheme.palette.secondary.main})`
                    : isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.06)",
                  transition: "height 0.3s ease",
                  ...(day.isToday && {
                    boxShadow: `0 4px 16px ${alpha(muiTheme.palette.primary.main, 0.3)}`,
                  }),
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: day.isToday ? 700 : 500,
                  fontSize: "0.68rem",
                  color: day.isToday ? "primary.main" : "text.secondary",
                }}
              >
                {day.day}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Quick task list */}
      {focusCandidates.length > 0 && (
        <Box sx={{ ...glassSx, p: { xs: 2.5, sm: 3 }, mt: { xs: 2.5, md: 3 } }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
            {t("Focus candidates")}
          </Typography>
          <Stack spacing={0} sx={{ gap: 0.75 }}>
            {focusCandidates.slice(0, 8).map((task) => (
              <Box
                key={task.id}
                onClick={() => { if (!focusRunning) setFocusTaskId(task.id); }}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: task.id === focusTaskId
                    ? alpha(muiTheme.palette.primary.main, 0.35)
                    : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                  bgcolor: task.id === focusTaskId
                    ? alpha(muiTheme.palette.primary.main, 0.06)
                    : "transparent",
                  cursor: focusRunning ? "default" : "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  ...(!focusRunning && {
                    "&:hover": {
                      borderColor: alpha(muiTheme.palette.primary.main, 0.2),
                      bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.25)",
                    },
                  }),
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: task.id === focusTaskId ? 600 : 400, minWidth: 0, mr: 1 }} noWrap>
                  {task.title}
                </Typography>
                <Stack direction="row" spacing={0} sx={{ gap: 0.5, flexShrink: 0 }}>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={task.status === "in_progress" ? "IP" : "TD"}
                    color={task.status === "in_progress" ? "warning" : "default"}
                    sx={{ height: 20, fontSize: "0.62rem" }}
                  />
                  {task.due_date && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={task.due_date.slice(5)}
                      sx={{ height: 20, fontSize: "0.62rem" }}
                    />
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

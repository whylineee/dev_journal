import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Box,
  Button,
  Chip,
  Collapse,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, type SxProps, type Theme } from "@mui/material/styles";
import { format } from "date-fns";
import type { Goal, Task } from "../../types";

interface PlannerWeeklyReviewSectionProps {
  currentWeekInterval: { start: Date; end: Date };
  dailyWins: string[];
  dailyWinsInput: string;
  handleAddDailyWin: () => void;
  handleRemoveDailyWin: (index: number) => void;
  isSectionCollapsed: (section: "dailyWins") => boolean;
  nearGoals: Goal[];
  onDailyWinsInputChange: (value: string) => void;
  onOpenFocus: () => void;
  onOpenGoals: () => void;
  onOpenTasks: () => void;
  plannerInsetCardSx: SxProps<Theme>;
  plannerSurfaceSx: SxProps<Theme>;
  t: (key: string, variables?: Record<string, string | number>) => string;
  weeklyReview: {
    completedTasks: Task[];
    meetingsThisWeek: Array<unknown>;
    journalEntries: Array<unknown>;
    habitCompletions: number;
    focusSessionsThisWeek: number;
  };
}

export const PlannerWeeklyReviewSection = ({
  currentWeekInterval,
  dailyWins,
  dailyWinsInput,
  handleAddDailyWin,
  handleRemoveDailyWin,
  isSectionCollapsed,
  nearGoals,
  onDailyWinsInputChange,
  onOpenFocus,
  onOpenGoals,
  onOpenTasks,
  plannerInsetCardSx,
  plannerSurfaceSx,
  t,
  weeklyReview,
}: PlannerWeeklyReviewSectionProps) => {
  return (
    <Box sx={{ ...plannerSurfaceSx, mt: { xs: 1.5, md: 2 }, p: { xs: 2, sm: 2.25 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t("Weekly Review")}
        </Typography>
        <Chip
          size="small"
          variant="outlined"
          label={`${format(currentWeekInterval.start, "MMM d")} - ${format(currentWeekInterval.end, "MMM d")}`}
        />
      </Stack>
      <Box
        sx={{
          mt: 2,
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
          gap: 1,
        }}
      >
        {[
          { label: t("Done"), value: weeklyReview.completedTasks.length },
          { label: t("Meetings"), value: weeklyReview.meetingsThisWeek.length },
          { label: t("Journal"), value: weeklyReview.journalEntries.length },
          { label: t("Habits"), value: weeklyReview.habitCompletions },
        ].map((item) => (
          <Box
            key={item.label}
            sx={{
              p: 1.2,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: alpha("#ffffff", 0.03),
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {item.label}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {item.value}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          mt: 2,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1fr) minmax(0, 1fr) minmax(320px, 0.9fr)" },
          gap: 1.25,
        }}
      >
        <Box sx={plannerInsetCardSx}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t("Completed this week")}
            </Typography>
            <Button size="small" onClick={onOpenTasks} endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />} sx={{ textTransform: "none" }}>
              {t("Open Tasks")}
            </Button>
          </Stack>
          <Stack spacing={0.8}>
            {weeklyReview.completedTasks.slice(0, 5).map((task) => (
              <Stack key={task.id} direction="row" justifyContent="space-between" spacing={1}>
                <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                  {task.title}
                </Typography>
                <Chip size="small" variant="outlined" label={task.priority} />
              </Stack>
            ))}
            {weeklyReview.completedTasks.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t("No completed tasks this week yet.")}
              </Typography>
            ) : null}
          </Stack>
        </Box>

        <Box sx={plannerInsetCardSx}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t("Goals Near Deadline")}
            </Typography>
            <Button size="small" onClick={onOpenGoals} endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />} sx={{ textTransform: "none" }}>
              {t("Manage")}
            </Button>
          </Stack>
          <Stack spacing={0.8}>
            {nearGoals.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t("No active goals with deadlines in next 14 days.")}
              </Typography>
            ) : (
              nearGoals.slice(0, 4).map((goal) => (
                <Stack key={goal.id} direction="row" justifyContent="space-between" spacing={1}>
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
        </Box>

        <Box sx={plannerInsetCardSx}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t("Daily Wins")}
            </Typography>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Chip size="small" variant="outlined" label={`${t("Focus Session")}: ${weeklyReview.focusSessionsThisWeek}`} />
              <Button size="small" onClick={onOpenFocus} sx={{ textTransform: "none" }}>
                {t("Open")}
              </Button>
            </Stack>
          </Stack>
          <Collapse in={!isSectionCollapsed("dailyWins")} timeout="auto" unmountOnExit>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1.25 }}>
              <TextField
                fullWidth
                size="small"
                value={dailyWinsInput}
                onChange={(event) => onDailyWinsInputChange(event.target.value)}
                placeholder={t("Example: shipped onboarding empty-state fix")}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddDailyWin();
                  }
                }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleAddDailyWin}
                disabled={dailyWinsInput.trim().length === 0}
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                {t("Add win")}
              </Button>
            </Stack>
            <Stack spacing={0.75}>
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

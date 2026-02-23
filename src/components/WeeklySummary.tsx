import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { format, isAfter, parseISO, subDays } from "date-fns";
import { useMemo } from "react";
import { useGitCommits, useEntries } from "../hooks/useEntries";
import { useTasks } from "../hooks/useTasks";

const stopWords = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "for",
  "is",
  "it",
  "was",
  "with",
  "that",
  "this",
  "i",
  "we",
  "you",
  "from",
  "as",
  "by",
  "at",
]);

const extractTopKeywords = (texts: string[], limit = 5) => {
  const counts = new Map<string, number>();

  texts
    .join(" ")
    .toLowerCase()
    .replace(/[^a-zа-яіїєґ0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !stopWords.has(word))
    .forEach((word) => {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
};

export const WeeklySummary = () => {
  const { data: entries = [] } = useEntries();
  const { data: tasks = [] } = useTasks();
  const { data: commits = [] } = useGitCommits();

  const summary = useMemo(() => {
    const periodStart = subDays(new Date(), 6);
    const periodStartDate = parseISO(format(periodStart, "yyyy-MM-dd"));

    const weekEntries = entries.filter((entry) => {
      const entryDate = parseISO(entry.date);
      return isAfter(entryDate, subDays(periodStartDate, 1));
    });

    const wordsByDay = weekEntries.map((entry) => {
      const words = `${entry.yesterday} ${entry.today}`
        .split(/\s+/)
        .filter((word) => word.length > 0).length;
      return { date: entry.date, words };
    });

    const totalWords = wordsByDay.reduce((sum, day) => sum + day.words, 0);
    const avgWords = wordsByDay.length ? Math.round(totalWords / wordsByDay.length) : 0;
    const bestDay = wordsByDay.sort((a, b) => b.words - a.words)[0];

    const completedTasks = tasks.filter((task) => task.status === "done").length;
    const activeTasks = tasks.filter((task) => task.status !== "done").length;

    const topKeywords = extractTopKeywords(
      weekEntries.map((entry) => `${entry.yesterday}\n${entry.today}`),
      4
    );

    return {
      journalDays: weekEntries.length,
      totalWords,
      avgWords,
      bestDay,
      completedTasks,
      activeTasks,
      commitsCount: commits.length,
      topKeywords,
    };
  }, [commits.length, entries, tasks]);

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Weekly Summary
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Rolling 7-day snapshot of journal activity and execution.
      </Typography>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Journal
          </Typography>
          <Typography variant="h5" sx={{ mt: 1, fontWeight: 700 }}>
            {summary.journalDays}/7 days
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {summary.totalWords} words total, avg {summary.avgWords} per entry day
          </Typography>
          {summary.bestDay ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Peak day: {summary.bestDay.date} ({summary.bestDay.words} words)
            </Typography>
          ) : null}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Delivery
          </Typography>
          <Typography variant="h5" sx={{ mt: 1, fontWeight: 700 }}>
            {summary.completedTasks} done
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {summary.activeTasks} active tasks, {summary.commitsCount} commits today
          </Typography>
        </Paper>
      </Stack>

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Frequent topics this week
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
          {summary.topKeywords.length > 0 ? (
            summary.topKeywords.map((keyword) => (
              <Chip key={keyword} label={keyword} size="small" variant="outlined" />
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              Not enough text yet to detect trends.
            </Typography>
          )}
        </Stack>
      </Box>
    </Paper>
  );
};

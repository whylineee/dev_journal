import AddTaskIcon from "@mui/icons-material/AddTask";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SearchIcon from "@mui/icons-material/Search";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  Box,
  Button,
  Chip,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { TaskPriority, TaskStatus } from "../../types";

interface TasksBoardToolbarProps {
  boardSurfaceSx: SxProps<Theme>;
  busy: boolean;
  filteredCount: number;
  onCreateTask: () => void;
  onPriorityFilterChange: (value: "all" | TaskPriority) => void;
  onProjectFilterChange: (value: "all" | number) => void;
  onQueryChange: (value: string) => void;
  onResetFilters: () => void;
  onStatusFilterChange: (value: "all" | TaskStatus) => void;
  onToggleOverdueOnly: () => void;
  priorityFilter: "all" | TaskPriority;
  projectFilter: "all" | number;
  projects: Array<{ id: number; name: string }>;
  query: string;
  showOverdueOnly: boolean;
  stats: { total: number; done: number; dueToday: number; overdue: number; activeTimers: number };
  statusFilter: "all" | TaskStatus;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

export const TasksBoardToolbar = ({
  boardSurfaceSx,
  busy,
  filteredCount,
  onCreateTask,
  onPriorityFilterChange,
  onProjectFilterChange,
  onQueryChange,
  onResetFilters,
  onStatusFilterChange,
  onToggleOverdueOnly,
  priorityFilter,
  projectFilter,
  projects,
  query,
  showOverdueOnly,
  stats,
  statusFilter,
  t,
}: TasksBoardToolbarProps) => {
  const hasActiveFilters =
    query.trim().length > 0 ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    projectFilter !== "all" ||
    showOverdueOnly;

  return (
  <Box sx={{ p: { xs: 0, md: 0 } }}>
    <Paper variant="outlined" sx={{ ...boardSurfaceSx, p: { xs: 1.25, md: 1.5 }, borderRadius: 2.5 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            {t("Board controls")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("Showing {filtered} of {total}", { filtered: filteredCount, total: stats.total })}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          {hasActiveFilters ? (
            <Tooltip title={t("Clear filters")}>
              <span>
                <Button
                  variant="outlined"
                  startIcon={<RestartAltIcon />}
                  onClick={onResetFilters}
                  disabled={busy}
                  sx={{ minHeight: 38 }}
                >
                  {t("Clear filters")}
                </Button>
              </span>
            </Tooltip>
          ) : null}
          <Button variant="contained" startIcon={<AddTaskIcon />} onClick={onCreateTask} disabled={busy} sx={{ minHeight: 38, px: 2 }}>
            {t("Add Task")}
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={0} sx={{ mt: 1.5, flexWrap: "wrap", gap: 0.75 }}>
        <Chip label={t("Total: {count}", { count: stats.total })} variant="outlined" size="small" />
        <Chip label={t("Done: {count}", { count: stats.done })} color="default" variant="outlined" size="small" />
        <Chip label={`${t("Due today")}: ${stats.dueToday}`} color="default" variant="outlined" size="small" sx={{ display: { xs: "none", sm: "inline-flex" } }} />
        <Chip label={t("Overdue: {count}", { count: stats.overdue })} color={stats.overdue > 0 ? "error" : "default"} variant="outlined" size="small" />
        <Chip label={t("Active timers: {count}", { count: stats.activeTimers })} color={stats.activeTimers > 0 ? "warning" : "default"} variant="outlined" size="small" sx={{ display: { xs: "none", md: "inline-flex" } }} />
      </Stack>

      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={1}
        sx={{
          mt: 1.5,
          alignItems: { xs: "stretch", lg: "center" },
        }}
      >
        <TextField
          placeholder={t("Search...")}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
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
          label={t("Status")}
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value as "all" | TaskStatus)}
          sx={{ minWidth: { xs: 0, sm: 136, md: 144 } }}
          SelectProps={{ native: true }}
          InputLabelProps={{ shrink: true }}
        >
          <option value="all">{t("All statuses")}</option>
          <option value="todo">{t("To Do")}</option>
          <option value="in_progress">{t("In Progress")}</option>
          <option value="done">{t("Done")}</option>
        </TextField>

        <TextField
          select
          label={t("Priority")}
          value={priorityFilter}
          onChange={(event) => onPriorityFilterChange(event.target.value as "all" | TaskPriority)}
          sx={{ minWidth: { xs: 0, sm: 136, md: 144 } }}
          SelectProps={{ native: true }}
          InputLabelProps={{ shrink: true }}
        >
          <option value="all">{t("All priorities")}</option>
          <option value="urgent">{t("Urgent")}</option>
          <option value="high">{t("High")}</option>
          <option value="medium">{t("Medium")}</option>
          <option value="low">{t("Low")}</option>
        </TextField>

        <TextField
          select
          label={t("Project")}
          value={projectFilter === "all" ? "all" : String(projectFilter)}
          onChange={(event) => onProjectFilterChange(event.target.value === "all" ? "all" : Number(event.target.value))}
          sx={{ minWidth: { xs: 0, sm: 146, md: 160 } }}
          SelectProps={{ native: true }}
          InputLabelProps={{ shrink: true }}
        >
          <option value="all">{t("All projects")}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </TextField>

        <Button
          variant={showOverdueOnly ? "contained" : "outlined"}
          color={showOverdueOnly ? "error" : "inherit"}
          onClick={onToggleOverdueOnly}
          startIcon={<WarningAmberIcon />}
          sx={{ minHeight: 40, whiteSpace: "nowrap" }}
        >
          {t("Overdue Only")}
        </Button>
      </Stack>
    </Paper>
  </Box>
  );
};

import AddTaskIcon from "@mui/icons-material/AddTask";
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
  Typography,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { TaskPriority, TaskStatus } from "../../types";

interface TasksBoardToolbarProps {
  boardSurfaceSx: SxProps<Theme>;
  busy: boolean;
  onCreateTask: () => void;
  onPriorityFilterChange: (value: "all" | TaskPriority) => void;
  onProjectFilterChange: (value: "all" | number) => void;
  onQueryChange: (value: string) => void;
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
  onCreateTask,
  onPriorityFilterChange,
  onProjectFilterChange,
  onQueryChange,
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
}: TasksBoardToolbarProps) => (
  <Box sx={{ p: { xs: 1, md: 2 } }}>
    <Paper variant="outlined" sx={{ ...boardSurfaceSx, p: { xs: 1.5, md: 1.9 }, borderRadius: 4 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {t("Tasks Board")}
          </Typography>
        </Box>

        <Button variant="contained" startIcon={<AddTaskIcon />} onClick={onCreateTask} disabled={busy} sx={{ minHeight: 42, px: 2.3, borderRadius: 2.8 }}>
          {t("Add Task")}
        </Button>
      </Stack>

      <Stack direction="row" spacing={0} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
        <Chip label={t("Total: {count}", { count: stats.total })} variant="outlined" size="small" />
        <Chip label={t("Done: {count}", { count: stats.done })} color="default" variant="outlined" size="small" />
        <Chip label={`${t("Due today")}: ${stats.dueToday}`} color="default" variant="outlined" size="small" />
        <Chip label={t("Overdue: {count}", { count: stats.overdue })} color={stats.overdue > 0 ? "error" : "default"} variant="outlined" size="small" />
        <Chip label={t("Active timers: {count}", { count: stats.activeTimers })} color={stats.activeTimers > 0 ? "warning" : "default"} variant="outlined" size="small" />
      </Stack>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ mt: 2 }}>
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
          sx={{ minWidth: 170 }}
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
          sx={{ minWidth: 170 }}
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
          sx={{ minWidth: 190 }}
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

        <Button variant={showOverdueOnly ? "contained" : "outlined"} color={showOverdueOnly ? "error" : "inherit"} onClick={onToggleOverdueOnly} startIcon={<WarningAmberIcon />}>
          {t("Overdue Only")}
        </Button>
      </Stack>
    </Paper>
  </Box>
);

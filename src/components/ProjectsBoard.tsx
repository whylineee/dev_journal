import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/Search";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { Project, ProjectStatus } from "../types";
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
} from "../hooks/useProjects";
import { useTasks } from "../hooks/useTasks";
import { useGoals } from "../hooks/useGoals";
import { useEntries } from "../hooks/useEntries";
import { useI18n } from "../i18n/I18nContext";

const statusLabel: Record<ProjectStatus, string> = {
  active: "Active",
  paused: "Paused",
  archived: "Archived",
};

const statusColor: Record<ProjectStatus, "info" | "warning" | "default"> = {
  active: "info",
  paused: "warning",
  archived: "default",
};

const defaultColor = "#60a5fa";

export const ProjectsBoard = () => {
  const { t } = useI18n();
  const { data: projects = [], isLoading } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: goals = [] } = useGoals();
  const { data: entries = [] } = useEntries();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>("all");
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(defaultColor);
  const [status, setStatus] = useState<ProjectStatus>("active");

  const busy =
    createProject.isPending ||
    updateProject.isPending ||
    deleteProject.isPending;

  const projectStats = useMemo(() => {
    const map = new Map<number, { entries: number; tasks: number; openTasks: number; goals: number }>();
    projects.forEach((project) => {
      map.set(project.id, { entries: 0, tasks: 0, openTasks: 0, goals: 0 });
    });

    entries.forEach((entry) => {
      if (entry.project_id && map.has(entry.project_id)) {
        map.get(entry.project_id)!.entries += 1;
      }
    });
    tasks.forEach((task) => {
      if (task.project_id && map.has(task.project_id)) {
        map.get(task.project_id)!.tasks += 1;
        if (task.status !== "done") {
          map.get(task.project_id)!.openTasks += 1;
        }
      }
    });
    goals.forEach((goal) => {
      if (goal.project_id && map.has(goal.project_id)) {
        map.get(goal.project_id)!.goals += 1;
      }
    });

    return map;
  }, [entries, goals, projects, tasks]);

  const dashboardStats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((project) => project.status === "active").length;
    const paused = projects.filter((project) => project.status === "paused").length;
    const archived = projects.filter((project) => project.status === "archived").length;
    return { total, active, paused, archived };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();

    return projects
      .filter((project) => {
        if (statusFilter !== "all" && project.status !== statusFilter) {
          return false;
        }
        if (!q) {
          return true;
        }
        return (
          project.name.toLowerCase().includes(q) ||
          project.description.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [projects, query, statusFilter]);

  const openCreateDialog = () => {
    setEditingProject(null);
    setName("");
    setDescription("");
    setColor(defaultColor);
    setStatus("active");
    setDialogOpen(true);
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setName(project.name);
    setDescription(project.description);
    setColor(project.color || defaultColor);
    setStatus(project.status);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const cleanName = name.trim();
    if (!cleanName) {
      return;
    }

    if (editingProject) {
      updateProject.mutate({
        id: editingProject.id,
        name: cleanName,
        description: description.trim(),
        color: color || defaultColor,
        status,
      });
    } else {
      createProject.mutate({
        name: cleanName,
        description: description.trim(),
        color: color || defaultColor,
        status,
      });
    }

    setDialogOpen(false);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", mt: 1 }}>
      <Paper sx={{ p: 3 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {t("Projects")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("Organize tasks, goals, and journal entries by project scope.")}
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateDialog}
            disabled={busy}
          >
            {t("New Project")}
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
          <Chip label={`Total: ${dashboardStats.total}`} variant="outlined" size="small" />
          <Chip label={`Active: ${dashboardStats.active}`} color="info" variant="outlined" size="small" />
          <Chip label={`Paused: ${dashboardStats.paused}`} color="warning" variant="outlined" size="small" />
          <Chip label={`Archived: ${dashboardStats.archived}`} variant="outlined" size="small" />
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2 }}>
          <TextField
            placeholder={t("Search...")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
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
            onChange={(event) => setStatusFilter(event.target.value as "all" | ProjectStatus)}
            sx={{ minWidth: 180 }}
            SelectProps={{ native: true }}
          >
            <option value="all">{t("All statuses")}</option>
            <option value="active">{t("Active")}</option>
            <option value="paused">{t("Paused")}</option>
            <option value="archived">{t("Archived")}</option>
          </TextField>
        </Stack>
      </Paper>

      <Stack spacing={1.5} sx={{ mt: 2 }}>
        {filteredProjects.map((project) => {
          const stats = projectStats.get(project.id) ?? {
            entries: 0,
            tasks: 0,
            openTasks: 0,
            goals: 0,
          };

          return (
            <Paper key={project.id} variant="outlined" sx={{ p: 2 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", gap: 1 }}>
                    <FolderOpenIcon sx={{ color: project.color }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {project.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={statusLabel[project.status]}
                      color={statusColor[project.status]}
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label={`${t("Open Tasks")}: ${stats.openTasks}`}
                      color={stats.openTasks > 0 ? "warning" : "default"}
                      variant="outlined"
                    />
                  </Stack>

                  {project.description ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                      {project.description}
                    </Typography>
                  ) : null}

                  <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap", gap: 1 }}>
                    <Chip size="small" variant="outlined" label={`${t("Journal")}: ${stats.entries}`} />
                    <Chip size="small" variant="outlined" label={`${t("Tasks")}: ${stats.tasks}`} />
                    <Chip size="small" variant="outlined" label={`${t("Goals")}: ${stats.goals}`} />
                  </Stack>
                </Box>

                <Stack direction="row" spacing={0.5}>
                  <IconButton size="small" onClick={() => openEditDialog(project)} disabled={busy}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => deleteProject.mutate(project.id)}
                    disabled={busy}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </Paper>
          );
        })}

        {!isLoading && filteredProjects.length === 0 ? (
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t("No projects yet. Create the first one to activate Project Hub.")}
            </Typography>
          </Paper>
        ) : null}
      </Stack>

      <Dialog open={isDialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingProject ? t("Edit project") : t("Create project")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t("Name")}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
              fullWidth
            />

            <TextField
              label={t("Description")}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              multiline
              minRows={3}
              fullWidth
            />

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label={t("Color")}
                value={color}
                onChange={(event) => setColor(event.target.value)}
                fullWidth
              />

              <TextField
                select
                label={t("Status")}
                value={status}
                onChange={(event) => setStatus(event.target.value as ProjectStatus)}
                SelectProps={{ native: true }}
                fullWidth
              >
                <option value="active">{t("Active")}</option>
                <option value="paused">{t("Paused")}</option>
                <option value="archived">{t("Archived")}</option>
              </TextField>
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            {t("Cancel")}
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={busy}>
            {t("Save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

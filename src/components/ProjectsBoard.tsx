import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
import CallSplitIcon from "@mui/icons-material/CallSplit";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import ReplayIcon from "@mui/icons-material/Replay";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import { openUrl } from "@tauri-apps/plugin-opener";
import { format } from "date-fns";
import { Project, ProjectBranchStatus, ProjectStatus, Task, TaskPriority } from "../types";
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
} from "../hooks/useProjects";
import {
  useCreateProjectBranch,
  useDeleteProjectBranch,
  useProjectBranches,
  useUpdateProjectBranch,
} from "../hooks/useProjectBranches";
import { useMeetings } from "../hooks/useMeetings";
import { useTasks, useCreateTask, useUpdateTaskStatus } from "../hooks/useTasks";
import { useGoals } from "../hooks/useGoals";
import { useEntries } from "../hooks/useEntries";
import { useI18n } from "../i18n/I18nContext";
import { expandMeetingOccurrences } from "../utils/meetingUtils";

const statusLabel: Record<ProjectStatus, string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};

const statusColor: Record<ProjectStatus, "info" | "warning" | "success" | "default"> = {
  active: "info",
  paused: "warning",
  completed: "success",
  archived: "default",
};

const branchStatusLabel: Record<ProjectBranchStatus, string> = {
  open: "Open",
  merged: "Merged",
};

const branchStatusColor: Record<ProjectBranchStatus, "info" | "success"> = {
  open: "info",
  merged: "success",
};

const priorityOptions: TaskPriority[] = ["low", "medium", "high", "urgent"];

const defaultColor = "#60a5fa";

const compareWorkspaceTasks = (a: Task, b: Task) => {
  if (a.status === "done" && b.status !== "done") {
    return 1;
  }
  if (a.status !== "done" && b.status === "done") {
    return -1;
  }

  if (a.due_date && b.due_date) {
    const diff = a.due_date.localeCompare(b.due_date);
    if (diff !== 0) {
      return diff;
    }
  } else if (a.due_date && !b.due_date) {
    return -1;
  } else if (!a.due_date && b.due_date) {
    return 1;
  }

  return b.updated_at.localeCompare(a.updated_at);
};

export const ProjectsBoard = () => {
  const { t } = useI18n();
  const { data: projects = [], isLoading } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: goals = [] } = useGoals();
  const { data: entries = [] } = useEntries();
  const { data: meetings = [] } = useMeetings();

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const createTask = useCreateTask();
  const updateTaskStatus = useUpdateTaskStatus();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>("all");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(defaultColor);
  const [status, setStatus] = useState<ProjectStatus>("active");

  const [workspaceTaskTitle, setWorkspaceTaskTitle] = useState("");
  const [workspaceTaskDescription, setWorkspaceTaskDescription] = useState("");
  const [workspaceTaskPriority, setWorkspaceTaskPriority] = useState<TaskPriority>("medium");
  const [workspaceTaskDueDate, setWorkspaceTaskDueDate] = useState("");

  const [branchName, setBranchName] = useState("");
  const [branchDescription, setBranchDescription] = useState("");

  const { data: branches = [] } = useProjectBranches(selectedProjectId, selectedProjectId !== null);
  const createBranch = useCreateProjectBranch();
  const updateBranch = useUpdateProjectBranch();
  const deleteBranch = useDeleteProjectBranch();

  const busy =
    createProject.isPending ||
    updateProject.isPending ||
    deleteProject.isPending ||
    createTask.isPending ||
    updateTaskStatus.isPending ||
    createBranch.isPending ||
    updateBranch.isPending ||
    deleteBranch.isPending;

  const projectTasksMap = useMemo(() => {
    const map = new Map<number, Task[]>();
    projects.forEach((project) => {
      map.set(project.id, []);
    });

    tasks.forEach((task) => {
      if (task.project_id && map.has(task.project_id)) {
        map.get(task.project_id)?.push(task);
      }
    });

    map.forEach((projectTasks, projectId) => {
      map.set(projectId, [...projectTasks].sort(compareWorkspaceTasks));
    });

    return map;
  }, [projects, tasks]);

  const projectStats = useMemo(() => {
    const map = new Map<number, { entries: number; tasks: number; openTasks: number; goals: number; meetings: number }>();
    projects.forEach((project) => {
      map.set(project.id, { entries: 0, tasks: 0, openTasks: 0, goals: 0, meetings: 0 });
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
    meetings.forEach((meeting) => {
      if (meeting.project_id && map.has(meeting.project_id)) {
        map.get(meeting.project_id)!.meetings += 1;
      }
    });

    return map;
  }, [entries, goals, meetings, projects, tasks]);

  const projectMeetingsMap = useMemo(() => {
    const occurrences = expandMeetingOccurrences(meetings, new Date(), 21);
    const map = new Map<number, typeof occurrences>();
    projects.forEach((project) => map.set(project.id, []));
    occurrences.forEach((occurrence) => {
      const projectId = occurrence.meeting.project_id;
      if (projectId && map.has(projectId)) {
        map.get(projectId)?.push(occurrence);
      }
    });
    return map;
  }, [meetings, projects]);

  const dashboardStats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((project) => project.status === "active").length;
    const paused = projects.filter((project) => project.status === "paused").length;
    const completed = projects.filter((project) => project.status === "completed").length;
    const archived = projects.filter((project) => project.status === "archived").length;
    return { total, active, paused, completed, archived };
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

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const setProjectStatus = (project: Project, nextStatus: ProjectStatus) => {
    updateProject.mutate({
      id: project.id,
      name: project.name,
      description: project.description,
      color: project.color,
      status: nextStatus,
    });
  };

  const handleCreateWorkspaceTask = () => {
    if (!selectedProject) {
      return;
    }

    const title = workspaceTaskTitle.trim();
    if (!title) {
      return;
    }

    createTask.mutate(
      {
        title,
        description: workspaceTaskDescription.trim(),
        status: "todo",
        priority: workspaceTaskPriority,
        project_id: selectedProject.id,
        goal_id: null,
        due_date: workspaceTaskDueDate || null,
        recurrence: "none",
        recurrence_until: null,
        time_estimate_minutes: 0,
      },
      {
        onSuccess: () => {
          setWorkspaceTaskTitle("");
          setWorkspaceTaskDescription("");
          setWorkspaceTaskDueDate("");
          setWorkspaceTaskPriority("medium");
        },
      }
    );
  };

  const handleTaskCheckbox = (task: Task, checked: boolean) => {
    updateTaskStatus.mutate({
      id: task.id,
      status: checked ? "done" : "todo",
    });
  };

  const handleCreateBranch = () => {
    if (!selectedProject) {
      return;
    }

    const cleanName = branchName.trim();
    if (!cleanName) {
      return;
    }

    createBranch.mutate(
      {
        project_id: selectedProject.id,
        name: cleanName,
        description: branchDescription.trim(),
        status: "open",
      },
      {
        onSuccess: () => {
          setBranchName("");
          setBranchDescription("");
        },
      }
    );
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", mt: 1 }}>
      <Paper sx={{ p: 3, borderRadius: 3.5 }}>
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
          <Chip label={`Completed: ${dashboardStats.completed}`} color="success" variant="outlined" size="small" />
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
            <option value="completed">{t("Completed")}</option>
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
            meetings: 0,
          };
          const workspaceOpen = selectedProjectId === project.id;
          const workspaceTasks = projectTasksMap.get(project.id) ?? [];
          const workspaceMeetings = projectMeetingsMap.get(project.id) ?? [];

          return (
            <Paper key={project.id} variant="outlined" sx={{
              p: 2,
              borderRadius: 3,
              borderColor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.45)",
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.02)"
                  : "rgba(255,255,255,0.40)",
              backdropFilter: "blur(12px)",
              transition: "all 0.2s ease",
              "&:hover": {
                transform: "translateY(-1px)",
                boxShadow: (theme) =>
                  theme.palette.mode === "dark"
                    ? "0 4px 16px rgba(0,0,0,0.30)"
                    : "0 4px 16px rgba(0,0,0,0.06)",
              },
            }}>
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
                    <Chip size="small" variant="outlined" label={`${t("Meetings")}: ${stats.meetings}`} />
                  </Stack>
                </Box>

                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexWrap: "wrap" }}>
                  <Button
                    size="small"
                    variant={workspaceOpen ? "contained" : "outlined"}
                    onClick={() => setSelectedProjectId(workspaceOpen ? null : project.id)}
                    disabled={busy}
                  >
                    {workspaceOpen ? t("Close Workspace") : t("Workspace")}
                  </Button>

                  {project.status !== "completed" ? (
                    <IconButton size="small" color="success" onClick={() => setProjectStatus(project, "completed")} disabled={busy}>
                      <DoneAllIcon fontSize="small" />
                    </IconButton>
                  ) : (
                    <IconButton size="small" color="info" onClick={() => setProjectStatus(project, "active")} disabled={busy}>
                      <ReplayIcon fontSize="small" />
                    </IconButton>
                  )}

                  <IconButton size="small" onClick={() => openEditDialog(project)} disabled={busy}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      if (workspaceOpen) {
                        setSelectedProjectId(null);
                      }
                      deleteProject.mutate(project.id);
                    }}
                    disabled={busy}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>

              {workspaceOpen ? (
                <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {t("Workspace")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {t("Plan project tasks and branches in one place.")}
                  </Typography>

                  <Stack spacing={1.5} sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">{t("Add Task")}</Typography>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                      <TextField
                        label={t("Name")}
                        placeholder={t("Task title")}
                        value={workspaceTaskTitle}
                        onChange={(event) => setWorkspaceTaskTitle(event.target.value)}
                        fullWidth
                      />
                      <TextField
                        label={t("Priority")}
                        value={workspaceTaskPriority}
                        onChange={(event) => setWorkspaceTaskPriority(event.target.value as TaskPriority)}
                        select
                        SelectProps={{ native: true }}
                        sx={{ minWidth: 160 }}
                      >
                        {priorityOptions.map((priority) => (
                          <option key={priority} value={priority}>
                            {t(priority.charAt(0).toUpperCase() + priority.slice(1))}
                          </option>
                        ))}
                      </TextField>
                      <TextField
                        label={t("Due date")}
                        type="date"
                        value={workspaceTaskDueDate}
                        onChange={(event) => setWorkspaceTaskDueDate(event.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 170 }}
                      />
                    </Stack>

                    <TextField
                      label={t("Description")}
                      value={workspaceTaskDescription}
                      onChange={(event) => setWorkspaceTaskDescription(event.target.value)}
                      fullWidth
                      multiline
                      minRows={2}
                    />

                    <Box>
                      <Button variant="outlined" onClick={handleCreateWorkspaceTask} disabled={busy || !workspaceTaskTitle.trim()}>
                        {t("Add Task")}
                      </Button>
                    </Box>

                    <Stack spacing={1}>
                      {workspaceTasks.map((task) => (
                        <Paper key={task.id} variant="outlined" sx={{ p: 1.25 }}>
                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                              <Checkbox
                                size="small"
                                checked={task.status === "done"}
                                onChange={(_, checked) => handleTaskCheckbox(task, checked)}
                                disabled={busy}
                              />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 600,
                                    textDecoration: task.status === "done" ? "line-through" : "none",
                                    opacity: task.status === "done" ? 0.7 : 1,
                                  }}
                                >
                                  {task.title}
                                </Typography>
                                {task.description ? (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                    {task.description}
                                  </Typography>
                                ) : null}
                              </Box>
                            </Stack>

                            <Stack direction="row" spacing={0.75} alignItems="center">
                              <Chip
                                size="small"
                                variant="outlined"
                                label={t(task.priority.charAt(0).toUpperCase() + task.priority.slice(1))}
                              />
                              {task.due_date ? (
                                <Chip size="small" variant="outlined" label={`${t("Due date")}: ${task.due_date}`} />
                              ) : null}
                            </Stack>
                          </Stack>
                        </Paper>
                      ))}

                      {workspaceTasks.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          {t("No project tasks yet.")}
                        </Typography>
                      ) : null}
                    </Stack>
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Stack spacing={1.5}>
                    <Typography variant="subtitle2">{t("Meetings")}</Typography>
                    <Stack spacing={1}>
                      {workspaceMeetings.slice(0, 5).map((occurrence) => (
                        <Paper key={occurrence.occurrence_id} variant="outlined" sx={{ p: 1.25 }}>
                          <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {occurrence.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                {format(occurrence.start, "MMM d, HH:mm")} - {format(occurrence.end, "HH:mm")}
                              </Typography>
                            </Box>
                            <Stack direction="row" spacing={0.75}>
                              {occurrence.meeting.meet_url ? (
                                <Button
                                  size="small"
                                  startIcon={<VideoCallIcon />}
                                  onClick={() => openUrl(occurrence.meeting.meet_url!)}
                                >
                                  {t("Open Meet")}
                                </Button>
                              ) : null}
                              <Button
                                size="small"
                                startIcon={<CalendarMonthIcon />}
                                onClick={() =>
                                  openUrl(
                                    occurrence.meeting.calendar_event_url ??
                                      `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(occurrence.title)}`
                                  )
                                }
                              >
                                {t("Open Calendar")}
                              </Button>
                            </Stack>
                          </Stack>
                        </Paper>
                      ))}

                      {workspaceMeetings.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          {t("No project meetings yet.")}
                        </Typography>
                      ) : null}
                    </Stack>
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Stack spacing={1.5}>
                    <Typography variant="subtitle2">{t("Branches")}</Typography>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                      <TextField
                        label={t("Branch name")}
                        value={branchName}
                        onChange={(event) => setBranchName(event.target.value)}
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <CallSplitIcon fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                      />
                      <TextField
                        label={t("Description")}
                        value={branchDescription}
                        onChange={(event) => setBranchDescription(event.target.value)}
                        fullWidth
                      />
                      <Button variant="outlined" onClick={handleCreateBranch} disabled={busy || !branchName.trim()}>
                        {t("Create branch")}
                      </Button>
                    </Stack>

                    <Stack spacing={1}>
                      {branches.map((branch) => (
                        <Paper key={branch.id} variant="outlined" sx={{ p: 1.25 }}>
                          <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {branch.name}
                              </Typography>
                              {branch.description ? (
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                  {branch.description}
                                </Typography>
                              ) : null}
                            </Box>

                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip
                                size="small"
                                color={branchStatusColor[branch.status]}
                                variant="outlined"
                                label={t(branchStatusLabel[branch.status])}
                              />
                              <Button
                                size="small"
                                onClick={() =>
                                  updateBranch.mutate({
                                    id: branch.id,
                                    project_id: branch.project_id,
                                    name: branch.name,
                                    description: branch.description,
                                    status: branch.status === "open" ? "merged" : "open",
                                  })
                                }
                                disabled={busy}
                              >
                                {branch.status === "open" ? t("Mark as merged") : t("Reopen")}
                              </Button>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => deleteBranch.mutate({ id: branch.id, project_id: branch.project_id })}
                                disabled={busy}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Stack>
                        </Paper>
                      ))}

                      {branches.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          {t("No branches yet.")}
                        </Typography>
                      ) : null}
                    </Stack>
                  </Stack>
                </Box>
              ) : null}
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
                <option value="completed">{t("Completed")}</option>
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

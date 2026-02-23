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
import AddTaskIcon from "@mui/icons-material/AddTask";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchIcon from "@mui/icons-material/Search";
import { format, parseISO } from "date-fns";
import {
  useCreateTask,
  useDeleteTask,
  useTasks,
  useUpdateTask,
  useUpdateTaskStatus,
} from "../hooks/useTasks";
import { Task, TaskStatus } from "../types";

const columns: Array<{ status: TaskStatus; label: string; color: "default" | "warning" | "info" | "success" }> = [
  { status: "todo", label: "To Do", color: "warning" },
  { status: "in_progress", label: "In Progress", color: "info" },
  { status: "done", label: "Done", color: "success" },
];

const statusLabel: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const formatDate = (value: string) => {
  try {
    return format(parseISO(value), "MMM d, HH:mm");
  } catch {
    return value;
  }
};

export const TasksBoard = () => {
  const { data: tasks = [], isLoading } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");

  const busy =
    createTask.isPending ||
    updateTask.isPending ||
    updateStatus.isPending ||
    deleteTask.isPending;

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((task) => {
      if (filter !== "all" && task.status !== filter) {
        return false;
      }

      if (!q) {
        return true;
      }

      return (
        task.title.toLowerCase().includes(q) ||
        task.description.toLowerCase().includes(q)
      );
    });
  }, [tasks, query, filter]);

  const grouped = useMemo(() => {
    return {
      todo: filteredTasks.filter((task) => task.status === "todo"),
      in_progress: filteredTasks.filter((task) => task.status === "in_progress"),
      done: filteredTasks.filter((task) => task.status === "done"),
    };
  }, [filteredTasks]);

  const openCreateDialog = () => {
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setStatus("todo");
    setDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      return;
    }

    if (editingTask) {
      updateTask.mutate({
        id: editingTask.id,
        title: cleanTitle,
        description: description.trim(),
        status,
      });
    } else {
      createTask.mutate({
        title: cleanTitle,
        description: description.trim(),
        status,
      });
    }

    setDialogOpen(false);
  };

  const handleDelete = (taskId: number) => {
    deleteTask.mutate(taskId);
  };

  const moveToStatus = (task: Task, nextStatus: TaskStatus) => {
    if (task.status === nextStatus) {
      return;
    }
    updateStatus.mutate({ id: task.id, status: nextStatus });
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
              Tasks Board
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track priorities and keep progress visible.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddTaskIcon />}
            onClick={openCreateDialog}
            disabled={busy}
          >
            New Task
          </Button>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2 }}>
          <TextField
            placeholder="Search tasks"
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
            label="Filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value as "all" | TaskStatus)}
            sx={{ minWidth: 200 }}
            SelectProps={{ native: true }}
          >
            <option value="all">All statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </TextField>
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ mt: 2 }}>
        {columns.map((column) => (
          <Paper key={column.status} sx={{ p: 2, flex: 1, minHeight: 320 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {column.label}
              </Typography>
              <Chip
                label={grouped[column.status].length}
                size="small"
                color={column.color}
                variant="outlined"
              />
            </Stack>

            <Stack spacing={1.5}>
              {grouped[column.status].map((task) => (
                <Paper
                  key={task.id}
                  variant="outlined"
                  sx={{ p: 1.5, borderColor: "rgba(255,255,255,0.1)" }}
                >
                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                        {task.title}
                      </Typography>
                      {task.description ? (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {task.description}
                        </Typography>
                      ) : null}
                      <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 1 }}>
                        Updated: {formatDate(task.updated_at)}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={() => openEditDialog(task)} disabled={busy}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(task.id)}
                        disabled={busy}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>

                  <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: "wrap" }}>
                    {columns.map((nextColumn) => (
                      <Chip
                        key={nextColumn.status}
                        label={statusLabel[nextColumn.status]}
                        size="small"
                        color={task.status === nextColumn.status ? nextColumn.color : "default"}
                        variant={task.status === nextColumn.status ? "filled" : "outlined"}
                        onClick={() => moveToStatus(task, nextColumn.status)}
                        clickable
                      />
                    ))}
                  </Stack>
                </Paper>
              ))}

              {!isLoading && grouped[column.status].length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                  No tasks in this column.
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        ))}
      </Stack>

      <Dialog open={isDialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingTask ? "Edit task" : "Create task"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
              fullWidth
            />

            <TextField
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              multiline
              minRows={3}
              fullWidth
            />

            <TextField
              select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as TaskStatus)}
              SelectProps={{ native: true }}
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </TextField>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={busy || title.trim().length === 0}
          >
            {editingTask ? "Save" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

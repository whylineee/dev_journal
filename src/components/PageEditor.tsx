import {
    Box,
    TextField,
    Typography,
    Button,
    Paper,
    IconButton,
    Tooltip,
    InputBase,
    Chip,
    Checkbox,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Stack,
} from "@mui/material";
import { useState, useEffect, useMemo, useCallback, ComponentProps } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { usePage, useCreatePage, useUpdatePage, useDeletePage } from "../hooks/usePages";
import { useGoals } from "../hooks/useGoals";
import { useProjects } from "../hooks/useProjects";
import { useTasks, useUpdateTaskStatus } from "../hooks/useTasks";
import { motion } from "framer-motion";
import { alpha, useTheme } from "@mui/material/styles";
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import CodeIcon from '@mui/icons-material/Code';
import DataObjectIcon from '@mui/icons-material/DataObject';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import ViewAgendaOutlinedIcon from '@mui/icons-material/ViewAgendaOutlined';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { Task } from "../types";

interface PageEditorProps {
    pageId: number | null;
    previewEnabled: boolean;
    autosaveEnabled: boolean;
    onSaveSuccess: (id: number) => void;
    onDeleteSuccess: () => void;
}

const countWords = (value: string) => value.split(/\s+/).filter((word) => word.length > 0).length;
const TASK_TABLE_BLOCK = "{{TASK_TABLE}}";

const splitPageContent = (value: string) => {
    return value.split(TASK_TABLE_BLOCK).flatMap((segment, index, source) => {
        const chunks: Array<{ type: "markdown" | "tasks"; value: string }> = [];
        if (segment.length > 0) {
            chunks.push({ type: "markdown", value: segment });
        }
        if (index < source.length - 1) {
            chunks.push({ type: "tasks", value: TASK_TABLE_BLOCK });
        }
        return chunks;
    });
};

const toggleChecklistLine = (value: string, lineNumber: number) => {
    const lines = value.split("\n");
    const index = lineNumber - 1;
    if (index < 0 || index >= lines.length) {
        return value;
    }

    const currentLine = lines[index];
    if (currentLine.includes("- [ ]")) {
        lines[index] = currentLine.replace("- [ ]", "- [x]");
    } else if (currentLine.includes("- [x]")) {
        lines[index] = currentLine.replace("- [x]", "- [ ]");
    }

    return lines.join("\n");
};

const PageTaskTable = ({
    tasks,
    projectsById,
    goalsById,
    onToggleTask,
}: {
    tasks: Task[];
    projectsById: Map<number, string>;
    goalsById: Map<number, string>;
    onToggleTask: (task: Task, checked: boolean) => void;
}) => {
    const [view, setView] = useState<"all" | "open" | "checklist">("all");

    const visibleTasks = useMemo(() => {
        if (view === "open") {
            return tasks.filter((task) => task.status !== "done");
        }
        return tasks;
    }, [tasks, view]);

    return (
        <Paper
            variant="outlined"
            sx={{
                mt: 2,
                borderRadius: 2.5,
                borderColor: "divider",
                overflow: "hidden",
                bgcolor: "background.paper",
            }}
        >
            <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Tasks Database
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                    Embedded tasks view for this page.
                </Typography>
                <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: "wrap" }}>
                    <Chip
                        label="All Tasks"
                        size="small"
                        color={view === "all" ? "primary" : "default"}
                        variant={view === "all" ? "filled" : "outlined"}
                        onClick={() => setView("all")}
                    />
                    <Chip
                        label="Open"
                        size="small"
                        color={view === "open" ? "primary" : "default"}
                        variant={view === "open" ? "filled" : "outlined"}
                        onClick={() => setView("open")}
                    />
                    <Chip
                        label="Checklist"
                        size="small"
                        color={view === "checklist" ? "primary" : "default"}
                        variant={view === "checklist" ? "filled" : "outlined"}
                        onClick={() => setView("checklist")}
                    />
                </Stack>
            </Box>

            {view === "checklist" ? (
                <Stack spacing={0.5} sx={{ p: 1.5 }}>
                    {visibleTasks.map((task) => (
                        <Stack key={task.id} direction="row" spacing={1} alignItems="center">
                            <Checkbox
                                checked={task.status === "done"}
                                onChange={(_, checked) => onToggleTask(task, checked)}
                                size="small"
                            />
                            <Typography
                                variant="body2"
                                sx={{
                                    textDecoration: task.status === "done" ? "line-through" : "none",
                                    opacity: task.status === "done" ? 0.65 : 1,
                                }}
                            >
                                {task.title}
                            </Typography>
                        </Stack>
                    ))}
                    {visibleTasks.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            No tasks to show.
                        </Typography>
                    ) : null}
                </Stack>
            ) : (
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: 44 }} />
                            <TableCell>Task name</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Project</TableCell>
                            <TableCell>Goal</TableCell>
                            <TableCell>Due date</TableCell>
                            <TableCell>Priority</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {visibleTasks.map((task) => (
                            <TableRow key={task.id} hover>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        checked={task.status === "done"}
                                        onChange={(_, checked) => onToggleTask(task, checked)}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {task.title}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        size="small"
                                        label={
                                            task.status === "done"
                                                ? "Done"
                                                : task.status === "in_progress"
                                                    ? "In Progress"
                                                    : "To Do"
                                        }
                                        color={
                                            task.status === "done"
                                                ? "success"
                                                : task.status === "in_progress"
                                                    ? "info"
                                                    : "default"
                                        }
                                        variant={task.status === "todo" ? "outlined" : "filled"}
                                    />
                                </TableCell>
                                <TableCell>{task.project_id ? projectsById.get(task.project_id) ?? "—" : "—"}</TableCell>
                                <TableCell>{task.goal_id ? goalsById.get(task.goal_id) ?? "—" : "—"}</TableCell>
                                <TableCell>{task.due_date ?? "—"}</TableCell>
                                <TableCell>
                                    <Chip
                                        size="small"
                                        variant="outlined"
                                        label={task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                        {visibleTasks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7}>
                                    <Typography variant="body2" color="text.secondary">
                                        No tasks to show.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : null}
                    </TableBody>
                </Table>
            )}
        </Paper>
    );
};

export const PageEditor = ({ pageId, previewEnabled, autosaveEnabled, onSaveSuccess, onDeleteSuccess }: PageEditorProps) => {
    const muiTheme = useTheme();
    const { data: page, isLoading } = usePage(pageId);
    const { data: tasks = [] } = useTasks();
    const { data: projects = [] } = useProjects();
    const { data: goals = [] } = useGoals();
    const createMutation = useCreatePage();
    const updateMutation = useUpdatePage();
    const deleteMutation = useDeletePage();
    const updateTaskStatus = useUpdateTaskStatus();

    const [title, setTitle] = useState("Untitled Page");
    const [content, setContent] = useState("");
    const [draftRestored, setDraftRestored] = useState(false);
    const draftKey = useMemo(() => `devJournal_page_draft_${pageId ?? 'new'}`, [pageId]);

    useEffect(() => {
        const pageTitle = page?.title ?? "Untitled Page";
        const pageContent = page?.content ?? "";

        let nextTitle = pageTitle;
        let nextContent = pageContent;
        let restored = false;

        const rawDraft = localStorage.getItem(draftKey);
        if (rawDraft) {
            try {
                const draft = JSON.parse(rawDraft) as { title?: string; content?: string };
                if (typeof draft.title === "string") {
                    nextTitle = draft.title;
                }
                if (typeof draft.content === "string") {
                    nextContent = draft.content;
                }
                restored = true;
            } catch {
                localStorage.removeItem(draftKey);
            }
        }

        setTitle(nextTitle);
        setContent(nextContent);
        setDraftRestored(restored);
    }, [page, pageId, draftKey]);

    useEffect(() => {
        if (!autosaveEnabled) {
            return;
        }

        const timeout = setTimeout(() => {
            localStorage.setItem(
                draftKey,
                JSON.stringify({
                    title,
                    content,
                    updatedAt: new Date().toISOString(),
                })
            );
        }, 700);

        return () => clearTimeout(timeout);
    }, [autosaveEnabled, content, draftKey, title]);

    const handleSave = useCallback(() => {
        if (pageId) {
            updateMutation.mutate({ id: pageId, title, content }, {
                onSuccess: () => {
                    localStorage.removeItem(draftKey);
                    setDraftRestored(false);
                    onSaveSuccess(pageId);
                }
            });
        } else {
            createMutation.mutate({ title, content }, {
                onSuccess: (newPage) => {
                    localStorage.removeItem(draftKey);
                    setDraftRestored(false);
                    onSaveSuccess(newPage.id);
                }
            });
        }
    }, [content, createMutation, draftKey, onSaveSuccess, pageId, title, updateMutation]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                if (!createMutation.isPending && !updateMutation.isPending) {
                    handleSave();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [createMutation.isPending, handleSave, updateMutation.isPending]);

    const handleDelete = () => {
        if (pageId) {
            deleteMutation.mutate(pageId, {
                onSuccess: () => {
                    localStorage.removeItem(draftKey);
                    onDeleteSuccess();
                }
            });
        }
    };

    const insertFormat = (prefix: string, suffix: string) => {
        if (content.endsWith('\n') || content.length === 0) {
            setContent(content + `${prefix}text${suffix}`);
        } else {
            setContent(content + `\n${prefix}text${suffix}`);
        }
    };

    const insertTemplate = () => {
        const template = `## Goal\n\n## Context\n\n## Plan\n- Step 1\n- Step 2\n\n## Risks\n\n## Notes`;
        setContent((prev) => (prev.trim().length === 0 ? template : `${prev}\n\n${template}`));
    };

    const insertCodeBlock = () => {
        const snippet = "```ts\n// code\n```";
        setContent((prev) => (prev.trim().length === 0 ? snippet : `${prev}${prev.endsWith("\n") ? "" : "\n"}\n${snippet}`));
    };

    const insertChecklist = () => {
        const snippet = "- [ ] First item\n- [ ] Second item";
        setContent((prev) => (prev.trim().length === 0 ? snippet : `${prev}${prev.endsWith("\n") ? "" : "\n"}\n${snippet}`));
    };

    const insertTable = () => {
        const snippet = "| Column | Value |\n| --- | --- |\n| Item | Text |";
        setContent((prev) => (prev.trim().length === 0 ? snippet : `${prev}${prev.endsWith("\n") ? "" : "\n"}\n${snippet}`));
    };

    const insertTaskDatabase = () => {
        setContent((prev) => (prev.trim().length === 0 ? TASK_TABLE_BLOCK : `${prev}${prev.endsWith("\n") ? "" : "\n"}\n${TASK_TABLE_BLOCK}`));
    };

    const clearDraft = () => {
        localStorage.removeItem(draftKey);
        setDraftRestored(false);
        setTitle(page?.title ?? "Untitled Page");
        setContent(page?.content ?? "");
    };

    const words = countWords(content);
    const projectsById = useMemo(() => {
        const map = new Map<number, string>();
        projects.forEach((project) => map.set(project.id, project.name));
        return map;
    }, [projects]);
    const goalsById = useMemo(() => {
        const map = new Map<number, string>();
        goals.forEach((goal) => map.set(goal.id, goal.title));
        return map;
    }, [goals]);
    const pagePreviewBlocks = useMemo(() => splitPageContent(content), [content]);
    const toolbarButtonSx = {
        color: "text.secondary",
        "&:hover": {
            color: "text.primary",
            bgcolor: alpha(muiTheme.palette.primary.main, 0.12),
        },
    };

    const markdownComponents = useMemo(() => ({
        table: (props: ComponentProps<"table">) => (
            <Box sx={{ overflowX: "auto", my: 2 }}>
                <Table size="small" sx={{ minWidth: 520 }} {...props} />
            </Box>
        ),
        thead: (props: ComponentProps<"thead">) => <TableHead {...props} />,
        tbody: (props: ComponentProps<"tbody">) => <TableBody {...props} />,
        tr: (props: ComponentProps<"tr">) => <TableRow {...props} />,
        th: (props: ComponentProps<"th">) => (
            <Box
                component="th"
                sx={{
                    px: 2,
                    py: 1.25,
                    textAlign: "left",
                    fontWeight: 700,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                }}
                {...props}
            />
        ),
        td: (props: ComponentProps<"td">) => (
            <Box
                component="td"
                sx={{
                    px: 2,
                    py: 1.1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                }}
                {...props}
            />
        ),
        input: ({ node, ...props }: ComponentProps<"input"> & { node?: { position?: { start?: { line?: number } } } }) => {
            if (props.type !== "checkbox") {
                return <input {...props} />;
            }

            return (
                <Checkbox
                    checked={Boolean(props.checked)}
                    size="small"
                    onChange={() => {
                        const line = node?.position?.start?.line;
                        if (!line) {
                            return;
                        }
                        setContent((prev) => toggleChecklistLine(prev, line));
                    }}
                    sx={{ p: 0.25, mr: 0.5 }}
                />
            );
        },
    }), []);

    const handleTaskToggle = (task: Task, checked: boolean) => {
        updateTaskStatus.mutate({
            id: task.id,
            status: checked ? "done" : "todo",
        });
    };

    if (isLoading && pageId) return (
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
            <Typography variant="h6" color="text.secondary">Loading page...</Typography>
        </Box>
    );

    return (
        <motion.div
            key={pageId || 'new'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
            <Box sx={{ maxWidth: 1000, mx: "auto", width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", md: "center" }}
                    mb={1}
                    gap={2}
                    flexDirection={{ xs: "column", md: "row" }}
                >
                    <InputBase
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Page Title"
                        sx={{
                            typography: { xs: "h4", md: "h3" },
                            fontWeight: 700,
                            letterSpacing: '-0.02em',
                            color: 'text.primary',
                            flex: 1,
                            minWidth: 0,
                            width: "100%",
                            mr: { md: 2 },
                        }}
                    />

                    <Paper
                        elevation={0}
                        sx={{
                            display: 'flex',
                            gap: 0.5,
                            p: 0.5,
                            borderRadius: 3,
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: alpha(muiTheme.palette.background.paper, 0.94),
                            alignSelf: { xs: "flex-end", md: "auto" },
                        }}
                    >
                        <Tooltip title="Bold">
                            <IconButton size="small" onClick={() => insertFormat('**', '**')} sx={toolbarButtonSx}>
                                <FormatBoldIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Italic">
                            <IconButton size="small" onClick={() => insertFormat('*', '*')} sx={toolbarButtonSx}>
                                <FormatItalicIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Code">
                            <IconButton size="small" onClick={() => insertFormat('`', '`')} sx={toolbarButtonSx}>
                                <CodeIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Code Block">
                            <IconButton size="small" onClick={insertCodeBlock} sx={toolbarButtonSx}>
                                <DataObjectIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Bullet List">
                            <IconButton size="small" onClick={() => insertFormat('- ', '')} sx={toolbarButtonSx}>
                                <FormatListBulletedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Checklist">
                            <IconButton size="small" onClick={insertChecklist} sx={toolbarButtonSx}>
                                <CheckBoxOutlinedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Table">
                            <IconButton size="small" onClick={insertTable} sx={toolbarButtonSx}>
                                <TableChartOutlinedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Tasks Database">
                            <IconButton size="small" onClick={insertTaskDatabase} sx={toolbarButtonSx}>
                                <ViewAgendaOutlinedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Paper>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: "center" }}>
                    <Chip label={`Words: ${words}`} size="small" variant="outlined" />
                    <Chip label={autosaveEnabled ? 'Autosave on' : 'Autosave off'} size="small" color={autosaveEnabled ? 'success' : 'default'} variant="outlined" />
                    <Chip label="Ctrl/Cmd+S to save" size="small" variant="outlined" />
                    <Chip label="Use {{TASK_TABLE}} for tasks DB" size="small" variant="outlined" />
                    {draftRestored ? <Chip label="Draft restored" size="small" color="info" variant="outlined" /> : null}
                    <Button size="small" onClick={insertTemplate}>Insert template</Button>
                </Box>

                <Paper
                    variant="outlined"
                    sx={{
                        flex: 1,
                        borderRadius: 4,
                        borderColor: "divider",
                        overflow: "hidden",
                        bgcolor: alpha(muiTheme.palette.background.paper, 0.9),
                        boxShadow: `0 24px 64px ${alpha(muiTheme.palette.common.black, 0.08)}`,
                    }}
                >
                    <Box
                        sx={{
                            px: { xs: 2, md: 4 },
                            py: { xs: 2.5, md: 3.5 },
                            borderBottom: "1px solid",
                            borderColor: "divider",
                        }}
                    >
                        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.14em" }}>
                            Page Canvas
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            One editor, like Notion. Write in Markdown, use checklists, and drop task databases inline.
                        </Typography>
                    </Box>

                    <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 2, md: 3 } }}>
                        <TextField
                            multiline
                            fullWidth
                            minRows={16}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Type '/' for commands or start writing in Markdown..."
                            variant="standard"
                            InputProps={{
                                disableUnderline: true,
                                sx: {
                                    alignItems: "flex-start",
                                    fontSize: 18,
                                    lineHeight: 1.8,
                                    "& textarea": {
                                        minHeight: "420px !important",
                                    },
                                },
                            }}
                            sx={{
                                "& .MuiInputBase-root": {
                                    p: 0,
                                },
                                "& textarea::placeholder": {
                                    color: "text.disabled",
                                    opacity: 1,
                                },
                            }}
                        />
                    </Box>

                    {previewEnabled ? (
                        <Box
                            sx={{
                                px: { xs: 2, md: 4 },
                                pb: { xs: 2.5, md: 4 },
                            }}
                        >
                            <Box
                                sx={{
                                    pt: 2.5,
                                    borderTop: "1px solid",
                                    borderColor: "divider",
                                }}
                            >
                                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.14em" }}>
                                    Live Blocks
                                </Typography>
                                {content ? (
                                    <Box sx={{ mt: 1.5 }}>
                                        {pagePreviewBlocks.map((block, index) =>
                                            block.type === "tasks" ? (
                                                <PageTaskTable
                                                    key={`tasks-${index}`}
                                                    tasks={tasks}
                                                    projectsById={projectsById}
                                                    goalsById={goalsById}
                                                    onToggleTask={handleTaskToggle}
                                                />
                                            ) : (
                                                <Markdown
                                                    key={`markdown-${index}`}
                                                    remarkPlugins={[remarkGfm]}
                                                    components={markdownComponents}
                                                >
                                                    {block.value}
                                                </Markdown>
                                            )
                                        )}
                                    </Box>
                                ) : (
                                    <Typography color="text.disabled" sx={{ fontStyle: "italic", mt: 1.5 }}>
                                        Start writing to see inline blocks and task databases.
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    ) : null}
                </Paper>

                <Box
                    sx={{
                        mt: 3,
                        pb: 4,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: { xs: "stretch", md: "center" },
                        flexDirection: { xs: "column", md: "row" },
                        flexWrap: "wrap",
                        gap: 1.25,
                    }}
                >
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: "wrap", order: { xs: 2, md: 1 } }}>
                        {pageId ? (
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={handleDelete}
                                disabled={deleteMutation.isPending}
                            >
                                Delete Page
                            </Button>
                        ) : <Box />}
                        <Button
                            variant="text"
                            color="inherit"
                            startIcon={<RestartAltIcon />}
                            onClick={clearDraft}
                        >
                            Reset Draft
                        </Button>
                    </Box>

                    <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        startIcon={<SaveIcon />}
                        onClick={handleSave}
                        disabled={createMutation.isPending || updateMutation.isPending}
                        sx={{ px: 4, minWidth: { xs: "100%", md: 220 }, order: { xs: 1, md: 2 } }}
                    >
                        {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Page"}
                    </Button>
                </Box>
            </Box>
        </motion.div>
    );
};

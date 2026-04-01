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
    useMediaQuery,
} from "@mui/material";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePage, useCreatePage, useUpdatePage, useDeletePage } from "../hooks/usePages";
import { useGoals } from "../hooks/useGoals";
import { useProjects } from "../hooks/useProjects";
import { useTasks, useUpdateTaskStatus } from "../hooks/useTasks";
import { motion } from "framer-motion";
import { useTheme } from "@mui/material/styles";
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import CodeIcon from '@mui/icons-material/Code';
import DataObjectIcon from '@mui/icons-material/DataObject';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import ViewAgendaOutlinedIcon from '@mui/icons-material/ViewAgendaOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl';
import FilterListIcon from '@mui/icons-material/FilterList';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import SearchIcon from '@mui/icons-material/Search';
import TuneIcon from '@mui/icons-material/Tune';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import NotesIcon from '@mui/icons-material/Notes';
import { Task } from "../types";

interface PageEditorProps {
    pageId: number | null;
    previewEnabled: boolean;
    autosaveEnabled: boolean;
    onSaveSuccess: (id: number) => void;
    onDeleteSuccess: () => void;
}

const TASK_TABLE_BLOCK = "{{TASK_TABLE}}";
const FORM_DB_PREFIX = "{{FORM_DB:";
const TASK_TRACKER_PREFIX = "{{TASK_TRACKER:";
const BLOCK_TOKEN_REGEX = /\{\{TASK_TABLE\}\}|\{\{FORM_DB:[^}]+\}\}|\{\{TASK_TRACKER:[^}]+\}\}/g;
const TASK_TRACKER_EDITOR_MARKER_REGEX = /\[\[Task Tracker\]\]/g;
const CHECKLIST_SOFT_BREAK_REGEX = /<br\s*\/?>/gi;

type PageFormFieldType = "text" | "checkbox" | "date" | "status";

interface PageFormField {
    id: string;
    label: string;
    type: PageFormFieldType;
    options?: string[];
}

interface PageFormRow {
    id: string;
    values: Record<string, string | boolean>;
}

interface PageFormData {
    id: string;
    title: string;
    description: string;
    fields: PageFormField[];
    rows: PageFormRow[];
}

type TrackerStatus = "Not started" | "In progress" | "Done";
type TrackerPriority = "Low" | "Medium" | "High";

interface TaskTrackerRow {
    id: string;
    taskName: string;
    status: TrackerStatus;
    assignee: string;
    dueDate: string;
    priority: TrackerPriority;
    done: boolean;
}

interface TaskTrackerData {
    id: string;
    title: string;
    description: string;
    rows: TaskTrackerRow[];
}

type PageContentBlock =
    | { type: "markdown"; value: string }
    | { type: "tasks"; value: string }
    | { type: "form"; value: string; token: string; formData: PageFormData }
    | { type: "tracker"; value: string; token: string; trackerData: TaskTrackerData };

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

const createDefaultFormData = (): PageFormData => ({
    id: makeId(),
    title: "New form",
    description: "Stay organized with tasks, your way.",
    fields: [
        { id: makeId(), label: "Task name", type: "text" },
        { id: makeId(), label: "Done", type: "checkbox" },
        { id: makeId(), label: "Assignee", type: "text" },
        { id: makeId(), label: "Due date", type: "date" },
        { id: makeId(), label: "Priority", type: "status", options: ["Low", "Medium", "High"] },
    ],
    rows: [],
});

const normalizeFormData = (input: Partial<PageFormData>): PageFormData => {
    const fields = Array.isArray(input.fields)
        ? input.fields
            .filter((field): field is PageFormField => Boolean(field && typeof field.id === "string" && typeof field.label === "string"))
            .map((field) => ({
                id: field.id,
                label: field.label || "Field",
                type: field.type ?? "text",
                options: field.type === "status"
                    ? (Array.isArray(field.options) && field.options.length > 0 ? field.options : ["Low", "Medium", "High"])
                    : undefined,
            }))
        : [];

    const safeFields = fields.length > 0 ? fields : createDefaultFormData().fields;

    const rows = Array.isArray(input.rows)
        ? input.rows
            .filter((row): row is PageFormRow => Boolean(row && typeof row.id === "string" && row.values && typeof row.values === "object"))
            .map((row) => ({
                id: row.id,
                values: { ...row.values },
            }))
        : [];

    return {
        id: typeof input.id === "string" && input.id.length > 0 ? input.id : makeId(),
        title: typeof input.title === "string" && input.title.trim().length > 0 ? input.title : "New form",
        description: typeof input.description === "string" ? input.description : "",
        fields: safeFields,
        rows,
    };
};

const serializeFormToken = (formData: PageFormData) => {
    return `${FORM_DB_PREFIX}${encodeURIComponent(JSON.stringify(formData))}}}`;
};

const parseFormToken = (token: string): PageFormData | null => {
    if (!token.startsWith(FORM_DB_PREFIX) || !token.endsWith("}}")) {
        return null;
    }
    const payload = token.slice(FORM_DB_PREFIX.length, -2);
    try {
        const parsed = JSON.parse(decodeURIComponent(payload)) as Partial<PageFormData>;
        return normalizeFormData(parsed);
    } catch {
        return null;
    }
};

const createDefaultTaskTrackerData = (): TaskTrackerData => ({
    id: makeId(),
    title: "Task Tracker",
    description: "Track your items here.",
    rows: [],
});

const normalizeTaskTrackerData = (input: Partial<TaskTrackerData>): TaskTrackerData => {
    const rows = Array.isArray(input.rows)
        ? input.rows
            .filter((row): row is TaskTrackerRow => Boolean(row && typeof row.id === "string"))
            .map((row) => ({
                id: row.id,
                taskName: typeof row.taskName === "string" ? row.taskName : "",
                status:
                    row.status === "Done" || row.status === "In progress" || row.status === "Not started"
                        ? row.status
                        : "Not started",
                assignee: typeof row.assignee === "string" ? row.assignee : "",
                dueDate: typeof row.dueDate === "string" ? row.dueDate : "",
                priority: row.priority === "High" || row.priority === "Medium" || row.priority === "Low" ? row.priority : "Medium",
                done: typeof row.done === "boolean" ? row.done : row.status === "Done",
            }))
        : [];

    return {
        id: typeof input.id === "string" && input.id.length > 0 ? input.id : makeId(),
        title: typeof input.title === "string" && input.title.trim().length > 0 ? input.title : "Task tracker",
        description: typeof input.description === "string" ? input.description : "",
        rows,
    };
};

const sanitizeTrackerId = (value: string) => {
    const cleaned = value.replace(/[^\w-]/g, "").slice(0, 64);
    return cleaned.length > 0 ? cleaned : makeId();
};

const buildTaskTrackerToken = (trackerId: string) => {
    return `${TASK_TRACKER_PREFIX}${sanitizeTrackerId(trackerId)}}}`;
};

const serializeTaskTrackerToken = (trackerData: TaskTrackerData) => {
    return buildTaskTrackerToken(trackerData.id);
};

const serializeTaskTrackerPayloadToken = (trackerData: TaskTrackerData) => {
    return `${TASK_TRACKER_PREFIX}${encodeURIComponent(JSON.stringify(trackerData))}}}`;
};

const parseTaskTrackerToken = (token: string): { id: string; data?: TaskTrackerData } | null => {
    if (!token.startsWith(TASK_TRACKER_PREFIX) || !token.endsWith("}}")) {
        return null;
    }

    const rawPayload = token.slice(TASK_TRACKER_PREFIX.length, -2).trim();
    if (rawPayload.length === 0) {
        return null;
    }

    try {
        const decoded = decodeURIComponent(rawPayload);
        if (decoded.startsWith("{")) {
            const parsed = JSON.parse(decoded) as Partial<TaskTrackerData>;
            const normalized = normalizeTaskTrackerData(parsed);
            return { id: sanitizeTrackerId(normalized.id), data: normalized };
        }
    } catch {
        // fallback to short-id format below
    }

    if (rawPayload.startsWith("{")) {
        try {
            const parsed = JSON.parse(rawPayload) as Partial<TaskTrackerData>;
            const normalized = normalizeTaskTrackerData(parsed);
            return { id: sanitizeTrackerId(normalized.id), data: normalized };
        } catch {
            return null;
        }
    }

    return { id: sanitizeTrackerId(rawPayload) };
};

const splitPageContent = (
    value: string,
    trackerDataById: Record<string, TaskTrackerData>
): PageContentBlock[] => {
    const blocks: PageContentBlock[] = [];
    BLOCK_TOKEN_REGEX.lastIndex = 0;
    let cursor = 0;
    let match: RegExpExecArray | null;

    while ((match = BLOCK_TOKEN_REGEX.exec(value)) !== null) {
        if (match.index > cursor) {
            blocks.push({ type: "markdown", value: value.slice(cursor, match.index) });
        }

        const token = match[0];
        if (token === TASK_TABLE_BLOCK) {
            blocks.push({ type: "tasks", value: token });
        } else if (token.startsWith(TASK_TRACKER_PREFIX)) {
            const trackerParsed = parseTaskTrackerToken(token);
            if (trackerParsed) {
                const trackerId = trackerParsed.id;
                const trackerData = trackerDataById[trackerId]
                    ? normalizeTaskTrackerData({ ...trackerDataById[trackerId], id: trackerId })
                    : trackerParsed.data
                        ? normalizeTaskTrackerData({ ...trackerParsed.data, id: trackerId })
                        : normalizeTaskTrackerData({ ...createDefaultTaskTrackerData(), id: trackerId });
                blocks.push({
                    type: "tracker",
                    value: token,
                    token: buildTaskTrackerToken(trackerId),
                    trackerData,
                });
            } else {
                blocks.push({ type: "markdown", value: token });
            }
        } else {
            const formData = parseFormToken(token);
            if (formData) {
                blocks.push({ type: "form", value: token, token, formData });
            } else {
                blocks.push({ type: "markdown", value: token });
            }
        }

        cursor = BLOCK_TOKEN_REGEX.lastIndex;
    }

    if (cursor < value.length) {
        blocks.push({ type: "markdown", value: value.slice(cursor) });
    }

    return blocks.length > 0 ? blocks : [{ type: "markdown", value: "" }];
};

const materializeTaskTrackerTokensForSave = (
    value: string,
    trackerDataById: Record<string, TaskTrackerData>
) => {
    return value.replace(/\{\{TASK_TRACKER:[^}]+\}\}/g, (rawToken) => {
        const parsed = parseTaskTrackerToken(rawToken);
        if (!parsed) {
            return rawToken;
        }
        const trackerId = parsed.id;
        const sourceData = trackerDataById[trackerId] ?? parsed.data ?? { ...createDefaultTaskTrackerData(), id: trackerId };
        const normalized = normalizeTaskTrackerData({ ...sourceData, id: trackerId });
        return serializeTaskTrackerPayloadToken(normalized);
    });
};

const extractEmbeddedBlockTokens = (value: string) => {
    BLOCK_TOKEN_REGEX.lastIndex = 0;
    const tokens: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = BLOCK_TOKEN_REGEX.exec(value)) !== null) {
        tokens.push(match[0]);
    }
    return tokens;
};

const normalizeEditorMarkdown = (value: string) => value.replace(/\n{3,}/g, "\n\n").trimEnd();

const toEditorDisplayContent = (value: string) => {
    BLOCK_TOKEN_REGEX.lastIndex = 0;
    return normalizeEditorMarkdown(value.replace(BLOCK_TOKEN_REGEX, ""));
};

const fromEditorDisplayContent = (value: string, embeddedTokens: string[]) => {
    const cleanMarkdown = normalizeEditorMarkdown(
        value
            .replace(/\[\[Tasks Database\]\]/g, "")
            .replace(TASK_TRACKER_EDITOR_MARKER_REGEX, "")
    );
    if (embeddedTokens.length === 0) {
        return cleanMarkdown;
    }
    return `${cleanMarkdown}${cleanMarkdown.length > 0 ? "\n\n" : ""}${embeddedTokens.join("\n")}`;
};

const removeEmbeddedTokenFromContent = (value: string, token: string) => {
    return normalizeEditorMarkdown(value.replace(token, ""));
};

type EditorBlockType = "paragraph" | "heading2" | "bullet" | "checklist";

interface EditorBlock {
    type: EditorBlockType;
    text: string;
    checked?: boolean;
}

const decodeChecklistText = (value: string) => value.replace(CHECKLIST_SOFT_BREAK_REGEX, "\n");
const encodeChecklistText = (value: string) => value.replace(/\n/g, "<br/>");

const markdownToEditorBlocks = (value: string): EditorBlock[] => {
    const normalized = normalizeEditorMarkdown(value);
    if (normalized.length === 0) {
        return [{ type: "paragraph", text: "" }];
    }

    const lines = normalized.split("\n");
    return lines.map((line) => {
        const checklistChecked = line.match(/^- \[x\]\s?(.*)$/i);
        if (checklistChecked) {
            return { type: "checklist", text: decodeChecklistText(checklistChecked[1] ?? ""), checked: true };
        }

        const checklistUnchecked = line.match(/^- \[ \]\s?(.*)$/);
        if (checklistUnchecked) {
            return { type: "checklist", text: decodeChecklistText(checklistUnchecked[1] ?? ""), checked: false };
        }

        const heading = line.match(/^##\s?(.*)$/);
        if (heading) {
            return { type: "heading2", text: heading[1] ?? "" };
        }

        const bullet = line.match(/^-\s?(.*)$/);
        if (bullet) {
            return { type: "bullet", text: bullet[1] ?? "" };
        }

        return { type: "paragraph", text: line };
    });
};

const editorBlocksToMarkdown = (blocks: EditorBlock[]) => {
    const lines = blocks.map((block) => {
        if (block.type === "heading2") {
            return `## ${block.text}`.trimEnd();
        }
        if (block.type === "bullet") {
            return `- ${block.text}`.trimEnd();
        }
        if (block.type === "checklist") {
            return `- [${block.checked ? "x" : " "}] ${encodeChecklistText(block.text)}`.trimEnd();
        }
        return block.text;
    });
    return normalizeEditorMarkdown(lines.join("\n"));
};

const PageTaskTable = ({
    tasks,
    projectsById,
    goalsById,
    onToggleTask,
    onDelete,
}: {
    tasks: Task[];
    projectsById: Map<number, string>;
    goalsById: Map<number, string>;
    onToggleTask: (task: Task, checked: boolean) => void;
    onDelete?: () => void;
}) => {
    const [view, setView] = useState<"all" | "my" | "checklist">("all");

    const visibleTasks = useMemo(() => {
        if (view === "my") {
            return tasks.filter((task) => task.status !== "done");
        }
        return tasks;
    }, [tasks, view]);

    const tabButtonSx = (active: boolean) => ({
        textTransform: "none",
        fontWeight: 600,
        borderRadius: 99,
        px: 1.4,
        py: 0.5,
        minHeight: 34,
        color: active ? "text.primary" : "text.secondary",
        bgcolor: active ? "action.selected" : "transparent",
        "&:hover": {
            bgcolor: active ? "action.selected" : "action.hover",
            color: "text.primary",
        },
    });

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
                {onDelete && (
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: "text.primary", lineHeight: 1.2 }}>
                            Task Database
                        </Typography>
                        <Tooltip title="Delete block" placement="left">
                            <IconButton size="small" onClick={onDelete} color="error" sx={{ opacity: 0.5, "&:hover": { opacity: 1 } }}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )}
                <Stack
                    direction={{ xs: "column", lg: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", lg: "center" }}
                    spacing={1}
                >
                    <Stack direction="row" spacing={0.4} sx={{ flexWrap: "wrap" }}>
                        <Button
                            size="small"
                            startIcon={<StarBorderIcon fontSize="small" />}
                            onClick={() => setView("all")}
                            sx={tabButtonSx(view === "all")}
                            data-testid="page-task-table-tab-all"
                        >
                            All Tasks
                        </Button>
                        <Button
                            size="small"
                            startIcon={<PersonOutlineIcon fontSize="small" />}
                            onClick={() => setView("my")}
                            sx={tabButtonSx(view === "my")}
                            data-testid="page-task-table-tab-my"
                        >
                            My Tasks
                        </Button>
                        <Button
                            size="small"
                            startIcon={<ChecklistRtlIcon fontSize="small" />}
                            onClick={() => setView("checklist")}
                            sx={tabButtonSx(view === "checklist")}
                            data-testid="page-task-table-tab-checklist"
                        >
                            Checklist
                        </Button>
                    </Stack>

                    <Stack direction="row" spacing={0.2}>
                        <IconButton size="small" sx={{ color: "text.secondary" }}>
                            <FilterListIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" sx={{ color: "text.secondary" }}>
                            <SwapVertIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" sx={{ color: "text.secondary" }}>
                            <SearchIcon fontSize="small" />
                        </IconButton>
                    </Stack>
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

const PageFormDatabase = ({
    formData,
    onChange,
    onDelete,
}: {
    formData: PageFormData;
    onChange: (nextFormData: PageFormData) => void;
    onDelete?: () => void;
}) => {
    const [view, setView] = useState<"builder" | "responses">("responses");

    const emitChange = (nextFormData: PageFormData) => {
        onChange(normalizeFormData(nextFormData));
    };

    const updateField = (fieldId: string, patch: Partial<PageFormField>) => {
        emitChange({
            ...formData,
            fields: formData.fields.map((field) => {
                if (field.id !== fieldId) {
                    return field;
                }
                const nextType = patch.type ?? field.type;
                return {
                    ...field,
                    ...patch,
                    options:
                        nextType === "status"
                            ? field.options && field.options.length > 0
                                ? field.options
                                : ["Low", "Medium", "High"]
                            : undefined,
                };
            }),
        });
    };

    const addField = (type: PageFormFieldType) => {
        emitChange({
            ...formData,
            fields: [
                ...formData.fields,
                {
                    id: makeId(),
                    label:
                        type === "checkbox"
                            ? "Checkbox"
                            : type === "date"
                                ? "Date"
                                : type === "status"
                                    ? "Status"
                                    : "Text",
                    type,
                    options: type === "status" ? ["Low", "Medium", "High"] : undefined,
                },
            ],
        });
    };

    const removeField = (fieldId: string) => {
        const nextFields = formData.fields.filter((field) => field.id !== fieldId);
        if (nextFields.length === 0) {
            return;
        }
        emitChange({
            ...formData,
            fields: nextFields,
            rows: formData.rows.map((row) => {
                const nextValues = { ...row.values };
                delete nextValues[fieldId];
                return { ...row, values: nextValues };
            }),
        });
    };

    const addRow = () => {
        const nextValues = formData.fields.reduce<Record<string, string | boolean>>((acc, field) => {
            acc[field.id] = field.type === "checkbox" ? false : "";
            return acc;
        }, {});
        emitChange({
            ...formData,
            rows: [...formData.rows, { id: makeId(), values: nextValues }],
        });
    };

    const updateRowValue = (rowId: string, fieldId: string, value: string | boolean) => {
        emitChange({
            ...formData,
            rows: formData.rows.map((row) =>
                row.id === rowId
                    ? {
                        ...row,
                        values: {
                            ...row.values,
                            [fieldId]: value,
                        },
                    }
                    : row
            ),
        });
    };

    const removeRow = (rowId: string) => {
        emitChange({
            ...formData,
            rows: formData.rows.filter((row) => row.id !== rowId),
        });
    };

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
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                    <InputBase
                        value={formData.title}
                        onChange={(event) => emitChange({ ...formData, title: event.target.value })}
                        sx={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, width: "100%" }}
                    />
                    {onDelete && (
                        <Tooltip title="Delete block" placement="left">
                            <IconButton size="small" onClick={onDelete} color="error" sx={{ mt: 0.5, opacity: 0.5, "&:hover": { opacity: 1 } }}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
                <InputBase
                    value={formData.description}
                    placeholder="Add description"
                    onChange={(event) => emitChange({ ...formData, description: event.target.value })}
                    sx={{ color: "text.secondary", fontSize: 15 }}
                />

                <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: "wrap" }}>
                    <Chip
                        label="Form builder"
                        size="small"
                        color={view === "builder" ? "primary" : "default"}
                        variant={view === "builder" ? "filled" : "outlined"}
                        onClick={() => setView("builder")}
                    />
                    <Chip
                        label="Responses"
                        size="small"
                        color={view === "responses" ? "primary" : "default"}
                        variant={view === "responses" ? "filled" : "outlined"}
                        onClick={() => setView("responses")}
                    />
                </Stack>
            </Box>

            {view === "builder" ? (
                <Box sx={{ p: 1.5 }}>
                    <Stack spacing={1}>
                        {formData.fields.map((field) => (
                            <Stack key={field.id} direction={{ xs: "column", md: "row" }} spacing={1}>
                                <TextField
                                    size="small"
                                    value={field.label}
                                    onChange={(event) => updateField(field.id, { label: event.target.value })}
                                    fullWidth
                                />
                                <TextField
                                    select
                                    size="small"
                                    value={field.type}
                                    onChange={(event) => updateField(field.id, { type: event.target.value as PageFormFieldType })}
                                    SelectProps={{ native: true }}
                                    sx={{ minWidth: 160 }}
                                >
                                    <option value="text">Text</option>
                                    <option value="checkbox">Checkbox</option>
                                    <option value="date">Date</option>
                                    <option value="status">Status</option>
                                </TextField>
                                <IconButton
                                    size="small"
                                    onClick={() => removeField(field.id)}
                                    disabled={formData.fields.length <= 1}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                        ))}
                    </Stack>

                    <Stack direction="row" spacing={0.75} sx={{ mt: 1.25, flexWrap: "wrap" }}>
                        <Button size="small" variant="outlined" onClick={() => addField("text")}>+ Text field</Button>
                        <Button size="small" variant="outlined" onClick={() => addField("checkbox")}>+ Checkbox</Button>
                        <Button size="small" variant="outlined" onClick={() => addField("date")}>+ Date</Button>
                        <Button size="small" variant="outlined" onClick={() => addField("status")}>+ Status</Button>
                    </Stack>
                </Box>
            ) : (
                <Box sx={{ p: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            Responses ({formData.rows.length})
                        </Typography>
                        <Button size="small" variant="contained" onClick={addRow}>
                            New row
                        </Button>
                    </Stack>

                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                {formData.fields.map((field) => (
                                    <TableCell key={field.id}>{field.label}</TableCell>
                                ))}
                                <TableCell sx={{ width: 48 }} />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {formData.rows.map((row) => (
                                <TableRow key={row.id} hover>
                                    {formData.fields.map((field) => (
                                        <TableCell key={field.id}>
                                            {field.type === "checkbox" ? (
                                                <Checkbox
                                                    checked={Boolean(row.values[field.id])}
                                                    onChange={(_, checked) => updateRowValue(row.id, field.id, checked)}
                                                    size="small"
                                                />
                                            ) : field.type === "date" ? (
                                                <TextField
                                                    size="small"
                                                    type="date"
                                                    value={typeof row.values[field.id] === "string" ? row.values[field.id] : ""}
                                                    onChange={(event) => updateRowValue(row.id, field.id, event.target.value)}
                                                    InputLabelProps={{ shrink: true }}
                                                    fullWidth
                                                    variant="standard"
                                                />
                                            ) : field.type === "status" ? (
                                                <TextField
                                                    select
                                                    size="small"
                                                    value={typeof row.values[field.id] === "string" ? row.values[field.id] : ""}
                                                    onChange={(event) => updateRowValue(row.id, field.id, event.target.value)}
                                                    SelectProps={{ native: true }}
                                                    fullWidth
                                                    variant="standard"
                                                >
                                                    {(field.options ?? ["Low", "Medium", "High"]).map((option) => (
                                                        <option key={option} value={option}>
                                                            {option}
                                                        </option>
                                                    ))}
                                                </TextField>
                                            ) : (
                                                <InputBase
                                                    value={typeof row.values[field.id] === "string" ? row.values[field.id] : ""}
                                                    onChange={(event) => updateRowValue(row.id, field.id, event.target.value)}
                                                    placeholder="Type..."
                                                    sx={{
                                                        width: "100%",
                                                        px: 0.5,
                                                        py: 0.25,
                                                        borderRadius: 1,
                                                        bgcolor: "action.hover",
                                                    }}
                                                />
                                            )}
                                        </TableCell>
                                    ))}
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={() => removeRow(row.id)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {formData.rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={formData.fields.length + 1}>
                                        <Typography variant="body2" color="text.secondary">
                                            No responses yet. Click "New row" to start filling the form.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : null}
                        </TableBody>
                    </Table>
                </Box>
            )}
        </Paper>
    );
};

const nextStatus = (value: TrackerStatus): TrackerStatus => {
    if (value === "Not started") return "In progress";
    if (value === "In progress") return "Done";
    return "Not started";
};

const nextPriority = (value: TrackerPriority): TrackerPriority => {
    if (value === "Low") return "Medium";
    if (value === "Medium") return "High";
    return "Low";
};

const PageTaskTrackerDatabase = ({
    trackerData,
    view,
    onViewChange,
    onChange,
    onDelete,
}: {
    trackerData: TaskTrackerData;
    view: "all" | "my" | "checklist";
    onViewChange: (nextView: "all" | "my" | "checklist") => void;
    onChange: (nextTrackerData: TaskTrackerData) => void;
    onDelete?: () => void;
}) => {
    const taskNameInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const [pendingRowFocusId, setPendingRowFocusId] = useState<string | null>(null);
    const [ghostTaskName, setGhostTaskName] = useState("");

    const emitChange = (nextTrackerData: TaskTrackerData) => {
        onChange(normalizeTaskTrackerData(nextTrackerData));
    };

    const addRow = (seed?: Partial<TaskTrackerRow>) => {
        const nextRow: TaskTrackerRow = {
            id: makeId(),
            taskName: seed?.taskName ?? "",
            status: seed?.status ?? "Not started",
            assignee: seed?.assignee ?? (view === "my" ? "Me" : ""),
            dueDate: seed?.dueDate ?? "",
            priority: seed?.priority ?? "Medium",
            done: seed?.done ?? false,
        };
        emitChange({
            ...trackerData,
            rows: [...trackerData.rows, nextRow],
        });
        setPendingRowFocusId(nextRow.id);
    };
    const addEmptyRow = () => addRow();

    const updateRow = (rowId: string, patch: Partial<TaskTrackerRow>) => {
        emitChange({
            ...trackerData,
            rows: trackerData.rows.map((row) => {
                if (row.id !== rowId) {
                    return row;
                }
                const nextRow = { ...row, ...patch };
                if (patch.done !== undefined) {
                    nextRow.status = patch.done ? "Done" : row.status === "Done" ? "Not started" : row.status;
                }
                if (patch.status !== undefined) {
                    nextRow.done = patch.status === "Done";
                }
                return nextRow;
            }),
        });
    };

    const removeRow = (rowId: string) => {
        emitChange({
            ...trackerData,
            rows: trackerData.rows.filter((row) => row.id !== rowId),
        });
    };

    const visibleRows = useMemo(() => {
        if (view === "my") {
            return trackerData.rows.filter((row) => row.assignee.trim().length > 0);
        }
        return trackerData.rows;
    }, [trackerData.rows, view]);

    useEffect(() => {
        if (!pendingRowFocusId || view === "checklist") {
            return;
        }

        const focusInput = () => {
            const target = taskNameInputRefs.current[pendingRowFocusId];
            if (!target) {
                return false;
            }
            target.focus();
            target.setSelectionRange?.(target.value.length, target.value.length);
            return true;
        };

        if (focusInput()) {
            setPendingRowFocusId(null);
            return;
        }

        const timeout = window.setTimeout(() => {
            if (focusInput()) {
                setPendingRowFocusId(null);
            }
        }, 0);

        return () => window.clearTimeout(timeout);
    }, [pendingRowFocusId, trackerData.rows, view]);

    const tabButtonSx = (active: boolean) => ({
        textTransform: "none",
        fontWeight: 600,
        borderRadius: 99,
        px: 1.4,
        py: 0.55,
        minHeight: 34,
        color: active ? "text.primary" : "text.secondary",
        bgcolor: active ? "action.selected" : "transparent",
        "&:hover": {
            bgcolor: active ? "action.selected" : "action.hover",
            color: "text.primary",
        },
    });

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
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                    <InputBase
                        value={trackerData.title}
                        onChange={(event) => emitChange({ ...trackerData, title: event.target.value })}
                        sx={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, width: "100%" }}
                    />
                    {onDelete && (
                        <Tooltip title="Delete block" placement="left">
                            <IconButton size="small" onClick={onDelete} color="error" sx={{ mt: 0.5, opacity: 0.5, "&:hover": { opacity: 1 } }}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
                <InputBase
                    value={trackerData.description}
                    placeholder="Track your items here."
                    onChange={(event) => emitChange({ ...trackerData, description: event.target.value })}
                    sx={{ color: "text.secondary", fontSize: 15, mt: 0.5, width: "100%" }}
                />

                <Stack
                    direction={{ xs: "column", lg: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", lg: "center" }}
                    spacing={1}
                    sx={{ mt: 1.5 }}
                >
                    <Stack direction="row" spacing={0.4} sx={{ flexWrap: "wrap" }}>
                        <Button size="small" startIcon={<StarBorderIcon fontSize="small" />} onClick={() => onViewChange("all")} sx={tabButtonSx(view === "all")} data-testid="page-task-tracker-tab-all">
                            All Tasks
                        </Button>
                        <Button size="small" startIcon={<PersonOutlineIcon fontSize="small" />} onClick={() => onViewChange("my")} sx={tabButtonSx(view === "my")} data-testid="page-task-tracker-tab-my">
                            My Tasks
                        </Button>
                        <Button size="small" startIcon={<ChecklistRtlIcon fontSize="small" />} onClick={() => onViewChange("checklist")} sx={tabButtonSx(view === "checklist")} data-testid="page-task-tracker-tab-checklist">
                            Checklist
                        </Button>
                    </Stack>

                    <Stack direction="row" spacing={0.2} alignItems="center">
                        <IconButton size="small" sx={{ color: "text.secondary" }}>
                            <FilterListIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" sx={{ color: "text.secondary" }}>
                            <SwapVertIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" sx={{ color: "text.secondary" }}>
                            <SearchIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" sx={{ color: "text.secondary" }}>
                            <TuneIcon fontSize="small" />
                        </IconButton>
                        <Button
                            size="small"
                            variant="contained"
                            endIcon={<ArrowDropDownIcon />}
                            onClick={addEmptyRow}
                            sx={{ textTransform: "none", borderRadius: 2, ml: 0.35 }}
                        >
                            New
                        </Button>
                    </Stack>
                </Stack>
            </Box>

            {view === "checklist" ? (
                <Stack spacing={0.75} sx={{ p: 1.5 }}>
                    {visibleRows.map((row) => (
                        <Stack key={row.id} direction="row" alignItems="center" spacing={1}>
                            <Checkbox
                                checked={row.done}
                                onChange={(_, checked) => updateRow(row.id, { done: checked })}
                                size="small"
                            />
                            <InputBase
                                value={row.taskName}
                                onChange={(event) => updateRow(row.id, { taskName: event.target.value })}
                                placeholder="Task name"
                                sx={{
                                    flex: 1,
                                    textDecoration: row.done ? "line-through" : "none",
                                    opacity: row.done ? 0.7 : 1,
                                }}
                            />
                            <Chip
                                size="small"
                                label={row.status}
                                color={row.status === "Done" ? "success" : row.status === "In progress" ? "info" : "default"}
                                variant={row.status === "Not started" ? "outlined" : "filled"}
                                onClick={() => updateRow(row.id, { status: nextStatus(row.status) })}
                            />
                        </Stack>
                    ))}
                    {visibleRows.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            No tasks yet. Add a new row.
                        </Typography>
                    ) : null}
                    <Button size="small" variant="outlined" onClick={addEmptyRow} sx={{ alignSelf: "flex-start" }}>
                        + New task
                    </Button>
                </Stack>
            ) : (
                <Box sx={{ p: 1.5 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: 44 }} />
                                <TableCell>Task name</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Assignee</TableCell>
                                <TableCell>Due date</TableCell>
                                <TableCell>Priority</TableCell>
                                <TableCell sx={{ width: 48 }} />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {visibleRows.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={row.done}
                                            onChange={(_, checked) => updateRow(row.id, { done: checked })}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <InputBase
                                            value={row.taskName}
                                            onChange={(event) => updateRow(row.id, { taskName: event.target.value })}
                                            inputRef={(node) => {
                                                taskNameInputRefs.current[row.id] = node;
                                            }}
                                            placeholder="Task name"
                                            data-testid={`page-task-tracker-task-name-${row.id}`}
                                            sx={{
                                                width: "100%",
                                                fontWeight: 600,
                                                textDecoration: row.done ? "line-through" : "none",
                                                opacity: row.done ? 0.7 : 1,
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={row.status}
                                            color={row.status === "Done" ? "success" : row.status === "In progress" ? "info" : "default"}
                                            variant={row.status === "Not started" ? "outlined" : "filled"}
                                            onClick={() => updateRow(row.id, { status: nextStatus(row.status) })}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <InputBase
                                            value={row.assignee}
                                            onChange={(event) => updateRow(row.id, { assignee: event.target.value })}
                                            placeholder="Assignee"
                                            sx={{ width: "100%" }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            size="small"
                                            type="date"
                                            value={row.dueDate}
                                            onChange={(event) => updateRow(row.id, { dueDate: event.target.value })}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter" && !event.shiftKey) {
                                                    event.preventDefault();
                                                    addRow();
                                                }
                                            }}
                                            variant="standard"
                                            InputLabelProps={{ shrink: true }}
                                            fullWidth
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={row.priority}
                                            color={row.priority === "High" ? "error" : row.priority === "Medium" ? "warning" : "success"}
                                            variant="filled"
                                            onClick={() => updateRow(row.id, { priority: nextPriority(row.priority) })}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={() => removeRow(row.id)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {visibleRows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <Typography variant="body2" color="text.secondary">
                                            No tasks yet. Click "New task" to start.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : null}
                            <TableRow hover data-testid="page-task-tracker-ghost-row">
                                <TableCell />
                                <TableCell>
                                    <InputBase
                                        value={ghostTaskName}
                                        onChange={(event) => setGhostTaskName(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" && !event.shiftKey) {
                                                event.preventDefault();
                                                const nextTitle = ghostTaskName.trim();
                                                if (nextTitle.length === 0) {
                                                    return;
                                                }
                                                addRow({ taskName: nextTitle });
                                                setGhostTaskName("");
                                            }
                                        }}
                                        placeholder="+ New task"
                                        inputProps={{ "data-testid": "page-task-tracker-ghost-input" }}
                                        sx={{ width: "100%", color: "text.secondary", fontStyle: "italic" }}
                                    />
                                </TableCell>
                                <TableCell />
                                <TableCell />
                                <TableCell />
                                <TableCell />
                                <TableCell />
                            </TableRow>
                        </TableBody>
                    </Table>
                </Box>
            )}
        </Paper>
    );
};

export const PageEditor = ({ pageId, previewEnabled, autosaveEnabled, onSaveSuccess, onDeleteSuccess }: PageEditorProps) => {
    const muiTheme = useTheme();
    const isCompactDesktop = useMediaQuery(muiTheme.breakpoints.between("md", "xl"));
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
    const [pageSection, setPageSection] = useState<"page" | "tasks" | "checklist">("page");
    const draftKey = useMemo(() => `devJournal_page_draft_${pageId ?? 'new'}`, [pageId]);
    const trackerStorageKey = useMemo(() => `devJournal_page_task_trackers_${pageId ?? "new"}`, [pageId]);
    const trackerViewStorageKey = useMemo(() => `devJournal_page_task_tracker_view_${pageId ?? "new"}`, [pageId]);
    const [taskTrackerDataById, setTaskTrackerDataById] = useState<Record<string, TaskTrackerData>>({});
    const [taskTrackerView, setTaskTrackerView] = useState<"all" | "my" | "checklist">("all");
    const [isTrackerViewLoaded, setIsTrackerViewLoaded] = useState(false);
    const checklistInputRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
    const autosaveTimeoutRef = useRef<number | null>(null);
    const [pendingChecklistFocusIndex, setPendingChecklistFocusIndex] = useState<number | null>(null);
    const clearPendingAutosave = useCallback(() => {
        if (autosaveTimeoutRef.current !== null) {
            window.clearTimeout(autosaveTimeoutRef.current);
            autosaveTimeoutRef.current = null;
        }
    }, []);

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
        clearPendingAutosave();

        if (!autosaveEnabled) {
            return;
        }

        autosaveTimeoutRef.current = window.setTimeout(() => {
            autosaveTimeoutRef.current = null;
            localStorage.setItem(
                draftKey,
                JSON.stringify({
                    title,
                    content,
                    updatedAt: new Date().toISOString(),
                })
            );
        }, 700);

        return clearPendingAutosave;
    }, [autosaveEnabled, clearPendingAutosave, content, draftKey, title]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(trackerStorageKey);
            if (!raw) {
                setTaskTrackerDataById({});
                return;
            }
            const parsed = JSON.parse(raw) as Record<string, Partial<TaskTrackerData>>;
            const normalized: Record<string, TaskTrackerData> = {};
            Object.entries(parsed ?? {}).forEach(([key, value]) => {
                normalized[sanitizeTrackerId(key)] = normalizeTaskTrackerData({ ...value, id: sanitizeTrackerId(key) });
            });
            setTaskTrackerDataById(normalized);
        } catch {
            setTaskTrackerDataById({});
        }
    }, [trackerStorageKey]);

    useEffect(() => {
        localStorage.setItem(trackerStorageKey, JSON.stringify(taskTrackerDataById));
    }, [taskTrackerDataById, trackerStorageKey]);

    useEffect(() => {
        setIsTrackerViewLoaded(false);
        let nextView: "all" | "my" | "checklist" = "all";
        try {
            const raw = localStorage.getItem(trackerViewStorageKey);
            if (raw === "all" || raw === "my" || raw === "checklist") {
                nextView = raw;
            }
        } catch {
            nextView = "all";
        }
        setTaskTrackerView(nextView);
        setIsTrackerViewLoaded(true);
    }, [trackerViewStorageKey]);

    useEffect(() => {
        if (!isTrackerViewLoaded) {
            return;
        }
        try {
            localStorage.setItem(trackerViewStorageKey, taskTrackerView);
        } catch {
            // ignore storage write issues
        }
    }, [isTrackerViewLoaded, taskTrackerView, trackerViewStorageKey]);

    useEffect(() => {
        let changed = false;
        const extracted: Record<string, TaskTrackerData> = {};

        const nextContent = content.replace(/\{\{TASK_TRACKER:[^}]+\}\}/g, (rawToken) => {
            const parsed = parseTaskTrackerToken(rawToken);
            if (!parsed) {
                return rawToken;
            }
            if (parsed.data) {
                extracted[parsed.id] = normalizeTaskTrackerData({ ...parsed.data, id: parsed.id });
            }
            const shortToken = buildTaskTrackerToken(parsed.id);
            if (shortToken !== rawToken) {
                changed = true;
            }
            return shortToken;
        });

        if (Object.keys(extracted).length > 0) {
            setTaskTrackerDataById((prev) => {
                let hasDiff = false;
                const next = { ...prev };
                Object.entries(extracted).forEach(([id, data]) => {
                    const existing = next[id];
                    if (!existing || JSON.stringify(existing) !== JSON.stringify(data)) {
                        hasDiff = true;
                        next[id] = data;
                    }
                });
                return hasDiff ? next : prev;
            });
        }

        if (changed && nextContent !== content) {
            setContent(nextContent);
        }
    }, [content]);

    useEffect(() => {
        if (!content.includes("[[Task Tracker]]") && !content.includes("[[Tasks Database]]")) {
            return;
        }

        const trackersToCreate: TaskTrackerData[] = [];
        const nextContent = content
            .replace(/\[\[Tasks Database\]\]/g, TASK_TABLE_BLOCK)
            .replace(/\[\[Task Tracker\]\]/g, () => {
                const trackerData = createDefaultTaskTrackerData();
                trackersToCreate.push(trackerData);
                return buildTaskTrackerToken(trackerData.id);
            });

        if (trackersToCreate.length > 0) {
            setTaskTrackerDataById((prev) => {
                const next = { ...prev };
                trackersToCreate.forEach((trackerData) => {
                    next[trackerData.id] = trackerData;
                });
                return next;
            });
        }

        if (nextContent !== content) {
            setContent(nextContent);
        }
    }, [content]);

    const handleSave = useCallback(() => {
        const contentToPersist = materializeTaskTrackerTokensForSave(content, taskTrackerDataById);
        if (pageId) {
            updateMutation.mutate({ id: pageId, title, content: contentToPersist }, {
                onSuccess: () => {
                    clearPendingAutosave();
                    localStorage.removeItem(draftKey);
                    setDraftRestored(false);
                    onSaveSuccess(pageId);
                }
            });
        } else {
            createMutation.mutate({ title, content: contentToPersist }, {
                onSuccess: (newPage) => {
                    clearPendingAutosave();
                    localStorage.removeItem(draftKey);
                    setDraftRestored(false);
                    onSaveSuccess(newPage.id);
                }
            });
        }
    }, [clearPendingAutosave, content, createMutation, draftKey, onSaveSuccess, pageId, taskTrackerDataById, title, updateMutation]);

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
                    clearPendingAutosave();
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

    const insertTaskTrackerDatabase = () => {
        const trackerData = createDefaultTaskTrackerData();
        setTaskTrackerDataById((prev) => ({
            ...prev,
            [trackerData.id]: trackerData,
        }));
        const token = serializeTaskTrackerToken(trackerData);
        setContent((prev) => (prev.trim().length === 0 ? token : `${prev}${prev.endsWith("\n") ? "" : "\n"}\n${token}`));
    };

    const clearDraft = () => {
        clearPendingAutosave();
        localStorage.removeItem(draftKey);
        localStorage.removeItem(trackerStorageKey);
        setDraftRestored(false);
        setTaskTrackerDataById({});
        setTitle(page?.title ?? "Untitled Page");
        setContent(page?.content ?? "");
    };

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
    const pagePreviewBlocks = useMemo(
        () => (previewEnabled ? splitPageContent(content, taskTrackerDataById) : []),
        [content, previewEnabled, taskTrackerDataById]
    );
    const interactiveBlocks = useMemo(
        () => pagePreviewBlocks.filter((block) => block.type !== "markdown"),
        [pagePreviewBlocks]
    );
    const handleFormBlockChange = useCallback((token: string, nextFormData: PageFormData) => {
        setContent((prev) => prev.replace(token, serializeFormToken(nextFormData)));
    }, []);
    const handleTaskTrackerBlockChange = useCallback((trackerId: string, nextTrackerData: TaskTrackerData) => {
        setTaskTrackerDataById((prev) => ({
            ...prev,
            [sanitizeTrackerId(trackerId)]: normalizeTaskTrackerData({ ...nextTrackerData, id: sanitizeTrackerId(trackerId) }),
        }));
    }, []);

    const handleDeleteTaskTrackerBlock = useCallback((trackerId: string) => {
        setContent((prev) => {
            const target = sanitizeTrackerId(trackerId);
            return removeEmbeddedTokenFromContent(prev, buildTaskTrackerToken(target));
        });
        setTaskTrackerDataById((prev) => {
            const copy = { ...prev };
            delete copy[sanitizeTrackerId(trackerId)];
            return copy;
        });
    }, []);

    const handleDeleteTaskTableBlock = useCallback(() => {
        setContent((prev) => removeEmbeddedTokenFromContent(prev, TASK_TABLE_BLOCK));
    }, []);

    const handleDeleteFormBlock = useCallback((token: string) => {
        setContent((prev) => removeEmbeddedTokenFromContent(prev, token));
    }, []);

    const editorDisplayContent = useMemo(() => toEditorDisplayContent(content), [content]);
    const editorBlocks = useMemo(() => markdownToEditorBlocks(editorDisplayContent), [editorDisplayContent]);
    const checklistBlockEntries = useMemo(
        () =>
            editorBlocks
                .map((block, index) => ({ block, index }))
                .filter((entry) => entry.block.type === "checklist"),
        [editorBlocks]
    );
    const handleEditorContentChange = useCallback((nextValue: string) => {
        const embeddedTokens = extractEmbeddedBlockTokens(content);
        setContent(fromEditorDisplayContent(nextValue, embeddedTokens));
    }, [content]);
    const commitEditorBlocks = useCallback((nextBlocks: EditorBlock[]) => {
        handleEditorContentChange(editorBlocksToMarkdown(nextBlocks));
    }, [handleEditorContentChange]);
    const updateEditorBlock = useCallback((index: number, patch: Partial<EditorBlock>) => {
        const nextBlocks = editorBlocks.map((block, idx) => {
            if (idx !== index) {
                return block;
            }
            const nextType = patch.type ?? block.type;
            return {
                ...block,
                ...patch,
                type: nextType,
                checked: nextType === "checklist" ? (patch.checked ?? block.checked ?? false) : undefined,
            };
        });
        commitEditorBlocks(nextBlocks);
    }, [commitEditorBlocks, editorBlocks]);
    const insertChecklistBlockAfter = useCallback((index: number) => {
        const nextBlocks = [...editorBlocks];
        nextBlocks.splice(index + 1, 0, { type: "checklist", text: "", checked: false });
        setPendingChecklistFocusIndex(index + 1);
        commitEditorBlocks(nextBlocks);
    }, [commitEditorBlocks, editorBlocks]);
    const addChecklistBlock = useCallback(() => {
        setPendingChecklistFocusIndex(editorBlocks.length);
        commitEditorBlocks([...editorBlocks, { type: "checklist", text: "", checked: false }]);
    }, [commitEditorBlocks, editorBlocks]);
    const removeEditorBlock = useCallback((index: number) => {
        if (editorBlocks.length <= 1) {
            commitEditorBlocks([{ type: "paragraph", text: "" }]);
            return;
        }
        const nextBlocks = editorBlocks.filter((_, idx) => idx !== index);
        commitEditorBlocks(nextBlocks);
    }, [commitEditorBlocks, editorBlocks]);
    useEffect(() => {
        if (pendingChecklistFocusIndex === null || pageSection !== "checklist") {
            return;
        }

        const focusInput = () => {
            const target = checklistInputRefs.current[pendingChecklistFocusIndex];
            if (!target) {
                return false;
            }
            target.focus();
            const end = target.value.length;
            target.setSelectionRange?.(end, end);
            return true;
        };

        if (focusInput()) {
            setPendingChecklistFocusIndex(null);
            return;
        }

        const timeout = window.setTimeout(() => {
            if (focusInput()) {
                setPendingChecklistFocusIndex(null);
            }
        }, 0);

        return () => window.clearTimeout(timeout);
    }, [checklistBlockEntries, pageSection, pendingChecklistFocusIndex]);
    const isDark = muiTheme.palette.mode === "dark";
    const shellSurfaceSx = {
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
    };
    const toolbarButtonSx = {
        color: "text.secondary",
        borderRadius: 2.2,
        border: "1px solid transparent",
        "&:hover": {
            color: "text.primary",
            bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
            borderColor: "divider",
        },
    };
    const pageSectionButtonSx = (active: boolean) => ({
        textTransform: "none",
        borderRadius: 99,
        px: 1.7,
        py: 0.7,
        color: active ? "text.primary" : "text.secondary",
        bgcolor: active ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)") : "transparent",
        border: "1px solid",
        borderColor: active
            ? isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.1)"
            : "transparent",
        fontWeight: 600,
        minHeight: 38,
        transition: "background-color .18s ease, border-color .18s ease, color .18s ease",
        "&:hover": {
            bgcolor: active
                ? isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.06)"
                : isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.03)",
            color: "text.primary",
        },
    });
    const isPageEditorEmpty = editorDisplayContent.trim().length === 0;

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
            <Box
                sx={{
                    maxWidth: isCompactDesktop ? 1080 : 1180,
                    mx: "auto",
                    width: '100%',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    px: { xs: 1, sm: 1.25, md: isCompactDesktop ? 1.75 : 2.75 },
                    pb: 5,
                }}
            >
                <Box
                    sx={{
                        ...shellSurfaceSx,
                        mb: 1.6,
                        p: { xs: 1.2, md: isCompactDesktop ? 1.45 : 1.8 },
                        borderRadius: isCompactDesktop ? 3.2 : 4,
                    }}
                >
                    <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", lg: "center" }}
                        gap={2}
                        flexDirection={{ xs: "column", lg: "row" }}
                    >
                        <Box sx={{ minWidth: 0, flex: 1, width: "100%" }}>
                            <InputBase
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Untitled"
                                sx={{
                                    fontSize: { xs: "2rem", sm: "2.4rem", xl: "3rem" },
                                    lineHeight: 1.05,
                                    fontWeight: 800,
                                    letterSpacing: '-0.04em',
                                    color: 'text.primary',
                                    flex: 1,
                                    minWidth: 0,
                                    width: "100%",
                                    mb: 0.5,
                                    "& input::placeholder": {
                                        color: "text.secondary",
                                        opacity: 1,
                                    },
                                }}
                            />
                        </Box>

                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{
                                flexWrap: "wrap",
                                justifyContent: { xs: "flex-start", lg: "flex-end" },
                                width: { xs: "100%", lg: "auto" },
                            }}
                        >
                            {draftRestored ? <Chip label="Draft restored" size="small" color="info" variant="outlined" /> : null}
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<SaveIcon />}
                                onClick={handleSave}
                                disabled={createMutation.isPending || updateMutation.isPending}
                                sx={{
                                    px: isCompactDesktop ? 2.1 : 2.6,
                                    minWidth: isCompactDesktop ? 132 : 150,
                                    minHeight: isCompactDesktop ? 40 : 42,
                                    borderRadius: 2.8,
                                }}
                            >
                                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                            </Button>
                        </Stack>
                    </Box>
                </Box>

                <Box
                    sx={{
                        ...shellSurfaceSx,
                        mb: 2,
                        p: 0.8,
                        borderRadius: 3.2,
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: { xs: "stretch", lg: "center" },
                            justifyContent: "space-between",
                            gap: 1,
                            flexDirection: { xs: "column", lg: "row" },
                        }}
                    >
                        <Box
                            sx={{
                                p: 0.35,
                                display: "inline-flex",
                                gap: 0.45,
                                alignItems: "center",
                                borderRadius: 99,
                                border: "1px solid",
                                borderColor: "divider",
                                bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                                flexWrap: "wrap",
                            }}
                        >
                            <Button
                                size="small"
                                startIcon={<NotesIcon fontSize="small" />}
                                onClick={() => setPageSection("page")}
                                sx={pageSectionButtonSx(pageSection === "page")}
                                data-testid="page-editor-section-page"
                            >
                                Page
                            </Button>
                            <Button
                                size="small"
                                startIcon={<ViewAgendaOutlinedIcon fontSize="small" />}
                                onClick={() => setPageSection("tasks")}
                                sx={pageSectionButtonSx(pageSection === "tasks")}
                                data-testid="page-editor-section-tasks"
                            >
                                Tasks
                            </Button>
                            <Button
                                size="small"
                                startIcon={<ChecklistRtlIcon fontSize="small" />}
                                onClick={() => setPageSection("checklist")}
                                sx={pageSectionButtonSx(pageSection === "checklist")}
                                data-testid="page-editor-section-checklist"
                            >
                                Checklist
                            </Button>
                        </Box>
                    </Box>

                    <Stack
                        direction="row"
                        spacing={0.35}
                        sx={{
                            mt: 1.15,
                            pt: 1.15,
                            borderTop: "1px solid",
                            borderColor: "divider",
                            flexWrap: "wrap",
                            alignItems: "center",
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
                        <Tooltip title="Task Tracker">
                            <IconButton size="small" onClick={insertTaskTrackerDatabase} sx={toolbarButtonSx}>
                                <FactCheckOutlinedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Button size="small" onClick={insertTemplate} sx={{ ml: 0.3, borderRadius: 2.4 }}>
                            Insert template
                        </Button>
                    </Stack>
                </Box>

                {pageSection === "page" ? (
                    <Box
                        sx={{
                            ...shellSurfaceSx,
                            flex: 1,
                            minHeight: 460,
                            borderRadius: 4,
                            p: { xs: 1.35, md: 1.7 },
                        }}
                    >
                        <TextField
                            multiline
                            fullWidth
                            minRows={16}
                            value={editorDisplayContent}
                            onChange={(event) => handleEditorContentChange(event.target.value)}
                            placeholder="Write anything you need. Notes, ideas, requirements..."
                            data-testid="page-editor-freewrite-input"
                            inputProps={{ "data-testid": "page-editor-freewrite-textarea" }}
                            variant="standard"
                            InputProps={{
                                disableUnderline: true,
                                sx: {
                                    alignItems: "flex-start",
                                    fontSize: { xs: 19, md: 21 },
                                    lineHeight: 1.82,
                                    "& textarea": {
                                        minHeight: "440px !important",
                                    },
                                },
                            }}
                            sx={{
                                "& .MuiInputBase-root": { p: 0 },
                                "& textarea::placeholder": { color: "text.disabled", opacity: 1 },
                            }}
                        />
                        {isPageEditorEmpty ? (
                            <Paper
                                variant="outlined"
                                sx={{
                                    mt: 2,
                                    p: 1.35,
                                    borderRadius: 3,
                                    borderStyle: "dashed",
                                    borderColor: "divider",
                                    bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)",
                                }}
                            >
                                <Stack spacing={0.4}>
                                    <Typography variant="caption" color="text.secondary">/ for commands</Typography>
                                    <Typography variant="caption" color="text.secondary">Tasks tab for databases</Typography>
                                    <Typography variant="caption" color="text.secondary">Checklist tab for task-list</Typography>
                                </Stack>
                            </Paper>
                        ) : null}
                    </Box>
                ) : null}

                {pageSection === "tasks" ? (
                    <Box sx={{ mt: 0.8 }}>
                        {!previewEnabled ? (
                            <Paper
                                variant="outlined"
                                sx={{
                                    ...shellSurfaceSx,
                                    p: 2.4,
                                    borderRadius: 3.4,
                                    borderColor: "divider",
                                }}
                            >
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                    Live blocks are hidden
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Enable page markdown preview in Settings to interact with task databases, forms, and trackers on this page.
                                </Typography>
                            </Paper>
                        ) : interactiveBlocks.length > 0 ? (
                            interactiveBlocks.map((block, index) =>
                                block.type === "tasks" ? (
                                    <PageTaskTable
                                        key={`tasks-${index}`}
                                        tasks={tasks}
                                        projectsById={projectsById}
                                        goalsById={goalsById}
                                        onToggleTask={handleTaskToggle}
                                        onDelete={handleDeleteTaskTableBlock}
                                    />
                                ) : block.type === "form" ? (
                                    <PageFormDatabase
                                        key={`form-${index}`}
                                        formData={block.formData}
                                        onChange={(nextFormData) => handleFormBlockChange(block.token, nextFormData)}
                                        onDelete={() => handleDeleteFormBlock(block.token)}
                                    />
                                ) : (
                                    <PageTaskTrackerDatabase
                                        key={`tracker-${index}`}
                                        trackerData={block.trackerData}
                                        view={taskTrackerView}
                                        onViewChange={setTaskTrackerView}
                                        onChange={(nextTrackerData) => handleTaskTrackerBlockChange(block.trackerData.id, nextTrackerData)}
                                        onDelete={() => handleDeleteTaskTrackerBlock(block.trackerData.id)}
                                    />
                                )
                            )
                        ) : (
                            <Paper
                                variant="outlined"
                                sx={{
                                    ...shellSurfaceSx,
                                    p: 2.4,
                                    borderRadius: 3.4,
                                    borderColor: "divider",
                                }}
                            >
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                    Add tasks section
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    You can use this page only for notes, or add a Task Tracker/Tasks Database below.
                                </Typography>
                                <Stack direction="row" spacing={1} sx={{ mt: 1.4, flexWrap: "wrap" }}>
                                    <Button size="small" variant="outlined" onClick={insertTaskTrackerDatabase} data-testid="page-editor-add-task-tracker">
                                        + Task Tracker
                                    </Button>
                                    <Button size="small" variant="outlined" onClick={insertTaskDatabase} data-testid="page-editor-add-task-database">
                                        + Tasks Database
                                    </Button>
                                </Stack>
                            </Paper>
                        )}
                    </Box>
                ) : null}

                {pageSection === "checklist" ? (
                    <Box sx={{ mt: 0.8 }}>
                        <Paper
                            variant="outlined"
                            sx={{
                                ...shellSurfaceSx,
                                p: 1.65,
                                borderRadius: 3.4,
                                borderColor: "divider",
                            }}
                        >
                            <Stack spacing={0.45}>
                                {checklistBlockEntries.map(({ block, index: blockIndex }) => (
                                    <Stack key={`checklist-${blockIndex}`} direction="row" spacing={1} alignItems="center">
                                        <Checkbox
                                            size="small"
                                            checked={Boolean(block.checked)}
                                            onChange={(_, checked) => updateEditorBlock(blockIndex, { checked })}
                                        />
                                        <InputBase
                                            multiline
                                            value={block.text}
                                            inputRef={(node) => {
                                                checklistInputRefs.current[blockIndex] = node;
                                            }}
                                            onChange={(event) => updateEditorBlock(blockIndex, { text: event.target.value })}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter" && event.shiftKey) {
                                                    event.preventDefault();
                                                    const target = event.currentTarget as HTMLTextAreaElement;
                                                    const selectionStart = target.selectionStart ?? block.text.length;
                                                    const selectionEnd = target.selectionEnd ?? selectionStart;
                                                    const nextText = `${block.text.slice(0, selectionStart)}\n${block.text.slice(selectionEnd)}`;
                                                    setPendingChecklistFocusIndex(blockIndex);
                                                    updateEditorBlock(blockIndex, { text: nextText });
                                                    return;
                                                }
                                                if (event.key === "Enter") {
                                                    event.preventDefault();
                                                    insertChecklistBlockAfter(blockIndex);
                                                } else if (event.key === "Backspace" && block.text.trim().length === 0) {
                                                    event.preventDefault();
                                                    removeEditorBlock(blockIndex);
                                                }
                                            }}
                                            inputProps={{ "data-testid": `page-editor-checklist-input-${blockIndex}` }}
                                            placeholder="Checklist item"
                                            sx={{
                                                flex: 1,
                                                textDecoration: block.checked ? "line-through" : "none",
                                                opacity: block.checked ? 0.65 : 1,
                                                "& textarea": {
                                                    lineHeight: 1.4,
                                                },
                                            }}
                                        />
                                        <IconButton size="small" onClick={() => removeEditorBlock(blockIndex)} sx={{ color: "text.secondary" }}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                ))}
                                {checklistBlockEntries.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary">
                                        Checklist is empty. Add your first item.
                                    </Typography>
                                ) : null}
                            </Stack>
                            <Button size="small" variant="outlined" onClick={addChecklistBlock} sx={{ mt: 1.2 }} data-testid="page-editor-checklist-add-item">
                                + Add checklist item
                            </Button>
                        </Paper>
                    </Box>
                ) : null}

                <Box
                    sx={{
                        mt: 2.5,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: { xs: "stretch", md: "center" },
                        flexDirection: { xs: "column", md: "row" },
                        gap: 1,
                    }}
                >
                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
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
                        ) : null}
                        <Button
                            variant="text"
                            color="inherit"
                            startIcon={<RestartAltIcon />}
                            onClick={clearDraft}
                        >
                            Reset Draft
                        </Button>
                    </Stack>
                </Box>
            </Box>
        </motion.div>
    );
};

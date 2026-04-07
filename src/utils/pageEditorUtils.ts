export const TASK_TABLE_BLOCK = "{{TASK_TABLE}}";
const FORM_DB_PREFIX = "{{FORM_DB:";
const TASK_TRACKER_PREFIX = "{{TASK_TRACKER:";
const BLOCK_TOKEN_REGEX = /\{\{TASK_TABLE\}\}|\{\{FORM_DB:[^}]+\}\}|\{\{TASK_TRACKER:[^}]+\}\}/g;
const TASK_TABLE_EDITOR_MARKER = "[[Tasks Database]]";
const FORM_DB_EDITOR_MARKER = "[[Form Database]]";
const EMBEDDED_EDITOR_MARKER_REGEX =
  /\[\[Tasks Database\]\]|\[\[Form Database\]\]|\[\[Task Tracker\]\]/g;
const CHECKLIST_SOFT_BREAK_REGEX = /<br\s*\/?>/gi;

export type PageFormFieldType = "text" | "checkbox" | "date" | "status";

export interface PageFormField {
  id: string;
  label: string;
  type: PageFormFieldType;
  options?: string[];
}

export interface PageFormRow {
  id: string;
  values: Record<string, string | boolean>;
}

export interface PageFormData {
  id: string;
  title: string;
  description: string;
  fields: PageFormField[];
  rows: PageFormRow[];
}

export type TrackerStatus = "Not started" | "In progress" | "Done";
export type TrackerPriority = "Low" | "Medium" | "High";

export interface TaskTrackerRow {
  id: string;
  taskName: string;
  status: TrackerStatus;
  assignee: string;
  dueDate: string;
  priority: TrackerPriority;
  done: boolean;
}

export interface TaskTrackerData {
  id: string;
  title: string;
  description: string;
  rows: TaskTrackerRow[];
}

export type PageContentBlock =
  | { type: "markdown"; value: string }
  | { type: "tasks"; value: string }
  | { type: "form"; value: string; token: string; formData: PageFormData }
  | { type: "tracker"; value: string; token: string; trackerData: TaskTrackerData };

export type EditorBlockType = "paragraph" | "heading2" | "bullet" | "checklist";

export interface EditorBlock {
  type: EditorBlockType;
  text: string;
  checked?: boolean;
}

export const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export const createDefaultFormData = (): PageFormData => ({
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

export const normalizeFormData = (input: Partial<PageFormData>): PageFormData => {
  const fields = Array.isArray(input.fields)
    ? input.fields
        .filter(
          (field): field is PageFormField =>
            Boolean(field && typeof field.id === "string" && typeof field.label === "string")
        )
        .map((field) => ({
          id: field.id,
          label: field.label || "Field",
          type: field.type ?? "text",
          options:
            field.type === "status"
              ? Array.isArray(field.options) && field.options.length > 0
                ? field.options
                : ["Low", "Medium", "High"]
              : undefined,
        }))
    : [];

  const safeFields = fields.length > 0 ? fields : createDefaultFormData().fields;

  const rows = Array.isArray(input.rows)
    ? input.rows
        .filter(
          (row): row is PageFormRow =>
            Boolean(row && typeof row.id === "string" && row.values && typeof row.values === "object")
        )
        .map((row) => ({
          id: row.id,
          values: { ...row.values },
        }))
    : [];

  return {
    id: typeof input.id === "string" && input.id.length > 0 ? input.id : makeId(),
    title:
      typeof input.title === "string" && input.title.trim().length > 0
        ? input.title
        : "New form",
    description: typeof input.description === "string" ? input.description : "",
    fields: safeFields,
    rows,
  };
};

export const serializeFormToken = (formData: PageFormData) =>
  `${FORM_DB_PREFIX}${encodeURIComponent(JSON.stringify(formData))}}}`;

export const parseFormToken = (token: string): PageFormData | null => {
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

export const createDefaultTaskTrackerData = (): TaskTrackerData => ({
  id: makeId(),
  title: "Task Tracker",
  description: "Track your items here.",
  rows: [],
});

export const normalizeTaskTrackerData = (
  input: Partial<TaskTrackerData>
): TaskTrackerData => {
  const rows = Array.isArray(input.rows)
    ? input.rows
        .filter((row): row is TaskTrackerRow => Boolean(row && typeof row.id === "string"))
        .map((row) => ({
          id: row.id,
          taskName: typeof row.taskName === "string" ? row.taskName : "",
          status:
            row.status === "Done" ||
            row.status === "In progress" ||
            row.status === "Not started"
              ? row.status
              : "Not started",
          assignee: typeof row.assignee === "string" ? row.assignee : "",
          dueDate: typeof row.dueDate === "string" ? row.dueDate : "",
          priority:
            row.priority === "High" ||
            row.priority === "Medium" ||
            row.priority === "Low"
              ? row.priority
              : "Medium",
          done: typeof row.done === "boolean" ? row.done : row.status === "Done",
        }))
    : [];

  return {
    id: typeof input.id === "string" && input.id.length > 0 ? input.id : makeId(),
    title:
      typeof input.title === "string" && input.title.trim().length > 0
        ? input.title
        : "Task tracker",
    description: typeof input.description === "string" ? input.description : "",
    rows,
  };
};

export const sanitizeTrackerId = (value: string) => {
  const cleaned = value.replace(/[^\w-]/g, "").slice(0, 64);
  return cleaned.length > 0 ? cleaned : makeId();
};

export const buildTaskTrackerToken = (trackerId: string) =>
  `${TASK_TRACKER_PREFIX}${sanitizeTrackerId(trackerId)}}}`;

export const serializeTaskTrackerToken = (trackerData: TaskTrackerData) =>
  buildTaskTrackerToken(trackerData.id);

const serializeTaskTrackerPayloadToken = (trackerData: TaskTrackerData) =>
  `${TASK_TRACKER_PREFIX}${encodeURIComponent(JSON.stringify(trackerData))}}}`;

export const parseTaskTrackerToken = (
  token: string
): { id: string; data?: TaskTrackerData } | null => {
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

export const splitPageContent = (
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

export const materializeTaskTrackerTokensForSave = (
  value: string,
  trackerDataById: Record<string, TaskTrackerData>
) =>
  value.replace(/\{\{TASK_TRACKER:[^}]+\}\}/g, (rawToken) => {
    const parsed = parseTaskTrackerToken(rawToken);
    if (!parsed) {
      return rawToken;
    }
    const trackerId = parsed.id;
    const sourceData = trackerDataById[trackerId] ?? parsed.data ?? {
      ...createDefaultTaskTrackerData(),
      id: trackerId,
    };
    const normalized = normalizeTaskTrackerData({ ...sourceData, id: trackerId });
    return serializeTaskTrackerPayloadToken(normalized);
  });

export const extractEmbeddedBlockTokens = (value: string) => {
  BLOCK_TOKEN_REGEX.lastIndex = 0;
  const tokens: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = BLOCK_TOKEN_REGEX.exec(value)) !== null) {
    tokens.push(match[0]);
  }
  return tokens;
};

export const normalizeEditorMarkdown = (value: string) =>
  value.replace(/\n{3,}/g, "\n\n").trimEnd();

export const toEditorDisplayContent = (value: string) => {
  BLOCK_TOKEN_REGEX.lastIndex = 0;
  return normalizeEditorMarkdown(
    value.replace(BLOCK_TOKEN_REGEX, (token) => {
      if (token === TASK_TABLE_BLOCK) {
        return TASK_TABLE_EDITOR_MARKER;
      }
      if (token.startsWith(FORM_DB_PREFIX)) {
        return FORM_DB_EDITOR_MARKER;
      }
      return "[[Task Tracker]]";
    })
  );
};

export const fromEditorDisplayContent = (
  value: string,
  embeddedTokens: string[]
) => {
  const taskTableTokens = embeddedTokens.filter((token) => token === TASK_TABLE_BLOCK);
  const formTokens = embeddedTokens.filter((token) => token.startsWith(FORM_DB_PREFIX));
  const trackerTokens = embeddedTokens.filter((token) =>
    token.startsWith(TASK_TRACKER_PREFIX)
  );
  const cleanMarkdown = normalizeEditorMarkdown(
    value.replace(EMBEDDED_EDITOR_MARKER_REGEX, (marker) => {
      if (marker === TASK_TABLE_EDITOR_MARKER) {
        return taskTableTokens.shift() ?? TASK_TABLE_EDITOR_MARKER;
      }
      if (marker === FORM_DB_EDITOR_MARKER) {
        return formTokens.shift() ?? FORM_DB_EDITOR_MARKER;
      }
      return trackerTokens.shift() ?? "[[Task Tracker]]";
    })
  );
  return cleanMarkdown;
};

export const removeEmbeddedTokenFromContent = (value: string, token: string) =>
  normalizeEditorMarkdown(value.replace(token, ""));

const decodeChecklistText = (value: string) => value.replace(CHECKLIST_SOFT_BREAK_REGEX, "\n");
const encodeChecklistText = (value: string) => value.replace(/\n/g, "<br/>");

export const markdownToEditorBlocks = (value: string): EditorBlock[] => {
  const normalized = normalizeEditorMarkdown(value);
  if (normalized.length === 0) {
    return [{ type: "paragraph", text: "" }];
  }

  const lines = normalized.split("\n");
  return lines.map((line) => {
    const checklistChecked = line.match(/^- \[x\]\s?(.*)$/i);
    if (checklistChecked) {
      return {
        type: "checklist",
        text: decodeChecklistText(checklistChecked[1] ?? ""),
        checked: true,
      };
    }

    const checklistUnchecked = line.match(/^- \[ \]\s?(.*)$/);
    if (checklistUnchecked) {
      return {
        type: "checklist",
        text: decodeChecklistText(checklistUnchecked[1] ?? ""),
        checked: false,
      };
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

export const editorBlocksToMarkdown = (blocks: EditorBlock[]) => {
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

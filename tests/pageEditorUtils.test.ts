import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTaskTrackerToken,
  createDefaultTaskTrackerData,
  editorBlocksToMarkdown,
  fromEditorDisplayContent,
  markdownToEditorBlocks,
  materializeTaskTrackerTokensForSave,
  parseFormToken,
  parseTaskTrackerToken,
  serializeFormToken,
  serializeTaskTrackerToken,
  splitPageContent,
  TASK_TABLE_BLOCK,
  toEditorDisplayContent,
  type PageFormData,
} from "../src/utils/pageEditorUtils";

test("form token round-trip preserves valid fields and rows", () => {
  const formData: PageFormData = {
    id: "form-1",
    title: "Bug Intake",
    description: "Track reports",
    fields: [
      { id: "name", label: "Task name", type: "text" },
      { id: "done", label: "Done", type: "checkbox" },
      { id: "priority", label: "Priority", type: "status", options: ["Low", "High"] },
    ],
    rows: [
      { id: "row-1", values: { name: "Crash", done: false, priority: "High" } },
    ],
  };

  const parsed = parseFormToken(serializeFormToken(formData));

  assert.deepEqual(parsed, {
    ...formData,
    fields: [
      { id: "name", label: "Task name", type: "text", options: undefined },
      { id: "done", label: "Done", type: "checkbox", options: undefined },
      { id: "priority", label: "Priority", type: "status", options: ["Low", "High"] },
    ],
  });
});

test("task tracker token supports short ids and payload tokens", () => {
  const shortToken = buildTaskTrackerToken("tracker @ 1");
  const shortParsed = parseTaskTrackerToken(shortToken);

  assert.equal(shortParsed?.id, "tracker1");

  const trackerData = {
    ...createDefaultTaskTrackerData(),
    id: "tracker-2",
    rows: [
      {
        id: "row-1",
        taskName: "Ship page editor",
        status: "In progress" as const,
        assignee: "me",
        dueDate: "2026-04-08",
        priority: "High" as const,
        done: false,
      },
    ],
  };

  const payloadParsed = parseTaskTrackerToken(
    materializeTaskTrackerTokensForSave(serializeTaskTrackerToken(trackerData), {
      [trackerData.id]: trackerData,
    })
  );

  assert.equal(payloadParsed?.id, "tracker-2");
  assert.deepEqual(payloadParsed?.data?.rows, trackerData.rows);
});

test("splitPageContent resolves embedded task/form/tracker blocks", () => {
  const trackerData = {
    ...createDefaultTaskTrackerData(),
    id: "tracker-a",
  };
  const formToken = serializeFormToken({
    id: "form-a",
    title: "Retro",
    description: "",
    fields: [{ id: "field-a", label: "Note", type: "text" }],
    rows: [],
  });
  const content = [
    "Intro text",
    TASK_TABLE_BLOCK,
    formToken,
    serializeTaskTrackerToken(trackerData),
  ].join("\n\n");

  const blocks = splitPageContent(content, {});

  assert.deepEqual(
    blocks.map((block) => block.type),
    ["markdown", "tasks", "markdown", "form", "markdown", "tracker"]
  );
  assert.equal(blocks[5]?.type, "tracker");
  if (blocks[5]?.type === "tracker") {
    assert.equal(blocks[5].trackerData.id, "tracker-a");
  }
});

test("editor display conversion preserves embedded block positions", () => {
  const tokens = [
    TASK_TABLE_BLOCK,
    buildTaskTrackerToken("tracker-a"),
  ];
  const content = `## Plan\n\n${tokens[0]}\n\nParagraph\n\n${tokens[1]}`;

  const display = toEditorDisplayContent(content);
  const restored = fromEditorDisplayContent(display, tokens);

  assert.equal(display, "## Plan\n\n[[Tasks Database]]\n\nParagraph\n\n[[Task Tracker]]");
  assert.equal(restored, content);
});

test("markdown block conversion preserves checklist soft breaks", () => {
  const markdown = "## Goal\n- Bullet\n- [x] First line<br/>Second line\nParagraph";

  const blocks = markdownToEditorBlocks(markdown);

  assert.deepEqual(blocks, [
    { type: "heading2", text: "Goal" },
    { type: "bullet", text: "Bullet" },
    { type: "checklist", text: "First line\nSecond line", checked: true },
    { type: "paragraph", text: "Paragraph" },
  ]);
  assert.equal(editorBlocksToMarkdown(blocks), markdown);
});

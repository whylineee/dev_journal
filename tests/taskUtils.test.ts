import test from "node:test";
import assert from "node:assert/strict";
import { format, subDays } from "date-fns";
import {
  compareTasks,
  formatDuration,
  getTaskElapsedSeconds,
  isTaskDueToday,
  isTaskOverdue,
  normalizeEstimateMinutes,
} from "../src/utils/taskUtils";
import type { Task } from "../src/types";

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 1,
  title: "Task",
  description: "",
  status: "todo",
  priority: "medium",
  project_id: null,
  goal_id: null,
  due_date: null,
  recurrence: "none",
  recurrence_until: null,
  parent_task_id: null,
  completed_at: null,
  time_estimate_minutes: 0,
  timer_started_at: null,
  timer_accumulated_seconds: 0,
  created_at: "2026-04-01T10:00:00Z",
  updated_at: "2026-04-01T10:00:00Z",
  ...overrides,
});

test("isTaskOverdue and isTaskDueToday reflect task status and due date", () => {
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  assert.equal(isTaskDueToday(makeTask({ due_date: today })), true);
  assert.equal(isTaskOverdue(makeTask({ due_date: yesterday })), true);
  assert.equal(isTaskOverdue(makeTask({ due_date: yesterday, status: "done" })), false);
});

test("getTaskElapsedSeconds includes running timer time and never goes negative", () => {
  const nowMs = Date.UTC(2026, 3, 6, 12, 0, 0);

  assert.equal(
    getTaskElapsedSeconds(
      makeTask({
        timer_accumulated_seconds: 15,
        timer_started_at: new Date(nowMs - 65_000).toISOString(),
      }),
      nowMs
    ),
    80
  );

  assert.equal(
    getTaskElapsedSeconds(
      makeTask({
        timer_accumulated_seconds: -10,
        timer_started_at: new Date(nowMs + 30_000).toISOString(),
      }),
      nowMs
    ),
    0
  );
});

test("formatDuration renders minute and hour durations", () => {
  assert.equal(formatDuration(65), "01:05");
  assert.equal(formatDuration(3661), "01:01:01");
});

test("normalizeEstimateMinutes clamps and rounds values", () => {
  assert.equal(normalizeEstimateMinutes(22.6), 23);
  assert.equal(normalizeEstimateMinutes(-3), 0);
  assert.equal(normalizeEstimateMinutes(20_000), 10_080);
  assert.equal(normalizeEstimateMinutes(Number.NaN), 0);
});

test("compareTasks sorts by priority, then due date, then newest update", () => {
  const tasks = [
    makeTask({
      id: 1,
      priority: "medium",
      due_date: "2026-04-08",
      updated_at: "2026-04-01T08:00:00Z",
    }),
    makeTask({
      id: 2,
      priority: "urgent",
      due_date: "2026-04-09",
      updated_at: "2026-04-01T07:00:00Z",
    }),
    makeTask({
      id: 3,
      priority: "medium",
      due_date: "2026-04-07",
      updated_at: "2026-04-01T06:00:00Z",
    }),
    makeTask({
      id: 4,
      priority: "medium",
      due_date: "2026-04-07",
      updated_at: "2026-04-01T09:00:00Z",
    }),
  ];

  const sorted = [...tasks].sort(compareTasks);

  assert.deepEqual(
    sorted.map((task) => task.id),
    [2, 4, 3, 1]
  );
});

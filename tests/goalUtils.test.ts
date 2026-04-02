import test from "node:test";
import assert from "node:assert/strict";
import { addDays, format, subDays } from "date-fns";
import { isGoalNearDeadline } from "../src/utils/goalUtils";
import type { Goal } from "../src/types";

const makeGoal = (overrides: Partial<Goal> = {}): Goal => ({
  id: 1,
  title: "Ship planner",
  description: "",
  status: "active",
  progress: 40,
  project_id: null,
  target_date: null,
  created_at: "2026-04-01T10:00:00Z",
  updated_at: "2026-04-01T10:00:00Z",
  ...overrides,
});

test("isGoalNearDeadline returns true for active goals within threshold", () => {
  const targetDate = format(addDays(new Date(), 5), "yyyy-MM-dd");

  assert.equal(
    isGoalNearDeadline(makeGoal({ target_date: targetDate }), 7),
    true
  );
});

test("isGoalNearDeadline ignores completed and archived goals", () => {
  const targetDate = format(addDays(new Date(), 2), "yyyy-MM-dd");

  assert.equal(
    isGoalNearDeadline(makeGoal({ target_date: targetDate, status: "completed" }), 7),
    false
  );
  assert.equal(
    isGoalNearDeadline(makeGoal({ target_date: targetDate, status: "archived" }), 7),
    false
  );
});

test("isGoalNearDeadline returns false for dates outside the threshold or in the past", () => {
  assert.equal(
    isGoalNearDeadline(
      makeGoal({ target_date: format(addDays(new Date(), 20), "yyyy-MM-dd") }),
      7
    ),
    false
  );
  assert.equal(
    isGoalNearDeadline(
      makeGoal({ target_date: format(subDays(new Date(), 1), "yyyy-MM-dd") }),
      7
    ),
    false
  );
});

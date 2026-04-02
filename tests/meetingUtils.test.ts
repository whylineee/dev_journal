import test from "node:test";
import assert from "node:assert/strict";
import {
  expandMeetingOccurrences,
  getMeetingDisplayStatus,
} from "../src/utils/meetingUtils";
import type { Meeting } from "../src/types";

const makeMeeting = (overrides: Partial<Meeting> = {}): Meeting => ({
  id: 1,
  title: "Weekly sync",
  agenda: "",
  start_at: "2026-04-06T09:00:00",
  end_at: "2026-04-06T10:00:00",
  meet_url: null,
  calendar_event_url: null,
  project_id: null,
  participants: [],
  notes: "",
  decisions: "",
  action_items: [],
  recurrence: "none",
  recurrence_until: null,
  reminder_minutes: 10,
  status: "planned",
  created_at: "2026-04-01T10:00:00Z",
  updated_at: "2026-04-01T10:00:00Z",
  ...overrides,
});

test("getMeetingDisplayStatus derives live and missed states from the occurrence window", () => {
  const meeting = makeMeeting();
  const start = new Date("2026-04-06T09:00:00");
  const end = new Date("2026-04-06T10:00:00");

  assert.equal(
    getMeetingDisplayStatus(meeting, start, end, new Date("2026-04-06T09:30:00")),
    "live"
  );
  assert.equal(
    getMeetingDisplayStatus(meeting, start, end, new Date("2026-04-06T10:30:00")),
    "missed"
  );
  assert.equal(
    getMeetingDisplayStatus(
      makeMeeting({ status: "done" }),
      start,
      end,
      new Date("2026-04-06T09:30:00")
    ),
    "done"
  );
});

test("expandMeetingOccurrences returns daily recurring meetings within range", () => {
  const occurrences = expandMeetingOccurrences(
    [
      makeMeeting({
        recurrence: "daily",
      }),
    ],
    new Date("2026-04-06T00:00:00"),
    3
  );

  assert.equal(occurrences.length, 3);
  assert.deepEqual(
    occurrences.map((occurrence) => occurrence.start.getDate()),
    [6, 7, 8]
  );
});

test("expandMeetingOccurrences skips weekends for weekday recurrence", () => {
  const occurrences = expandMeetingOccurrences(
    [
      makeMeeting({
        start_at: "2026-04-10T09:00:00",
        end_at: "2026-04-10T10:00:00",
        recurrence: "weekdays",
      }),
    ],
    new Date("2026-04-10T00:00:00"),
    4
  );

  assert.equal(occurrences.length, 2);
  assert.deepEqual(
    occurrences.map((occurrence) => occurrence.start.getDay()),
    [5, 1]
  );
});

test("expandMeetingOccurrences respects recurrence_until and keeps sorted order", () => {
  const occurrences = expandMeetingOccurrences(
    [
      makeMeeting({
        id: 1,
        title: "Daily standup",
        recurrence: "daily",
        recurrence_until: "2026-04-07",
      }),
      makeMeeting({
        id: 2,
        title: "Design review",
        start_at: "2026-04-06T08:00:00",
        end_at: "2026-04-06T08:30:00",
      }),
    ],
    new Date("2026-04-06T00:00:00"),
    4
  );

  assert.deepEqual(
    occurrences.map((occurrence) => occurrence.title),
    ["Design review", "Daily standup", "Daily standup"]
  );
});

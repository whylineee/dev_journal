import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { installBrowserMocks } from "./helpers/browserMocks";
import {
  persistAdrRecords,
  persistDebugSessions,
  persistIncidents,
  persistQuickCaptureRecords,
  readAdrRecords,
  readDebugSessions,
  readIncidents,
  readQuickCaptureRecords,
} from "../src/utils/insightsStorage";

const browser = installBrowserMocks();

beforeEach(() => {
  browser.reset();
});

test("insights storage filters malformed payloads by record type", () => {
  localStorage.setItem(
    "devJournal_insights_adr_records",
    JSON.stringify([
      {
        id: "adr-1",
        title: "Adopt cache",
        problem: "Slow list",
        decision: "Cache reads",
        rationale: "Lower latency",
        consequences: "",
        created_at: "2026-04-21T09:00:00.000Z",
        review_date: "",
      },
      {
        id: "adr-2",
        title: "Broken",
        problem: "Missing fields",
      },
    ])
  );

  assert.deepEqual(readAdrRecords(), [
    {
      id: "adr-1",
      title: "Adopt cache",
      problem: "Slow list",
      decision: "Cache reads",
      rationale: "Lower latency",
      consequences: "",
      created_at: "2026-04-21T09:00:00.000Z",
      review_date: "",
    },
  ]);
});

test("insights persistence stays best-effort when localStorage writes fail", () => {
  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = () => {
    throw new Error("quota exceeded");
  };

  try {
    let thrownError: unknown = null;

    try {
      persistAdrRecords([]);
      persistIncidents([]);
      persistDebugSessions([]);
      persistQuickCaptureRecords([]);
    } catch (error) {
      thrownError = error;
    }

    assert.equal(thrownError, null);
  } finally {
    localStorage.setItem = originalSetItem;
  }

  assert.deepEqual(readIncidents(), []);
  assert.deepEqual(readDebugSessions(), []);
  assert.deepEqual(readQuickCaptureRecords(), []);
});

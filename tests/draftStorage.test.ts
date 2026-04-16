import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { installBrowserMocks } from "./helpers/browserMocks";
import {
  persistPageDraft,
  persistPageTrackerView,
  readPageTrackerView,
  removePageTrackerState,
} from "../src/utils/draftStorage";
import { persistPageTaskTrackerDataById } from "../src/utils/pageTrackerStorage";

const browser = installBrowserMocks();

beforeEach(() => {
  browser.reset();
});

test("removePageTrackerState clears both persisted tracker data and tracker view", () => {
  persistPageTaskTrackerDataById("new", {
    trackerA: {
      id: "trackerA",
      title: "Task tracker",
      description: "",
      rows: [],
    },
  });
  persistPageTrackerView("new", "checklist");

  removePageTrackerState("new");

  assert.equal(localStorage.getItem("devJournal_page_task_trackers_new"), null);
  assert.equal(readPageTrackerView("new"), "all");
});

test("page editor persistence stays best-effort when localStorage writes fail", () => {
  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = () => {
    throw new Error("quota exceeded");
  };

  try {
    assert.doesNotThrow(() => {
      persistPageDraft("new", {
        title: "Draft",
        content: "Content",
        updatedAt: "2026-04-16T10:00:00.000Z",
      });
      persistPageTaskTrackerDataById("new", {
        trackerA: {
          id: "trackerA",
          title: "Task tracker",
          description: "",
          rows: [],
        },
      });
      persistPageTrackerView("new", "checklist");
    });
  } finally {
    localStorage.setItem = originalSetItem;
  }

  assert.equal(localStorage.getItem("devJournal_page_draft_new"), null);
  assert.equal(localStorage.getItem("devJournal_page_task_trackers_new"), null);
  assert.equal(localStorage.getItem("devJournal_page_task_tracker_view_new"), null);
});

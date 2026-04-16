import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { installBrowserMocks } from "./helpers/browserMocks";
import {
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

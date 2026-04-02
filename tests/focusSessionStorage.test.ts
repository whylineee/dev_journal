import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  FOCUS_SESSIONS_STORAGE_KEY,
  FOCUS_SESSIONS_UPDATED_EVENT,
  readFocusSessionsMap,
  writeFocusSessionsMap,
} from "../src/utils/focusSessionStorage";
import { installBrowserMocks } from "./helpers/browserMocks";

const browser = installBrowserMocks();

beforeEach(() => {
  browser.reset();
});

test("readFocusSessionsMap filters out invalid values", () => {
  localStorage.setItem(
    FOCUS_SESSIONS_STORAGE_KEY,
    JSON.stringify({
      "2026-04-01": 3,
      "2026-04-02": "nope",
      "2026-04-03": null,
      "": 2,
    })
  );

  assert.deepEqual(readFocusSessionsMap(), {
    "2026-04-01": 3,
  });
});

test("writeFocusSessionsMap stores payload and dispatches update event", () => {
  writeFocusSessionsMap({
    "2026-04-01": 2,
    "2026-04-02": 1,
  });

  assert.deepEqual(JSON.parse(localStorage.getItem(FOCUS_SESSIONS_STORAGE_KEY) ?? "{}"), {
    "2026-04-01": 2,
    "2026-04-02": 1,
  });
  assert.equal(browser.events[browser.events.length - 1], FOCUS_SESSIONS_UPDATED_EVENT);
});

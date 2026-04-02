import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  APP_USAGE_STORAGE_KEY,
  APP_USAGE_UPDATED_EVENT,
  ENTRY_ENERGY_STORAGE_KEY,
  ENTRY_ENERGY_UPDATED_EVENT,
  readAppUsageMap,
  readEntryEnergyMap,
  writeAppUsageMap,
  writeEntryEnergyTag,
} from "../src/utils/analyticsStorage";
import { installBrowserMocks } from "./helpers/browserMocks";

const browser = installBrowserMocks();

beforeEach(() => {
  browser.reset();
});

test("readEntryEnergyMap filters malformed storage payloads", () => {
  localStorage.setItem(
    ENTRY_ENERGY_STORAGE_KEY,
    JSON.stringify({
      "2026-04-01": "focused",
      "2026-04-02": "unknown",
      "2026-04-03": 3,
      "": "tired",
    })
  );

  assert.deepEqual(readEntryEnergyMap(), {
    "2026-04-01": "focused",
  });
});

test("writeEntryEnergyTag merges sanitized state and emits update event", () => {
  localStorage.setItem(
    ENTRY_ENERGY_STORAGE_KEY,
    JSON.stringify({
      "2026-04-01": "focused",
      "2026-04-02": "broken",
    })
  );

  writeEntryEnergyTag("2026-04-03", "deep_work");

  assert.deepEqual(JSON.parse(localStorage.getItem(ENTRY_ENERGY_STORAGE_KEY) ?? "{}"), {
    "2026-04-01": "focused",
    "2026-04-03": "deep_work",
  });
  assert.equal(browser.events[browser.events.length - 1], ENTRY_ENERGY_UPDATED_EVENT);
});

test("writeEntryEnergyTag removes a date when toggled off", () => {
  localStorage.setItem(
    ENTRY_ENERGY_STORAGE_KEY,
    JSON.stringify({
      "2026-04-01": "focused",
    })
  );

  writeEntryEnergyTag("2026-04-01", null);

  assert.deepEqual(JSON.parse(localStorage.getItem(ENTRY_ENERGY_STORAGE_KEY) ?? "{}"), {});
});

test("readAppUsageMap keeps only finite non-negative numeric values", () => {
  localStorage.setItem(
    APP_USAGE_STORAGE_KEY,
    JSON.stringify({
      "2026-04-01": 120.8,
      "2026-04-02": -5,
      "2026-04-03": "15",
      "2026-04-04": null,
    })
  );

  assert.deepEqual(readAppUsageMap(), {
    "2026-04-01": 121,
  });
});

test("writeAppUsageMap persists normalized payload and emits update event", () => {
  writeAppUsageMap({
    "2026-04-01": 90,
  });

  assert.deepEqual(JSON.parse(localStorage.getItem(APP_USAGE_STORAGE_KEY) ?? "{}"), {
    "2026-04-01": 90,
  });
  assert.equal(browser.events[browser.events.length - 1], APP_USAGE_UPDATED_EVENT);
});

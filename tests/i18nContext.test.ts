import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { installBrowserMocks } from "./helpers/browserMocks";
import { persistLanguage, readStoredLanguage } from "../src/i18n/I18nContext";

const browser = installBrowserMocks();

beforeEach(() => {
  browser.reset();
});

test("readStoredLanguage returns persisted Ukrainian and falls back to English", () => {
  assert.equal(readStoredLanguage(), "en");

  localStorage.setItem("devJournal_language", "uk");
  assert.equal(readStoredLanguage(), "uk");

  localStorage.setItem("devJournal_language", "de");
  assert.equal(readStoredLanguage(), "en");
});

test("language storage helpers ignore blocked localStorage access", () => {
  const originalGetItem = localStorage.getItem.bind(localStorage);
  const originalSetItem = localStorage.setItem.bind(localStorage);

  try {
    localStorage.getItem = () => {
      throw new Error("storage blocked");
    };
    assert.equal(readStoredLanguage(), "en");

    localStorage.getItem = originalGetItem;
    localStorage.setItem = () => {
      throw new Error("storage blocked");
    };

    assert.doesNotThrow(() => persistLanguage("uk"));
  } finally {
    localStorage.getItem = originalGetItem;
    localStorage.setItem = originalSetItem;
  }
});

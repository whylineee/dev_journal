import test from "node:test";
import assert from "node:assert/strict";
import { isSafeExternalUrl } from "../src/utils/urlUtils";

test("isSafeExternalUrl allows only http and https URLs", () => {
  assert.equal(isSafeExternalUrl("https://example.com/meet"), true);
  assert.equal(isSafeExternalUrl("http://localhost:3000"), true);
  assert.equal(isSafeExternalUrl("file:///tmp/test"), false);
  assert.equal(isSafeExternalUrl("zoommtg://zoom.us/join"), false);
  assert.equal(isSafeExternalUrl("not a url"), false);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  hasMatchingState,
  hasTrustedOrigin,
  resolveExpectedOrigin,
} from "../../lib/server/request-guards.js";

test("resolveExpectedOrigin prefers configured app url", () => {
  assert.equal(
    resolveExpectedOrigin({
      requestUrl: "https://internal.example.test/api/surveys",
      configuredAppUrl: "https://app.audioform.test",
    }),
    "https://app.audioform.test",
  );
});

test("hasTrustedOrigin accepts same-origin mutation requests", () => {
  assert.equal(
    hasTrustedOrigin({
      requestOrigin: "https://app.audioform.test",
      requestReferer: null,
      requestUrl: "https://app.audioform.test/api/surveys",
      configuredAppUrl: "https://app.audioform.test",
    }),
    true,
  );
});

test("hasTrustedOrigin rejects cross-site mutation requests", () => {
  assert.equal(
    hasTrustedOrigin({
      requestOrigin: "https://evil.example",
      requestReferer: null,
      requestUrl: "https://app.audioform.test/api/surveys",
      configuredAppUrl: "https://app.audioform.test",
    }),
    false,
  );
});

test("hasTrustedOrigin falls back to referer when origin is absent", () => {
  assert.equal(
    hasTrustedOrigin({
      requestOrigin: "",
      requestReferer: "https://app.audioform.test/admin/dashboard",
      requestUrl: "https://app.audioform.test/api/surveys",
      configuredAppUrl: "https://app.audioform.test",
    }),
    true,
  );
});

test("hasMatchingState only accepts exact oauth state matches", () => {
  assert.equal(hasMatchingState("expected-state", "expected-state"), true);
  assert.equal(hasMatchingState("expected-state", "expected-state-extra"), false);
  assert.equal(hasMatchingState("expected-state", "wrong-state"), false);
});

import test from "node:test";
import assert from "node:assert/strict";
import requestGuards from "../../lib/server/request-guards.js";

const {
  hasMatchingState,
  hasTrustedOrigin,
  resolveExpectedOrigin,
} = requestGuards;

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

test("hasTrustedOrigin accepts localhost requests even when configured app url differs", () => {
  assert.equal(
    hasTrustedOrigin({
      requestOrigin: "http://localhost:3001",
      requestReferer: null,
      requestUrl: "http://localhost:3001/api/auth/login",
      configuredAppUrl: "https://audioform-production.up.railway.app",
    }),
    true,
  );
});

test("hasTrustedOrigin accepts private-network requests for local device testing", () => {
  assert.equal(
    hasTrustedOrigin({
      requestOrigin: "http://192.168.1.25:3000",
      requestReferer: null,
      requestUrl: "http://192.168.1.25:3000/api/auth/login",
      configuredAppUrl: "https://audioform-production.up.railway.app",
    }),
    true,
  );
});

test("hasMatchingState only accepts exact oauth state matches", () => {
  assert.equal(hasMatchingState("expected-state", "expected-state"), true);
  assert.equal(hasMatchingState("expected-state", "expected-state-extra"), false);
  assert.equal(hasMatchingState("expected-state", "wrong-state"), false);
});

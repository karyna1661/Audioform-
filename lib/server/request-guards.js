import { timingSafeEqual } from "node:crypto";

export function resolveExpectedOrigin({ requestUrl, configuredAppUrl }) {
  const source = configuredAppUrl && configuredAppUrl.trim() ? configuredAppUrl.trim() : requestUrl;
  return new URL(source).origin;
}

export function hasTrustedOrigin({
  requestOrigin,
  requestReferer,
  requestUrl,
  configuredAppUrl,
}) {
  const expectedOrigin = resolveExpectedOrigin({ requestUrl, configuredAppUrl });

  if (typeof requestOrigin === "string" && requestOrigin.length > 0) {
    return requestOrigin === expectedOrigin;
  }

  if (typeof requestReferer === "string" && requestReferer.length > 0) {
    try {
      return new URL(requestReferer).origin === expectedOrigin;
    } catch {
      return false;
    }
  }

  return false;
}

export function hasMatchingState(expectedState, receivedState) {
  if (!expectedState || !receivedState) return false;
  const expectedBuffer = Buffer.from(expectedState, "utf8");
  const receivedBuffer = Buffer.from(receivedState, "utf8");
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

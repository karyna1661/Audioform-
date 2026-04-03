import { timingSafeEqual } from "node:crypto";

export function resolveExpectedOrigin({ requestUrl, configuredAppUrl }) {
  const source = configuredAppUrl && configuredAppUrl.trim() ? configuredAppUrl.trim() : requestUrl;
  return new URL(source).origin;
}

function resolveRequestOrigin(requestUrl) {
  try {
    return new URL(requestUrl).origin;
  } catch {
    return null;
  }
}

function isLocalHostname(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function isTrustedLocalOrigin(candidate, requestUrl) {
  if (!candidate) return false;
  try {
    const candidateUrl = new URL(candidate);
    const request = new URL(requestUrl);
    return isLocalHostname(candidateUrl.hostname) && isLocalHostname(request.hostname);
  } catch {
    return false;
  }
}

export function hasTrustedOrigin({
  requestOrigin,
  requestReferer,
  requestUrl,
  configuredAppUrl,
}) {
  const expectedOrigin = resolveExpectedOrigin({ requestUrl, configuredAppUrl });
  const requestOriginFromUrl = resolveRequestOrigin(requestUrl);

  if (typeof requestOrigin === "string" && requestOrigin.length > 0) {
    if (isTrustedLocalOrigin(requestOrigin, requestUrl)) {
      return true;
    }
    if (requestOriginFromUrl && requestOrigin === requestOriginFromUrl) {
      return true;
    }
    return requestOrigin === expectedOrigin;
  }

  if (typeof requestReferer === "string" && requestReferer.length > 0) {
    try {
      if (isTrustedLocalOrigin(requestReferer, requestUrl)) {
        return true;
      }
      const refererOrigin = new URL(requestReferer).origin;
      if (requestOriginFromUrl && refererOrigin === requestOriginFromUrl) {
        return true;
      }
      return refererOrigin === expectedOrigin;
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

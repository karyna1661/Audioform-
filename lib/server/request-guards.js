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

function isPrivateNetworkHostname(hostname) {
  if (isLocalHostname(hostname) || hostname === "::1") return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
  return false;
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

function isTrustedPrivateNetworkOrigin(candidate, requestUrl) {
  if (!candidate) return false;
  try {
    const candidateUrl = new URL(candidate);
    const request = new URL(requestUrl);
    return isPrivateNetworkHostname(candidateUrl.hostname) && isPrivateNetworkHostname(request.hostname);
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
    if (isTrustedPrivateNetworkOrigin(requestOrigin, requestUrl)) {
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
      if (isTrustedPrivateNetworkOrigin(requestReferer, requestUrl)) {
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

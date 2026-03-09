const DEFAULT_CALLBACK_URL = "/admin/dashboard/v4"

export function isAllowedCallbackUrl(value: string): boolean {
  if (!value.startsWith("/") || value.startsWith("//")) return false
  if (value === "/") return true
  const allowedRoots = ["/admin", "/questionnaire", "/embed"]
  return allowedRoots.some((root) => value === root || value.startsWith(`${root}/`))
}

export function sanitizeCallbackUrl(
  value: string | null | undefined,
  fallback: string = DEFAULT_CALLBACK_URL,
): string {
  if (!value) return fallback
  return isAllowedCallbackUrl(value) ? value : fallback
}


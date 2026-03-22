import { isB2Configured } from "@/lib/server/b2-storage"

export const REQUIRED_ENV = ["AUTH_SESSION_SECRET", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const

export function getMissingRequiredEnv(): string[] {
  return REQUIRED_ENV.filter((name) => !(process.env[name] || "").trim())
}

export async function checkSupabase(): Promise<{ ok: boolean; status: number | null; error?: string }> {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return { ok: false, status: null, error: "Supabase is not configured." }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`${url}/rest/v1/users?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      cache: "no-store",
      signal: controller.signal,
    })

    return {
      ok: response.ok,
      status: response.status,
      error: response.ok ? undefined : `Supabase probe failed with status ${response.status}.`,
    }
  } catch (error) {
    return {
      ok: false,
      status: null,
      error: error instanceof Error ? error.message : "Supabase probe failed.",
    }
  } finally {
    clearTimeout(timeout)
  }
}

export function getStorageStatus() {
  return {
    ok: isB2Configured() || process.env.NODE_ENV !== "production",
    provider: isB2Configured() ? "backblaze-b2" : "local-fallback",
  }
}

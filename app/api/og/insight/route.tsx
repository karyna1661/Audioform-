import { ImageResponse } from "next/og"
import { getTranscriptByResponseId } from "@/lib/server/transcript-store"
import { getInsightByTranscriptId } from "@/lib/server/insight-store"

export const runtime = "edge"

function formatDuration(seconds?: number | null): string {
  if (!seconds && seconds !== 0) return "Unknown"
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".")
  if (parts.length < 2) return null
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4)
    const decoded = typeof Buffer !== "undefined" 
      ? Buffer.from(padded, "base64").toString("utf8")
      : atob(padded)
    return JSON.parse(decoded) as Record<string, unknown>
  } catch {
    return null
  }
}

function resolveSupabaseConfig(): { url: string; key: string } {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ""
  const explicitUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  if (explicitUrl && key) return { url: explicitUrl.replace(/\/+$/, ""), key }
  const payload = key ? decodeJwtPayload(key) : null
  const ref = typeof payload?.ref === "string" ? payload.ref : ""
  if (ref && key) return { url: `https://${ref}.supabase.co`, key }
  throw new Error("Missing Supabase config")
}

async function getResponseDurationSeconds(responseId: string): Promise<number | null> {
  try {
    const { url, key } = resolveSupabaseConfig()
    const res = await fetch(`${url}/rest/v1/response_records?id=eq.${encodeURIComponent(responseId)}&select=duration_seconds&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = await res.json()
    return data[0]?.duration_seconds ?? null
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const responseId = searchParams.get("responseId")?.trim()

  if (!responseId) {
    return new Response("Missing responseId", { status: 400 })
  }

  const durationSeconds = await getResponseDurationSeconds(responseId)
  const transcript = await getTranscriptByResponseId(responseId)
  const insight = transcript ? await getInsightByTranscriptId(transcript.id) : null

  const summary = insight?.narrativeSummary || "Processing insight..."
  const quote = insight?.powerQuote || ""
  const theme = insight?.primaryTheme || ""
  const duration = formatDuration(durationSeconds)

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          background: "linear-gradient(135deg, #f7f0e4 0%, #efe0c7 52%, #f8f4ed 100%)",
          color: "var(--af-color-primary)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: 24,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#7a6146",
            }}
          >
            <div style={{ width: 16, height: 16, borderRadius: 999, background: "#b85e2d" }} />
            Audioform Insight
          </div>
          
          {theme && (
            <div style={{ 
              display: "flex", 
              padding: "6px 16px", 
              borderRadius: 999, 
              background: "#fff6ed", 
              border: "1px solid #cfbea4", 
              color: "#7a6146", 
              fontSize: 20, 
              width: "fit-content",
              textTransform: "capitalize"
            }}>
              {theme}
            </div>
          )}

          <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.15, maxWidth: 980, color: "var(--af-color-primary)", marginTop: 12 }}>
            {summary}
          </div>

          {quote && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                marginTop: "16px",
                padding: "28px 30px",
                borderRadius: 28,
                background: "rgba(255, 253, 248, 0.92)",
                border: "2px solid rgba(184, 94, 45, 0.22)",
                maxWidth: 980,
              }}
            >
              <div style={{ fontSize: 20, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a6a4c" }}>
                {`Direct Quote (${duration})`}
              </div>
              <div style={{ fontSize: 32, lineHeight: 1.3, fontStyle: "italic", color: "var(--af-color-primary)" }}>
                {`"${quote}"`}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 28, color: "#6e3316" }}>High-signal voice feedback</div>
            <div style={{ fontSize: 22, color: "#7a6146" }}>Powered by Audioform</div>
          </div>
          <div style={{ fontSize: 24, color: "#7a6146" }}>audioform-production.up.railway.app</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}

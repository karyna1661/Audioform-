import { ImageResponse } from "next/og"
import { getLatestPublishedSurveyQuestions, getPublishedSurveyById } from "@/lib/server/survey-store"

export const runtime = "edge"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const surveyId = searchParams.get("surveyId")?.trim()

  const survey = surveyId ? await getPublishedSurveyById(surveyId) : null
  const prompts = surveyId ? await getLatestPublishedSurveyQuestions(surveyId) : []

  const title = survey?.title?.trim() || "Audioform voice survey"
  const firstPrompt = prompts[0]?.trim() || "Share one concrete moment by voice."
  const prompt = firstPrompt.length > 150 ? `${firstPrompt.slice(0, 147)}...` : firstPrompt

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
          color: "#261c14",
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
            Audioform survey
          </div>
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.05, maxWidth: 980 }}>{title}</div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              marginTop: "8px",
              padding: "28px 30px",
              borderRadius: 28,
              background: "rgba(255, 253, 248, 0.92)",
              border: "2px solid rgba(184, 94, 45, 0.22)",
              maxWidth: 980,
            }}
          >
            <div style={{ fontSize: 22, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a6a4c" }}>
              First prompt preview
            </div>
            <div style={{ fontSize: 38, lineHeight: 1.22 }}>{prompt}</div>
          </div>
        </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 28, color: "#6e3316" }}>Answer by voice in under a minute</div>
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

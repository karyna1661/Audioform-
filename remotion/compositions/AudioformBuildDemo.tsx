import React from "react"
import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"

const palette = {
  sand: "#f3ecdf",
  cream: "#f9f4ea",
  peach: "#fff6ed",
  line: "#dbcdb8",
  burnt: "#b85e2d",
  burntDark: "#8a431f",
  ink: "#2f261f",
  muted: "#5c5146",
  green: "#2d5a17",
}

const ease = Easing.bezier(0.22, 1, 0.36, 1)

const browserFrame: React.CSSProperties = {
  width: 1500,
  height: 790,
  borderRadius: 28,
  border: `2px solid ${palette.line}`,
  backgroundColor: palette.cream,
  boxShadow: "0 30px 70px rgba(59, 40, 19, 0.2)",
  overflow: "hidden",
}

type SceneProps = {
  from: number
  durationInFrames: number
  chapter: string
  title: string
  subtitle: string
  children: React.ReactNode
}

const SceneChrome: React.FC<SceneProps> = ({ from, durationInFrames, chapter, title, subtitle, children }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const local = frame - from

  const rise = spring({
    frame: local,
    fps,
    config: { damping: 200 },
    durationInFrames: 38,
  })
  const opacityIn = interpolate(local, [0, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  })
  const opacityOut = interpolate(local, [durationInFrames - 18, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  })
  const opacity = opacityIn * opacityOut

  return (
    <AbsoluteFill
      style={{
        padding: "70px 84px",
        color: palette.ink,
        fontFamily: "Inter, Arial, sans-serif",
        transform: `translateY(${(1 - rise) * 26}px)`,
        opacity,
      }}
    >
      <div
        style={{
          alignSelf: "flex-start",
          marginBottom: 16,
          borderRadius: 999,
          border: `1px solid ${palette.line}`,
          backgroundColor: "rgba(255, 246, 237, 0.88)",
          color: palette.burntDark,
          padding: "8px 14px",
          fontSize: 14,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1.1,
          backdropFilter: "blur(6px)",
        }}
      >
        {chapter}
      </div>
      <h1 style={{ margin: 0, fontSize: 74, lineHeight: 1.02, letterSpacing: -1.8 }}>{title}</h1>
      <p style={{ margin: "16px 0 28px", fontSize: 31, color: palette.muted, maxWidth: 1360 }}>{subtitle}</p>
      {children}
    </AbsoluteFill>
  )
}

const TopBar: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      height: 62,
      backgroundColor: palette.peach,
      borderBottom: `1px solid ${palette.line}`,
      display: "flex",
      alignItems: "center",
      padding: "0 20px",
      gap: 16,
    }}
  >
    <div style={{ display: "flex", gap: 8 }}>
      <span style={{ width: 11, height: 11, borderRadius: 99, backgroundColor: "#e07e73" }} />
      <span style={{ width: 11, height: 11, borderRadius: 99, backgroundColor: "#e9b95e" }} />
      <span style={{ width: 11, height: 11, borderRadius: 99, backgroundColor: "#7bc58b" }} />
    </div>
    <div
      style={{
        marginLeft: 10,
        border: `1px solid ${palette.line}`,
        backgroundColor: "#fffdf9",
        borderRadius: 999,
        fontSize: 18,
        color: palette.muted,
        padding: "6px 14px",
      }}
    >
      {label}
    </div>
  </div>
)

const ProgressRail: React.FC = () => {
  const frame = useCurrentFrame()
  const total = 450
  const p = interpolate(frame, [0, total], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  return (
    <div
      style={{
        position: "absolute",
        left: 84,
        right: 84,
        bottom: 38,
        height: 10,
        borderRadius: 999,
        backgroundColor: "#e5d8c5",
      }}
    >
      <div
        style={{
          width: `${p * 100}%`,
          height: "100%",
          borderRadius: 999,
          background: "linear-gradient(90deg,#b85e2d 0%,#d68a5f 100%)",
        }}
      />
    </div>
  )
}

const StepBadge: React.FC<{ n: number; label: string }> = ({ n, label }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      borderRadius: 999,
      border: `1px solid ${palette.line}`,
      backgroundColor: palette.peach,
      color: palette.burntDark,
      padding: "8px 14px",
      fontSize: 17,
      fontWeight: 700,
      marginBottom: 14,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    }}
  >
    <span
      style={{
        width: 24,
        height: 24,
        borderRadius: 999,
        backgroundColor: "#f1ceb9",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
      }}
    >
      {n}
    </span>
    {label}
  </div>
)

const waveformBar = (h: number): React.CSSProperties => ({
  width: 10,
  height: h,
  borderRadius: 99,
  backgroundColor: palette.burnt,
})

export const AudioformBuildDemo: React.FC = () => {
  const frame = useCurrentFrame()
  const driftX = interpolate(frame, [0, 450], [0, -16], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const driftY = interpolate(frame, [0, 450], [0, -10], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const zoom = interpolate(frame, [0, 450], [1, 1.018], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const grainFlicker = 0.04 + ((Math.sin(frame * 0.53) + 1) / 2) * 0.03

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #f3ecdf 0%, #f1e5d0 46%, #eddcc1 100%)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 920,
          height: 920,
          borderRadius: 920,
          right: -200,
          top: -260,
          background: "radial-gradient(circle, rgba(184,94,45,0.22) 0%, rgba(184,94,45,0) 72%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 640,
          height: 640,
          borderRadius: 640,
          left: -160,
          bottom: -220,
          background: "radial-gradient(circle, rgba(138,67,31,0.14) 0%, rgba(138,67,31,0) 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(to right, rgba(138,67,31,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(138,67,31,0.05) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          opacity: 0.22,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translate(${driftX}px, ${driftY}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >

      <Sequence from={0} durationInFrames={100} premountFor={20}>
        <SceneChrome
          from={0}
          durationInFrames={100}
          chapter="Intro"
          title="Audioform for builders who ship in public"
          subtitle="Capture voice conviction, not shallow comments. This is a real workflow demo."
        >
          <div style={browserFrame}>
            <TopBar label="audioform.app / admin/questionnaires" />
            <div style={{ display: "grid", gridTemplateColumns: "370px 1fr", height: "calc(100% - 62px)" }}>
              <div style={{ borderRight: `1px solid ${palette.line}`, padding: 22, backgroundColor: "#f5ebdb" }}>
                <p style={{ margin: 0, fontWeight: 700, color: palette.burntDark }}>Survey Stack</p>
                {["Activation Decision Pulse", "Onboarding Friction Check", "Retention Risk Scan"].map((q, i) => (
                  <div
                    key={q}
                    style={{
                      marginTop: 12,
                      borderRadius: 16,
                      border: `1px solid ${palette.line}`,
                      backgroundColor: i === 0 ? "#fffdf8" : "#f9f1e3",
                      padding: 12,
                      fontSize: 17,
                    }}
                  >
                    {q}
                  </div>
                ))}
              </div>
              <div style={{ padding: 28 }}>
                <StepBadge n={1} label="Design" />
                <p style={{ margin: "0 0 12px", fontSize: 42, fontWeight: 700 }}>Define one product decision</p>
                <p style={{ margin: 0, fontSize: 24, color: palette.muted }}>
                  Build signal-ready prompts before publishing.
                </p>
              </div>
            </div>
          </div>
        </SceneChrome>
      </Sequence>

      <Sequence from={88} durationInFrames={115} premountFor={20}>
        <SceneChrome
          from={88}
          durationInFrames={115}
          chapter="Step 1"
          title="Step 1: Compose the survey"
          subtitle="Intent mode + depth prompts create higher quality responses."
        >
          <div style={browserFrame}>
            <TopBar label="audioform.app / admin/questionnaires/v1" />
            <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 20 }}>
              <div style={{ border: `1px solid ${palette.line}`, borderRadius: 20, backgroundColor: "#fffdf8", padding: 20 }}>
                <p style={{ margin: 0, fontSize: 20, color: palette.burntDark, fontWeight: 700 }}>Decision Context</p>
                <p style={{ margin: "8px 0 0", fontSize: 19 }}>Should we simplify onboarding before adding new features?</p>
                <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
                  {["Validate Direction", "Find Weak Spots", "Find Confusion"].map((pill, i) => (
                    <div
                      key={pill}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: `1px solid ${palette.line}`,
                        backgroundColor: i === 1 ? "#f1ceb9" : "#f6ebd8",
                        fontSize: 15,
                        fontWeight: 600,
                      }}
                    >
                      {pill}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ border: `1px solid ${palette.line}`, borderRadius: 20, backgroundColor: "#f8efdf", padding: 20 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 20 }}>Depth starters</p>
                {[
                  "What would stop you from using this in production?",
                  "Where did you pause before the next step?",
                  "What would make this clearly better this week?",
                ].map((item) => (
                  <div
                    key={item}
                    style={{
                      marginTop: 10,
                      fontSize: 17,
                      borderRadius: 12,
                      border: `1px solid ${palette.line}`,
                      backgroundColor: "#fff8ef",
                      padding: "10px 12px",
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SceneChrome>
      </Sequence>

      <Sequence from={191} durationInFrames={118} premountFor={20}>
        <SceneChrome
          from={191}
          durationInFrames={118}
          chapter="Step 2"
          title="Step 2: Collect voice responses"
          subtitle="Respondents give 20-45s takes. Playback and timing are explicit."
        >
          <div style={browserFrame}>
            <TopBar label="audioform.app / questionnaire/v1" />
            <div style={{ padding: 34, display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 20 }}>
              <div style={{ border: `1px solid ${palette.line}`, borderRadius: 20, backgroundColor: "#fffdf8", padding: 24 }}>
                <StepBadge n={2} label="Respond" />
                <p style={{ margin: "0 0 10px", fontSize: 39, fontWeight: 700 }}>
                  What part of this product helped you most, and why?
                </p>
                <p style={{ margin: "0 0 20px", fontSize: 22, color: palette.muted }}>
                  Speak naturally. Add one concrete example.
                </p>
                <div
                  style={{
                    border: `1px solid ${palette.line}`,
                    borderRadius: 20,
                    backgroundColor: "#f8efdf",
                    padding: 18,
                    height: 180,
                    display: "flex",
                    alignItems: "end",
                    gap: 7,
                  }}
                >
                  {new Array(34).fill(true).map((_, i) => {
                    const wobble = Math.sin((frame + i * 5) * 0.15)
                    const height = 28 + ((wobble + 1) / 2) * 90
                    return <div key={i} style={waveformBar(height)} />
                  })}
                </div>
                <p style={{ margin: "12px 0 0", fontSize: 17, color: palette.muted }}>
                  Playback: 00:09 / 00:31
                </p>
              </div>

              <div style={{ border: `1px solid ${palette.line}`, borderRadius: 20, backgroundColor: "#f8efdf", padding: 24 }}>
                <p style={{ margin: 0, fontSize: 18, textTransform: "uppercase", letterSpacing: 0.8, color: palette.burntDark }}>
                  Quality target
                </p>
                <p style={{ margin: "8px 0 0", fontSize: 50, fontWeight: 700, color: palette.green }}>30s</p>
                <p style={{ marginTop: 8, fontSize: 20, color: palette.muted }}>TTFR: first response in 2m</p>
                <div style={{ marginTop: 18, border: `1px solid ${palette.line}`, borderRadius: 14, background: "#fff9f1", padding: 12 }}>
                  <p style={{ margin: 0, fontSize: 16 }}>Voice adds hesitation, certainty, and emotional signal.</p>
                </div>
              </div>
            </div>
          </div>
        </SceneChrome>
      </Sequence>

      <Sequence from={296} durationInFrames={108} premountFor={20}>
        <SceneChrome
          from={296}
          durationInFrames={108}
          chapter="Step 3"
          title="Step 3: Review and export top signal"
          subtitle="Survey Stack routes to Moderation Queue where clips can be turned into shareable proof."
        >
          <div style={browserFrame}>
            <TopBar label="audioform.app / admin/responses?focus=top-signal" />
            <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              {[
                { survey: "Activation Decision Pulse", reason: "Clear onboarding friction + concrete fix", length: "00:31" },
                { survey: "Onboarding Friction Check", reason: "Short response, flagged for follow-up", length: "00:12" },
              ].map((item, idx) => {
                const pop = interpolate(frame, [305 + idx * 12, 322 + idx * 12], [0.92, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: ease,
                })
                return (
                  <div
                    key={item.survey}
                    style={{
                      border: `1px solid ${palette.line}`,
                      borderRadius: 18,
                      padding: 16,
                      backgroundColor: idx === 0 ? "#fffdf9" : "#f9f1e3",
                      transform: `scale(${pop})`,
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{item.survey}</p>
                    <p style={{ margin: "6px 0", fontSize: 18, color: palette.muted }}>{item.reason}</p>
                    <p style={{ margin: 0, fontSize: 16 }}>{item.length}</p>
                    <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                      <span style={{ border: `1px solid ${palette.line}`, borderRadius: 999, padding: "5px 10px", fontSize: 14 }}>
                        Replay clip
                      </span>
                      <span style={{ border: `1px solid ${palette.line}`, borderRadius: 999, padding: "5px 10px", fontSize: 14 }}>
                        Export share clip note
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </SceneChrome>
      </Sequence>

      <Sequence from={392} durationInFrames={58} premountFor={12}>
        <SceneChrome
          from={392}
          durationInFrames={58}
          chapter="Final CTA"
          title="Build in public with proof, not guesswork"
          subtitle="Audioform turns weekly feedback into decision-ready voice signal."
        >
          <div
            style={{
              ...browserFrame,
              height: 290,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 34px",
              backgroundColor: palette.peach,
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 36, fontWeight: 700 }}>Start your first signal survey</p>
              <p style={{ margin: "8px 0 0", fontSize: 22, color: palette.muted }}>
                {"Create -> collect -> replay -> ship"}
              </p>
            </div>
            <div
              style={{
                padding: "14px 24px",
                borderRadius: 999,
                backgroundColor: palette.burnt,
                color: "#fff6ed",
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              audioform.app
            </div>
          </div>
        </SceneChrome>
      </Sequence>
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 100% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.17) 100%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: grainFlicker,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.8) 0, rgba(0,0,0,0.8) 1px, rgba(255,255,255,0.8) 1px, rgba(255,255,255,0.8) 2px)",
          mixBlendMode: "soft-light",
        }}
      />

      <ProgressRail />
    </AbsoluteFill>
  )
}

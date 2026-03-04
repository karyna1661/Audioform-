"use client"

export type AudioformEventName =
  | "creator_onboarding_started"
  | "decision_intent_prompt_viewed"
  | "creator_clicked_start"
  | "decision_intent_selected"
  | "prompt_template_selected"
  | "prompt_template_applied"
  | "survey_draft_saved"
  | "survey_published"
  | "share_link_copied"
  | "respondent_started"
  | "response_recording_started"
  | "response_recording_submitted"
  | "response_duration_bucketed"
  | "respondent_completed"
  | "response_inbox_opened"
  | "first_response_viewed"
  | "response_replayed"
  | "response_bookmarked"
  | "respondent_thank_you_viewed"
  | "respondent_follow_up_action"
  | "creator_conversion_cta_clicked"

type EventPayload = Record<string, string | number | boolean | null | undefined>

type AudioformEvent = {
  name: AudioformEventName
  payload?: EventPayload
  timestamp: string
}

function getSessionId(): string {
  if (typeof window === "undefined") return "server"
  const key = "audioform_session_id"
  const existing = window.sessionStorage.getItem(key)
  if (existing) return existing
  const created = crypto.randomUUID()
  window.sessionStorage.setItem(key, created)
  return created
}

export function trackEvent(name: AudioformEventName, payload?: EventPayload): void {
  if (typeof window === "undefined") return

  const event: AudioformEvent = {
    name,
    payload: {
      ...payload,
      path: window.location.pathname,
      session_id: getSessionId(),
    },
    timestamp: new Date().toISOString(),
  }

  const storeKey = "audioform_events"
  const current = window.localStorage.getItem(storeKey)
  const parsed: AudioformEvent[] = current ? JSON.parse(current) : []
  parsed.push(event)
  window.localStorage.setItem(storeKey, JSON.stringify(parsed.slice(-500)))

  window.dispatchEvent(new CustomEvent("audioform:track", { detail: event }))
}

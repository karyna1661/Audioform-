type SurveyRow = {
  id: string
  title: string
  decision_focus: string | null
  intent: string | null
  template_pack: string | null
  question_count: number | null
  status: "draft" | "published"
  created_by: string
  created_at: string
  updated_at: string
  published_at: string | null
}

type DashboardEventRow = {
  id: string
  type: string
  survey_id: string | null
  message: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export type StoredSurvey = {
  id: string
  title: string
  decisionFocus: string | null
  intent: string | null
  templatePack: string | null
  questionCount: number
  status: "draft" | "published"
  createdBy: string
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

export type DashboardEvent = {
  id: string
  type: string
  surveyId: string | null
  message: string
  metadata: Record<string, unknown> | null
  createdAt: string
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
    const parsed = JSON.parse(decoded) as Record<string, unknown>
    return parsed
  } catch {
    return null
  }
}

function resolveSupabaseConfig(): { url: string; key: string } {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    ""

  const explicitUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  if (explicitUrl && key) return { url: explicitUrl.replace(/\/+$/, ""), key }

  const projectRefFromEnv = process.env.SUPABASE_PROJECT_REF || ""
  if (projectRefFromEnv && key) {
    return { url: `https://${projectRefFromEnv}.supabase.co`, key }
  }

  const payload = key ? decodeJwtPayload(key) : null
  const ref = typeof payload?.ref === "string" ? payload.ref : ""
  if (ref && key) {
    return { url: `https://${ref}.supabase.co`, key }
  }

  throw new Error("Missing Supabase config for survey store.")
}

async function supabaseRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { url, key } = resolveSupabaseConfig()
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Supabase survey request failed (${response.status}): ${text.slice(0, 280)}`)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function mapSurvey(row: SurveyRow): StoredSurvey {
  return {
    id: row.id,
    title: row.title,
    decisionFocus: row.decision_focus,
    intent: row.intent,
    templatePack: row.template_pack,
    questionCount: row.question_count ?? 0,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  }
}

function mapEvent(row: DashboardEventRow): DashboardEvent {
  return {
    id: row.id,
    type: row.type,
    surveyId: row.survey_id,
    message: row.message,
    metadata: row.metadata,
    createdAt: row.created_at,
  }
}

export async function listSurveys(input?: {
  id?: string
  status?: "draft" | "published"
  createdBy?: string
}): Promise<StoredSurvey[]> {
  const params: string[] = ["select=id,title,decision_focus,intent,template_pack,question_count,status,created_by,created_at,updated_at,published_at", "order=updated_at.desc"]
  if (input?.id) params.push(`id=eq.${encodeURIComponent(input.id)}`)
  if (input?.status) params.push(`status=eq.${input.status}`)
  if (input?.createdBy) params.push(`created_by=eq.${encodeURIComponent(input.createdBy)}`)
  const rows = await supabaseRequest<SurveyRow[]>(`/rest/v1/surveys?${params.join("&")}`)
  return rows.map(mapSurvey)
}

export async function getPublishedSurveyById(id: string): Promise<StoredSurvey | null> {
  const rows = await listSurveys({ id, status: "published" })
  return rows[0] ?? null
}

export async function getPublishedSurveyByCreatorAndId(
  creatorId: string,
  id: string,
): Promise<StoredSurvey | null> {
  const rows = await listSurveys({ id, createdBy: creatorId, status: "published" })
  return rows[0] ?? null
}

export async function getSurveyById(id: string): Promise<StoredSurvey | null> {
  const rows = await listSurveys({ id })
  return rows[0] ?? null
}

export async function getSurveyByIdForCreator(id: string, creatorId: string): Promise<StoredSurvey | null> {
  const rows = await listSurveys({ id, createdBy: creatorId })
  return rows[0] ?? null
}

function buildSurveyPayload(
  input: {
    id: string
    title: string
    decisionFocus?: string
    intent?: string
    templatePack?: string
    questionCount: number
    status: "draft" | "published"
    createdBy: string
  },
  publishedAt: string | null,
) {
  return {
    id: input.id,
    title: input.title,
    decision_focus: input.decisionFocus || null,
    intent: input.intent || null,
    template_pack: input.templatePack || null,
    question_count: input.questionCount,
    status: input.status,
    created_by: input.createdBy,
    updated_at: new Date().toISOString(),
    published_at: publishedAt,
  }
}

export async function saveSurveyForCreator(input: {
  id: string
  title: string
  decisionFocus?: string
  intent?: string
  templatePack?: string
  questionCount: number
  status: "draft" | "published"
  createdBy: string
}): Promise<StoredSurvey> {
  const existing = await getSurveyById(input.id)
  const publishedAt =
    input.status === "published" ? existing?.publishedAt || new Date().toISOString() : null

  if (!existing) {
    const payload = buildSurveyPayload(input, publishedAt)
    const rows = await supabaseRequest<SurveyRow[]>("/rest/v1/surveys", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([payload]),
    })
    if (!rows.length) throw new Error("Failed to save survey.")
    return mapSurvey(rows[0])
  }

  if (existing.createdBy !== input.createdBy) {
    throw new Error("Forbidden survey access.")
  }

  const payload = buildSurveyPayload(input, publishedAt)
  const rows = await supabaseRequest<SurveyRow[]>(
    `/rest/v1/surveys?id=eq.${encodeURIComponent(input.id)}&created_by=eq.${encodeURIComponent(input.createdBy)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload),
    },
  )
  if (!rows.length) throw new Error("Failed to save survey.")
  return mapSurvey(rows[0])
}

export async function recordDashboardEvent(input: {
  type: string
  message: string
  surveyId?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  await supabaseRequest<DashboardEventRow[]>("/rest/v1/dashboard_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify([
      {
        type: input.type,
        survey_id: input.surveyId ?? null,
        message: input.message,
        metadata: input.metadata ?? null,
      },
    ]),
  })
}

export async function listDashboardEvents(limit = 20): Promise<DashboardEvent[]> {
  const rows = await supabaseRequest<DashboardEventRow[]>(
    `/rest/v1/dashboard_events?select=id,type,survey_id,message,metadata,created_at&order=created_at.desc&limit=${limit}`,
  )
  return rows.map(mapEvent)
}

export async function listDashboardEventsForSurveyIds(
  surveyIds: string[],
  limit = 20,
): Promise<DashboardEvent[]> {
  if (!surveyIds.length) return []
  const scopedIds = surveyIds.map((id) => encodeURIComponent(id)).join(",")
  const rows = await supabaseRequest<DashboardEventRow[]>(
    `/rest/v1/dashboard_events?select=id,type,survey_id,message,metadata,created_at&survey_id=in.(${scopedIds})&order=created_at.desc&limit=${limit}`,
  )
  return rows.map(mapEvent)
}

export async function getLatestPublishedSurveyQuestions(surveyId: string): Promise<string[]> {
  const rows = await supabaseRequest<DashboardEventRow[]>(
    `/rest/v1/dashboard_events?select=id,type,survey_id,message,metadata,created_at&survey_id=eq.${encodeURIComponent(
      surveyId,
    )}&type=eq.survey_published&order=created_at.desc&limit=1`,
  )
  const latest = rows[0]
  const questions = latest?.metadata?.questions
  if (!Array.isArray(questions)) return []
  return questions.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
}

export async function getLatestSurveyQuestions(surveyId: string): Promise<string[]> {
  const rows = await supabaseRequest<DashboardEventRow[]>(
    `/rest/v1/dashboard_events?select=id,type,survey_id,message,metadata,created_at&survey_id=eq.${encodeURIComponent(
      surveyId,
    )}&type=in.(survey_draft_saved,survey_published)&order=created_at.desc&limit=1`,
  )
  const latest = rows[0]
  const questions = latest?.metadata?.questions
  if (!Array.isArray(questions)) return []
  return questions.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
}

export async function deleteSurveyByIdForCreator(id: string, creatorId: string): Promise<boolean> {
  const existing = await getSurveyByIdForCreator(id, creatorId)
  if (!existing) return false

  // Delete response rows first to avoid FK violations in stricter schemas.
  await supabaseRequest<unknown>(`/rest/v1/response_records?survey_id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  })

  await supabaseRequest<unknown>(`/rest/v1/dashboard_events?survey_id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  })

  await supabaseRequest<unknown>(
    `/rest/v1/surveys?id=eq.${encodeURIComponent(id)}&created_by=eq.${encodeURIComponent(creatorId)}`,
    {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    },
  )

  return true
}

export async function deleteSurveyById(id: string): Promise<void> {
  await supabaseRequest<unknown>(`/rest/v1/surveys?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  })
}

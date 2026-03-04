import { pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "node:crypto"

export type StoredUser = {
  id: string
  name: string
  email: string
  role: "admin" | "user"
  passwordHash: string
  passwordSalt: string
  createdAt: string
}

type SupabaseUserRow = {
  id: string
  name: string
  email: string
  role: "admin" | "user"
  password_hash: string
  password_salt: string
  created_at: string
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".")
  if (parts.length < 2) return null
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4)
    const parsed = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<string, unknown>
    return parsed
  } catch {
    return null
  }
}

function resolveSupabaseConfig(): { url: string; key: string } {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_API ||
    process.env.SUPABASE_ANON_KEY ||
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

  throw new Error(
    "Missing Supabase configuration. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (preferred), or SUPABASE_API with a token containing `ref`.",
  )
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
    const details = text.slice(0, 300)
    throw new Error(`Supabase request failed (${response.status}): ${details}`)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function mapRowToStoredUser(row: SupabaseUserRow): StoredUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    createdAt: row.created_at,
  }
}

function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 210_000, 32, "sha256").toString("hex")
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const normalized = email.trim().toLowerCase()
  const rows = await supabaseRequest<SupabaseUserRow[]>(
    `/rest/v1/users?email=eq.${encodeURIComponent(normalized)}&select=id,name,email,role,password_hash,password_salt,created_at&limit=1`,
  )
  if (!rows.length) return null
  return mapRowToStoredUser(rows[0])
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  const rows = await supabaseRequest<SupabaseUserRow[]>(
    `/rest/v1/users?id=eq.${encodeURIComponent(id)}&select=id,name,email,role,password_hash,password_salt,created_at&limit=1`,
  )
  if (!rows.length) return null
  return mapRowToStoredUser(rows[0])
}

export async function createUser(input: { name: string; email: string; password: string }): Promise<StoredUser> {
  const email = input.email.trim().toLowerCase()
  const existing = await findUserByEmail(email)
  if (existing) {
    throw new Error("Account already exists for this email.")
  }

  const passwordSalt = randomBytes(16).toString("hex")
  const passwordHash = hashPassword(input.password, passwordSalt)
  const id = randomUUID()
  const createdAt = new Date().toISOString()

  const rows = await supabaseRequest<SupabaseUserRow[]>("/rest/v1/users", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify([
      {
        id,
        name: input.name.trim(),
        email,
        role: "user",
        password_hash: passwordHash,
        password_salt: passwordSalt,
        created_at: createdAt,
      },
    ]),
  })

  if (!rows.length) {
    throw new Error("Failed to create account in Supabase.")
  }
  return mapRowToStoredUser(rows[0])
}

export async function verifyUserPassword(email: string, password: string): Promise<StoredUser | null> {
  const user = await findUserByEmail(email)
  if (!user) return null

  const expected = Buffer.from(user.passwordHash, "hex")
  const supplied = Buffer.from(hashPassword(password, user.passwordSalt), "hex")
  if (expected.length !== supplied.length) return null
  if (!timingSafeEqual(expected, supplied)) return null
  return user
}

export function toSafeUser(user: StoredUser): { id: string; name: string; email: string; role: "admin" | "user" } {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }
}

import { randomUUID } from "node:crypto"

type B2Auth = {
  accountId: string
  apiUrl: string
  authorizationToken: string
  downloadUrl: string
}

let cachedAuth: { value: B2Auth; expiresAt: number } | null = null

function requireB2Config(): { keyId: string; applicationKey: string; bucketId?: string; bucketName?: string } {
  const keyId = process.env.B2_KEY_ID || process.env.keyID || process.env.KEY_ID || ""
  const applicationKey =
    process.env.B2_APPLICATION_KEY || process.env.applicationKey || process.env.APPLICATION_KEY || ""
  const bucketId = process.env.B2_BUCKET_ID || process.env.B2_BUCKET || undefined
  const bucketName = process.env.B2_BUCKET_NAME || process.env.B2_BUCKET || process.env.BUCKET_NAME || undefined

  if (!keyId || !applicationKey) {
    throw new Error("Missing B2 credentials. Set B2_KEY_ID (or keyID) and B2_APPLICATION_KEY (or applicationKey).")
  }
  if (!bucketId && !bucketName) {
    throw new Error("Missing B2 bucket config. Set B2_BUCKET_ID or B2_BUCKET_NAME.")
  }
  return { keyId, applicationKey, bucketId, bucketName }
}

async function b2Authorize(): Promise<B2Auth> {
  if (cachedAuth && Date.now() < cachedAuth.expiresAt) {
    return cachedAuth.value
  }

  const { keyId, applicationKey } = requireB2Config()
  const basic = Buffer.from(`${keyId}:${applicationKey}`).toString("base64")
  const response = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
    headers: {
      Authorization: `Basic ${basic}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`B2 authorize failed (${response.status}): ${text.slice(0, 220)}`)
  }

  const json = (await response.json()) as B2Auth
  cachedAuth = {
    value: json,
    expiresAt: Date.now() + 45 * 60 * 1000,
  }
  return json
}

function parseB2StoragePath(storagePath: string): { bucketName: string; fileName: string } | null {
  if (!storagePath.startsWith("b2://")) return null
  const withoutScheme = storagePath.slice("b2://".length)
  const slashIndex = withoutScheme.indexOf("/")
  if (slashIndex <= 0 || slashIndex === withoutScheme.length - 1) return null
  const bucketName = withoutScheme.slice(0, slashIndex)
  const fileName = withoutScheme.slice(slashIndex + 1)
  return { bucketName, fileName }
}

async function resolveBucket(auth: B2Auth): Promise<{ bucketId: string; bucketName: string }> {
  const config = requireB2Config()
  if (config.bucketId && config.bucketName) {
    return { bucketId: config.bucketId, bucketName: config.bucketName }
  }

  const listResponse = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_buckets`, {
    method: "POST",
    headers: {
      Authorization: auth.authorizationToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      accountId: auth.accountId,
      bucketId: config.bucketId,
      bucketName: config.bucketName,
    }),
    cache: "no-store",
  })

  if (!listResponse.ok) {
    const text = await listResponse.text()
    throw new Error(`B2 bucket lookup failed (${listResponse.status}): ${text.slice(0, 220)}`)
  }

  const listJson = (await listResponse.json()) as {
    buckets: Array<{ bucketId: string; bucketName: string }>
  }
  if (!listJson.buckets?.length) {
    throw new Error("B2 bucket not found for provided bucket id/name.")
  }
  return listJson.buckets[0]
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-")
}

export async function uploadToB2(input: {
  buffer: Buffer
  mimeType: string
  originalName: string
  prefix?: string
}): Promise<{ storagePath: string; publicUrl?: string; fileId?: string; fileName?: string }> {
  const auth = await b2Authorize()
  const bucket = await resolveBucket(auth)

  const uploadUrlRes = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: "POST",
    headers: {
      Authorization: auth.authorizationToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bucketId: bucket.bucketId,
    }),
    cache: "no-store",
  })

  if (!uploadUrlRes.ok) {
    const text = await uploadUrlRes.text()
    throw new Error(`B2 get upload URL failed (${uploadUrlRes.status}): ${text.slice(0, 220)}`)
  }

  const uploadData = (await uploadUrlRes.json()) as {
    uploadUrl: string
    authorizationToken: string
  }

  const safeName = sanitizeFileName(input.originalName || "audio.webm")
  const objectKey = `${input.prefix || "audio-responses"}/${randomUUID()}-${safeName}`

  const uploadRes = await fetch(uploadData.uploadUrl, {
    method: "POST",
    headers: {
      Authorization: uploadData.authorizationToken,
      "X-Bz-File-Name": encodeURIComponent(objectKey),
      "Content-Type": input.mimeType || "application/octet-stream",
      "X-Bz-Content-Sha1": "do_not_verify",
    },
    body: Uint8Array.from(input.buffer),
    cache: "no-store",
  })

  if (!uploadRes.ok) {
    const text = await uploadRes.text()
    throw new Error(`B2 upload failed (${uploadRes.status}): ${text.slice(0, 300)}`)
  }

  const uploadJson = (await uploadRes.json().catch(() => null)) as
    | null
    | {
        fileId?: string
        fileName?: string
      }

  const storagePath = `b2://${bucket.bucketName}/${objectKey}`
  const publicUrl = `${auth.downloadUrl}/file/${bucket.bucketName}/${objectKey}`
  return { storagePath, publicUrl, fileId: uploadJson?.fileId, fileName: uploadJson?.fileName }
}

export async function downloadFromB2StoragePath(storagePath: string): Promise<Buffer | null> {
  const parsed = parseB2StoragePath(storagePath)
  if (!parsed) return null

  const auth = await b2Authorize()
  const downloadUrl = `${auth.downloadUrl}/file/${parsed.bucketName}/${parsed.fileName}`
  const response = await fetch(downloadUrl, {
    headers: {
      Authorization: auth.authorizationToken,
    },
    cache: "no-store",
  })
  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`B2 download failed (${response.status}): ${text.slice(0, 220)}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function deleteFromB2(input: { fileId: string; fileName: string }): Promise<void> {
  const auth = await b2Authorize()
  const res = await fetch(`${auth.apiUrl}/b2api/v2/b2_delete_file_version`, {
    method: "POST",
    headers: {
      Authorization: auth.authorizationToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileId: input.fileId,
      fileName: input.fileName,
    }),
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`B2 delete failed (${res.status}): ${text.slice(0, 220)}`)
  }
}

export function isB2Configured(): boolean {
  const keyId = process.env.B2_KEY_ID || process.env.keyID || process.env.KEY_ID
  const appKey = process.env.B2_APPLICATION_KEY || process.env.applicationKey || process.env.APPLICATION_KEY
  const bucket = process.env.B2_BUCKET_ID || process.env.B2_BUCKET_NAME || process.env.B2_BUCKET || process.env.BUCKET_NAME
  return Boolean(keyId && appKey && bucket)
}

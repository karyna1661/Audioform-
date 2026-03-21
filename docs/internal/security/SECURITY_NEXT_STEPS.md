# Security Next Steps

## What Is True Right Now

- Route-level hardening for survey ownership, response ownership, dashboard scoping, CSRF-style origin checks, and OAuth state validation is already in the codebase.
- The remaining material risk is the server-side use of `SUPABASE_SERVICE_ROLE_KEY`.
- In Supabase, the `service_role` key bypasses Row Level Security. RLS is still important, but it does not protect you if that key leaks.

## Priority Order

1. Rotate all sensitive credentials.
2. Enable RLS on every table that should never be publicly queryable.
3. Audit every place the server uses the service-role key.
4. Decide whether to keep app-layer authorization only, or migrate to database-enforced tenancy.

## Rotation Runbook

### Supabase

- Rotate `SUPABASE_SERVICE_ROLE_KEY` in Supabase Dashboard.
- Update local `.env` and deployment secrets immediately after rotation.
- Invalidate any logs, previews, or screenshots that may contain the old key.
- Confirm no client bundle references the key.

### Session Secret

- Replace `AUTH_SESSION_SECRET` with a fresh 32-byte random value.
- Example generated value:

```text
4c95ebe7b816bd902c34556d652ca361744441b8be35cb58c9649c645fb3ec85
```

- Rotating this will log out all active sessions.

### Google OAuth

- Rotate `GOOGLE_CLIENT_SECRET`.
- Verify the redirect URI still matches `/api/auth/google/callback`.
- Re-test login after rotation.

### SMTP

- Rotate `SMTP_PASSWORD`.
- If possible, create a dedicated SMTP credential scoped only to transactional mail.

### Backblaze B2

- Rotate `B2_APPLICATION_KEY`.
- Confirm the bucket is private.
- Confirm downloads still go only through the authenticated API path.

## RLS Guidance

Enable RLS because it protects against:

- accidental anon-key exposure
- future client-side Supabase usage
- misconfigured public endpoints
- direct SQL access by non-service roles

Do not assume RLS protects against:

- leaked `SUPABASE_SERVICE_ROLE_KEY`
- server code that intentionally uses service-role access

## Architectural Reality

This app currently uses custom session cookies, not Supabase Auth JWTs, so `auth.uid()`-based RLS will not automatically line up with your app users.

If you want database-enforced tenant isolation for normal application traffic, you need one of these:

- migrate auth/session handling to Supabase Auth and query with end-user tokens
- proxy all data access through narrowly scoped RPCs or backend methods and keep service-role use minimal
- move to a pattern where per-request DB identity is set explicitly instead of using a global bypass key

## Immediate Verification

- Confirm all server-only secrets exist only in server runtime and deploy config.
- Confirm `NEXT_PUBLIC_*` values contain no credentials.
- Confirm old credentials fail after rotation.
- Re-test login, signup, survey CRUD, response moderation, and audio playback.

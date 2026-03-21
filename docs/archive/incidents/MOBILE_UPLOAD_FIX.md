# Mobile Response Upload Fix

## Problem
Mobile voice responses were failing to save with a "Failed to fetch" or storage error, even though B2 credentials were configured in the `.env` file.

## Root Cause
The `createStoredResponse` function in `lib/server/response-store.ts` was checking `isB2Configured()` first and attempting B2 upload even in development mode. When B2 authentication failed (due to network issues, incorrect credentials, or API problems), it would throw an error instead of falling back to local storage.

## Solution Applied

### 1. **Development Mode Priority** (`lib/server/response-store.ts`)
Changed the logic to:
- **Development**: Always use local file storage (uploads/audio-responses/)
- **Production**: Try B2 first, but fall back to local storage if B2 fails

```typescript
// Always use local storage in development, B2 only in production
if (process.env.NODE_ENV === "production" && isB2Configured()) {
  try {
    // Try B2 upload
    const uploaded = await uploadToB2({...})
    storagePath = uploaded.storagePath
    publicUrl = uploaded.publicUrl
  } catch (b2Error) {
    console.error("B2 upload failed, falling back to local storage:", b2Error)
    // Fallback to local storage even in production if B2 fails
    const fullPath = path.join(UPLOAD_DIR, fileName)
    await writeFile(fullPath, buffer)
    storagePath = fullPath
  }
} else {
  // Development mode - use local storage
  const fullPath = path.join(UPLOAD_DIR, fileName)
  await writeFile(fullPath, buffer)
  storagePath = fullPath
}
```

### 2. **Better Error Logging** (`app/api/responses/route.ts`)
Added detailed logging to help debug storage issues:

```typescript
console.log("Creating response storage:", {
  questionId: parsed.data.questionId,
  surveyId: parsed.data.surveyId,
  userId: session?.sub || "anonymous",
  audioFileSize: audioFile.size,
  audioFileType: audioFile.type,
  nodeEnv: process.env.NODE_ENV,
  b2Configured: process.env.B2_KEY_ID ? true : false,
})

console.log("Response stored successfully:", {
  id: stored.id,
  storagePath: stored.storagePath,
  publicUrl: stored.publicUrl,
})
```

### 3. **Improved Error Messages**
More specific error responses for different failure scenarios:
- Storage configuration issues → 503 with retry suggestion
- Database connection failures → 503 with retry suggestion  
- Other errors → Return the actual error message

## Testing

Run the verification script:
```bash
node scripts/test-mobile-upload.js
```

Expected output:
```
✓ B2_KEY_ID: ✓
✓ B2_APPLICATION_KEY: ✓
✓ B2_BUCKET: ✓
✓ Upload directory exists
✓ API route exists
✓ Development mode logic: ✓
✓ B2 fallback logic: ✓
```

## How to Verify It's Working

1. **Restart your dev server:**
   ```bash
   npm run dev
   ```

2. **Submit a voice response from mobile:**
   - Open the survey on your mobile device
   - Record and submit a voice response
   - You should see success message

3. **Check the dev logs:**
   Look for these messages:
   ```
   Creating response storage: { ... }
   Response stored successfully: { ... }
   ```

4. **Verify files are saved:**
   Check the directory: `c:\Users\hp\Downloads\Audioform\uploads\audio-responses\`
   
   You should see `.webm` files with UUID names like:
   ```
   a1b2c3d4-e5f6-7890-abcd-ef1234567890.webm
   ```

## Production Deployment

When deployed to production (Railway + Vercel):
- The system will attempt B2 upload first
- If B2 fails, it will automatically fall back to local storage
- Local storage in production means Railway's ephemeral filesystem
- For persistent storage in production, ensure B2 credentials are correct

## Files Modified

1. `lib/server/response-store.ts` - Storage logic with fallback
2. `app/api/responses/route.ts` - Better error handling and logging
3. `scripts/test-mobile-upload.js` - New verification script

## Next Steps if Still Not Working

1. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

2. **Check CORS headers** (if testing from mobile on different domain):
   The API already includes proper CORS headers for cross-origin requests

3. **Test with curl:**
   ```bash
   curl -X POST http://localhost:3000/api/responses \
     -F "audio=@test.webm" \
     -F "questionId=q1" \
     -F "surveyId=test-survey"
   ```

4. **Check Supabase connection:**
   The metadata is stored in Supabase. Verify your Supabase service is running.

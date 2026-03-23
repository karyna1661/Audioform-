# 🎯 Audioform User Flow Walkthrough

## Complete User Journey: From Discovery to Decision

This document walks you through exactly how users interact with your Audioform build, step-by-step.

---

## Table of Contents

1. [User Personas](#user-personas)
2. [Discovery & First Visit](#discovery--first-visit)
3. [Survey Creation Flow (Builder)](#survey-creation-flow-builder)
4. [Survey Taking Flow (Respondent)](#survey-taking-flow-respondent)
5. [Response Review Flow (Builder)](#response-review-flow-builder)
6. [Embed Widget Flow](#embed-widget-flow)
7. [Mobile Experience](#mobile-experience)

---

## 1. User Personas

### Primary Users

#### **Builder** (You/Creator)
- **Goal**: Get decision-ready feedback from users
- **Needs**: Quick survey creation, clear insights, actionable data
- **Pain Point**: Traditional surveys give shallow, opinion-based responses

#### **Respondent** (Your User/Customer)
- **Goal**: Share their experience easily
- **Needs**: Simple interface, voice recording, <5 min completion
- **Pain Point**: Long text forms, confusing questions

---

## 2. Discovery & First Visit

### Step 1: Landing on Homepage
```
URL: https://your-railway-url.com
User: Potential Builder
```

**What they see:**
- Value proposition: "Hear clear signal, decide faster"
- Example audio responses (social proof)
- Call-to-action: "Create your first survey"

**Action:** Click "Get Started" → Redirects to `/login`

---

### Step 2: Authentication
```
URL: /login
User: New Builder
```

**Flow:**
1. User clicks "Sign in with Google"
2. Google OAuth popup opens
3. User grants permission
4. Redirects to `/api/auth/google/callback`
5. Server creates session, stores in database
6. Redirects to `/admin/dashboard/v4` ✅

**Behind the scenes:**
```typescript
// Secure session creation
const session = await createSession({
  userId: googleUser.id,
  email: googleUser.email,
  expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
})
```

---

## 3. Survey Creation Flow (Builder)

### Step 3: Dashboard Overview
```
URL: /admin/dashboard/v4
User: Authenticated Builder
```

**What they see:**
1. **First-run checklist** (3 items):
   - ✅ Create your first survey
   - ⬜ Publish one survey
   - ⬜ Collect one voice response

2. **Quick Actions**:
   - Moderate queue (response-level)
   - Configure creator notifications
   - Open respondent flow preview

3. **Decision KPIs**:
   - Published rate: 0%
   - Unique respondents: 0
   - TTFR (Time to First Response): Pending

4. **Survey Stack** (empty state):
   - "No surveys yet"
   - CTA: "Create first survey"

**Action:** Click "Create new survey" button

---

### Step 4: Survey Builder Interface
```
URL: /admin/questionnaires/v1
User: Builder creating survey
```

#### Phase 1: Define Decision Context (Trigger)

**Form Fields:**
1. **Survey Title**: "Activation Decision Pulse"

#### Phase 2: Build Question Flow (Action)

**Question Intelligence System Opens:**

**Option A: Use Pre-built Template** (Recommended)
```
Templates available:
1. PMF Discovery (3 questions)
2. User Feedback (3 questions)
3. Feature Validation (3 questions)
4. Onboarding Insights (3 questions)
5. Experience → Friction → Desire (1 question) ⭐
```

**User clicks "Experience → Friction → Desire":**
```javascript
// Applied template:
[
  "Tell me about the last time you tried to solve this problem. What was frustrating about it, and what do you wish existed instead?"
]
```

**Quality Score appears:** 85% ✅ (Good for voice)

---

**Option B: Browse by Category** (Custom)

Categories:
- 🎯 User Experience
- 💡 Product Feedback
- ✨ Feature Ideas
- 🔍 Market Validation
- ❤️ Customer Satisfaction
- 🌟 Open Insight

**User expands "User Experience":**
```
Questions available:
- "What confused you the most when you first used this product?"
- "At what moment did you almost stop using it?"
- "What felt surprisingly easy or delightful?"
- "Walk me through your experience. What part felt confusing?"
```

**User clicks to add:**
```javascript
Questions array:
[
  "What confused you the most when you first used this product?",
  "At what moment did you almost stop using it?"
]
```

**Quality Coach shows scores:**
- Question 1: 92% ✅
- Question 2: 78% ⚠️ (Needs improvement)

**User improves Question 2:**
- Clicks "Add timeframe" button
- Auto-suggests: "In the last week, at what moment did you almost stop using it?"
- New score: 88% ✅

---

#### Phase 3: Preview & Publish (Reward)

**Preview Panel Shows:**
```
How builders will hear this signal:
"What confused you the most when you first used this product?"

Response quality targets:
✓ 1 concrete example
✓ 1 friction moment  
✓ 1 clear suggestion
```

**Launch Console:**
- Builder onboarding checklist: 2/3 complete
- Readiness index: 85% (Good!)

**Actions Available:**
1. **Save Draft** → Saves to database, status: "draft"
2. **Publish** → Makes public, status: "published", generates shareable link

**User clicks "Publish":**
```typescript
// Behind the scenes:
await publishSurvey({
  surveyId: "creator-activation-decision-puls-mmt80utt-fq9y3",
  status: "published",
  publishedAt: new Date().toISOString()
})

// Track event
trackEvent("survey_published", {
  survey_id: surveyId,
  question_count: 2
})
```

**Success!** Survey published. Link copied to clipboard:
```
https://your-railway-url.com/questionnaire/v1?surveyId=creator-activation-decision-puls-mmt80utt-fq9y3
```

---

## 4. Survey Taking Flow (Respondent)

### Step 5: Respondent Opens Survey
```
URL: /questionnaire/v1?surveyId=creator-activation-decision-puls-mmt80utt-fq9y3
User: Respondent (no login required)
```

**What they see:**
- Clean, minimal interface
- Survey title: "Activation Decision Pulse"
- Question 1 of 2 displayed prominently
- Large microphone button
- Progress indicator

---

### Step 6: Voice Recording

**Question Display:**
```
"What confused you the most when you first used this product?"

📝 Optional text hint: "Think about your first 5 minutes of using it"
```

**Recording Flow:**

1. **Click Microphone Button** 🔴
   ```
   Browser asks: "Allow access to microphone?"
   User clicks: "Allow"
   ```

2. **Recording Starts** (animated waveform)
   ```
   Timer: 00:03
   UI: "Listening... tap to stop"
   ```

3. **User Taps Stop** at 00:23
   ```
   Audio blob created (23 seconds)
   Preview plays automatically
   ```

4. **Review & Submit**
   ```
   [▶️ Replay]  [🗑️ Retake]  [✅ Submit]
   ```

5. **Submit Response**
   ```typescript
   // Behind the scenes:
   const formData = new FormData()
   formData.append('audio', audioBlob)
   formData.append('surveyId', surveyId)
   
   fetch('/api/responses', { method: 'POST', body: formData })
   ```

---

### Step 7: Transcription & Storage

**Server Processing:**
```typescript
// /api/transcribe/route.ts
1. Receive audio file (WebM format)
2. Upload to Backblaze B2 (secure storage)
3. Send to OpenAI Whisper API
4. Get transcription text back
5. Save to Supabase database
6. Return success to client
```

**Response Stored:**
```json
{
  "id": "resp_abc123",
  "surveyId": "creator-activation-decision-puls-mmt80utt-fq9y3",
  "userId": "anonymous_user_xyz",
  "audioUrl": "https://b2-backblaze.com/bucket/audio_abc123.webm",
  "transcription": "When I first opened the dashboard, I was overwhelmed by all the charts...",
  "duration": 23,
  "createdAt": "2026-03-16T18:45:32Z"
}
```

---

### Step 8: Thank You Screen
```
URL: /thank-you
User: Respondent
```

**What they see:**
```
"Thank you for sharing your voice! 🎉"
"Your response has been recorded."

[Optional: Share with a friend] button
```

**Action:** Close tab or share link

---

## 5. Response Review Flow (Builder)

### Step 9: Notification Received
```
Email arrives in Builder's inbox:
Subject: "New voice response received"

Body:
"You have a new response for 'Activation Decision Pulse'
Duration: 23 seconds
Transcription preview: 'When I first opened the dashboard...'

[View Response] button
```

**Builder clicks button** → `/admin/responses`

---

### Step 10: Moderation Queue
```
URL: /admin/responses
User: Builder reviewing responses
```

**What they see:**
- List of all responses (newest first)
- Each card shows:
  - Duration badge: "0:23"
  - Transcription preview (first 50 chars)
  - Status: New / Reviewed / Bookmarked
  - Survey name

**Filters Available:**
- By survey
- By date range
- By duration
- By status

**Builder clicks on response card**

---

### Step 11: Response Detail View

**Split Screen Layout:**

**Left Panel (Audio):**
```
🎵 Audio Player
[▶️ Play] [⏸️ Pause] [⏪ -10s] [⏩ +10s]
Waveform visualization
Timestamp: 0:00 / 0:23
```

**Right Panel (Transcript):**
```
Full transcription:
"When I first opened the dashboard, I was 
overwhelmed by all the charts. I couldn't 
find where to create my first survey. It 
took me about 2 minutes to realize the 
button was in the top right corner."

[📋 Copy transcript]
```

**Actions:**
- Bookmark ⭐ (save for later review)
- Mark as reviewed ✓
- Delete 🗑️ (if spam/inappropriate)
- Export 📤 (download audio + transcript)

---

### Step 12: Extract Decision Signal

**Builder listens to 5-10 responses**, then identifies patterns:

**Example Insight:**
```
Pattern found in 3/5 responses:
"Couldn't find the create survey button"

Decision: Move button to center of dashboard
Confidence: High (multiple users reported same issue)
```

**Builder takes action:**
- Updates dashboard design
- Republishes survey to validate fix
- Compares before/after responses

---

## 6. Embed Widget Flow

### Step 13: Embed on External Site

**Builder copies embed code:**
```html
<iframe 
  src="https://your-railway-url.com/embed/by-creator/creator123/survey456" 
  width="100%" 
  height="760" 
  style="border:0;border-radius:16px;" 
  title="Audioform survey">
</iframe>
```

**Pastes into their website HTML**

---

### Step 14: Website Visitor Interaction

**Visitor on builder's website:**
1. Sees embedded widget
2. Clicks "Share feedback"
3. Records voice response inline
4. Submits without leaving website

**Response goes to same Audioform dashboard** ✅

---

## 7. Mobile Experience

### Responsive Design Throughout

**Mobile-Specific Optimizations:**

#### Dashboard (`/admin/dashboard/v4`)
- Single column layout
- Hamburger menu
- Touch-friendly buttons
- Swipe gestures on response cards

#### Survey Builder (`/admin/questionnaires/v1`)
- Vertical question cards
- Easy drag-and-drop (touch-enabled)
- Full-screen question editor
- Mobile keyboard optimizations

#### Respondent Flow (`/questionnaire/v1`)
- Large microphone button (thumb-friendly)
- Optimized for one-handed use
- Minimal scrolling required
- Native-feel recording UI

---

## Complete User Journey Map

```
Day 1: Builder Discovery
├─ 10:00 AM: Lands on homepage
├─ 10:05 AM: Signs in with Google
├─ 10:10 AM: Creates first survey (PMF Discovery template)
├─ 10:15 AM: Publishes survey
└─ 10:20 AM: Shares link with 5 beta users

Day 1: Respondent Feedback
├─ 2:00 PM: User A receives link, records 45s response
├─ 2:15 PM: User B records 32s response
├─ 2:30 PM: User C records 1:12 response
└─ 3:00 PM: Builder gets email notification

Day 2: Builder Analysis
├─ 9:00 AM: Reviews 3 responses in moderation queue
├─ 9:30 AM: Identifies pattern (onboarding confusion)
├─ 10:00 AM: Decides to simplify onboarding flow
└─ 10:30 AM: Creates follow-up survey to validate change

Day 3: Iteration
├─ Ships simplified onboarding
├─ Sends new survey to same users
└─ Compares responses: "Much clearer now!" ✅
```

---

## Key Metrics Tracked

### Builder Behavior
- Surveys created
- Surveys published
- Time to first response
- Responses per survey
- Average response duration
- Bookmark rate (signal quality indicator)

### Respondent Behavior
- Completion rate
- Drop-off point
- Average recording length
- Retake rate (quality control)

### System Health
- Transcription accuracy
- API response times
- Storage usage (B2)
- Cost per response

---

## Technical Flow Summary

```
Frontend (Next.js 16)
├─ React 19 components
├─ Tailwind CSS styling
├─ Motion animations
└─ Client-side state management

Backend (Serverless)
├─ Next.js API Routes
├─ Supabase (PostgreSQL)
├─ Backblaze B2 (file storage)
├─ OpenAI Whisper (transcription)
└─ SMTP (email notifications)

Authentication
├─ Google OAuth (primary)
├─ Privy (optional Web3)
└─ Session cookies (encrypted)

Deployment
└─ Railway (containerized)
   ├─ Auto-scaling
   ├─ HTTPS/TLS
   └─ Environment isolation
```

---

## Next Steps for Users

**After First Success:**
1. Create multiple surveys for different features
2. Embed widget on website/app
3. Set up regular feedback cadence (weekly/bi-weekly)
4. Build response library over time
5. Export insights for team reviews

**Advanced Usage:**
- A/B test different question templates
- Segment responses by user type
- Track sentiment trends over time
- Integrate with product analytics tools

---

**Last Updated**: March 16, 2026
**Version**: 1.0

This walkthrough reflects the actual deployed build on Railway.

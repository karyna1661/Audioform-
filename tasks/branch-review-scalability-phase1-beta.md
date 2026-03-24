# Branch Review Checklist: `feat/scalability-phase1-beta`

This checklist covers all the work completed on the `feat/scalability-phase1-beta` branch. Use this to verify the changes, especially the mobile UX and extractor pipeline, before merging into `main`.

## 1. Mobile Admin UI Simplification 📱
*Test on a mobile device or responsive simulator.*

- [ ] **Dashboard (`/admin/dashboard/v4`)**
  - [ ] **Survey Stack focus:** The Survey Stack is the primary focus above the fold on mobile.
  - [ ] **Compact KPIs:** The "Decision KPIs" block is now a condensed 3-column grid instead of large stacked cards.
  - [ ] **First-run checklist:** Tighter spacing and smaller icons on mobile.
  - [ ] **Cleaned up Sidebars:** Desktop-heavy elements (like the full Insight Extractor panel) are hidden on mobile. Mobile gets a lighter, dedicated "Today" feed and a compact Extractor summary.
  - [ ] **Action Buttons:** Share/Copy buttons take up full width on mobile for easier tapping.

- [ ] **Response Inbox (`/admin/responses`)**
  - [ ] **Card Density:** Response cards have tighter padding (`p-2 sm:p-4`) on mobile.
  - [ ] **Badges:** Metadata badges (duration, high signal, etc.) are smaller and hide text labels (showing only icons) on small screens to save space.
  - [ ] **Action Buttons:** Play, Flag, Bookmark, and Star buttons are smaller (`h-7/h-8`) and grouped more tightly on mobile.
  - [ ] **Insights:** AI insight summaries are truncated with `line-clamp-2` and have "More/Less" toggles.

- [ ] **Survey Builder (`/admin/questionnaires/v1`)**
  - [ ] **Emoji Removal:** Replaced the mobile "Templates vs Categories" toggle emojis with proper icons (`LayoutTemplate`, `Library`).
  - [ ] **Simplified Steps:** Reduced redundant text in the mobile step header ("Step 1 of 5..." instead of "Mobile flow...").
  - [ ] **Less Clutter:** Hid secondary descriptive text/guidance that took up too much vertical space on phones.

## 2. Product Role & Auth Fixes 🔐

- [ ] **Creator Workspace Access:** Public signups now correctly default to `role = "admin"`. New users are no longer blocked from accessing the creator workspace.
- [ ] **Mobile Login Loop:** Fixed the bug where non-admin sessions would silently bounce back to the homepage instead of showing an explicit error and clearing the session.

## 3. Insight Extractor Pipeline & Backend 🧠

- [ ] **Transcription Persistence:** Transcripts now save to the `response_transcripts` table.
- [ ] **Insight Persistence:** First-pass AI heuristics (themes, signal score, quotes) now save to the `insight_results` table.
- [ ] **Inbox Visibility:** Inbox cards surface transcript status, insight summaries, primary themes, and signal scores (out of 100).
- [ ] **Dashboard Metrics:** The dashboard calculates top themes and shows extraction throughput/failure metrics.
- [ ] **Deepgram Support:** Integrated Deepgram as a reliable, fast transcription provider alongside OpenAI.
- [ ] **Retry Flow:** Failed extractions surface their error messages and offer a "Retry extraction" button directly on the response card.

## 4. Cache-Busting & Link Sharing 🔗

- [ ] **WhatsApp/Telegram Cache Fix:** Clicking "Copy survey link" from the Dashboard or the Builder now appends a version parameter (e.g., `?v=1711234567890`) to the URL. This forces messaging apps to fetch fresh OpenGraph metadata (image and description) instead of using stale cached versions.

---

## Instructions for Review
1. Deploy this branch (`feat/scalability-phase1-beta`) to a staging environment or preview URL on Railway/Vercel.
2. Open the preview URL on your phone.
3. Tap through the Dashboard, Inbox, and Survey Builder.
4. If the mobile density feels right and the extractor data is loading correctly, this branch is ready to merge into `main`.
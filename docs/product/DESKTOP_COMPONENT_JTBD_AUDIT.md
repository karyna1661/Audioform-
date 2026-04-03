# Audioform Desktop Component And Button Audit

## Scope

This report audits the **currently rendered desktop product surfaces** in the main app and maps each major component and interactive control to:

- its **job to be done**
- its **UX role**
- its **place in the end-to-end product loop**
- the **risk if it is unclear, weak, or missing**

Audited desktop routes:

- `/`
- `/login`
- `/signup`
- `/forgot-password`
- `/admin/dashboard/v4`
- `/admin/questionnaires/v1`
- `/admin/responses`
- `/admin/notifications`
- `/admin/settings`
- `/admin/profile`
- `/admin/help`
- `/share/survey/[surveyId]`
- `/questionnaire/v1`
- `/questionnaire/thank-you`

Secondary or internal desktop routes reviewed separately:

- `/redesign`
- `/visual-command-center`
- `/local/x-signal`
- `/local/content-scheduler`

Not included in the button inventory:

- dormant UI primitives in `components/ui/*` that are **not currently rendered in the audited routes**
- mobile-only step controls unless they also affect desktop structure

## Executive Summary

Audioform's desktop product is organized around one strong loop:

1. attract a builder
2. create a survey
3. distribute it
4. collect voice responses
5. replay and classify signal
6. decide what to do next

The strongest parts of the desktop experience are:

- the **homepage CTA hierarchy**
- the **survey builder's coaching and quality gates**
- the **response inbox's fast triage controls**
- the **dashboard's distribution utilities** like copy link, embed code, and QR

The weakest parts are:

- desktop navigation is **fragmented** because the repo contains `AdminHeader` and `AdminSidebar`, but the live admin pages mostly render without that shell
- some desktop pages are **placeholders** (`/admin/settings`, `/admin/profile`, `/admin/help`, `/forgot-password`), so the buttons technically work as navigation but do not complete the user job
- the response inbox relies heavily on **icon-only expert controls**, which is efficient for repeat use but weaker for first-time comprehension
- there is a noticeable split between the polished main product and **experimental/internal routes** like `/visual-command-center`

## System-Level JTBD Map

| Product stage | User | Core job to be done | Primary surfaces |
| --- | --- | --- | --- |
| Discovery | Builder | Understand why voice feedback is better than forms | `/` |
| Access | Builder | Get into workspace with minimal friction | `/login`, `/signup`, `/forgot-password` |
| Authoring | Builder | Build a short, high-signal survey | `/admin/questionnaires/v1` |
| Distribution | Builder | Share survey anywhere quickly | `/admin/dashboard/v4`, `/share/survey/[surveyId]` |
| Response capture | Respondent | Record a clear answer with minimal effort | `/questionnaire/v1` |
| Completion | Respondent | Receive closure and optional next action | `/questionnaire/thank-you` |
| Review and triage | Builder | Replay, classify, and surface decision-worthy signal | `/admin/responses` |
| Notification ops | Builder | Control when and how alerts are sent | `/admin/notifications` |

## Desktop Surface Audit

### 1. Homepage: `/`

**Primary desktop job:** convince a prospective builder that Audioform helps them gather more decision-ready feedback than text forms.

| Component | JTBD | Role on page | Notes |
| --- | --- | --- | --- |
| Brand header | Orient visitor and establish product identity | Global orientation | Supports trust and lightweight wayfinding |
| Hero headline and typed subcopy | Explain product value fast | Core positioning | The page works as a narrative framing device, not just a CTA wall |
| Product illustration panel | Make the intangible voice-feedback concept feel concrete | Belief-building proof artifact | Helps visitors picture the product loop |
| Two process chips below hero | Reduce abstraction and show sequence | Mental model reinforcement | Translates promise into a simple operating model |
| Three feature cards | Explain how Audioform differs from generic survey tools | Value decomposition | Supports the visitor who needs more than the hero |

**Desktop button and link inventory**

| Control | JTBD | UX role | Priority | Risk if weak |
| --- | --- | --- | --- | --- |
| `Log in` | Re-enter existing workspace | Secondary CTA | Secondary | Returning users may detour or bounce |
| `Start free` | Create a builder account | Primary acquisition CTA | Primary | If this weakens, the homepage loses conversion direction |
| `Create your survey` | Move authenticated or new users into authoring flow | Primary product CTA | Primary | This is the strongest “start value creation” button |
| `Preview respondent flow` | Let users feel the product before committing | Confidence-building CTA | Secondary | Important for lowering uncertainty before signup |

**Role verdict**

- Strong top-of-funnel page.
- The page does a good job separating **builder conversion** from **respondent preview**.
- The desktop CTA architecture is clear: create > preview > log in.

### 2. Login: `/login`

**Primary desktop job:** let an existing builder regain access quickly and with confidence.

| Component | JTBD | Role on page | Notes |
| --- | --- | --- | --- |
| Left-side value panel | Reassure user they are entering the right product | Context and trust | Prevents auth page from feeling generic |
| Feature rows | Remind the user why the workspace matters | Reinforcement | Useful for return motivation |
| Need access card | Bridge login and signup | Cross-flow routing | Keeps the auth split coherent |
| Email/password form | Enable access | Main task area | Clear and direct |
| Resume your loop card | Re-anchor next steps after login | Progress framing | Good for dormant users |

**Desktop button and link inventory**

| Control | JTBD | UX role | Priority | Risk if weak |
| --- | --- | --- | --- | --- |
| `Home` | Leave auth flow safely | Escape hatch | Low | Useful but non-core |
| `Forgot password?` | Recover access | Recovery path | High | Currently points to a page that does not complete the task |
| Password visibility toggle | Reduce entry errors | Form utility | Medium | Good support control |
| `Enter workspace` | Complete sign-in | Primary submit CTA | Primary | Core success action |
| `Create one` | Route non-users to signup | Cross-flow CTA | Secondary | Prevents dead ends |

**Role verdict**

- The login page is strong structurally.
- The weak point is downstream: `Forgot password?` leads to a placeholder recovery page, so the real job is not fulfilled.

### 3. Signup: `/signup`

**Primary desktop job:** turn motivated visitors into creators and set expectation for first value.

| Component | JTBD | Role on page | Notes |
| --- | --- | --- | --- |
| Left-side value stack | Sell the builder outcome | Conversion support | Frames signup as the start of a workflow, not account creation for its own sake |
| Three info tiles | Reduce uncertainty | Trust and outcome proof | Each tile maps to product promise |
| Signup form | Create creator account | Main task area | Minimal fields keep friction low |
| What happens next card | Clarify post-signup flow | Commitment support | Good transition into builder workflow |

**Desktop button and link inventory**

| Control | JTBD | UX role | Priority | Risk if weak |
| --- | --- | --- | --- | --- |
| `Home` | Exit to marketing site | Escape hatch | Low | Useful but not central |
| Password visibility toggle | Confirm password entry | Form utility | Medium | Prevents mistakes |
| `Create workspace` | Start builder account and workspace | Primary CTA | Primary | Main acquisition action |
| `Log in` | Route existing user away from signup | Cross-flow CTA | Secondary | Prevents duplicate-account confusion |

**Role verdict**

- Clear conversion page.
- Good job connecting signup to the first survey outcome.

### 4. Forgot Password: `/forgot-password`

**Primary desktop job:** restore account access.

| Component | JTBD | Role on page | Notes |
| --- | --- | --- | --- |
| Recovery explanation | Tell user what is happening | State clarification | Honest, but incomplete |
| Support email card | Provide fallback path | Manual recovery workaround | Temporary substitute for actual reset flow |

**Desktop button inventory**

| Control | JTBD | UX role | Priority | Risk if weak |
| --- | --- | --- | --- | --- |
| `Back to login` | Return to auth page | Escape/back action | Medium | Works, but does not solve recovery |

**Role verdict**

- This page is a blocker from a product completeness perspective.
- It contains a button, but it does not complete the user’s intended job.

### 5. Builder Dashboard: `/admin/dashboard/v4`

**Primary desktop job:** give the creator a single command surface to publish, distribute, and evaluate survey performance.

| Component | JTBD | Role on page | Notes |
| --- | --- | --- | --- |
| Header block | Orient builder and summarize current workspace | Surface framing | Sets tone for a decision-oriented admin home |
| First-run checklist | Guide early activation | Onboarding accelerator | Strong JTBD support for new builders |
| Quick Actions panel | Jump directly to adjacent jobs | Navigation accelerator | Good for experienced repeat use |
| Decision KPI panel | Show whether the loop is working | Performance snapshot | Supports operator mindset |
| Survey Stack | Central operating table for each survey | Core workspace module | The most important dashboard component |
| First Response Spotlight | Encourage replay behavior | Guided analysis | Turns data into next recommended action |
| Insight Extractor panel | Monitor transcript/insight processing health | System health and synthesis layer | Useful for advanced review |
| Today activity feed | Show recent events | Recency/context feed | Keeps dashboard “alive” |
| Delete confirmation dialog | Protect destructive action | Safety layer | Correct use of destructive confirmation |
| QR handoff dialog | Support real-world distribution | Utility overlay | Good fit for events, demos, in-person use |

**Desktop button and action inventory**

| Control | JTBD | UX role | Priority | Role note |
| --- | --- | --- | --- | --- |
| `Sign out` | Leave workspace securely | Utility action | Medium | Needed, not value-creating |
| `Create new survey` | Start authoring a new survey | Primary CTA | Primary | Main builder action from dashboard |
| `Moderate queue (response-level)` | Jump into response triage | Navigation CTA | High | Connects ops to signal review |
| `Configure creator notifications` | Manage alerts | Navigation CTA | Medium | Ops support |
| `Open respondent flow preview` | Experience survey like a respondent | Preview CTA | High | Good empathy/testing button |
| `Replay first response` | Inspect time-to-first-signal outcome | Guided next-step CTA | High | Good “listen first” action |
| Survey row click | Open survey for edit or review | Row-level primary action | High | Excellent multi-function row behavior |
| `Copy survey link` | Distribute published survey | Utility distribution action | High | Essential distribution control |
| `Copy iframe code` | Embed survey externally | Utility distribution action | Medium | Important for integration use cases |
| `QR code` | Share survey in offline or live settings | Utility distribution action | Medium | Helpful extension of link-sharing |
| `Copy draft link` | Return to draft later | Utility action | Medium | Useful for creator continuity |
| `Delete` | Remove survey | Destructive action | High | Properly isolated and confirmed |
| `Cancel` in delete dialog | Abort destructive action | Safety action | High | Necessary |
| `Delete permanently` | Confirm destructive removal | Destructive confirmation | High | Correctly separate from simple delete click |
| `Copy direct link` in QR dialog | Copy live share URL | Utility action | Medium | Complements QR scan |
| `Download QR code` | Save QR asset | Utility action | Medium | Extends distribution portability |

**Role verdict**

- This is the best expression of the builder operating model.
- The page does three jobs at once: activation, distribution, and signal monitoring.
- The dashboard is slightly overloaded, but the hierarchy is still understandable.

### 6. Survey Builder: `/admin/questionnaires/v1`

**Primary desktop job:** help the creator build a short voice survey that is specific enough to generate replayable signal.

| Component | JTBD | Role on page | Notes |
| --- | --- | --- | --- |
| Header and working rule marquee | Set editorial standard | Strategic framing | Keeps the product opinionated |
| Builder Brief | Define what the survey is for | Context authoring | Makes title act as a decision brief |
| Prompt Studio: template shelf | Accelerate good survey starts | Guided authoring | Strong JTBD support for inexperienced builders |
| Prompt Studio: category bank | Expand or refine prompt set | Prompt discovery | Adds controlled flexibility |
| Voice interview principles | Teach best practice in context | Embedded education | Strong product coaching |
| Signal path prompt list | Sequence prompts intentionally | Structure editor | Turns prompt collection into interview flow |
| Prompt editor | Refine wording | Main editing workspace | Central authoring tool |
| Quality coach | Improve prompt quality before publish | Guardrail and teaching tool | One of the strongest components in the app |
| Responder preview | Simulate respondent experience | Preview and empathy tool | Helps creators hear how prompts land |
| Release desk | Gate publishing and sharing | Final readiness checkpoint | Strong release-oriented mental model |

**Desktop button and action inventory**

| Control | JTBD | UX role | Priority | Role note |
| --- | --- | --- | --- | --- |
| `Back to dashboard` | Exit builder safely | Back navigation | Medium | Useful orientation control |
| `New draft` | Clear current working state and start over | Workspace reset | Medium | Good for fresh starts |
| `Save draft` | Preserve progress | Persistence CTA | High | Important creator safety action |
| Template cards | Apply prebuilt survey structure | Accelerated authoring action | High | Very strong onboarding aid |
| Category disclosure rows | Browse prompt bank | Expansion control | Medium | Supports exploration |
| Individual question buttons inside categories | Add a specific question | Content insertion action | High | Lets creators compose surveys incrementally |
| `Undo change` | Reverse accidental edits or reorder | Recovery action | High | Crucial for experimentation confidence |
| Prompt tiles | Select prompt to edit | Selection control | High | Supports focused refinement |
| `Add prompt` | Add another question to sequence | Authoring action | High | Extends the interview |
| `Delete prompt` | Remove selected question | Destructive edit action | High | Necessary sequence cleanup |
| `Add timeframe` | Make prompt more specific | Quality-improvement micro-action | Medium | Strong opinionated nudge |
| `Convert to open question` | Remove yes/no framing | Quality-improvement micro-action | Medium | Helpful teaching-through-editing |
| `Add depth cue` | Encourage detailed answers | Quality-improvement micro-action | Medium | Good specificity booster |
| `Publish survey` | Make survey live | Primary release CTA | Primary | Most important action in builder |
| `Copy draft link` | Reopen same draft later | Utility action | Medium | Continuity support |
| `Copy survey link` | Distribute published survey | Utility distribution action | High | Primary post-publish output |
| `Copy embed link` | Embed survey externally | Utility distribution action | Medium | Good for web distribution |
| `Copy iframe code` | Install survey on other site | Utility distribution action | Medium | Integration support |
| `Copy script code` | Use script embed variant | Utility distribution action | Medium | More flexible distribution |

**Role verdict**

- This is the strongest page in the product from a JTBD perspective.
- It does not just let the creator build; it **teaches them how to build well**.
- The builder is opinionated in the right places.

### 7. Response Inbox: `/admin/responses` and `components/response-inbox.tsx`

**Primary desktop job:** let the builder replay responses quickly and classify which ones matter.

| Component | JTBD | Role on page | Notes |
| --- | --- | --- | --- |
| Responses page header | Explain current inbox state | Page orientation | Includes filtering state and totals |
| Response overview card | Summarize response quality depth | Quick health metric | Good as lightweight signal snapshot |
| Start Here card | Recommend where to listen first | Guided prioritization | Strong use of featured response logic |
| Filter tabs | Narrow the inbox | Fast segmentation | Good for expert review |
| Response cards | Review, listen, classify, and summarize | Core review module | Main operating unit |
| Transcript panel | Read the response quickly | Non-audio review aid | Good for scanning |
| AI summary panel | Shorten interpretation time | Synthesis layer | Helps creators move from raw input to insight |
| Footer summary | Clarify filtered result count | State feedback | Small but useful |

**Desktop button and action inventory**

| Control | JTBD | UX role | Priority | Role note |
| --- | --- | --- | --- | --- |
| Back arrow in page header | Return to previous workspace | Navigation utility | Medium | Contextual but slightly ambiguous |
| Tabs: `All` / `Flagged` / `High Signal` | Segment inbox | Filter control | High | Core triage affordance |
| `Extract insight` / `Retry extraction` | Generate AI summary | Utility-to-analysis action | High | Bridges raw audio to synthesis |
| `Share Card` | Open public insight card | Externalization action | Medium | Useful for sharing a synthesized artifact |
| `More` / `Less` on summaries | Expand or collapse AI summary | Progressive disclosure | Medium | Keeps cards compact |
| Play / Pause icon button | Listen to response | Core media action | Primary at card level | Essential review action |
| Flag icon button | Mark response for attention/problematic content | Classification action | High | Important but icon-only |
| Star icon button | Mark as high signal | Classification action | High | Important but icon-only |
| Bookmark icon button | Save for later review | Persistence action | Medium | Good for long review sessions |

**Role verdict**

- Excellent operational page for experienced creators.
- The only notable weakness is discoverability: icon-only triage controls assume the user learns the system quickly.

### 8. Notifications: `/admin/notifications`

**Primary desktop job:** configure when creators are notified and verify the notification system works.

| Component | JTBD | Role on page | Notes |
| --- | --- | --- | --- |
| Delivery Rules panel | Set alert logic | Configuration module | Good task grouping |
| Template Editor | Define outgoing message style | Content ops module | Keeps rules and copy separate |
| Variables list | Show template capabilities | Helper documentation | Useful scaffolding |
| Test Console | Validate configuration immediately | Verification module | Strong ops pattern |
| Success/error alerts | Confirm outcomes | Feedback state | Good operational hygiene |

**Desktop button and action inventory**

| Control | JTBD | UX role | Priority | Role note |
| --- | --- | --- | --- | --- |
| `Back to Dashboard` | Leave config safely | Navigation action | Medium | Standard |
| Rule switches | Enable or disable specific notification types | Toggle control | High | Core settings mechanism |
| `Save rules` | Persist rule changes | Primary panel action | High | Required for confidence |
| `Save template` | Persist message content | Primary panel action | High | Content config action |
| `Send Test Email` | Verify delivery path | Validation CTA | Primary in Test Console | Very important operational trust builder |
| `View email preview` | Inspect generated output | Verification link | Medium | Nice debugging support |

**Role verdict**

- This page matches an admin-ops mental model well.
- Strong separation between logic, content, and verification.

### 9. Share Landing Page: `/share/survey/[surveyId]`

**Primary desktop job:** help a respondent understand what the survey is and start it confidently.

| Component | JTBD | Role on page | Notes |
| --- | --- | --- | --- |
| First prompt preview | Show what kind of answer is expected | Expectation setting | Good pre-qualification mechanism |
| Survey badges | Signal effort level and format | Friction reduction | Important for respondent confidence |
| Survey title | Clarify what the conversation is about | Context | Necessary anchor |

**Desktop button inventory**

| Control | JTBD | UX role | Priority | Role note |
| --- | --- | --- | --- | --- |
| `Open survey` | Start the response flow | Primary CTA | Primary | Entire page is in service of this action |

**Role verdict**

- Clean, minimal handoff page.
- Good at reducing ambiguity before a response starts.

### 10. Respondent Survey Flow: `/questionnaire/v1`

**Primary desktop job:** let a respondent answer each prompt by voice with minimal friction and no account creation.

| Component | JTBD | Role on page | Notes |
| --- | --- | --- | --- |
| Progress label and progress bar | Show finite workload | Progress feedback | Important for confidence and completion |
| Current question block | Focus respondent on a single prompt | Main task context | Good one-question-at-a-time design |
| Audio recorder waveform area | Make recording state legible | Primary interaction canvas | Central interaction surface |
| Short-response hint alert | Encourage stronger answers | Quality nudge | Good non-blocking coaching |
| Upload paused alert | Preserve trust on failure | Error recovery | Strong reassurance language |

**Desktop button and action inventory**

| Control | JTBD | UX role | Priority | Role note |
| --- | --- | --- | --- | --- |
| `Back to dashboard` when admin is viewing preview | Exit preview | Contextual navigation | Low for respondents, medium for creators |
| `Retry microphone access` | Recover from permission failure | Recovery action | High | Important rescue path |
| Mic record button | Start answer capture | Primary interaction | Primary | Main respondent action |
| Stop button | End recording | Recording control | High | Completes capture |
| Re-record button | Safely discard and retry | Recovery/edit action | High | Critical for respondent confidence |
| Play / Pause preview button | Review answer before sending | Verification control | High | Builds confidence before submission |
| Submit recording button | Send answer | Primary completion action | Primary | Core success event |
| `Previous` | Revisit previous prompt | Navigation control | Medium | Helpful for multi-question surveys |

**Role verdict**

- Strong, focused respondent UX.
- The recorder control set is minimal and appropriate.

### 11. Thank You Page: `/questionnaire/thank-you`

**Primary desktop job:** close the respondent loop and optionally convert them into a creator.

| Component | JTBD | Role on page | Notes |
| --- | --- | --- | --- |
| Success icon and confirmation copy | Confirm completion | Closure state | Strong emotional finish |
| Powered by Audioform card | Reframe from respondent to prospect | Product marketing bridge | Deliberate conversion move |

**Desktop button inventory**

| Control | JTBD | UX role | Priority | Role note |
| --- | --- | --- | --- | --- |
| `Create your own survey` | Convert respondent into creator | Primary conversion CTA | Primary | Strong growth loop move |
| `Answer another prompt` | Continue in current survey flow | Secondary CTA | High | Good if survey still has more prompts or user wants to retry |
| `Return home` | Exit cleanly | Tertiary CTA | Medium | Standard closure action |
| Support email link | Contact support | Help action | Low | Useful fallback |

**Role verdict**

- Good end-state page.
- Strong growth-minded use of a thank-you surface.

### 12. Placeholder Admin Pages: `/admin/settings`, `/admin/profile`, `/admin/help`

**Primary desktop job:** these pages should support account and workspace administration, but currently mostly act as placeholders.

| Page | Existing component role | Actual completed job | Gap |
| --- | --- | --- | --- |
| Settings | Placeholder card + back button | Almost none | User is told settings exist but cannot act on them |
| Profile | Placeholder card + back button | Almost none | User can arrive but cannot manage profile |
| Help | Placeholder support card + back button | Minimal | Some informational value, but no real help workflow |

**Buttons**

| Control | JTBD | UX role | Verdict |
| --- | --- | --- | --- |
| `Back to dashboard` on all three pages | Return to working area | Escape/navigation | Works, but page-level job remains incomplete |

## Shared Desktop Components

### `components/audio-recorder.tsx`

This is the key **respondent interaction engine**.

| Control | JTBD | UX role | Why it matters |
| --- | --- | --- | --- |
| Record | Start answer capture | Primary interaction | Makes the survey voice-native |
| Stop | End answer capture | Capture control | Gives clear control over length |
| Re-record | Retry safely | Recovery control | Removes fear of “messing up” |
| Play/Pause | Self-review | Verification control | Helps improve answer confidence |
| Submit | Send completed take | Primary completion control | Closes the per-question loop |

### `components/admin-header.tsx`

This component contains:

- notifications button
- settings button
- help button
- account menu
- profile/settings/logout dropdown items

**Audit note:** it is well structured, but it does not appear to be the active shell for the main desktop admin pages. Its role is therefore conceptually strong but operationally underused.

### `components/admin-sidebar.tsx`

This component defines desktop navigation to:

- Dashboard
- Questionnaires
- Moderation Queue
- Email Notifications
- Settings
- Help & Support

**Audit note:** the IA is coherent, but because the live pages mostly do not render this sidebar, desktop navigation is less unified than the component suggests it should be.

## Secondary And Experimental Desktop Routes

### `/redesign`

- Functions as a comparison launcher for redesign directions.
- Buttons are route links, not product actions.
- Useful for internal review, not part of the live customer JTBD loop.

### `/local/x-signal` and `/local/content-scheduler`

- Local-only internal tools.
- Not core production product surfaces.
- Should be treated as internal ops views rather than part of the customer desktop audit.

### `/visual-command-center`

- Internal/experimental artifact unrelated to the current polished product loop.
- Uses a very different visual language and interaction style.
- Includes multiple buttons, tabs, toggles, and file-open behaviors, but these support an internal documentation dashboard rather than Audioform’s core survey workflow.

## Systemic Findings

### What is working well

- The product has a strong **single dominant loop**.
- Primary CTAs are usually clear and well separated from utility controls.
- The builder flow is unusually strong because it combines **authoring**, **education**, and **quality gating** in one screen.
- The respondent flow is disciplined and does not overload the user.
- Distribution controls are practical and business-ready: link, embed, iframe, QR.

### What is structurally weak

- Desktop admin navigation is inconsistent because page-level navigation has replaced a reusable shared shell.
- Placeholder pages create false affordance: the button says “go here,” but the destination does not yet do the job.
- Triage actions in the response inbox are efficient but somewhat opaque for new users because they are mostly icon-first.
- There is a split between polished product surfaces and experimental/internal routes that could confuse stakeholders if shown together.

## Priority Recommendations

### 1. High priority

- Make `Settings`, `Profile`, `Help`, and `Forgot Password` complete their real jobs or hide/de-emphasize those destinations.
- Standardize desktop admin navigation around one persistent shell if that is still the intended IA.

### 2. Medium priority

- Add clearer labels, tooltips, or onboarding cues for response triage icons in the inbox.
- Consider surfacing the difference between `Flagged`, `High Signal`, and `Saved` more explicitly for first-time users.

### 3. Medium priority

- Keep internal/experimental routes visually and structurally separate from main product routes.
- If stakeholders use the app for reviews, present the audited production routes first.

### 4. Preserve

- Preserve the current survey builder philosophy.
- Preserve the respondent flow simplicity.
- Preserve the dashboard’s distribution-focused utility layer.

## Final Verdict

Audioform’s desktop product is best understood as a **decision-support system for voice feedback**.

Its most important buttons are not generic navigation controls. They are the controls that move the user through the signal loop:

- `Create your survey`
- `Save draft`
- `Publish survey`
- `Copy survey link`
- `Open survey`
- recorder `Start / Stop / Re-record / Submit`
- `Extract insight`
- response triage actions: `Flag`, `High Signal`, `Bookmark`

Those controls collectively do the real work of the product:

- create a question worth asking
- get a real answer
- turn that answer into signal
- make a product decision faster

That loop is strong.

The main gaps are not in the core product idea. They are in the surrounding desktop support structure:

- incomplete admin destinations
- fragmented desktop navigation
- a few places where utility is stronger than clarity

If those gaps are tightened, the desktop experience becomes much more legible as a complete operating system for founder and product-team feedback.

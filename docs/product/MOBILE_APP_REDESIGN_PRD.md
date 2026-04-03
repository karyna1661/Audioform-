# Audioform Mobile App Redesign PRD

## Document Status

- Status: Draft for review
- Owner: Product + Design + Frontend
- Source inputs:
  - [Desktop JTBD audit](c:/Users/hp/Downloads/Audioform/docs/product/DESKTOP_COMPONENT_JTBD_AUDIT.md)
  - Current route/component structure in `app/` and `components/`
- Intent: define a **mobile-first product system** that is structurally separate from desktop while keeping shared design tokens and brand fundamentals

## 1. Why This PRD Exists

Audioform’s current mobile experience is too often a compressed version of desktop. In practice this creates:

- components nested inside other components purely to preserve desktop structure
- buttons embedded inside already crowded containers
- irregular stacking and spacing on small screens
- overloaded screens where mobile users have to decode desktop hierarchy
- higher UI fragility each time the team “tweaks” mobile after desktop changes

This PRD proposes a different model:

- **desktop and mobile keep the same design tokens**
- **desktop and mobile do not need to share the same layout architecture**
- mobile gets its own interaction model, screen hierarchy, and component composition rules

The goal is not to make mobile “match” desktop.

The goal is to make mobile feel like Audioform was designed for a phone from the start.

## 2. Product Decision

Audioform will move to a **dual-surface product design system**:

- **Desktop** remains the primary deep-work, multi-panel, analysis-heavy surface
- **Mobile** becomes a separate product surface optimized for fast capture, fast review, and fast distribution

Both surfaces will share:

- brand identity
- core tokens
- content model
- analytics model
- backend APIs

Both surfaces may differ in:

- navigation model
- screen architecture
- density
- control placement
- component composition
- number of actions shown at once

## 3. Core Product Assumptions

These assumptions guide the PRD.

### 3.1 Primary users on mobile

There are two meaningful mobile users:

- **Builder on the move**
  - checks response activity
  - shares survey links
  - reviews a few strong responses
  - makes quick triage decisions
  - does light editing, not deep survey authoring

- **Respondent on phone**
  - opens a survey from a link
  - records one or more voice answers
  - wants zero friction, obvious controls, and safe retry

### 3.2 Mobile is not for everything

Desktop stays the better surface for:

- deep survey authoring
- complex prompt sequencing
- dense analytics
- longer moderation sessions
- settings-heavy ops work

Mobile should win at:

- fast “check signal now” moments
- recording and submitting answers
- sharing a survey in seconds
- quick review and triage
- high-confidence lightweight editing

### 3.3 Mobile design principle

On mobile, every screen must answer one question:

**What is the one thing this user most likely needs to do right now?**

If a screen tries to support 4 major jobs at once, it should be split.

## 4. Product Goals

### 4.1 Primary goals

- Build a mobile-first UI system that does not depend on desktop nesting patterns
- Reduce layout irregularity and interaction density on phones
- Improve respondent completion and builder mobile clarity
- Create clear separation between quick mobile actions and deep desktop work
- Establish a repeatable rule set so future features do not regress into compressed desktop layouts

### 4.2 Secondary goals

- Preserve Audioform’s warm editorial identity
- Keep brand continuity across mobile and desktop
- Reuse tokens and backend contracts wherever practical
- Make implementation incremental by route

### 4.3 Non-goals

- Rebuilding the product as a native iOS/Android app
- Achieving visual parity between mobile and desktop
- Forcing every desktop feature into mobile v1
- Rewriting backend data models only for redesign purposes

## 5. Product Problems To Solve

Derived from the desktop audit plus the mobile pain you identified.

### 5.1 Structural problems

- Nested cards inside cards inside action groups create fragile mobile stacking
- Row-based desktop actions do not translate well to narrow viewports
- Header + utility + content patterns are repeated even when mobile only needs one primary action
- Desktop side-panel thinking leaks into mobile screens

### 5.2 Interaction problems

- Too many secondary controls appear too early
- Some button groups become visually flat on phone
- Icon-heavy expert controls can be unclear without desktop breathing room
- Context switching is high because one mobile screen often tries to preserve desktop mental models

### 5.3 IA problems

- Builder tasks that should be split across screens are packed into single responsive surfaces
- Mobile lacks a product-specific navigation logic separate from desktop
- Placeholder pages still consume navigation weight

## 6. JTBD Translation: Desktop To Mobile

Using the desktop audit, the product loop translates into the following mobile JTBD model.

| JTBD | Desktop expression | Mobile expression |
| --- | --- | --- |
| Start a survey | Full builder workspace | Quick-start draft + optional handoff to desktop for deep editing |
| Improve prompt quality | Side-by-side edit + coach | One-prompt-at-a-time guided refinement |
| Publish and distribute | Survey stack utilities | One-tap share hub |
| Record response | Single-page recorder | Full-screen phone-native recorder |
| Review signal | Multi-card inbox | Swipeable or stacked review queue |
| Mark high signal | Inline response controls | Thumb-zone triage controls |
| Configure notifications | Admin settings page | Lightweight preferences or desktop-only defer |

This means mobile should not mirror desktop screens. It should mirror **mobile jobs**.

## 7. Shared Design System Rules

Mobile and desktop remain one product family through shared tokens.

### 7.1 Shared

- `--af-color-primary`
- `--af-color-secondary`
- `--af-color-neutral`
- spacing primitives
- semantic color roles
- typography families where appropriate
- interaction language and copy tone

### 7.2 Allowed to diverge

- page templates
- navigation
- component anatomy
- density
- motion timing
- visibility of secondary actions

### 7.3 New rule

**No desktop component may be made “mobile-ready” by simply wrapping, shrinking, or stacking it if the underlying action model remains desktop-first.**

If the action model changes, the component should be redesigned, not responsively compressed.

## 8. Mobile Product Strategy

This PRD defines **two full mobile directions**.

Both are valid. They differ in product emphasis.

## 9. Version A: Pocket Studio

### 9.1 Product thesis

Pocket Studio makes Audioform feel like a premium mobile tool for focused builders and polished respondents.

This version emphasizes:

- clarity
- craft
- guided progression
- warm editorial confidence

It is best when the team wants mobile to feel:

- premium
- calm
- narrative
- intentionally reduced

### 9.2 Core concept

Mobile is a **guided studio**, not a dashboard.

Each major task becomes its own focused screen:

- Home
- Survey draft
- Publish/share
- Signal queue
- Response detail
- Recorder

### 9.3 Mobile IA

- **Tab 1: Home**
  - today’s summary
  - active survey
  - pending responses
  - strongest next action

- **Tab 2: Surveys**
  - survey cards
  - draft / published split
  - quick create

- **Tab 3: Signal**
  - response queue
  - filtered review
  - high-signal saves

- **Tab 4: Share**
  - survey link
  - QR
  - embed handoff
  - respondent preview entry

- **Tab 5: Account**
  - profile
  - notifications
  - settings/help

### 9.4 Mobile interaction model

- bottom navigation for primary surface switching
- one main action per screen
- sticky bottom CTA where needed
- destructive and expert actions hidden behind sheets
- cards simplified into sections rather than nested containers

### 9.5 Screen concepts

#### Home

Purpose:

- orient builder fast
- show one recommended next move

Primary modules:

- welcome/status header
- “do this next” card
- survey snapshot
- response momentum summary

Primary CTA examples:

- `Create survey`
- `Review 3 new responses`
- `Share latest survey`

#### Surveys

Purpose:

- browse and resume survey work

Primary modules:

- segmented control: Drafts / Live
- vertical survey list
- one persistent `New survey` CTA

Card actions:

- tap card = open survey detail
- overflow menu = rename / duplicate / delete / copy link

#### Survey Detail

Purpose:

- replace desktop survey row plus builder utilities

Sections:

- title/status
- prompt count and quality state
- share tools
- edit prompts
- publish state

Primary CTA logic:

- draft = `Continue editing`
- published = `Share survey`

#### Prompt Editing

Purpose:

- break large builder flow into one-prompt-at-a-time mobile steps

Pattern:

- prompt list screen
- prompt detail/editor screen
- quality coach below editor
- helper rewrites in bottom sheet

This avoids giant nested authoring panels.

#### Signal

Purpose:

- review responses quickly on the move

Pattern:

- queue of response cards
- tabs: All / High Signal / Saved
- large play control
- transcript summary collapsed by default

Quick triage actions:

- `High Signal`
- `Save`
- `Flag`

These appear as labeled pill actions instead of only icons.

#### Response Detail

Purpose:

- allow deeper but still mobile-appropriate review

Modules:

- audio player
- question prompt
- transcript
- AI summary
- quote
- classification actions
- share insight card

#### Share

Purpose:

- centralize all distribution actions into one mobile-native hub

Modules:

- current live survey selector
- copy direct link
- open QR
- copy embed link
- preview respondent flow

This removes distribution controls from being scattered inside many cards.

### 9.6 Strengths

- strongest information clarity
- easiest to implement incrementally
- lowest mobile UI fragility
- best fit for warm Audioform brand
- easiest for respondents and first-time builders

### 9.7 Risks

- may feel less “powerful” to expert builders
- some desktop speed may be replaced with extra taps
- survey authoring on mobile remains lighter than desktop

## 10. Version B: Field Loop

### 10.1 Product thesis

Field Loop makes Audioform feel like a fast tactical operating console for founders moving between meetings, communities, and product decisions.

This version emphasizes:

- speed
- momentum
- thumb-first decisions
- compact action loops

It is best when the team wants mobile to feel:

- tactical
- quick
- operational
- high-frequency

### 10.2 Core concept

Mobile is a **fast command loop**.

The user lands in a feed of what needs attention now, then acts fast:

- share
- listen
- mark
- move

### 10.3 Mobile IA

- **Feed**
  - all urgent activity
  - new responses
  - surveys needing publish/share
  - failed extractions

- **Create**
  - lightweight survey composer
  - template-first

- **Review**
  - response triage queue

- **Distribute**
  - link, QR, embed

- **Me**
  - notifications, account, settings

### 10.4 Interaction model

- large feed cards with action clusters
- quicker gestures and horizontal state changes
- more compact density than Version A
- more use of sheets and segmented filters
- bottom action rail for per-item choices

### 10.5 Screen concepts

#### Feed

Purpose:

- unify “what should I do next?”

Card types:

- new response card
- draft ready-to-publish card
- live survey share card
- extraction failure card
- first response landed card

Each card contains one main CTA and one overflow action.

#### Create

Purpose:

- create a survey fast from templates

Pattern:

- choose template
- name survey
- refine top 1-3 prompts
- publish

This version intentionally deprioritizes deep authoring on phone.

#### Review

Purpose:

- triage a stack of responses very fast

Pattern:

- one response at a time
- sticky player
- quick action rail
- swipe between items or tap next

Actions:

- `Mark high signal`
- `Save`
- `Flag`
- `Extract insight`

#### Distribute

Purpose:

- support fast, situational sharing

Pattern:

- current survey at top
- big `Copy link`
- QR launch
- share sheet integration
- optional recent share history

### 10.6 Strengths

- strongest for frequent builder mobile check-ins
- ideal for on-the-go founders
- sharp action focus
- clearer “do-now” operating model

### 10.7 Risks

- easier to become operationally dense
- less premium and less calm than Version A
- can drift into mini-dashboard territory if not tightly controlled

## 11. Recommendation

### Recommend building: Version A, Pocket Studio

Reason:

- it solves the exact problem that triggered this redesign: irregular mobile structure caused by desktop composition patterns
- it gives the cleanest break from nested-component design debt
- it is the easiest direction to scale without repeated mobile regressions
- it better fits Audioform’s strongest brand advantage: warm, intentional, high-signal product thinking

### Keep from Version B

Even if Version A is chosen, borrow these elements from Version B:

- a “do this next” feed on mobile home
- faster review queue patterns in Signal
- stronger action prioritization for quick check-ins

## 12. Mobile Component Strategy

This section maps audited desktop components/buttons into mobile-native equivalents.

| Desktop component/action | Current desktop role | Mobile replacement |
| --- | --- | --- |
| Hero CTA cluster | acquisition | separate mobile landing/auth flow, simplified action stack |
| Survey Stack row | manage each survey in dashboard | survey list item + detail screen |
| Dashboard quick actions panel | jump to adjacent tasks | home recommendations + tab nav |
| KPI cluster | status summary | compact insight strip on home |
| Prompt Studio multi-panel builder | authoring | step-based prompt workflow |
| Quality coach side module | improve prompts | inline coach below active prompt |
| Response card with many controls | review and classify | simplified card + detail page |
| Icon-only triage buttons | expert review | labeled pills in thumb zone |
| Share controls spread across dashboard/builder | distribution | dedicated share hub |
| Notification config page | ops setup | settings section or desktop-first defer |

## 13. Mobile Navigation Model

### Global rules

- maximum 5 primary tabs
- no desktop sidebar patterns on mobile
- no three-column responsive collapse
- if a screen requires more than one persistent action group, split the screen

### Preferred primary nav for Version A

- Home
- Surveys
- Signal
- Share
- Account

### Preferred nav for respondent flow

Respondent flow should **not** use app tabs.

It should remain a dedicated task flow with:

- question progress
- full-screen recorder
- submit feedback state
- thank-you

## 14. Mobile Layout Principles

### 14.1 One dominant action per screen

Every mobile screen must have one clearly dominant action.

### 14.2 No nested cards unless semantically necessary

Avoid:

- card > card > action group
- panel > subpanel > chip row > button row

Prefer:

- section
- divider
- bottom sheet
- detail screen

### 14.3 Move utilities out of the main reading path

Utilities like:

- copy embed
- copy draft link
- delete
- account options

should live in:

- overflow menus
- bottom sheets
- detail screens

not inline beside primary mobile actions.

### 14.4 Thumb-zone controls

Primary interaction zones should bias lower on screen where possible:

- recorder actions
- response triage actions
- share actions
- publish CTA

### 14.5 Collapse density, not clarity

When space is limited:

- remove secondary copy first
- move secondary actions to sheets
- keep labels for important actions
- do not compress important controls into ambiguous icon clusters

## 15. Mobile Design Direction

### Shared visual DNA

- warm paper-like surfaces
- Audioform primary accent
- soft editorial typography
- tactile, calm motion
- high-contrast action hierarchy

### Version A tone

- quiet confidence
- warm editorial studio
- reduced and premium

### Version B tone

- tactical founder console
- fast and responsive
- compact but confident

## 16. Functional Scope By Route

### Phase 1 mobile redesign routes

- `/login`
- `/signup`
- `/questionnaire/v1`
- `/questionnaire/thank-you`
- `/admin/dashboard/v4`
- `/admin/questionnaires/v1`
- `/admin/responses`
- `/admin/notifications`

### Phase 2 routes

- `/admin/settings`
- `/admin/profile`
- `/admin/help`
- `/share/survey/[surveyId]`

### Phase 3

- internal cleanup
- remove now-obsolete mobile fallback patterns
- unify responsive rules across shared primitives

## 17. Success Metrics

### UX/product metrics

- lower mobile layout regression rate
- higher respondent mobile completion rate
- higher builder mobile task completion for quick review/share
- lower time-to-share for live surveys on mobile
- lower tap confusion in response triage

### Engineering metrics

- fewer mobile-only patch fixes after desktop changes
- fewer nested conditional layouts in shared route files
- smaller divergence between intent and rendered mobile hierarchy

## 18. Technical Product Requirements

### 18.1 Architecture requirements

- mobile may use separate page sections or component trees from desktop
- shared route files are acceptable only if mobile and desktop are intentionally branched
- if branching becomes too complex, extract mobile-specific components or screen assemblies

### 18.2 Component requirements

- create mobile-specific screen components where desktop components are structurally unsuitable
- avoid reusing desktop dashboard cards wholesale on mobile
- avoid responsive-only fixes for fundamentally different jobs

### 18.3 Token requirements

- keep color tokens shared
- keep semantic spacing scale shared
- allow mobile-only spacing and sizing recipes derived from tokens

## 19. Content Strategy Requirements

Mobile copy should be:

- shorter
- more direct
- more action-first

Examples:

- `Create new survey` may become `New survey`
- `Configure creator notifications` may become `Alerts`
- `Moderate queue` may become `Review signal`

The job must stay clear even when the label gets shorter.

## 20. Accessibility Requirements

- 44px minimum touch targets
- visible action labels for important destructive/classification actions
- no hidden critical controls behind hover
- recorder controls must remain obvious under one-hand use
- transcripts and summaries must be readable without dense card nesting

## 21. Execution Plan

### Step 1. Direction selection

- approve Version A or Version B
- lock navigation model
- define which desktop features remain desktop-only

### Step 2. Mobile foundations

- create mobile layout primitives
- create mobile screen shell
- define bottom nav / top bar patterns
- define mobile cards, sections, sheets, and sticky CTA patterns

### Step 3. Respondent flow first

Why first:

- highest mobile-native value
- smallest scope
- easiest signal on design success

Deliverables:

- mobile survey screen
- full-screen recorder
- mobile thank-you

### Step 4. Builder quick loop

Deliverables:

- mobile dashboard/home
- survey list and survey detail
- share hub
- response queue

### Step 5. Builder authoring

Deliverables:

- step-based prompt editor
- mobile quality coach
- publish flow

### Step 6. Ops cleanup

Deliverables:

- notifications
- settings/profile/help decisions
- remove placeholder-first nav paths

## 22. Proposed Implementation Sequence

Recommended build order:

1. mobile foundations
2. respondent flow
3. mobile home/dashboard
4. signal queue and response detail
5. share hub
6. survey list/detail
7. mobile authoring
8. notifications/settings cleanup

## 23. Open Product Decisions

These should be resolved before or during implementation.

- Should mobile survey creation support full authoring, or only lightweight authoring plus desktop handoff?
- Should notifications remain editable on mobile in v1, or be reduced to simple toggles only?
- Should response triage on mobile use stacked cards or single-item queue review?
- Should share tools live under a separate tab or inside survey detail only?
- Should Settings/Profile/Help be rebuilt now or de-emphasized until meaningful functionality exists?

## 24. Final Product Recommendation

Audioform should maintain:

- **desktop as the deep-work system**
- **mobile as the fast loop system**

The product should stop treating mobile as a smaller desktop canvas.

The cleanest path is:

- choose **Version A: Pocket Studio**
- build mobile-specific screen architecture
- keep shared tokens
- move quick mobile jobs to dedicated screens
- reduce nested composition radically

That gives Audioform two coherent surfaces:

- desktop for structured thinking
- mobile for fast action and real-world use

Both remain Audioform.
They just stop pretending they need to work the same way.

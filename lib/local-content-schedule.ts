export type ContentScheduleItem = {
  id: string
  day: number
  platform: "X" | "LinkedIn" | "Farcaster"
  pillar: "Problem" | "Education" | "Build in Public" | "Proof" | "Beta"
  title: string
  hook: string
  body: string
  cta: string
  format: "Short post" | "Thread" | "Founder note"
}

export const localContentSchedule: ContentScheduleItem[] = [
  {
    id: "day-01",
    day: 1,
    platform: "X",
    pillar: "Problem",
    title: "Shallow feedback problem",
    format: "Short post",
    hook: "Most product feedback is too low-effort to trust.",
    body:
      "A like is not a decision signal. A text reply is often performance. Builders shipping in public need to hear conviction, hesitation, and confusion, not just collect comments.",
    cta: "Ask people what part of your feedback loop still feels shallow.",
  },
  {
    id: "day-02",
    day: 2,
    platform: "LinkedIn",
    pillar: "Education",
    title: "Why voice matters",
    format: "Founder note",
    hook: "Voice captures something text strips away: emotional certainty.",
    body:
      "When someone speaks, you hear pause, doubt, excitement, and resistance. That is the difference between 'nice feedback' and signal you can actually build against.",
    cta: "Share one product decision that would be easier if you could hear user conviction.",
  },
  {
    id: "day-03",
    day: 3,
    platform: "Farcaster",
    pillar: "Build in Public",
    title: "What we are building",
    format: "Short post",
    hook: "Building Audioform as feedback infrastructure for people who ship in public.",
    body:
      "The bet: higher-friction feedback can produce higher-signal decisions. We are optimizing for depth, not volume.",
    cta: "Reply with the last product choice you made from weak signal.",
  },
  {
    id: "day-04",
    day: 4,
    platform: "X",
    pillar: "Education",
    title: "Good question design",
    format: "Thread",
    hook: "Bad feedback usually starts with a bad question.",
    body:
      "Ask for one lived moment. Ask where someone hesitated. Ask what they would change first. Do not ask broad opinion questions if you need build direction.",
    cta: "Turn one vague question you use today into a concrete one.",
  },
  {
    id: "day-05",
    day: 5,
    platform: "LinkedIn",
    pillar: "Problem",
    title: "Polite feedback trap",
    format: "Founder note",
    hook: 'A lot of founders are not dealing with bad feedback. They are dealing with polite feedback.',
    body:
      "That is more dangerous. It feels supportive, but it delays the real decision. We want a system that surfaces friction early enough to matter.",
    cta: "Comment with the phrase users keep saying that you no longer fully trust.",
  },
  {
    id: "day-06",
    day: 6,
    platform: "X",
    pillar: "Build in Public",
    title: "Working definition of signal",
    format: "Short post",
    hook: "Current working definition: signal density = useful truth per response.",
    body:
      "We care less about form completion rate and more about whether a response changes what you build next.",
    cta: "If you had to measure signal density in your product, what would you count?",
  },
  {
    id: "day-07",
    day: 7,
    platform: "Farcaster",
    pillar: "Proof",
    title: "Weekly build recap",
    format: "Short post",
    hook: "This week we tightened the survey builder around one decision at a time.",
    body:
      "Cleaner framing, stronger prompts, and a more visible path from question to publish. The product should make good feedback behavior easier, not just possible.",
    cta: "Want screenshots or a walkthrough? Ask and I will post them.",
  },
  {
    id: "day-08",
    day: 8,
    platform: "LinkedIn",
    pillar: "Education",
    title: "Voice vs forms",
    format: "Founder note",
    hook: "Forms are good at collecting answers. They are weaker at capturing conviction.",
    body:
      "We are not trying to replace every form. We are building for moments where a founder needs to know whether a user is sure, hesitant, confused, or emotionally flat.",
    cta: "Message me the product moment where text feedback stops being enough.",
  },
  {
    id: "day-09",
    day: 9,
    platform: "X",
    pillar: "Problem",
    title: "Feedback scattered everywhere",
    format: "Short post",
    hook: "Feedback is everywhere. Insight is nowhere.",
    body:
      "Replies, DMs, Discord threads, notes, call snippets. The problem is not volume. The problem is entropy.",
    cta: "Quote this with the place where your most useful feedback currently disappears.",
  },
  {
    id: "day-10",
    day: 10,
    platform: "Farcaster",
    pillar: "Education",
    title: "Three prompt model",
    format: "Short post",
    hook: "A simple prompt stack for better product feedback:",
    body:
      "1. What happened?\n2. Where did you hesitate?\n3. What would you change first?\nThat sequence tends to produce more usable responses than generic 'thoughts?' asks.",
    cta: "Save this and test it in your next user convo.",
  },
  {
    id: "day-11",
    day: 11,
    platform: "LinkedIn",
    pillar: "Build in Public",
    title: "Why this category exists",
    format: "Founder note",
    hook: "I do not think 'survey tool' is the right category for what we are building.",
    body:
      "This is closer to feedback infrastructure for public builders. The goal is not questionnaires. The goal is faster, higher-confidence iteration.",
    cta: "Tell me if that category language clicks or misses.",
  },
  {
    id: "day-12",
    day: 12,
    platform: "X",
    pillar: "Education",
    title: "Short prompts win",
    format: "Short post",
    hook: "20-45 second prompts are the sweet spot.",
    body:
      "Long enough for one real example. Short enough to answer without turning it into a formal interview. That constraint improves response quality.",
    cta: "Steal this for your next product ask.",
  },
  {
    id: "day-13",
    day: 13,
    platform: "LinkedIn",
    pillar: "Proof",
    title: "What we optimize for",
    format: "Founder note",
    hook: "Metrics I care about more than top-line response count:",
    body:
      "Time to first response. Percent of responses long enough to contain one concrete moment. Replay rate. Return rate from creators reviewing signal. Those are closer to product truth.",
    cta: "Which feedback metric do you think most teams overvalue?",
  },
  {
    id: "day-14",
    day: 14,
    platform: "Farcaster",
    pillar: "Build in Public",
    title: "Invite for rough feedback",
    format: "Short post",
    hook: "Looking for builders willing to break the current flow before beta.",
    body:
      "I want people who will tell me where the builder experience is still unclear, slow, or too polished to trust.",
    cta: "Reply if you want to dogfood and send blunt notes.",
  },
  {
    id: "day-15",
    day: 15,
    platform: "X",
    pillar: "Problem",
    title: "Survey fatigue",
    format: "Short post",
    hook: "People are not tired of feedback. They are tired of low-value asks.",
    body:
      "If the question is specific and the response can actually influence a decision, people are much more willing to engage.",
    cta: "Ask yourself whether your current prompt deserves an answer.",
  },
  {
    id: "day-16",
    day: 16,
    platform: "LinkedIn",
    pillar: "Education",
    title: "How to ask for truth",
    format: "Founder note",
    hook: "To get honest feedback, lower the pressure and raise the specificity.",
    body:
      "Do not ask users to review the whole product. Ask for one moment, one friction point, and one suggested change. That framing makes honesty easier.",
    cta: "Use that structure in your next onboarding audit.",
  },
  {
    id: "day-17",
    day: 17,
    platform: "X",
    pillar: "Build in Public",
    title: "Builder belief",
    format: "Short post",
    hook: "The whole thesis behind Audioform:",
    body:
      "Slightly higher friction on the response side can produce much higher confidence on the builder side.",
    cta: "Agree or disagree. I want the strongest counterargument.",
  },
  {
    id: "day-18",
    day: 18,
    platform: "Farcaster",
    pillar: "Proof",
    title: "Use cases",
    format: "Short post",
    hook: "Three places I think this is strongest before beta:",
    body:
      "1. Onboarding friction diagnosis\n2. Messaging clarity checks\n3. Feature launch validation\nIf your product ships in public, those loops happen constantly.",
    cta: "Which one should we lean into first?",
  },
  {
    id: "day-19",
    day: 19,
    platform: "LinkedIn",
    pillar: "Problem",
    title: "Comments are not enough",
    format: "Founder note",
    hook: "Comments are great for reaction. They are weak for decisions.",
    body:
      "Public comment systems optimize for visibility and fast takes. Builders often need the opposite: slower, more deliberate signal tied to a product question.",
    cta: "If you build in public, where do comments still help and where do they fail?",
  },
  {
    id: "day-20",
    day: 20,
    platform: "X",
    pillar: "Education",
    title: "Prompt rewrite",
    format: "Thread",
    hook: "Prompt rewrite example:",
    body:
      "Bad: 'What do you think of the onboarding?'\nBetter: 'Where did you hesitate during onboarding, and what would have made the next step obvious?'",
    cta: "Reply with a weak prompt and I will rewrite it.",
  },
  {
    id: "day-21",
    day: 21,
    platform: "Farcaster",
    pillar: "Build in Public",
    title: "Beta shaping",
    format: "Short post",
    hook: "Pre-beta goal is not feature count. It is loop quality.",
    body:
      "Can a builder go from decision -> question -> response -> action without confusion? That is the bar.",
    cta: "What part of that loop usually breaks first in your tools?",
  },
  {
    id: "day-22",
    day: 22,
    platform: "LinkedIn",
    pillar: "Proof",
    title: "Friction as filter",
    format: "Founder note",
    hook: "One product belief I keep coming back to: friction is not always the enemy.",
    body:
      "In feedback products, a little friction can filter noise and increase signal density. The real question is whether the friction creates better output.",
    cta: "Where have you seen productive friction work well?",
  },
  {
    id: "day-23",
    day: 23,
    platform: "X",
    pillar: "Beta",
    title: "Early beta criteria",
    format: "Short post",
    hook: "Who should get into beta first?",
    body:
      "Not teams that want survey volume. Builders who already ship publicly and care about clarity over raw completion rates are the better first users.",
    cta: "If that sounds like you, reply and I will add you to the early list.",
  },
  {
    id: "day-24",
    day: 24,
    platform: "LinkedIn",
    pillar: "Education",
    title: "Decision-first feedback",
    format: "Founder note",
    hook: "Most feedback workflows are answer-first. Ours is decision-first.",
    body:
      "Start with the decision you need to make this week. Then design the prompt to reduce uncertainty around that decision. Everything gets sharper from there.",
    cta: "Try framing your next feedback ask around a single decision.",
  },
  {
    id: "day-25",
    day: 25,
    platform: "Farcaster",
    pillar: "Problem",
    title: "What users actually feel",
    format: "Short post",
    hook: "Founders do not just need to know what users think. They need to know what users actually feel.",
    body:
      "That difference changes roadmap confidence. It changes messaging. It changes whether a weak launch signal is noise or real resistance.",
    cta: "What decision would you revisit if you had better emotional signal?",
  },
  {
    id: "day-26",
    day: 26,
    platform: "X",
    pillar: "Build in Public",
    title: "Pre-beta invite language",
    format: "Short post",
    hook: "Preparing beta language around this promise:",
    body:
      "Ask one focused question. Collect voice signal. Decide what to ship next. If that message does not land instantly, the product positioning still needs work.",
    cta: "Would you click that? Be honest.",
  },
  {
    id: "day-27",
    day: 27,
    platform: "LinkedIn",
    pillar: "Proof",
    title: "What success looks like",
    format: "Founder note",
    hook: "Success for this product is not 'more responses.'",
    body:
      "Success is a founder hearing 5 responses and being materially clearer on what to change next. That is the standard I want beta to prove.",
    cta: "What is the smallest amount of feedback that has ever changed your roadmap?",
  },
  {
    id: "day-28",
    day: 28,
    platform: "Farcaster",
    pillar: "Beta",
    title: "Beta prep update",
    format: "Short post",
    hook: "Beta prep update: tightening onboarding, builder prompts, and the loop from response to action.",
    body:
      "I would rather open later with a stronger loop than open earlier with a prettier shell.",
    cta: "If you want the first invite batch, leave a note.",
  },
  {
    id: "day-29",
    day: 29,
    platform: "X",
    pillar: "Beta",
    title: "Final pre-beta message test",
    format: "Thread",
    hook: "Trying to say Audioform in one sentence:",
    body:
      "Audioform is a high-signal feedback layer for builders who ship in public. It turns voice responses into decision-ready product signal.",
    cta: "Quote this with the part that still feels fuzzy.",
  },
  {
    id: "day-30",
    day: 30,
    platform: "LinkedIn",
    pillar: "Beta",
    title: "Beta opening post",
    format: "Founder note",
    hook: "We are close to opening Audioform to early beta.",
    body:
      "If you are a founder, builder, or community-led operator who wants higher-conviction feedback than forms and comments can give you, this is the audience I want first.",
    cta: "Comment 'beta' or message me if you want early access.",
  },
]


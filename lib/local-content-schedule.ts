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
    title: "Clean feedback problem",
    format: "Short post",
    hook: "Most user feedback is too clean to be useful.",
    body:
      "Text boxes give you summaries.\nVoice gives you hesitation, emotion, specificity, and the exact words people use when something breaks.\n\nThat is why we are building Audioform.",
    cta: "Follow along if you care more about signal than volume.",
  },
  {
    id: "day-02",
    day: 2,
    platform: "Farcaster",
    pillar: "Education",
    title: "Context survives in voice",
    format: "Short post",
    hook: "We are building Audioform around a simple belief:",
    body:
      "text feedback often compresses away the most important part of the signal.\n\nVoice keeps the context.\nThat usually matters more than the answer itself.",
    cta: "Reply if your best product feedback has ever come from hearing, not reading.",
  },
  {
    id: "day-03",
    day: 3,
    platform: "X",
    pillar: "Problem",
    title: "Decision-grade feedback",
    format: "Short post",
    hook: "Founders do not need more feedback.",
    body:
      "They need feedback they can actually decide from.\n\nAudioform helps teams publish short voice surveys, collect spoken responses, and review the real context behind what users mean.",
    cta: "Reply if you want the 30-second voice prompt pack.",
  },
  {
    id: "day-04",
    day: 4,
    platform: "Farcaster",
    pillar: "Education",
    title: "Conviction over dashboards",
    format: "Short post",
    hook: 'A lot of teams already have "feedback."',
    body:
      "What they do not have is conviction.\n\nWe are interested in feedback that helps you make a decision, not just fill a dashboard.",
    cta: "What makes feedback actionable for you?",
  },
  {
    id: "day-05",
    day: 5,
    platform: "X",
    pillar: "Education",
    title: "Prompt quality matters",
    format: "Short post",
    hook: "One thing we have learned: good feedback starts with good prompts.",
    body:
      'Bad question:\n"Do you like this?"\n\nBetter question:\n"Tell me about the last time this broke your flow."\n\nThat difference changes everything.',
    cta: "DM me if you want a starter prompt list.",
  },
  {
    id: "day-06",
    day: 6,
    platform: "Farcaster",
    pillar: "Education",
    title: "Prompt infrastructure",
    format: "Short post",
    hook: "Prompt quality is underrated product infrastructure.",
    body:
      "Better prompts create better answers.\nBetter answers create better decisions.\n\nThat is a core idea behind Audioform.",
    cta: "What is the best feedback question you have used recently?",
  },
  {
    id: "day-07",
    day: 7,
    platform: "X",
    pillar: "Problem",
    title: "System design problem",
    format: "Short post",
    hook: "Low-quality feedback is often a system design problem.",
    body:
      "If users only give you one-line feedback, it is often not because they do not care.\n\nIt is because the format is weak.\nOr the question is weak.\nOr both.",
    cta: "Follow for more build-in-public feedback frameworks.",
  },
  {
    id: "day-08",
    day: 8,
    platform: "Farcaster",
    pillar: "Education",
    title: "Invite something real",
    format: "Short post",
    hook: 'We think "low-quality feedback" is often a system design problem, not a user problem.',
    body:
      "People usually say more when the prompt and format invite something real.",
    cta: "Have you seen this in your own product?",
  },
  {
    id: "day-09",
    day: 9,
    platform: "X",
    pillar: "Proof",
    title: "What useful feedback contains",
    format: "Short post",
    hook: "This is what we want from feedback.",
    body:
      "- a real moment\n- a clear friction point\n- the words they would never type into a form\n- something we can act on this week\n\nThat is the bar.",
    cta: "Reply and I will send you our question framework.",
  },
  {
    id: "day-10",
    day: 10,
    platform: "Farcaster",
    pillar: "Proof",
    title: "Context emotion specificity",
    format: "Short post",
    hook: "The best feedback usually has 3 things:",
    body:
      "context,\nemotion,\nspecificity.\n\nVoice tends to preserve all 3 better than text.",
    cta: "Which of those three do you lose most often today?",
  },
  {
    id: "day-11",
    day: 11,
    platform: "X",
    pillar: "Problem",
    title: "Signal rate over completion rate",
    format: "Short post",
    hook: "Most surveys optimize for completion rate.",
    body:
      "We care about signal rate.\n\nA fast response that says nothing is not useful.\nA short voice response with one real insight is.",
    cta: "Would you trade response volume for response quality?",
  },
  {
    id: "day-12",
    day: 12,
    platform: "Farcaster",
    pillar: "Education",
    title: "Signal density",
    format: "Short post",
    hook: "A thought we keep coming back to:",
    body:
      "more responses does not automatically mean more learning.\n\nSignal density matters more than raw volume.",
    cta: "What metric do you think teams overweight most?",
  },
  {
    id: "day-13",
    day: 13,
    platform: "X",
    pillar: "Build in Public",
    title: "Public bet",
    format: "Short post",
    hook: "Building Audioform in public means we get to test this in public:",
    body:
      "Will teams actually prefer a small set of high-signal voice responses over a large set of shallow text answers?\n\nWe think yes.",
    cta: "Agree or disagree. I want the strongest counterargument.",
  },
  {
    id: "day-14",
    day: 14,
    platform: "Farcaster",
    pillar: "Build in Public",
    title: "Shallow vs strong responses",
    format: "Short post",
    hook: "Open question for builders:",
    body:
      "would you rather have 50 shallow survey responses or 7 strong voice responses with real context?\n\nWe know which side we are betting on.",
    cta: "Reply with your answer and why.",
  },
  {
    id: "day-15",
    day: 15,
    platform: "X",
    pillar: "Education",
    title: "What happened vs how it felt",
    format: "Short post",
    hook: "Text feedback tells you what happened.",
    body:
      "Voice feedback tells you how it felt.\n\nThat gap is where a lot of product decisions get won or lost.",
    cta: "Try asking your next feedback question in voice.",
  },
  {
    id: "day-16",
    day: 16,
    platform: "Farcaster",
    pillar: "Proof",
    title: "Hearing confusion",
    format: "Short post",
    hook: 'There is a difference between: "I was confused"',
    body:
      "and hearing the confusion happen in someone's voice.\n\nThat difference is useful.",
    cta: "What product moment needs more emotional context in your workflow?",
  },
  {
    id: "day-17",
    day: 17,
    platform: "X",
    pillar: "Problem",
    title: "Too polished to trust",
    format: "Short post",
    hook: "A lot of onboarding feedback arrives too late and too polished.",
    body:
      "By the time someone writes it down, they have already cleaned it up.\n\nWe want the closer-to-the-moment version.",
    cta: "Do you trust polished feedback less?",
  },
  {
    id: "day-18",
    day: 18,
    platform: "Farcaster",
    pillar: "Proof",
    title: "Less edited more true",
    format: "Short post",
    hook: "One benefit of voice feedback:",
    body:
      "you get something less edited.\n\nThat usually means less polished, but more true.",
    cta: "What kind of truth gets lost in typed feedback?",
  },
  {
    id: "day-19",
    day: 19,
    platform: "X",
    pillar: "Education",
    title: "Best use cases for voice",
    format: "Short post",
    hook: "We are especially interested in feedback around:",
    body:
      "- onboarding friction\n- feature confusion\n- failed expectations\n- moments users nearly bounced\n\nThat is where spoken feedback gets interesting fast.",
    cta: "Reply with the first use case you would test.",
  },
  {
    id: "day-20",
    day: 20,
    platform: "Farcaster",
    pillar: "Education",
    title: "Not every question needs voice",
    format: "Short post",
    hook: "Not every question deserves voice.",
    body:
      "But if you are trying to understand confusion, friction, or desire, voice starts to look a lot better than a text box.",
    cta: "Which product question would you ask in voice first?",
  },
  {
    id: "day-21",
    day: 21,
    platform: "X",
    pillar: "Build in Public",
    title: "Focused product idea",
    format: "Short post",
    hook: "The product idea is simple.",
    body:
      "Ask better questions.\nCollect spoken answers.\nReview responses with enough context to spot patterns fast.\n\nSimple does not mean small.\nIt means focused.",
    cta: "Follow along as we build Audioform in public.",
  },
  {
    id: "day-22",
    day: 22,
    platform: "Farcaster",
    pillar: "Build in Public",
    title: "Narrow on purpose",
    format: "Short post",
    hook: "We are trying to keep Audioform narrow on purpose.",
    body:
      'Not "all feedback."\nJust high-signal voice feedback that helps teams decide what to do next.',
    cta: "What part of that loop is hardest for your team today?",
  },
  {
    id: "day-23",
    day: 23,
    platform: "X",
    pillar: "Education",
    title: "Stories beat ratings",
    format: "Short post",
    hook: "People are better at telling stories than filling out forms.",
    body:
      "So we would rather ask for a moment than a rating.\n\nStories are often where the useful product truth lives.",
    cta: "Reply if you want our story-first question format.",
  },
  {
    id: "day-24",
    day: 24,
    platform: "Farcaster",
    pillar: "Education",
    title: "Stories hold truth",
    format: "Short post",
    hook: "Forms tend to ask for judgments.",
    body:
      "Voice can invite stories.\n\nStories are often where the useful product truth lives.",
    cta: "Do you learn more from ratings or from user stories?",
  },
  {
    id: "day-25",
    day: 25,
    platform: "X",
    pillar: "Problem",
    title: "Fake certainty",
    format: "Short post",
    hook: "There is a lot of fake certainty in product feedback.",
    body:
      "Polite praise.\nAverages.\nSurvey summaries.\nSanitized comments.\n\nWe are more interested in raw signal than clean reporting.",
    cta: "What is the most misleading feedback metric you have seen?",
  },
  {
    id: "day-26",
    day: 26,
    platform: "Farcaster",
    pillar: "Proof",
    title: "Proximity matters",
    format: "Short post",
    hook: "A lot of product teams have reporting on feedback.",
    body:
      "Fewer have real proximity to what users are actually experiencing.\n\nThat proximity matters.",
    cta: "What is one signal your current system misses?",
  },
  {
    id: "day-27",
    day: 27,
    platform: "X",
    pillar: "Beta",
    title: "Conversation over form field",
    format: "Short post",
    hook: "We are building Audioform for teams who want feedback that sounds more like a conversation and less like a form field.",
    body:
      "If that is your lane, follow along.",
    cta: "DM for beta access if you are building with user feedback every week.",
  },
  {
    id: "day-28",
    day: 28,
    platform: "Farcaster",
    pillar: "Beta",
    title: "Beta opening thesis",
    format: "Short post",
    hook: "That is the bet behind Audioform:",
    body:
      "better questions + voice input + tighter review loops = better product decisions.\n\nWe will keep sharing what we learn as we build.",
    cta: "Reply if you want to be in the first beta wave.",
  },
]

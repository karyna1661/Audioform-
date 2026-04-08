export type ResponseSignalSummary = {
  complaint?: string | null
  opportunity?: string | null
  emotion?: string | null
  frictionMoment?: string | null
  confidence?: number | null
}

export type ResponseQuoteCandidate = {
  quote: string
  score: number
  conviction: number
  specificity: number
  shareability: number
}

export type StoredInsight = {
  id: string
  transcriptId: string
  responseId: string | null
  narrativeSummary: string | null
  signalSummary: ResponseSignalSummary | null
  powerQuote: string | null
  verbatimQuotes: string[]
  quoteCandidates: ResponseQuoteCandidate[]
  primaryTheme: string | null
  themes: string[]
  sentiment: string | null
  sentimentScore: number | null
  signalScore: number | null
  provider: string | null
  extractorVersion: string | null
  createdAt: string
  updatedAt: string
}

export type ReleaseComplaintSummary = {
  label: string
  count: number
}

export type ReleaseOpportunitySummary = {
  label: string
  reason: string
}

export type ReleaseSignalSummary = {
  topComplaints: ReleaseComplaintSummary[]
  topOpportunities: ReleaseOpportunitySummary[]
  emergingSignals: string[]
  contrarianInsights: string[]
}

export type ReleaseInsightCluster = {
  label: string
  count: number
  description: string
  representativeResponseIds: string[]
  representativeQuote: string | null
  representativeTakeId: string | null
}

export type ReleaseShareArtifacts = {
  topQuotes: string[]
  bestClusterLabel?: string | null
  bestClipCandidateIds?: string[]
}

export type StoredReleaseInsight = {
  id: string
  surveyId: string
  narrativeSummary: string | null
  signalSummary: ReleaseSignalSummary | null
  clusters: ReleaseInsightCluster[]
  shareArtifacts: ReleaseShareArtifacts | null
  provider: string | null
  extractorVersion: string | null
  createdAt: string
  updatedAt: string
}


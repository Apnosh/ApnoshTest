import type { DashboardSnapshot, ClientBenchmark, ClientInsight, AMClientNote, DashboardViewType, BreakdownItem } from '@/types/database'

// ============================================================
// Mock Marketing Intelligence Data
// ============================================================

const businessName = 'Casa Priya'

// --- Trend data generators ---

function generateTrend(base: number, months: number, growth: number): { date: string; value: number }[] {
  const points: { date: string; value: number }[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const noise = 0.85 + Math.random() * 0.3
    const progress = (months - i) / months
    const val = Math.round(base * (1 + growth * progress) * noise)
    points.push({
      date: d.toISOString().split('T')[0],
      value: val,
    })
  }
  return points
}

function generateDailyTrend(base: number, days: number, growth: number): { date: string; value: number }[] {
  const points: { date: string; value: number }[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const noise = 0.8 + Math.random() * 0.4
    const progress = (days - i) / days
    const val = Math.round(base * (1 + growth * progress) * noise)
    points.push({
      date: d.toISOString().split('T')[0],
      value: val,
    })
  }
  return points
}

function generateSparkline(length: number, trend: 'up' | 'down' | 'flat'): number[] {
  const data: number[] = []
  let val = 50 + Math.random() * 50
  for (let i = 0; i < length; i++) {
    const dir = trend === 'up' ? 0.6 : trend === 'down' ? -0.6 : 0
    val += (Math.random() - 0.5 + dir) * 15
    val = Math.max(10, Math.min(100, val))
    data.push(Math.round(val))
  }
  return data
}

// --- Time range configs ---

export type TimeRange = '1m' | '3m' | '6m' | '1y' | 'all'

export const timeRangeOptions: { label: string; value: TimeRange }[] = [
  { label: '1M', value: '1m' },
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: '1Y', value: '1y' },
  { label: 'ALL', value: 'all' },
]

function getTrendForRange(fullTrend: { date: string; value: number }[], range: TimeRange): { date: string; value: number }[] {
  const now = new Date()
  const cutoff = new Date(now)
  switch (range) {
    case '1m': cutoff.setMonth(cutoff.getMonth() - 1); break
    case '3m': cutoff.setMonth(cutoff.getMonth() - 3); break
    case '6m': cutoff.setMonth(cutoff.getMonth() - 6); break
    case '1y': cutoff.setFullYear(cutoff.getFullYear() - 1); break
    case 'all': return fullTrend
  }
  return fullTrend.filter(p => new Date(p.date) >= cutoff)
}

// --- View configurations ---

export interface ViewConfig {
  id: DashboardViewType
  label: string
  description: string
  contextLabel: string
  unit: string
  icon: 'eye' | 'map-pin' | 'dollar-sign' | 'heart'
  comingSoon: boolean
}

export const viewConfigs: ViewConfig[] = [
  {
    id: 'visibility',
    label: 'Visibility',
    description: 'People discovering your business',
    contextLabel: `People who discovered ${businessName} this month`,
    unit: 'people',
    icon: 'eye',
    comingSoon: false,
  },
  {
    id: 'foottraffic',
    label: 'Foot Traffic',
    description: 'People taking action to visit',
    contextLabel: `People taking action to visit ${businessName} this month`,
    unit: 'actions',
    icon: 'map-pin',
    comingSoon: false,
  },
  {
    id: 'visibility' as DashboardViewType,
    label: 'Revenue',
    description: 'People spending money',
    contextLabel: '',
    unit: '',
    icon: 'dollar-sign',
    comingSoon: true,
  },
  {
    id: 'visibility' as DashboardViewType,
    label: 'Loyalty',
    description: 'People coming back',
    contextLabel: '',
    unit: '',
    icon: 'heart',
    comingSoon: true,
  },
]

// --- Visibility view data ---

const visibilityTrendFull = generateDailyTrend(280, 365, 0.45)

const visibilityBreakdown: BreakdownItem[] = [
  {
    label: 'Social media reach',
    value: 48200,
    description: 'Total people who saw your content',
    trend: 18,
    sparkline: generateSparkline(12, 'up'),
  },
  {
    label: 'New profile visits',
    value: 3420,
    description: 'People who visited your profile for the first time',
    trend: 24,
    sparkline: generateSparkline(12, 'up'),
  },
  {
    label: 'Content impressions',
    value: 127800,
    description: 'Times your posts appeared in someone\'s feed',
    trend: 12,
    sparkline: generateSparkline(12, 'up'),
  },
  {
    label: 'New followers',
    value: 342,
    description: 'People who chose to follow you',
    trend: 31,
    sparkline: generateSparkline(12, 'up'),
  },
]

const visibilitySnapshot: DashboardSnapshot = {
  id: 'snap-vis-1',
  client_id: 'client-1',
  snapshot_date: new Date().toISOString().split('T')[0],
  view_type: 'visibility',
  primary_metric: 52400,
  pct_change_mom: 18,
  pct_change_prev: 22,
  breakdown_data: visibilityBreakdown,
  trend_data: visibilityTrendFull,
  fetched_at: new Date().toISOString(),
}

// --- Foot Traffic view data ---

const footTrafficTrendFull = generateDailyTrend(85, 365, 0.35)

const footTrafficBreakdown: BreakdownItem[] = [
  {
    label: 'Direction requests',
    value: 847,
    description: 'People who asked Google Maps to route here',
    trend: 14,
    sparkline: generateSparkline(12, 'up'),
  },
  {
    label: 'Phone calls',
    value: 312,
    description: 'Calls placed directly from your Google listing',
    trend: 8,
    sparkline: generateSparkline(12, 'up'),
  },
  {
    label: 'Website clicks',
    value: 1247,
    description: 'People who clicked through to your website',
    trend: -3,
    sparkline: generateSparkline(12, 'down'),
  },
  {
    label: 'Search appearances',
    value: 28400,
    description: 'Times you showed up in local search results',
    trend: 22,
    sparkline: generateSparkline(12, 'up'),
  },
]

const footTrafficSnapshot: DashboardSnapshot = {
  id: 'snap-ft-1',
  client_id: 'client-1',
  snapshot_date: new Date().toISOString().split('T')[0],
  view_type: 'foottraffic',
  primary_metric: 2406,
  pct_change_mom: 11,
  pct_change_prev: 15,
  breakdown_data: footTrafficBreakdown,
  trend_data: footTrafficTrendFull,
  fetched_at: new Date().toISOString(),
}

// --- Benchmarks ---

const visibilityBenchmark: ClientBenchmark = {
  id: 'bench-vis-1',
  client_id: 'client-1',
  view_type: 'visibility',
  benchmark_month: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  client_value: 52400,
  category_average: 34200,
  category_top_25: 48000,
  category_top_10: 62000,
  percentile_rank: 78,
  updated_at: new Date().toISOString(),
}

const footTrafficBenchmark: ClientBenchmark = {
  id: 'bench-ft-1',
  client_id: 'client-1',
  view_type: 'foottraffic',
  benchmark_month: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  client_value: 2406,
  category_average: 1840,
  category_top_25: 2200,
  category_top_10: 3100,
  percentile_rank: 72,
  updated_at: new Date().toISOString(),
}

// --- Insights ---

const visibilityInsights: ClientInsight = {
  id: 'ins-vis-1',
  client_id: 'client-1',
  view_type: 'visibility',
  insight_month: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  insight_1: 'Your reel hit 2,100 people in Capitol Hill \u2014 video content is reaching 3x more people than your photos this month.',
  insight_2: 'Tuesday 11am\u20131pm is your peak time \u2014 posts scheduled then get 40% more engagement than any other window.',
  created_by: 'team-1',
  published_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
}

const footTrafficInsights: ClientInsight = {
  id: 'ins-ft-1',
  client_id: 'client-1',
  view_type: 'foottraffic',
  insight_month: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  insight_1: 'Your Google Maps listing now ranks #2 for "Indian restaurant Austin" \u2014 up from #5 last month. More people are finding you organically.',
  insight_2: 'Phone calls spike on Friday and Saturday between 5pm\u20137pm \u2014 62% of your weekly calls happen in those 4 hours.',
  created_by: 'team-1',
  published_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
}

// --- AM Note ---

const amNote: AMClientNote = {
  id: 'note-1',
  client_id: 'client-1',
  note_text: 'Great month overall. Your spring menu content is performing really well, especially the tasting menu carousel. I\'m shifting more of your budget toward video content since that\'s where we\'re seeing the best reach numbers. Let\'s chat this week about the new location launch plan \u2014 I have some ideas for a local awareness campaign.',
  created_by: 'team-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const amInfo = {
  name: 'Sarah Kim',
  title: 'Account Manager',
  initials: 'SK',
}

// --- Public API ---

export function getSnapshot(viewType: DashboardViewType): DashboardSnapshot {
  return viewType === 'visibility' ? visibilitySnapshot : footTrafficSnapshot
}

export function getTrend(viewType: DashboardViewType, range: TimeRange): { date: string; value: number }[] {
  const full = viewType === 'visibility' ? visibilityTrendFull : footTrafficTrendFull
  return getTrendForRange(full, range)
}

export function getBenchmark(viewType: DashboardViewType): ClientBenchmark {
  return viewType === 'visibility' ? visibilityBenchmark : footTrafficBenchmark
}

export function getInsights(viewType: DashboardViewType): ClientInsight {
  return viewType === 'visibility' ? visibilityInsights : footTrafficInsights
}

export function getAMNote(): AMClientNote {
  return amNote
}

export function getBusinessName(): string {
  return businessName
}

export function getRankingLabel(percentile: number): string | null {
  if (percentile >= 90) return 'Top 10% locally'
  if (percentile >= 75) return 'Top 25% locally'
  if (percentile >= 50) return 'Above average'
  if (percentile >= 25) return 'Near average'
  return null
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

export function formatTrendSign(n: number): string {
  if (n > 0) return `+${n}%`
  if (n < 0) return `${n}%`
  return '0%'
}

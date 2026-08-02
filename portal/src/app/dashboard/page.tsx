'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
  Eye, MapPin, DollarSign, Heart, TrendingUp, TrendingDown,
  Lightbulb, ArrowUp, ArrowDown,
} from 'lucide-react'
import Sparkline from './sparkline'
import {
  viewConfigs,
  timeRangeOptions,
  getSnapshot,
  getTrend,
  getBenchmark,
  getInsights,
  getAMNote,
  getBusinessName,
  getRankingLabel,
  formatNumber,
  formatTrendSign,
  amInfo,
  type TimeRange,
  type ViewConfig,
} from './marketing-data'
import type { DashboardViewType } from '@/types/database'

const TrendChart = dynamic(() => import('./trend-chart'), {
  ssr: false,
  loading: () => <div className="h-[160px] bg-bg-2 rounded-xl animate-pulse" />,
})

// --- Icon map ---

const iconMap = {
  'eye': Eye,
  'map-pin': MapPin,
  'dollar-sign': DollarSign,
  'heart': Heart,
} as const

// --- Skeleton components ---

function SkeletonPulse({ className }: { className?: string }) {
  return <div className={`bg-bg-2 rounded-lg animate-pulse ${className ?? ''}`} />
}

function SkeletonCard() {
  return (
    <div className="bg-bg-2 rounded-xl p-4 space-y-3">
      <SkeletonPulse className="h-3 w-20" />
      <SkeletonPulse className="h-7 w-16" />
      <SkeletonPulse className="h-3 w-full" />
      <SkeletonPulse className="h-8 w-full" />
    </div>
  )
}

// --- Main Dashboard ---

const STORAGE_KEY = 'apnosh-dashboard-view'

export default function MarketingDashboard() {
  const [activeView, setActiveView] = useState<DashboardViewType>('visibility')
  const [timeRange, setTimeRange] = useState<TimeRange>('3m')
  const [loading, setLoading] = useState(true)
  const [benchmarkAnimated, setBenchmarkAnimated] = useState(false)

  // Restore persisted view
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'visibility' || saved === 'foottraffic') {
      setActiveView(saved)
    }
    // Simulate data load
    const timer = setTimeout(() => setLoading(false), 600)
    return () => clearTimeout(timer)
  }, [])

  // Persist view selection
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, activeView)
  }, [activeView])

  // Animate benchmarks on first render only
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setBenchmarkAnimated(true), 100)
      return () => clearTimeout(timer)
    }
  }, [loading])

  const handleViewChange = useCallback((view: DashboardViewType) => {
    setActiveView(view)
  }, [])

  const snapshot = getSnapshot(activeView)
  const trendData = getTrend(activeView, timeRange)
  const benchmark = getBenchmark(activeView)
  const insights = getInsights(activeView)
  const amNote = getAMNote()
  const businessName = getBusinessName()
  const currentConfig = viewConfigs.find(v => v.id === activeView && !v.comingSoon)!
  const isPositiveTrend = snapshot.pct_change_mom >= 0

  const rankLabel = getRankingLabel(benchmark.percentile_rank)
  const benchMaxVal = Math.max(benchmark.client_value, benchmark.category_average) * 1.2

  if (loading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="max-w-[600px] mx-auto space-y-5">
      {/* View Selector */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {viewConfigs.map((view, i) => (
          <ViewCard
            key={`${view.label}-${i}`}
            config={view}
            active={activeView === view.id && !view.comingSoon}
            onClick={() => !view.comingSoon && handleViewChange(view.id)}
          />
        ))}
      </div>

      {/* Hero Section */}
      <section className="pt-2">
        <p className="text-[13px] text-ink-3 mb-1">{currentConfig.contextLabel}</p>
        <div className="flex items-baseline gap-3">
          <span className="text-[48px] font-medium tracking-[-2px] leading-none text-ink">
            {formatNumber(snapshot.primary_metric)}
          </span>
          <span className="text-[16px] text-ink-3">{currentConfig.unit}</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] font-medium ${
              isPositiveTrend
                ? 'bg-brand-light text-brand-text'
                : 'bg-red-50 text-negative'
            }`}
          >
            {isPositiveTrend ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {formatTrendSign(snapshot.pct_change_mom)}
          </span>
          <span className="text-[12px] text-ink-4">
            {isPositiveTrend ? 'Your best month yet' : 'Down from last month'}
          </span>
        </div>
      </section>

      {/* Time Range Toggle */}
      <div className="flex gap-1">
        {timeRangeOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => setTimeRange(opt.value)}
            className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
              timeRange === opt.value
                ? 'bg-ink text-white'
                : 'text-ink-4 hover:text-ink-2'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Trend Graph */}
      <section>
        <TrendChart data={trendData} positive={isPositiveTrend} />
      </section>

      {/* Divider */}
      <hr className="border-ink-6" style={{ borderWidth: '0.5px' }} />

      {/* Breakdown Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-medium text-ink-2">What makes up this number</h3>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {snapshot.breakdown_data.map((item) => (
            <BreakdownCard key={item.label} item={item} />
          ))}
        </div>
      </section>

      {/* Divider */}
      <hr className="border-ink-6" style={{ borderWidth: '0.5px' }} />

      {/* Benchmark */}
      <section>
        <h3 className="text-[13px] font-medium text-ink-2 mb-4">How you compare locally</h3>
        <div className="space-y-3">
          {/* You */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] text-ink-3">You</span>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-ink">{formatNumber(benchmark.client_value)}</span>
                {rankLabel && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-light text-brand-text font-medium">
                    {rankLabel}
                  </span>
                )}
              </div>
            </div>
            <div className="h-2.5 bg-bg-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-[600ms] ease-out"
                style={{ width: benchmarkAnimated ? `${(benchmark.client_value / benchMaxVal) * 100}%` : '0%' }}
              />
            </div>
          </div>
          {/* Average */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] text-ink-3">Avg similar business</span>
              <span className="text-[13px] font-medium text-ink-3">{formatNumber(benchmark.category_average)}</span>
            </div>
            <div className="h-2.5 bg-bg-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-ink-5 rounded-full transition-all duration-[600ms] ease-out"
                style={{ width: benchmarkAnimated ? `${(benchmark.category_average / benchMaxVal) * 100}%` : '0%' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <hr className="border-ink-6" style={{ borderWidth: '0.5px' }} />

      {/* Insights */}
      <section>
        <h3 className="text-[13px] font-medium text-ink-2 mb-3">What's working</h3>
        <div className="space-y-2.5">
          {insights.insight_1 && <InsightCard text={insights.insight_1} />}
          {insights.insight_2 && <InsightCard text={insights.insight_2} />}
          {!insights.insight_1 && !insights.insight_2 && (
            <p className="text-[13px] text-ink-4 py-4 text-center">
              Your account manager will add insights after your first full month.
            </p>
          )}
        </div>
      </section>

      {/* Divider */}
      <hr className="border-ink-6" style={{ borderWidth: '0.5px' }} />

      {/* AM Note */}
      <section className="pb-8">
        <h3 className="text-[13px] font-medium text-ink-2 mb-3">From your account manager</h3>
        <div className="bg-white border border-ink-6 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-[34px] h-[34px] rounded-full bg-brand flex items-center justify-center text-white text-[12px] font-medium flex-shrink-0">
              {amInfo.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[12px] font-medium text-ink">{amInfo.name}</span>
                <span className="text-[11px] text-ink-4">{amInfo.title}</span>
              </div>
              <p className="text-[13px] text-ink-2 leading-[1.5]">
                {amNote.note_text}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

// --- Sub-components ---

function ViewCard({ config, active, onClick }: { config: ViewConfig; active: boolean; onClick: () => void }) {
  const Icon = iconMap[config.icon]
  const comingSoon = config.comingSoon

  return (
    <button
      onClick={onClick}
      disabled={comingSoon}
      className={`flex-shrink-0 w-[140px] rounded-xl p-3 text-left transition-all ${
        comingSoon
          ? 'opacity-45 cursor-not-allowed bg-white border border-ink-6'
          : active
            ? 'bg-brand-light border border-brand-border'
            : 'bg-white border border-ink-6 hover:border-ink-5'
      }`}
      style={{ borderWidth: '0.5px' }}
    >
      <Icon className={`w-4 h-4 mb-1.5 ${active ? 'text-brand' : comingSoon ? 'text-ink-4' : 'text-ink-3'}`} />
      <div className={`text-[13px] font-medium mb-0.5 ${active ? 'text-brand-text' : 'text-ink-2'}`}>
        {config.label}
      </div>
      <div className="text-[11px] text-ink-4 leading-snug">{config.description}</div>
      {comingSoon && (
        <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-ink-6 text-ink-4 font-medium">
          Coming soon
        </span>
      )}
    </button>
  )
}

function BreakdownCard({ item }: { item: { label: string; value: number; description: string; trend: number; sparkline: number[] } }) {
  const isUp = item.trend >= 0

  return (
    <div className="bg-bg-2 rounded-xl p-3.5 relative">
      <div className="flex items-start justify-between mb-1">
        <span className="text-[12px] text-ink-3">{item.label}</span>
        <span className={`text-[11px] flex items-center gap-0.5 ${isUp ? 'text-brand' : 'text-negative'}`}>
          {isUp ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
          {formatTrendSign(item.trend)}
        </span>
      </div>
      <div className="text-[26px] font-medium tracking-[-0.5px] text-ink mb-1">
        {formatNumber(item.value)}
      </div>
      <p className="text-[11px] text-ink-4 leading-snug mb-2">{item.description}</p>
      <Sparkline data={item.sparkline} color={isUp ? '#4abd98' : '#E24B4A'} />
    </div>
  )
}

function InsightCard({ text }: { text: string }) {
  return (
    <div className="bg-bg-2 rounded-xl p-3.5 flex items-start gap-3">
      <Lightbulb className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
      <p className="text-[13px] text-ink-2 leading-[1.5]">{text}</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="max-w-[600px] mx-auto space-y-5">
      {/* View selector skeleton */}
      <div className="flex gap-2.5">
        {[1, 2, 3, 4].map(i => (
          <SkeletonPulse key={i} className="w-[140px] h-[90px] rounded-xl flex-shrink-0" />
        ))}
      </div>
      {/* Hero skeleton */}
      <div className="space-y-2 pt-2">
        <SkeletonPulse className="h-4 w-64" />
        <SkeletonPulse className="h-12 w-40" />
        <SkeletonPulse className="h-5 w-32" />
      </div>
      {/* Time range skeleton */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <SkeletonPulse key={i} className="h-8 w-12 rounded-full" />
        ))}
      </div>
      {/* Graph skeleton */}
      <SkeletonPulse className="h-[160px] rounded-xl" />
      <hr className="border-ink-6" style={{ borderWidth: '0.5px' }} />
      {/* Breakdown skeleton */}
      <div>
        <SkeletonPulse className="h-4 w-48 mb-3" />
        <div className="grid grid-cols-2 gap-2.5">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    </div>
  )
}

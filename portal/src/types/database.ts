// ============================================================
// Apnosh Client Portal — Database Types
// ============================================================

// --- Enums ---

export type UserRole = 'client' | 'admin' | 'team_member'

export type OrderType = 'subscription' | 'one_time' | 'a_la_carte'
export type OrderStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

export type DeliverableType = 'graphic' | 'video' | 'caption' | 'email' | 'website_page' | 'seo' | 'branding' | 'photography' | 'other'
export type DeliverableStatus = 'draft' | 'internal_review' | 'client_review' | 'revision_requested' | 'approved' | 'scheduled' | 'published'

export type BriefStatus = 'pending' | 'assigned' | 'in_progress' | 'completed'

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'past_due' | 'trialing'

export type AssetType = 'logo' | 'photo' | 'video' | 'font' | 'guideline' | 'color_palette' | 'other'

export type Platform = 'instagram' | 'facebook' | 'tiktok' | 'linkedin' | 'twitter' | 'youtube' | 'google_business' | 'website'

export type NotificationType = 'approval_needed' | 'deliverable_ready' | 'order_confirmed' | 'message' | 'report_ready' | 'payment' | 'system'

// --- User Profile (extends Supabase Auth user) ---

export interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  role: UserRole
  created_at: string
  updated_at: string
}

// --- Business ---

export interface Business {
  id: string
  owner_id: string
  name: string
  industry: string
  business_type?: string
  description?: string
  website_url?: string
  phone?: string
  locations: BusinessLocation[]
  hours?: string
  year_established?: number
  years_in_business_label?: string
  logo_description?: string
  target_interests?: string[]
  monthly_ad_budget_label?: string
  monthly_ad_budget_min?: number
  monthly_ad_budget_max?: number
  // Brand Identity
  brand_voice_words: string[] // 3 adjectives
  brand_tone?: string
  brand_do_nots?: string[]
  brand_colors: Array<{ hex: string; name: string }> | { primary?: string; secondary?: string; [key: string]: string | undefined }
  fonts?: string[]
  style_notes?: string
  // Target Audience
  target_audience?: string
  target_age_range?: string
  target_location?: string
  target_problem?: string
  // Competitors
  competitors: Competitor[]
  competitor_strengths?: string
  differentiator?: string
  // Marketing Context
  current_platforms: string[]
  current_efforts?: string
  posting_frequency?: string
  has_google_business?: boolean
  monthly_budget?: number
  past_marketing_wins?: string
  past_marketing_fails?: string
  // Goals & Preferences
  marketing_goals: string[]
  content_topics?: string
  content_avoid_topics?: string
  additional_notes?: string
  // Seasonal
  seasonal_calendar?: SeasonalEvent[]
  // Metadata
  onboarding_completed: boolean
  onboarding_step: number
  created_at: string
  updated_at: string
}

export interface BusinessLocation {
  address: string
  city: string
  state: string
  zip: string
  is_primary: boolean
}

export interface Competitor {
  name: string
  website_url?: string
}

export interface SeasonalEvent {
  name: string
  month: number
  description?: string
}

// --- Brand Assets ---

export interface BrandAsset {
  id: string
  business_id: string
  type: AssetType
  file_url: string
  thumbnail_url?: string
  file_name: string
  file_size: number
  tags: string[]
  uploaded_at: string
}

// --- Platform Connections ---

export interface PlatformConnection {
  id: string
  business_id: string
  platform: Platform
  profile_url?: string
  username?: string
  access_token?: string // encrypted
  refresh_token?: string // encrypted
  connected_at: string
  expires_at?: string
}

// --- Subscriptions ---

export interface Subscription {
  id: string
  business_id: string
  plan_id: string
  plan_name: string
  plan_price: number
  billing_interval: 'monthly' | 'annually'
  status: SubscriptionStatus
  stripe_subscription_id?: string
  stripe_customer_id?: string
  started_at: string
  current_period_start: string
  current_period_end: string
  cancelled_at?: string
}

// --- Orders ---

export interface Order {
  id: string
  business_id: string
  type: OrderType
  service_id?: string
  service_name: string
  quantity: number
  unit_price: number
  total_price: number
  status: OrderStatus
  special_instructions?: string
  deadline?: string
  stripe_payment_intent_id?: string
  created_at: string
  updated_at: string
}

// --- Work Briefs (auto-generated) ---

export interface WorkBrief {
  id: string
  order_id: string
  business_id: string
  brief_content: BriefContent
  assigned_to?: string // team member user ID
  assigned_to_name?: string
  status: BriefStatus
  created_at: string
  updated_at: string
}

export interface BriefContent {
  // Business context (auto-populated from Business profile)
  business_name: string
  industry: string
  brand_voice: string[]
  brand_tone?: string
  brand_do_nots?: string
  target_audience?: string
  // Order specifics
  service_type: string
  deliverable_description: string
  quantity: number
  // Content direction
  content_topics?: string
  caption_preferences?: string
  hashtag_guidelines?: string
  cta_preferences?: string
  // Platform specs
  platforms: string[]
  dimensions?: string
  format_requirements?: string
  // Reference
  past_top_content?: string[]
  competitor_examples?: string[]
  // Logistics
  deadline?: string
  special_instructions?: string
  standing_instructions?: string
}

// --- Deliverables ---

export interface Deliverable {
  id: string
  work_brief_id: string
  business_id: string
  type: DeliverableType
  title: string
  description?: string
  content: DeliverableContent
  file_urls: string[]
  preview_urls: string[]
  version: number
  status: DeliverableStatus
  client_feedback?: string
  revision_notes?: string
  approved_at?: string
  approved_by?: string
  created_at: string
  updated_at: string
}

export interface DeliverableContent {
  caption?: string
  hashtags?: string[]
  platform?: Platform
  dimensions?: string
  alt_text?: string
  scheduled_time?: string
  [key: string]: unknown
}

// --- Content Calendar ---

export interface ContentCalendarEntry {
  id: string
  business_id: string
  deliverable_id?: string
  platform: Platform
  title: string
  caption?: string
  scheduled_at: string
  published_at?: string
  post_url?: string
  engagement_metrics?: EngagementMetrics
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  created_at: string
}

export interface EngagementMetrics {
  likes?: number
  comments?: number
  shares?: number
  saves?: number
  reach?: number
  impressions?: number
  clicks?: number
}

// --- Messages ---

export interface Message {
  id: string
  business_id: string
  thread_id: string
  sender_id: string
  sender_name: string
  sender_role: UserRole
  content: string
  attachments: MessageAttachment[]
  read_at?: string
  created_at: string
}

export interface MessageAttachment {
  file_url: string
  file_name: string
  file_type: string
  file_size: number
}

export interface MessageThread {
  id: string
  business_id: string
  subject: string
  order_id?: string
  last_message_at: string
  created_at: string
}

// --- Analytics Snapshots ---

export interface AnalyticsSnapshot {
  id: string
  business_id: string
  platform: Platform
  date: string
  metrics: PlatformMetrics
  created_at: string
}

export interface PlatformMetrics {
  followers?: number
  followers_change?: number
  reach?: number
  impressions?: number
  engagement_rate?: number
  posts_count?: number
  top_post_url?: string
  website_clicks?: number
  profile_visits?: number
  [key: string]: unknown
}

// --- Notifications ---

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  link?: string
  read_at?: string
  created_at: string
}

// --- Service Catalog ---

export interface ServiceCatalog {
  id: string
  name: string
  category: 'marketing' | 'websites_seo' | 'creative' | 'strategy'
  description: string
  short_description: string
  price: number
  price_unit: 'per_month' | 'per_item' | 'per_hour' | 'one_time'
  features: string[]
  is_subscription: boolean
  is_active: boolean
  sort_order: number
}

// --- Marketing Intelligence Dashboard ---

export type DashboardViewType = 'visibility' | 'foottraffic'

export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok' | 'linkedin' | 'google_business'

export interface SocialMetric {
  id: string
  client_id: string
  platform: SocialPlatform
  metric_date: string
  reach: number
  impressions: number
  engagement: number
  followers: number
  new_followers: number
  profile_visits: number
  posts_published: number
  fetched_at: string
}

export interface GBPMetric {
  id: string
  client_id: string
  metric_date: string
  search_impressions: number
  direction_requests: number
  phone_calls: number
  website_clicks: number
  fetched_at: string
}

export interface BreakdownItem {
  label: string
  value: number
  description: string
  trend: number
  sparkline: number[]
}

export interface DashboardSnapshot {
  id: string
  client_id: string
  snapshot_date: string
  view_type: DashboardViewType
  primary_metric: number
  pct_change_mom: number
  pct_change_prev: number
  breakdown_data: BreakdownItem[]
  trend_data: { date: string; value: number }[]
  fetched_at: string
}

export interface ClientBenchmark {
  id: string
  client_id: string
  view_type: DashboardViewType
  benchmark_month: string
  client_value: number
  category_average: number
  category_top_25: number
  category_top_10: number
  percentile_rank: number
  updated_at: string
}

export interface ClientInsight {
  id: string
  client_id: string
  view_type: DashboardViewType
  insight_month: string
  insight_1: string | null
  insight_2: string | null
  created_by: string
  published_at: string | null
  created_at: string
}

export interface AMClientNote {
  id: string
  client_id: string
  note_text: string
  created_by: string
  created_at: string
  updated_at: string
}

// ============================================================
// CRM  (admin-only — clients never see these records)
// ============================================================

export type AccountStatus = 'prospect' | 'active' | 'paused' | 'churned'
export type HealthScore = 'green' | 'yellow' | 'red'
export type PreferredChannel = 'Email' | 'Phone' | 'SMS' | 'Slack' | 'Other'

export interface Account {
  id: string
  business_id: string

  // Primary contact
  contact_name?: string
  contact_role?: string
  contact_email?: string
  contact_phone?: string
  contact_preferred_channel?: PreferredChannel
  last_contacted_at?: string

  // Contract
  contract_start_date?: string
  contract_renewal_date?: string
  contract_term_months?: number
  contract_auto_renew: boolean
  contract_cancellation_notice?: string

  // Financials
  mrr: number
  ltv_projected: number
  total_paid: number
  cac?: number

  // Acquisition
  lead_source?: string
  acquired_at?: string

  // Health
  health_score: HealthScore
  health_reason?: string
  nps?: number
  nps_collected_at?: string

  // Relationship
  status: AccountStatus
  assigned_am_id?: string

  created_at: string
  updated_at: string
}

export type ClientActivityType =
  | 'call' | 'email' | 'meeting' | 'message' | 'payment'
  | 'contract_signed' | 'contract_renewed' | 'nps_survey'
  | 'health_update' | 'churn' | 'note'

export interface ClientActivity {
  id: string
  account_id: string
  activity_type: ClientActivityType
  title: string
  body?: string
  actor_id?: string
  occurred_at: string
  metadata: Record<string, unknown>
  created_at: string
}

// Convenience: joined row returned by admin list/detail queries
export interface AccountWithBusiness extends Account {
  business: Pick<Business,
    | 'id' | 'name' | 'industry' | 'business_type'
    | 'description' | 'website_url' | 'locations'
  >
}

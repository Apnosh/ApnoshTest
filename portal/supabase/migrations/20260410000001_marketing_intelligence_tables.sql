-- ============================================================
-- Marketing Intelligence Dashboard Tables
-- ============================================================

-- Cached social metrics per platform per day
create table if not exists social_metrics (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null,
  platform        text not null,
  metric_date     date not null,
  reach           bigint default 0,
  impressions     bigint default 0,
  engagement      bigint default 0,
  followers       bigint default 0,
  new_followers   bigint default 0,
  profile_visits  bigint default 0,
  posts_published int default 0,
  fetched_at      timestamptz default now(),
  unique(client_id, platform, metric_date)
);

-- Google Business Profile metrics
create table if not exists gbp_metrics (
  id                    uuid primary key default gen_random_uuid(),
  client_id             uuid not null,
  metric_date           date not null,
  search_impressions    bigint default 0,
  direction_requests    bigint default 0,
  phone_calls           bigint default 0,
  website_clicks        bigint default 0,
  fetched_at            timestamptz default now(),
  unique(client_id, metric_date)
);

-- Pre-computed dashboard snapshots (updated nightly)
create table if not exists dashboard_snapshots (
  id                    uuid primary key default gen_random_uuid(),
  client_id             uuid not null,
  snapshot_date         date not null,
  view_type             text not null,
  primary_metric        bigint default 0,
  pct_change_mom        numeric(5,2),
  pct_change_prev       numeric(5,2),
  breakdown_data        jsonb,
  trend_data            jsonb,
  fetched_at            timestamptz default now(),
  unique(client_id, snapshot_date, view_type)
);

-- Local benchmarks by business category and city
create table if not exists client_benchmarks (
  id                    uuid primary key default gen_random_uuid(),
  client_id             uuid not null,
  view_type             text not null,
  benchmark_month       date not null,
  client_value          bigint,
  category_average      bigint,
  category_top_25       bigint,
  category_top_10       bigint,
  percentile_rank       int,
  updated_at            timestamptz default now(),
  unique(client_id, view_type, benchmark_month)
);

-- AM-written insights per client per month
create table if not exists client_insights (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null,
  view_type       text not null,
  insight_month   date not null,
  insight_1       text,
  insight_2       text,
  created_by      uuid,
  published_at    timestamptz,
  created_at      timestamptz default now(),
  unique(client_id, view_type, insight_month)
);

-- AM notes per client (latest shown on dashboard)
create table if not exists am_client_notes (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null,
  note_text       text not null,
  created_by      uuid,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Indexes for fast dashboard reads
create index if not exists idx_social_metrics_client_date on social_metrics(client_id, metric_date);
create index if not exists idx_gbp_metrics_client_date on gbp_metrics(client_id, metric_date);
create index if not exists idx_dashboard_snapshots_client on dashboard_snapshots(client_id, view_type, snapshot_date);
create index if not exists idx_client_benchmarks_client on client_benchmarks(client_id, view_type, benchmark_month);
create index if not exists idx_client_insights_client on client_insights(client_id, view_type, insight_month);
create index if not exists idx_am_client_notes_client on am_client_notes(client_id);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table social_metrics enable row level security;
alter table gbp_metrics enable row level security;
alter table dashboard_snapshots enable row level security;
alter table client_benchmarks enable row level security;
alter table client_insights enable row level security;
alter table am_client_notes enable row level security;

-- Clients can only read their own data
create policy "Clients read own social_metrics"
  on social_metrics for select
  using (client_id = auth.uid());

create policy "Clients read own gbp_metrics"
  on gbp_metrics for select
  using (client_id = auth.uid());

create policy "Clients read own dashboard_snapshots"
  on dashboard_snapshots for select
  using (client_id = auth.uid());

create policy "Clients read own client_benchmarks"
  on client_benchmarks for select
  using (client_id = auth.uid());

-- Clients can only see published insights
create policy "Clients read published insights"
  on client_insights for select
  using (client_id = auth.uid() and published_at is not null);

create policy "Clients read own am_client_notes"
  on am_client_notes for select
  using (client_id = auth.uid());

-- Service role (admin/cron) has full access via service_role key
-- No additional policies needed for admin writes since they use service_role

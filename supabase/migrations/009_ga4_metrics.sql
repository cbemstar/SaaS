-- Rich GA4 analytics storage + per-user dashboard layout preferences.
--
-- The existing daily_performance table stores one number per channel per day,
-- which can only hold GA4 sessions. These additive tables store the curated GA4
-- metric set and dimension breakdowns without disturbing the channel-spend
-- pipeline. RLS follows the Clerk third-party-auth model from 008_clerk_auth.sql
-- (public.is_workspace_member reads auth.jwt()->>'sub').

-- Curated GA4 metrics: one row per (workspace, client, day).
create table if not exists public.ga4_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id text not null references public.clients(id) on delete cascade,
  date date not null,
  total_users numeric not null default 0,
  new_users numeric not null default 0,
  active_users numeric not null default 0,
  sessions numeric not null default 0,
  engaged_sessions numeric not null default 0,
  engagement_rate numeric not null default 0,
  average_session_duration numeric not null default 0,
  user_engagement_duration numeric not null default 0,
  sessions_per_user numeric not null default 0,
  screen_page_views numeric not null default 0,
  views_per_session numeric not null default 0,
  event_count numeric not null default 0,
  key_events numeric not null default 0,
  bounce_rate numeric not null default 0,
  total_revenue numeric not null default 0,
  transactions numeric not null default 0,
  purchase_revenue numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, client_id, date)
);

create index if not exists ga4_daily_metrics_ws_client_date_idx
  on public.ga4_daily_metrics (workspace_id, client_id, date);

-- Per-dimension daily breakdowns (channel group, device, country, landing page).
create table if not exists public.ga4_breakdowns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id text not null references public.clients(id) on delete cascade,
  date date not null,
  dimension_type text not null check (dimension_type in ('channel_group', 'device', 'country', 'landing_page')),
  dimension_value text not null,
  sessions numeric not null default 0,
  total_users numeric not null default 0,
  engaged_sessions numeric not null default 0,
  key_events numeric not null default 0,
  screen_page_views numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (workspace_id, client_id, date, dimension_type, dimension_value)
);

create index if not exists ga4_breakdowns_ws_client_date_idx
  on public.ga4_breakdowns (workspace_id, client_id, date, dimension_type);

-- Per-user dashboard layout: which cards, their order/size, and saved filters.
-- scope is 'overview' (agency dashboard) or a client_id (client dashboard).
create table if not exists public.dashboard_preferences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id text not null,
  scope text not null,
  layout jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id, scope)
);

create index if not exists dashboard_preferences_ws_user_idx
  on public.dashboard_preferences (workspace_id, user_id);

alter table public.ga4_daily_metrics enable row level security;
alter table public.ga4_breakdowns enable row level security;
alter table public.dashboard_preferences enable row level security;

-- GA4 tables: workspace members can read; writes happen via the service role.
create policy "members can read ga4 daily metrics" on public.ga4_daily_metrics
  for select using (public.is_workspace_member(workspace_id));

create policy "members can read ga4 breakdowns" on public.ga4_breakdowns
  for select using (public.is_workspace_member(workspace_id));

-- Dashboard preferences: a member may only touch their own rows in their workspace.
create policy "members read own dashboard prefs" on public.dashboard_preferences
  for select using (
    public.is_workspace_member(workspace_id)
    and user_id = (select auth.jwt()->>'sub')
  );

create policy "members insert own dashboard prefs" on public.dashboard_preferences
  for insert with check (
    public.is_workspace_member(workspace_id)
    and user_id = (select auth.jwt()->>'sub')
  );

create policy "members update own dashboard prefs" on public.dashboard_preferences
  for update using (
    public.is_workspace_member(workspace_id)
    and user_id = (select auth.jwt()->>'sub')
  )
  with check (
    public.is_workspace_member(workspace_id)
    and user_id = (select auth.jwt()->>'sub')
  );

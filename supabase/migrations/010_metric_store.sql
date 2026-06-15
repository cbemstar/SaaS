-- Source-agnostic metric store. One uniform schema for every connector's data
-- (GA4, Meta, Google Ads, LinkedIn, TikTok, Search Console, …) so dashboards,
-- date ranges, year-over-year comparison, and reports compose the same way
-- regardless of source. Long format: one row per metric per day.
--
-- RLS follows the Clerk third-party-auth model (public.is_workspace_member reads
-- auth.jwt()->>'sub'); writes happen via the service role during connector sync.

create table if not exists public.metric_daily (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id text not null references public.clients(id) on delete cascade,
  source text not null,
  date date not null,
  metric_key text not null,
  value numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, client_id, source, date, metric_key)
);

create index if not exists metric_daily_lookup_idx
  on public.metric_daily (workspace_id, client_id, source, date);

create table if not exists public.metric_breakdown (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id text not null references public.clients(id) on delete cascade,
  source text not null,
  date date not null,
  dimension_type text not null,
  dimension_value text not null,
  metric_key text not null,
  value numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, client_id, source, date, dimension_type, dimension_value, metric_key)
);

create index if not exists metric_breakdown_lookup_idx
  on public.metric_breakdown (workspace_id, client_id, source, date, dimension_type);

alter table public.metric_daily enable row level security;
alter table public.metric_breakdown enable row level security;

create policy "members read metric_daily" on public.metric_daily
  for select using (public.is_workspace_member(workspace_id));

create policy "members read metric_breakdown" on public.metric_breakdown
  for select using (public.is_workspace_member(workspace_id));

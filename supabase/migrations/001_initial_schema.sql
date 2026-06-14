create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Pacific/Auckland',
  currency text not null default 'NZD',
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.clients (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  industry text not null,
  status text not null check (status in ('active', 'onboarding', 'paused')),
  "monthlySpend" numeric not null default 0,
  "spendDelta" numeric not null default 0,
  conversions integer not null default 0,
  "conversionsDelta" numeric not null default 0,
  roas numeric not null default 0,
  "lastReport" text not null default '—',
  channels text[] not null default '{}',
  alerts integer not null default 0,
  initials text not null default '',
  accent text not null default 'from-slate-500/30 to-zinc-500/30',
  created_at timestamptz not null default now()
);

create table if not exists public.connector_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  channel text not null check (channel in ('meta', 'google_ads', 'linkedin', 'tiktok', 'ga4', 'search_console')),
  label text not null,
  description text not null,
  status text not null check (status in ('connected', 'action_required', 'disconnected')),
  accounts integer not null default 0,
  last_sync text not null default 'Never',
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, channel)
);

create table if not exists public.daily_performance (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id text references public.clients(id) on delete cascade,
  date date not null,
  label text not null,
  meta numeric not null default 0,
  google_ads numeric not null default 0,
  linkedin numeric not null default 0,
  tiktok numeric not null default 0,
  ga4 numeric not null default 0,
  search_console numeric not null default 0,
  conversions integer not null default 0,
  created_at timestamptz not null default now(),
  unique (workspace_id, client_id, date)
);

create table if not exists public.insights (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client text not null,
  "clientId" text not null references public.clients(id) on delete cascade,
  channel text not null check (channel in ('meta', 'google_ads', 'linkedin', 'tiktok', 'ga4', 'search_console')),
  severity text not null check (severity in ('high', 'medium', 'low')),
  type text not null check (type in ('opportunity', 'anomaly', 'recommendation')),
  title text not null,
  body text not null,
  action text not null,
  evidence text not null,
  "estImpact" text not null,
  "createdAt" text not null default 'just now',
  created_at_db timestamptz not null default now()
);

create table if not exists public.report_templates (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text not null,
  pages integer not null,
  used integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id text not null references public.clients(id) on delete cascade,
  template_id text not null references public.report_templates(id),
  name text not null,
  blocks jsonb not null default '[]',
  status text not null check (status in ('draft', 'scheduled', 'sent')),
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  agency text,
  intent text not null check (intent in ('waitlist', 'partner', 'trial', 'sales')),
  plan text,
  message text,
  created_at timestamptz not null default now()
);

create table if not exists public.stripe_customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  stripe_customer_id text not null unique,
  stripe_subscription_id text,
  plan text,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.clients enable row level security;
alter table public.connector_accounts enable row level security;
alter table public.daily_performance enable row level security;
alter table public.insights enable row level security;
alter table public.report_templates enable row level security;
alter table public.reports enable row level security;
alter table public.leads enable row level security;
alter table public.stripe_customers enable row level security;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
  );
$$;

create policy "members can read workspaces" on public.workspaces
  for select using (public.is_workspace_member(id));

create policy "members can read workspace members" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));

create policy "members can read clients" on public.clients
  for select using (public.is_workspace_member(workspace_id));

create policy "members can read connector accounts" on public.connector_accounts
  for select using (public.is_workspace_member(workspace_id));

create policy "members can read daily performance" on public.daily_performance
  for select using (public.is_workspace_member(workspace_id));

create policy "members can read insights" on public.insights
  for select using (public.is_workspace_member(workspace_id));

create policy "members can read report templates" on public.report_templates
  for select using (public.is_workspace_member(workspace_id));

create policy "members can manage reports" on public.reports
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "anyone can submit leads" on public.leads
  for insert with check (true);

create policy "members can read billing state" on public.stripe_customers
  for select using (public.is_workspace_member(workspace_id));

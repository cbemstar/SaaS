-- RLS write policies for workspace-scoped data

create policy "members can update workspaces" on public.workspaces
  for update using (public.is_workspace_member(id))
  with check (public.is_workspace_member(id));

create policy "members can insert clients" on public.clients
  for insert with check (public.is_workspace_member(workspace_id));

create policy "members can update clients" on public.clients
  for update using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "members can delete clients" on public.clients
  for delete using (public.is_workspace_member(workspace_id));

create policy "members can insert connector accounts" on public.connector_accounts
  for insert with check (public.is_workspace_member(workspace_id));

create policy "members can update connector accounts" on public.connector_accounts
  for update using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "members can delete connector accounts" on public.connector_accounts
  for delete using (public.is_workspace_member(workspace_id));

create policy "members can insert daily performance" on public.daily_performance
  for insert with check (public.is_workspace_member(workspace_id));

create policy "members can update daily performance" on public.daily_performance
  for update using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "members can delete daily performance" on public.daily_performance
  for delete using (public.is_workspace_member(workspace_id));

create policy "members can insert insights" on public.insights
  for insert with check (public.is_workspace_member(workspace_id));

create policy "members can update insights" on public.insights
  for update using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "members can delete insights" on public.insights
  for delete using (public.is_workspace_member(workspace_id));

create table if not exists public.client_connector_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id text not null references public.clients(id) on delete cascade,
  channel text not null check (channel in ('meta', 'google_ads', 'linkedin', 'tiktok', 'ga4', 'search_console')),
  external_account_id text,
  external_account_name text,
  created_at timestamptz not null default now(),
  unique (client_id, channel)
);

alter table public.client_connector_links enable row level security;

create policy "members can read client connector links" on public.client_connector_links
  for select using (public.is_workspace_member(workspace_id));

create policy "members can manage client connector links" on public.client_connector_links
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

alter table public.insights add column if not exists dismissed boolean not null default false;

create table if not exists public.connector_tokens (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  channel text not null check (channel in ('meta', 'google_ads', 'linkedin', 'tiktok', 'ga4', 'search_console')),
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, channel)
);

alter table public.connector_tokens enable row level security;

-- Tokens are server-only; no member policies (service role access only)

alter table public.workspaces add column if not exists onboarded boolean not null default false;

-- Shareable client-facing report links. A token maps to a saved template +
-- client + range; the public /r/[token] page renders the report with no login
-- (data read via the service role), so agencies can send a live report link to
-- a client or schedule it.

create table if not exists public.report_shares (
  token text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  template_id text not null references public.report_templates(id) on delete cascade,
  client_id text not null references public.clients(id) on delete cascade,
  days integer not null default 30,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists report_shares_workspace_idx on public.report_shares (workspace_id);

alter table public.report_shares enable row level security;

-- Members can see their workspace's shares; public viewing happens via the
-- service role in the /r/[token] route, so no anon select policy is needed.
create policy "members read report shares" on public.report_shares
  for select using (public.is_workspace_member(workspace_id));

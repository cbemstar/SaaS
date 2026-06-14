create table if not exists public.connector_sync_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  channel text not null,
  status text not null check (status in ('success', 'partial', 'failed')),
  synced_clients integer not null default 0,
  skipped_clients integer not null default 0,
  rows_imported integer not null default 0,
  error_message text,
  triggered_by text not null default 'user' check (triggered_by in ('user', 'cron', 'all')),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists connector_sync_runs_workspace_channel_idx
  on public.connector_sync_runs (workspace_id, channel, started_at desc);

alter table public.connector_sync_runs enable row level security;

create policy "members can read connector sync runs" on public.connector_sync_runs
  for select using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = connector_sync_runs.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "members can insert connector sync runs" on public.connector_sync_runs
  for insert with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = connector_sync_runs.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "members can update connector sync runs" on public.connector_sync_runs
  for update using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = connector_sync_runs.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Recurring report delivery schedules

create table if not exists public.scheduled_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id text not null references public.clients(id) on delete cascade,
  template_id text not null references public.report_templates(id),
  name text not null,
  blocks jsonb not null default '[]'::jsonb,
  recipient_email text not null,
  cadence text not null check (cadence in ('weekly', 'monthly')),
  day_of_week smallint check (day_of_week between 1 and 7),
  day_of_month smallint check (day_of_month between 1 and 28),
  send_hour smallint not null default 8 check (send_hour between 0 and 23),
  timezone text not null default 'Pacific/Auckland',
  active boolean not null default true,
  next_run_at timestamptz not null,
  last_run_at timestamptz,
  last_status text check (last_status in ('sent', 'failed', 'skipped')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scheduled_reports_cadence_day_check check (
    (cadence = 'weekly' and day_of_week is not null and day_of_month is null)
    or (cadence = 'monthly' and day_of_month is not null and day_of_week is null)
  )
);

create index if not exists scheduled_reports_due_idx
  on public.scheduled_reports (next_run_at)
  where active = true;

alter table public.scheduled_reports enable row level security;

create policy "members can read scheduled reports" on public.scheduled_reports
  for select using (public.is_workspace_member(workspace_id));

create policy "members can insert scheduled reports" on public.scheduled_reports
  for insert with check (public.is_workspace_member(workspace_id));

create policy "members can update scheduled reports" on public.scheduled_reports
  for update using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "members can delete scheduled reports" on public.scheduled_reports
  for delete using (public.is_workspace_member(workspace_id));

-- Client delivery pipeline: contact emails, delivery log, insight approval gate

alter table public.clients add column if not exists contact_email text;

alter table public.insights add column if not exists approved boolean not null default false;

create table if not exists public.report_deliveries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id text not null references public.clients(id) on delete cascade,
  report_id uuid references public.reports(id) on delete set null,
  scheduled_report_id uuid references public.scheduled_reports(id) on delete set null,
  recipient_email text not null,
  report_name text not null,
  blocks jsonb not null default '[]'::jsonb,
  delivery_type text not null check (delivery_type in ('manual', 'scheduled')),
  status text not null check (status in ('sent', 'failed')),
  error_message text,
  sent_by uuid references auth.users(id) on delete set null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists report_deliveries_workspace_client_idx
  on public.report_deliveries (workspace_id, client_id, sent_at desc);

alter table public.report_deliveries enable row level security;

create policy "members can read report deliveries" on public.report_deliveries
  for select using (public.is_workspace_member(workspace_id));

create policy "members can insert report deliveries" on public.report_deliveries
  for insert with check (public.is_workspace_member(workspace_id));

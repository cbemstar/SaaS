-- Branding, customisation, and AI engine settings for workspaces,
-- plus richer report templates for the in-app template builder.

alter table public.workspaces add column if not exists logo_url text;
alter table public.workspaces add column if not exists accent_color text default '#1f6f5c';
alter table public.workspaces add column if not exists report_footer text;
alter table public.workspaces add column if not exists primary_contact text;
alter table public.workspaces add column if not exists white_label boolean not null default true;
alter table public.workspaces add column if not exists ai_cite_evidence boolean not null default true;
alter table public.workspaces add column if not exists ai_human_review boolean not null default true;
alter table public.workspaces add column if not exists ai_tone text not null default 'concise'
  check (ai_tone in ('concise', 'detailed', 'persuasive'));

alter table public.report_templates add column if not exists sections jsonb not null default '[]'::jsonb;
alter table public.report_templates add column if not exists accent text;
alter table public.report_templates add column if not exists is_default boolean not null default false;
alter table public.report_templates add column if not exists updated_at timestamptz not null default now();

create policy "members can insert report templates" on public.report_templates
  for insert with check (public.is_workspace_member(workspace_id));

create policy "members can update report templates" on public.report_templates
  for update using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "members can delete report templates" on public.report_templates
  for delete using (public.is_workspace_member(workspace_id));

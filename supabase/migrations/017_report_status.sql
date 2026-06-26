-- 017: Report lifecycle status (draft → ready → sent).
--
-- Reports already auto-persist their layout (the builder PATCHes report_templates)
-- and carry created_at + updated_at. This adds an explicit status so the Reports
-- section can show whether each report is a draft, finalized (ready), or already
-- sent to a client. Existing rows default to 'draft'.
alter table public.report_templates
  add column if not exists status text not null default 'draft';

alter table public.report_templates
  drop constraint if exists report_templates_status_check;
alter table public.report_templates
  add constraint report_templates_status_check check (status in ('draft', 'ready', 'sent'));

-- Surfacing "recently edited" first is the common sort on the Reports list.
create index if not exists report_templates_workspace_updated_idx
  on public.report_templates (workspace_id, updated_at desc);

-- 016: Indexes on the hottest filter columns.
--
-- These back queries that run on (nearly) every authenticated request or page
-- load. Without them Postgres falls back to sequential scans, so latency grows
-- linearly with row count — the exact failure mode at hundreds/thousands of
-- concurrent workspaces. All are additive and idempotent.
--
-- NOTE: on a large, live table prefer `create index concurrently` (run outside a
-- transaction) to avoid a write lock. These tables are small at launch, so a
-- plain create is fine; revisit if a table grows into millions of rows.

-- workspace_members: PK is (workspace_id, user_id), so a user_id-only lookup —
-- which runs on EVERY authenticated request to resolve the active workspace —
-- is not served by the PK. This is the single most important index here.
create index if not exists workspace_members_user_id_idx
  on public.workspace_members (user_id, created_at);

-- clients: filtered by workspace_id on list/count/dashboard paths.
create index if not exists clients_workspace_id_idx
  on public.clients (workspace_id);

-- insights: the insights page + dashboard read open (non-dismissed) insights
-- for a workspace, newest first.
create index if not exists insights_workspace_open_idx
  on public.insights (workspace_id, dismissed, created_at_db desc);

-- daily_performance already has a unique(workspace_id, client_id, date) index
-- that serves workspace-scoped reads; add a workspace+date index for the
-- workspace-wide, date-ordered dashboard scan.
create index if not exists daily_performance_workspace_date_idx
  on public.daily_performance (workspace_id, date);

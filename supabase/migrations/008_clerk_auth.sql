-- Migrate identity from Supabase Auth to Clerk (third-party auth integration).
--
-- Clerk user IDs are strings (e.g. "user_2abc..."), not UUIDs, and Supabase no
-- longer owns the auth.users table for this app. So:
--   1. Columns that stored a Supabase auth UUID become text holding the Clerk ID.
--   2. Foreign keys to auth.users are dropped (auth.users is no longer the source of truth).
--   3. RLS reads the Clerk user ID from the verified JWT via auth.jwt()->>'sub'
--      instead of auth.uid().
--
-- Requires the Clerk <-> Supabase third-party auth integration to be configured
-- (Clerk dashboard: enable Supabase integration; Supabase dashboard:
-- Authentication > Sign In / Providers > add Clerk with your Clerk domain).

-- 1. Drop policies that reference workspace_members.user_id directly, so the
--    column type can be altered. They are recreated at the end.
drop policy if exists "members can read connector sync runs" on public.connector_sync_runs;
drop policy if exists "members can insert connector sync runs" on public.connector_sync_runs;
drop policy if exists "members can update connector sync runs" on public.connector_sync_runs;

-- 2. Drop foreign keys to auth.users and widen the identity columns to text.
alter table public.workspace_members drop constraint if exists workspace_members_user_id_fkey;
alter table public.workspace_members alter column user_id type text using user_id::text;

alter table public.workspace_invites drop constraint if exists workspace_invites_invited_by_fkey;
alter table public.workspace_invites alter column invited_by type text using invited_by::text;

alter table public.report_deliveries drop constraint if exists report_deliveries_sent_by_fkey;
alter table public.report_deliveries alter column sent_by type text using sent_by::text;

-- 3. Re-point the membership helper functions at the Clerk subject claim.
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
      and user_id = (select auth.jwt()->>'sub')
  );
$$;

create or replace function public.is_workspace_admin(target_workspace_id uuid)
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
      and user_id = (select auth.jwt()->>'sub')
      and role in ('owner', 'admin')
  );
$$;

-- 4. Recreate the connector_sync_runs policies via the membership helper
--    (equivalent to the previous inline auth.uid() checks).
create policy "members can read connector sync runs" on public.connector_sync_runs
  for select using (public.is_workspace_member(workspace_id));

create policy "members can insert connector sync runs" on public.connector_sync_runs
  for insert with check (public.is_workspace_member(workspace_id));

create policy "members can update connector sync runs" on public.connector_sync_runs
  for update using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- Team invites for multi-user workspaces

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'member')),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create index if not exists workspace_invites_token_idx on public.workspace_invites (token);
create index if not exists workspace_invites_email_idx on public.workspace_invites (lower(email));

alter table public.workspace_invites enable row level security;

create policy "members can read workspace invites" on public.workspace_invites
  for select using (public.is_workspace_member(workspace_id));

-- Inserts/updates/deletes on invites are performed via service role in API routes.

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
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

create policy "admins can insert workspace members" on public.workspace_members
  for insert with check (public.is_workspace_admin(workspace_id));

create policy "admins can delete workspace members" on public.workspace_members
  for delete using (
    public.is_workspace_admin(workspace_id)
    and role <> 'owner'
  );

create policy "admins can update workspace members" on public.workspace_members
  for update using (public.is_workspace_admin(workspace_id))
  with check (
    public.is_workspace_admin(workspace_id)
    and role <> 'owner'
  );

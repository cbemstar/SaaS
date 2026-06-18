-- Billing lifecycle: track renewal date and pending cancellation so the UI can
-- show "renews on X" / "cancels on X", and so webhook-driven subscription
-- updates have somewhere to land. plan/status already exist on stripe_customers.

alter table public.stripe_customers
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false;

-- One billing row per workspace, so webhook upserts can converge on workspace_id.
create unique index if not exists stripe_customers_workspace_id_key
  on public.stripe_customers (workspace_id);

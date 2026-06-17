-- AI provider configuration (bring-your-own-key) + monthly credit metering.
--
-- Default provider is Google Gemini using Kōrero's shared key (GOOGLE_GENERATIVE_AI_API_KEY).
-- A workspace can instead bring its own key for any provider; BYOK calls bypass
-- Kōrero's metered credits (the customer pays their provider directly).
--
-- The stored BYOK key is encrypted at rest by the app (AES-256-GCM, see
-- lib/crypto.ts) — this column never holds plaintext. All access is via the
-- service role; RLS denies everything else.

alter table public.workspaces
  add column if not exists ai_byok_provider text,        -- null = use Kōrero default; else 'google' | 'openai' | 'anthropic'
  add column if not exists ai_byok_key_cipher text,       -- AES-GCM ciphertext of the API key (never plaintext)
  add column if not exists ai_byok_model text,            -- e.g. 'gemini-2.5-flash', 'llama-3.3-70b-versatile'
  add column if not exists ai_byok_base_url text,         -- OpenAI-compatible base URL (Groq, OpenRouter, …)
  add column if not exists ai_byok_key_hint text;         -- last 4 chars, safe to show in UI

-- One row per workspace per calendar month (UTC). credits_used counts AI
-- generations that drew on Kōrero's shared provider key.
create table if not exists public.ai_usage (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  period text not null,                                   -- 'YYYY-MM' (UTC)
  credits_used integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, period)
);

alter table public.ai_usage enable row level security;
-- Reads/writes happen through the service role in server code; deny by default.

-- Atomic increment so concurrent generations can't lose a count. Returns the
-- new running total for the period.
create or replace function public.increment_ai_usage(
  p_workspace_id uuid,
  p_period text,
  p_amount integer default 1
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total integer;
begin
  insert into public.ai_usage (workspace_id, period, credits_used, updated_at)
  values (p_workspace_id, p_period, p_amount, now())
  on conflict (workspace_id, period)
  do update set credits_used = public.ai_usage.credits_used + p_amount,
                updated_at = now()
  returning credits_used into new_total;

  return new_total;
end;
$$;

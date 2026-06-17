import type { LanguageModel } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { aiDefaultModel, googleAiApiKey } from "@/lib/env";
import { decryptSecret } from "@/lib/crypto";
import type { WorkspaceRow } from "@/lib/supabase/types";

export type ResolvedAi = {
  model: LanguageModel;
  byok: boolean;
  label: string;
};

type ByokConfig = Pick<
  WorkspaceRow,
  "ai_byok_provider" | "ai_byok_key_cipher" | "ai_byok_model" | "ai_byok_base_url"
> | null | undefined;

const DEFAULT_MODELS = {
  google: "gemini-2.5-flash",
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-6",
} as const;

function byokModel(workspace: ByokConfig): ResolvedAi | null {
  if (!workspace?.ai_byok_provider || !workspace.ai_byok_key_cipher) return null;
  const apiKey = decryptSecret(workspace.ai_byok_key_cipher);
  if (!apiKey) return null;

  switch (workspace.ai_byok_provider) {
    case "google": {
      const provider = createGoogleGenerativeAI({ apiKey });
      return { model: provider(workspace.ai_byok_model || DEFAULT_MODELS.google), byok: true, label: "Google Gemini (your key)" };
    }
    case "anthropic": {
      const provider = createAnthropic({ apiKey });
      return { model: provider(workspace.ai_byok_model || DEFAULT_MODELS.anthropic), byok: true, label: "Anthropic (your key)" };
    }
    case "openai": {
      const provider = createOpenAI({ apiKey, baseURL: workspace.ai_byok_base_url || undefined });
      return { model: provider(workspace.ai_byok_model || DEFAULT_MODELS.openai), byok: true, label: "Custom provider (your key)" };
    }
    default:
      return null;
  }
}

/**
 * Resolve the language model for a workspace. Prefers the workspace's own key
 * (BYOK) when set, otherwise falls back to Kōrero's default Google Gemini key.
 * Returns null when no provider is configured at all.
 */
export function resolveAiModel(workspace: ByokConfig): ResolvedAi | null {
  return byokModel(workspace) ?? defaultModel();
}

function defaultModel(): ResolvedAi | null {
  if (!googleAiApiKey) return null;
  const provider = createGoogleGenerativeAI({ apiKey: googleAiApiKey });
  return { model: provider(aiDefaultModel), byok: false, label: "Kōrero AI (Gemini)" };
}

/** True if a workspace can run AI at all (own key or Kōrero default key present). */
export function isAiConfigured(workspace: ByokConfig): boolean {
  return Boolean((workspace?.ai_byok_provider && workspace?.ai_byok_key_cipher) || googleAiApiKey);
}

/** True if the workspace is using its own key (BYOK) for AI. */
export function workspaceUsesByok(workspace: ByokConfig): boolean {
  return Boolean(workspace?.ai_byok_provider && workspace?.ai_byok_key_cipher);
}

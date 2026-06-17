import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireWorkspaceId } from "@/lib/workspace";
import { encryptSecret, isEncryptionConfigured } from "@/lib/crypto";

/** Bring-your-own-key AI provider config. The API key is encrypted at rest and
 *  never returned to the client — only a masked hint. */

const saveSchema = z.object({
  provider: z.enum(["google", "openai", "anthropic"]),
  apiKey: z.string().min(8, "Enter a valid API key").max(400),
  model: z.string().max(120).optional(),
  baseUrl: z.string().url().max(400).optional(),
});

export async function GET() {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const { data } = await admin
    .from("workspaces")
    .select("ai_byok_provider, ai_byok_model, ai_byok_base_url, ai_byok_key_hint, ai_byok_key_cipher")
    .eq("id", workspaceId)
    .single();

  return NextResponse.json({
    byok: {
      provider: data?.ai_byok_provider ?? null,
      model: data?.ai_byok_model ?? null,
      baseUrl: data?.ai_byok_base_url ?? null,
      keyHint: data?.ai_byok_key_hint ?? null,
      hasKey: Boolean(data?.ai_byok_key_cipher),
      encryptionConfigured: isEncryptionConfigured(),
    },
  });
}

export async function PUT(request: Request) {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isEncryptionConfigured()) {
    return NextResponse.json(
      { error: "Server is missing AI_KEY_SECRET — BYOK key storage is disabled." },
      { status: 503 },
    );
  }

  let payload: z.infer<typeof saveSchema>;
  try {
    payload = saveSchema.parse(await request.json());
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request";
    return NextResponse.json({ error: message ?? "Invalid request" }, { status: 400 });
  }

  const cipher = encryptSecret(payload.apiKey.trim());
  if (!cipher) {
    return NextResponse.json({ error: "Could not secure the API key" }, { status: 500 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const trimmedKey = payload.apiKey.trim();
  const { error } = await admin
    .from("workspaces")
    .update({
      ai_byok_provider: payload.provider,
      ai_byok_key_cipher: cipher,
      ai_byok_key_hint: trimmedKey.slice(-4),
      ai_byok_model: payload.model?.trim() || null,
      ai_byok_base_url: payload.provider === "openai" ? payload.baseUrl?.trim() || null : null,
    })
    .eq("id", workspaceId);

  if (error) {
    console.error("Failed to save BYOK config", error);
    return NextResponse.json({ error: "Could not save API key" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const { error } = await admin
    .from("workspaces")
    .update({
      ai_byok_provider: null,
      ai_byok_key_cipher: null,
      ai_byok_key_hint: null,
      ai_byok_model: null,
      ai_byok_base_url: null,
    })
    .eq("id", workspaceId);

  if (error) {
    return NextResponse.json({ error: "Could not remove API key" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

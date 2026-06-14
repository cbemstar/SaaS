import { auth, currentUser } from "@clerk/nextjs/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureDefaultConnectors, ensureDefaultReportTemplates } from "@/lib/billing";
import type { WorkspaceRow } from "@/lib/supabase/types";

function workspaceNameFromEmail(email?: string | null) {
  if (!email) {
    return "My agency";
  }

  const domain = email.split("@")[1]?.split(".")[0];
  if (!domain) {
    return "My agency";
  }

  return `${domain.charAt(0).toUpperCase()}${domain.slice(1)} workspace`;
}

/** Cheap auth check — Clerk user id from the session, no Clerk API call. */
export async function getAuthUserId() {
  const { userId } = await auth();
  return userId;
}

/** Full authenticated user including email (one Clerk API call). */
export async function getAuthenticatedUser() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? null;

  return { id: userId, email };
}

export async function getWorkspaceIdForUser(userId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return null;
  }

  const { data, error } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to resolve workspace for user", error);
    return null;
  }

  return data?.workspace_id ?? null;
}

export async function getActiveWorkspaceId() {
  const userId = await getAuthUserId();
  if (!userId) {
    return null;
  }

  return getWorkspaceIdForUser(userId);
}

export async function getWorkspace(workspaceId: string): Promise<WorkspaceRow | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return null;
  }

  const { data, error } = await admin.from("workspaces").select("*").eq("id", workspaceId).maybeSingle();
  if (error) {
    console.error("Failed to load workspace", error);
    return null;
  }

  return data;
}

export async function getActiveWorkspace(): Promise<WorkspaceRow | null> {
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) {
    return null;
  }

  return getWorkspace(workspaceId);
}

export async function getClientCount(workspaceId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return 0;
  }

  const { count, error } = await admin
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("Failed to count clients", error);
    return 0;
  }

  return count ?? 0;
}

export async function getPostLoginPath() {
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) {
    return "/onboarding";
  }

  const workspace = await getWorkspace(workspaceId);
  if (!workspace?.onboarded) {
    return "/onboarding";
  }

  const clientCount = await getClientCount(workspaceId);
  if (clientCount === 0) {
    return "/clients?welcome=1";
  }

  return "/dashboard";
}

export async function ensureWorkspaceForUser(userId: string, email?: string | null) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase is not configured");
  }

  const existingWorkspaceId = await getWorkspaceIdForUser(userId);
  if (existingWorkspaceId) {
    return {
      workspaceId: existingWorkspaceId,
      seeded: false,
      mode: "supabase" as const,
    };
  }

  const { data: workspace, error: workspaceError } = await admin
    .from("workspaces")
    .insert({
      name: workspaceNameFromEmail(email),
      timezone: "Pacific/Auckland",
      currency: "NZD",
      onboarded: false,
    })
    .select("id")
    .single();

  if (workspaceError || !workspace) {
    console.error("Failed to create workspace", workspaceError);
    throw workspaceError ?? new Error("Workspace creation failed");
  }

  const { error: memberError } = await admin.from("workspace_members").insert({
    workspace_id: workspace.id,
    user_id: userId,
    role: "owner",
  });

  if (memberError) {
    console.error("Failed to create workspace membership", memberError);
    throw memberError;
  }

  await ensureDefaultConnectors(workspace.id);
  await ensureDefaultReportTemplates(workspace.id);

  return {
    workspaceId: workspace.id,
    seeded: false,
    mode: "supabase" as const,
  };
}

export async function requireWorkspaceId() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return null;
  }

  const workspaceId = await getWorkspaceIdForUser(user.id);
  if (workspaceId) {
    return workspaceId;
  }

  const provisioned = await ensureWorkspaceForUser(user.id, user.email);
  return provisioned.workspaceId;
}

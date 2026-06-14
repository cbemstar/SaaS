import { Resend } from "resend";
import { clerkClient } from "@clerk/nextjs/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { appUrl, resendApiKey } from "@/lib/env";
import type { WorkspaceMemberRow } from "@/lib/supabase/types";

export type WorkspaceRole = WorkspaceMemberRow["role"];
export type InviteRole = "admin" | "member";

export type TeamMember = {
  userId: string;
  email: string | null;
  role: WorkspaceRole;
  joinedAt: string;
};

export type PendingInvite = {
  id: string;
  email: string;
  role: InviteRole;
  expiresAt: string;
  createdAt: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getMemberRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  return data?.role ?? null;
}

export function canManageTeam(role: WorkspaceRole | null) {
  return role === "owner" || role === "admin";
}

async function getUserEmail(userId: string) {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
  } catch (error) {
    console.error("Failed to resolve user email from Clerk", error);
    return null;
  }
}

export async function listTeamMembers(workspaceId: string): Promise<TeamMember[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  const { data: members, error } = await admin
    .from("workspace_members")
    .select("user_id, role, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error || !members?.length) return [];

  const enriched = await Promise.all(
    members.map(async (member) => ({
      userId: member.user_id,
      email: await getUserEmail(member.user_id),
      role: member.role as WorkspaceRole,
      joinedAt: member.created_at,
    })),
  );

  return enriched;
}

export async function listPendingInvites(workspaceId: string): Promise<PendingInvite[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("workspace_invites")
    .select("id, email, role, expires_at, created_at")
    .eq("workspace_id", workspaceId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role as InviteRole,
    expiresAt: invite.expires_at,
    createdAt: invite.created_at,
  }));
}

async function isEmailAlreadyMember(workspaceId: string, email: string) {
  const members = await listTeamMembers(workspaceId);
  const normalized = normalizeEmail(email);
  return members.some((member) => member.email && normalizeEmail(member.email) === normalized);
}

export async function createWorkspaceInvite(
  workspaceId: string,
  invitedBy: string,
  input: { email: string; role: InviteRole },
) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Database is not configured");
  }

  const email = normalizeEmail(input.email);
  if (!email.includes("@")) {
    throw new Error("Enter a valid email address");
  }

  if (await isEmailAlreadyMember(workspaceId, email)) {
    throw new Error("This person is already on your team");
  }

  const workspace = await admin.from("workspaces").select("name").eq("id", workspaceId).maybeSingle();
  const workspaceName = workspace.data?.name ?? "your agency";

  await admin
    .from("workspace_invites")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("email", email)
    .is("accepted_at", null);

  const { data: invite, error } = await admin
    .from("workspace_invites")
    .insert({
      workspace_id: workspaceId,
      email,
      role: input.role,
      invited_by: invitedBy,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id, token, email, role, expires_at")
    .single();

  if (error || !invite) {
    console.error("Failed to create invite", error);
    throw new Error("Could not create invite");
  }

  const inviteUrl = `${appUrl}/login?invite=${invite.token}`;

  if (resendApiKey) {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: "Kōrero <onboarding@resend.dev>",
      to: email,
      subject: `You've been invited to ${workspaceName} on Kōrero`,
      html: `<p>You've been invited to join <strong>${workspaceName}</strong> on Kōrero as a <strong>${input.role}</strong>.</p><p><a href="${inviteUrl}">Accept invitation</a></p><p>This link expires in 7 days.</p>`,
    });
  }

  return {
    invite: {
      id: invite.id,
      email: invite.email,
      role: invite.role as InviteRole,
      expiresAt: invite.expires_at,
    },
    inviteUrl,
    emailed: Boolean(resendApiKey),
  };
}

export async function revokeWorkspaceInvite(workspaceId: string, inviteId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Database is not configured");
  }

  const { error } = await admin
    .from("workspace_invites")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", inviteId)
    .is("accepted_at", null);

  if (error) {
    console.error("Failed to revoke invite", error);
    throw new Error("Could not revoke invite");
  }
}

export async function acceptWorkspaceInvite(
  userId: string,
  userEmail: string | null | undefined,
  token?: string,
) {
  const admin = createSupabaseAdminClient();
  if (!admin || !userEmail) {
    return null;
  }

  const normalizedEmail = normalizeEmail(userEmail);

  let inviteQuery = admin
    .from("workspace_invites")
    .select("id, workspace_id, email, role, expires_at, accepted_at")
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString());

  if (token) {
    inviteQuery = inviteQuery.eq("token", token);
  } else {
    inviteQuery = inviteQuery.eq("email", normalizedEmail);
  }

  const { data: invite, error } = await inviteQuery.maybeSingle();
  if (error || !invite) {
    return null;
  }

  if (normalizeEmail(invite.email) !== normalizedEmail) {
    throw new Error("This invitation was sent to a different email address");
  }

  const existingWorkspace = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingWorkspace.data?.workspace_id) {
    if (existingWorkspace.data.workspace_id === invite.workspace_id) {
      await admin
        .from("workspace_invites")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invite.id);
      return { workspaceId: invite.workspace_id, alreadyMember: true as const };
    }
    throw new Error("You already belong to another workspace");
  }

  const { error: memberError } = await admin.from("workspace_members").insert({
    workspace_id: invite.workspace_id,
    user_id: userId,
    role: invite.role,
  });

  if (memberError) {
    console.error("Failed to accept invite", memberError);
    throw new Error("Could not join workspace");
  }

  await admin.from("workspace_invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);

  return { workspaceId: invite.workspace_id, alreadyMember: false as const };
}

export async function removeTeamMember(workspaceId: string, targetUserId: string, actorUserId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Database is not configured");
  }

  if (targetUserId === actorUserId) {
    throw new Error("You cannot remove yourself from the team");
  }

  const { data: target } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!target) {
    throw new Error("Team member not found");
  }

  if (target.role === "owner") {
    throw new Error("The workspace owner cannot be removed");
  }

  const { error } = await admin
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", targetUserId);

  if (error) {
    console.error("Failed to remove team member", error);
    throw new Error("Could not remove team member");
  }

}

export async function getInvitePreview(token: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from("workspace_invites")
    .select("workspace_id, email, role, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (!data || data.accepted_at || new Date(data.expires_at) < new Date()) {
    return null;
  }

  const { data: workspace } = await admin.from("workspaces").select("name").eq("id", data.workspace_id).maybeSingle();

  return {
    email: data.email,
    role: data.role as InviteRole,
    workspaceName: workspace?.name ?? "an agency workspace",
  };
}

export async function bootstrapUserWorkspace(
  userId: string,
  email: string | null | undefined,
  inviteToken?: string,
) {
  const { getWorkspaceIdForUser, ensureWorkspaceForUser } = await import("@/lib/workspace");

  const existingWorkspaceId = await getWorkspaceIdForUser(userId);
  if (existingWorkspaceId) {
    return {
      workspaceId: existingWorkspaceId,
      joinedViaInvite: false,
      mode: "supabase" as const,
    };
  }

  if (inviteToken) {
    try {
      const accepted = await acceptWorkspaceInvite(userId, email, inviteToken);
      if (accepted) {
        return {
          workspaceId: accepted.workspaceId,
          joinedViaInvite: true,
          mode: "supabase" as const,
        };
      }
      throw new Error("Invitation is invalid or has expired");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not accept invitation";
      throw new Error(message);
    }
  }

  if (email) {
    try {
      const acceptedByEmail = await acceptWorkspaceInvite(userId, email);
      if (acceptedByEmail) {
        return {
          workspaceId: acceptedByEmail.workspaceId,
          joinedViaInvite: true,
          mode: "supabase" as const,
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not accept invitation";
      throw new Error(message);
    }
  }

  const provisioned = await ensureWorkspaceForUser(userId, email);
  return {
    workspaceId: provisioned.workspaceId,
    joinedViaInvite: false,
    mode: provisioned.mode,
  };
}

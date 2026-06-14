import { NextResponse } from "next/server";
import { canManageTeam, getMemberRole, revokeWorkspaceInvite } from "@/lib/team";
import { getAuthenticatedUser, requireWorkspaceId } from "@/lib/workspace";

type RouteContext = { params: Promise<{ inviteId: string }> };

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getAuthenticatedUser();
  const workspaceId = await requireWorkspaceId();
  const { inviteId } = await params;

  if (!user || !workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getMemberRole(workspaceId, user.id);
  if (!canManageTeam(role)) {
    return NextResponse.json({ error: "Only owners and admins can revoke invites" }, { status: 403 });
  }

  try {
    await revokeWorkspaceInvite(workspaceId, inviteId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not revoke invite";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

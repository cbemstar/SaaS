import { NextResponse } from "next/server";
import { canManageTeam, getMemberRole, removeTeamMember } from "@/lib/team";
import { getAuthenticatedUser, requireWorkspaceId } from "@/lib/workspace";

type RouteContext = { params: Promise<{ userId: string }> };

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getAuthenticatedUser();
  const workspaceId = await requireWorkspaceId();
  const { userId } = await params;

  if (!user || !workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getMemberRole(workspaceId, user.id);
  if (!canManageTeam(role)) {
    return NextResponse.json({ error: "Only owners and admins can remove teammates" }, { status: 403 });
  }

  try {
    await removeTeamMember(workspaceId, userId, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not remove team member";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

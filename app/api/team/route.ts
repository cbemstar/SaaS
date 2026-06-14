import { NextResponse } from "next/server";
import { canManageTeam, getMemberRole, listPendingInvites, listTeamMembers } from "@/lib/team";
import { getAuthenticatedUser, requireWorkspaceId } from "@/lib/workspace";

export async function GET() {
  const user = await getAuthenticatedUser();
  const workspaceId = await requireWorkspaceId();

  if (!user || !workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getMemberRole(workspaceId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Not a workspace member" }, { status: 403 });
  }

  const [members, invites] = await Promise.all([
    listTeamMembers(workspaceId),
    canManageTeam(role) ? listPendingInvites(workspaceId) : Promise.resolve([]),
  ]);

  return NextResponse.json({
    members,
    invites,
    currentUser: {
      id: user.id,
      email: user.email ?? null,
      role,
      canManageTeam: canManageTeam(role),
    },
  });
}

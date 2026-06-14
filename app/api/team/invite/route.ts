import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageTeam, createWorkspaceInvite, getMemberRole } from "@/lib/team";
import { getAuthenticatedUser, getActiveWorkspace, requireWorkspaceId } from "@/lib/workspace";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
});

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  const workspaceId = await requireWorkspaceId();

  if (!user || !workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getMemberRole(workspaceId, user.id);
  if (!canManageTeam(role)) {
    return NextResponse.json({ error: "Only owners and admins can invite teammates" }, { status: 403 });
  }

  let payload: z.infer<typeof inviteSchema>;
  try {
    payload = inviteSchema.parse(await request.json());
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request";
    return NextResponse.json({ error: message ?? "Invalid request" }, { status: 400 });
  }

  try {
    const workspace = await getActiveWorkspace();
    const result = await createWorkspaceInvite(workspaceId, user.id, payload);
    return NextResponse.json({
      ...result,
      workspaceName: workspace?.name ?? "your workspace",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create invite";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

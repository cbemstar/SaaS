import { NextResponse } from "next/server";
import { z } from "zod";
import { bootstrapUserWorkspace } from "@/lib/team";
import { getAuthenticatedUser } from "@/lib/workspace";

const bootstrapSchema = z.object({
  inviteToken: z.string().optional(),
});

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let inviteToken: string | undefined;
  const rawBody = await request.text();
  if (rawBody) {
    try {
      inviteToken = bootstrapSchema.parse(JSON.parse(rawBody)).inviteToken;
    } catch {
      inviteToken = undefined;
    }
  }

  try {
    const result = await bootstrapUserWorkspace(user.id, user.email, inviteToken);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Workspace bootstrap failed", error);
    const message = error instanceof Error ? error.message : "Workspace bootstrap failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

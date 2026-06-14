import { NextResponse, type NextRequest } from "next/server";
import { getInvitePreview } from "@/lib/team";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing invite token" }, { status: 400 });
  }

  const preview = await getInvitePreview(token);
  if (!preview) {
    return NextResponse.json({ error: "Invite not found or expired" }, { status: 404 });
  }

  return NextResponse.json({ preview });
}

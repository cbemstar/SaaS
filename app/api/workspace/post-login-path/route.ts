import { NextResponse } from "next/server";
import { getPostLoginPath } from "@/lib/workspace";

export async function GET() {
  const path = await getPostLoginPath();
  return NextResponse.json({ path });
}

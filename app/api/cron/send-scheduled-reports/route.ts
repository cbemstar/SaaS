import { NextResponse, type NextRequest } from "next/server";
import { processDueScheduledReports } from "@/lib/scheduled-reports";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processDueScheduledReports();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Scheduled report cron failed", error);
    return NextResponse.json({ error: "Scheduled report send failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { channels, type ChannelKey } from "@/lib/catalog";
import { isConnectorKey } from "@/lib/connectors";
import { getConnectorRateLimitInfo } from "@/lib/connector-rate-limits";
import { syncConnectorChannel } from "@/lib/connectors/sync-workspace";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireWorkspaceId } from "@/lib/workspace";

type RouteContext = { params: Promise<{ channel: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { channel: channelParam } = await context.params;
  if (!isConnectorKey(channelParam)) {
    return NextResponse.json({ error: "Unknown connector" }, { status: 404 });
  }

  const channel: ChannelKey = channelParam;
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }

  const { data: connector } = await admin
    .from("connector_accounts")
    .select("status")
    .eq("workspace_id", workspaceId)
    .eq("channel", channel)
    .maybeSingle();

  if (!connector || connector.status === "disconnected") {
    return NextResponse.json({ error: `${channels[channel].label} is not connected` }, { status: 400 });
  }

  if (channel === "google_ads" && !process.env.GOOGLE_ADS_DEVELOPER_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Google Ads sync needs GOOGLE_ADS_DEVELOPER_TOKEN in Vercel environment variables. Apply for a developer token in Google Ads API Center, then add it and sync again.",
      },
      { status: 503 },
    );
  }

  const result = await syncConnectorChannel(admin, workspaceId, channel);
  const rateLimit = getConnectorRateLimitInfo(channel);
  const label = channels[channel].label;

  let message: string;
  if (result.rowsImported > 0) {
    message = `Imported ${result.rowsImported} day${result.rowsImported === 1 ? "" : "s"} for ${result.syncedClients} client${result.syncedClients === 1 ? "" : "s"}.`;
  } else if (result.clearedClients > 0) {
    message = `${label} is connected, but the mapped account returned no data in the last 30 days. Cleared stale metrics for ${result.clearedClients} client${result.clearedClients === 1 ? "" : "s"}.`;
  } else if (result.skippedClients > 0) {
    message = `No ${label} data imported. Add ${label} to the client's tracked channels, map the account under Client settings, then sync again.`;
  } else {
    message = `No ${label} data imported. Map client accounts and try again.`;
  }

  return NextResponse.json({
    ...result,
    channel,
    rateLimit,
    message,
  });
}

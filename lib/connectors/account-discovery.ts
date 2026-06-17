import type { ChannelKey } from "@/lib/catalog";
import { listGa4Properties } from "@/lib/connectors/ga4";
import { getGoogleAccessToken } from "@/lib/connectors/google-auth";
import { listSearchConsoleSites } from "@/lib/connectors/search-console";
import { readConnectorTokens } from "@/lib/connectors/store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type DiscoveredAccount = {
  id: string;
  name: string;
};

async function getConnectorToken(workspaceId: string, channel: ChannelKey) {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { access_token } = await readConnectorTokens(admin, workspaceId, channel);
  return access_token;
}

async function listMetaAdAccounts(accessToken: string): Promise<DiscoveredAccount[]> {
  const params = new URLSearchParams({
    fields: "id,name,account_id",
    limit: "50",
    access_token: accessToken,
  });

  const response = await fetch(`https://graph.facebook.com/v20.0/me/adaccounts?${params.toString()}`);
  if (!response.ok) return [];

  const payload = (await response.json()) as {
    data?: Array<{ id: string; name?: string; account_id?: string }>;
  };

  return (payload.data ?? []).map((account) => ({
    id: account.account_id ?? account.id.replace("act_", ""),
    name: account.name ?? account.id,
  }));
}

async function listGoogleAdsCustomers(accessToken: string): Promise<DiscoveredAccount[]> {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) return [];

  const response = await fetch("https://googleads.googleapis.com/v18/customers:listAccessibleCustomers", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": developerToken,
    },
  });

  if (!response.ok) return [];

  const payload = (await response.json()) as { resourceNames?: string[] };
  return (payload.resourceNames ?? []).map((resource) => {
    const id = resource.replace("customers/", "");
    return { id, name: `Customer ${id}` };
  });
}

export async function discoverConnectorAccounts(
  workspaceId: string,
  channel: ChannelKey,
): Promise<{ accounts: DiscoveredAccount[]; manualEntry: boolean; error?: string }> {
  const accessToken = await getConnectorToken(workspaceId, channel);
  if (!accessToken) {
    return { accounts: [], manualEntry: true, error: "Connector not connected" };
  }

  switch (channel) {
    case "meta": {
      const accounts = await listMetaAdAccounts(accessToken);
      return { accounts, manualEntry: accounts.length === 0 };
    }
    case "google_ads": {
      const accounts = await listGoogleAdsCustomers(accessToken);
      return { accounts, manualEntry: accounts.length === 0 };
    }
    case "ga4": {
      const admin = createSupabaseAdminClient();
      if (!admin) {
        return { accounts: [], manualEntry: true, error: "Database is not configured" };
      }
      const token = await getGoogleAccessToken(admin, workspaceId, "ga4");
      if (!token) {
        return { accounts: [], manualEntry: true, error: "Connector not connected" };
      }
      const accounts = await listGa4Properties(token);
      return { accounts, manualEntry: accounts.length === 0 };
    }
    case "search_console": {
      const admin = createSupabaseAdminClient();
      if (!admin) {
        return { accounts: [], manualEntry: true, error: "Database is not configured" };
      }
      const token = await getGoogleAccessToken(admin, workspaceId, "search_console");
      if (!token) {
        return { accounts: [], manualEntry: true, error: "Connector not connected" };
      }
      const accounts = await listSearchConsoleSites(token);
      return { accounts, manualEntry: accounts.length === 0 };
    }
    case "linkedin":
    case "tiktok":
      return { accounts: [], manualEntry: true };
    default: {
      const exhaustive: never = channel;
      return exhaustive;
    }
  }
}

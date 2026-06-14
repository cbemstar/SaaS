import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isConnectorKey } from "@/lib/connectors";
import { connectorRedirectUri, exchangeOAuthCode } from "@/lib/connectors/oauth-exchange";
import { upsertConnectorAccount, upsertConnectorToken } from "@/lib/connectors/store";

const oauthWorkspaceCookie = "korero_oauth_workspace";
const oauthStateCookie = "korero_oauth_state";

type RouteContext = {
  params: Promise<{ channel: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { channel } = await params;
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");
  const returnedState = request.nextUrl.searchParams.get("state");
  const workspaceId = request.cookies.get(oauthWorkspaceCookie)?.value;
  const expectedState = request.cookies.get(oauthStateCookie)?.value;

  if (!isConnectorKey(channel)) {
    return NextResponse.json({ error: "Unknown connector" }, { status: 404 });
  }

  if (oauthError || !code) {
    return NextResponse.redirect(new URL(`/connectors?error=${channel}`, request.url));
  }

  if (!workspaceId) {
    return NextResponse.redirect(new URL("/login?next=%2Fconnectors", request.url));
  }

  // Reject callbacks that don't match the state we issued in /start — defends
  // against OAuth CSRF (an attacker binding their account/code to this workspace).
  if (!expectedState || !returnedState || expectedState !== returnedState) {
    const response = NextResponse.redirect(
      new URL(`/connectors?error=${channel}&reason=state`, request.url),
    );
    response.cookies.delete(oauthWorkspaceCookie);
    response.cookies.delete(oauthStateCookie);
    return response;
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.redirect(new URL(`/connectors?error=${channel}&reason=db`, request.url));
  }

  const redirectUri = connectorRedirectUri(channel);
  const exchange = await exchangeOAuthCode(channel, code, redirectUri);

  if (!exchange.ok) {
    await upsertConnectorAccount(supabase, workspaceId, channel, {
      status: "action_required",
      description: `Connection failed: ${exchange.error}. Check redirect URI and app credentials.`,
      accounts: 0,
      lastSync: "Connection failed",
    });

    const response = NextResponse.redirect(
      new URL(`/connectors?error=${channel}&reason=token`, request.url),
    );
    response.cookies.delete(oauthWorkspaceCookie);
    response.cookies.delete(oauthStateCookie);
    return response;
  }

  const tokenResult = await upsertConnectorToken(supabase, workspaceId, channel, exchange.tokens);
  if (tokenResult.error) {
    console.error("Failed to store connector token", tokenResult.error);
    const response = NextResponse.redirect(new URL(`/connectors?error=${channel}&reason=save`, request.url));
    response.cookies.delete(oauthWorkspaceCookie);
    response.cookies.delete(oauthStateCookie);
    return response;
  }

  const expiresAt = exchange.tokens.expires_in
    ? new Date(Date.now() + exchange.tokens.expires_in * 1000).toISOString()
    : null;

  const accountResult = await upsertConnectorAccount(supabase, workspaceId, channel, {
    status: "connected",
    description: "Connected. Run Sync to pull the latest metrics.",
    accounts: 1,
    lastSync: "Just connected",
    tokenExpiresAt: expiresAt,
  });

  if (accountResult.error) {
    console.error("Failed to store connector account", accountResult.error);
    const response = NextResponse.redirect(new URL(`/connectors?error=${channel}&reason=save`, request.url));
    response.cookies.delete(oauthWorkspaceCookie);
    response.cookies.delete(oauthStateCookie);
    return response;
  }

  const response = NextResponse.redirect(new URL(`/connectors?connected=${channel}`, request.url));
  response.cookies.delete(oauthWorkspaceCookie);
  response.cookies.delete(oauthStateCookie);
  return response;
}

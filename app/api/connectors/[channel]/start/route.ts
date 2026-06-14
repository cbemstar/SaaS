import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { connectorHasCredentials, getConnectorAuthorizeUrl, isConnectorKey } from "@/lib/connectors";
import { requireWorkspaceId } from "@/lib/workspace";

const oauthWorkspaceCookie = "korero_oauth_workspace";
const oauthStateCookie = "korero_oauth_state";

type RouteContext = {
  params: Promise<{ channel: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { channel } = await params;

  if (!isConnectorKey(channel)) {
    return NextResponse.json({ error: "Unknown connector" }, { status: 404 });
  }

  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.redirect(new URL("/login?next=%2Fconnectors", _request.url));
  }

  if (!connectorHasCredentials(channel)) {
    return NextResponse.json(
      {
        error: "Connector credentials are not configured",
        nextStep: "Add the provider client ID/secret environment variables before starting OAuth.",
      },
      { status: 400 },
    );
  }

  const state = randomUUID();
  const response = NextResponse.redirect(getConnectorAuthorizeUrl(channel, state));
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
  };
  response.cookies.set(oauthWorkspaceCookie, workspaceId, cookieOptions);
  // Bind the provider redirect to this browser session so a forged callback
  // cannot attach an attacker's account (or code) to the victim's workspace.
  response.cookies.set(oauthStateCookie, state, cookieOptions);

  return response;
}

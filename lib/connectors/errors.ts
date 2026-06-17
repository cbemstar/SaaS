import type { ChannelKey } from "@/lib/catalog";

/**
 * Thrown by a connector fetcher when the provider rejects our credentials
 * (HTTP 401/403, or a provider-specific token-expired code). Distinguishes a
 * "you need to reconnect" failure from a transient error or a genuinely empty
 * result — so sync can flag the connector action_required instead of silently
 * importing nothing (or, worse, treating it as "no data").
 */
export class ConnectorAuthError extends Error {
  channel: ChannelKey;
  status?: number;
  constructor(channel: ChannelKey, status?: number) {
    super(`${channel} authorization failed${status ? ` (HTTP ${status})` : ""}`);
    this.name = "ConnectorAuthError";
    this.channel = channel;
    this.status = status;
  }
}

export function isConnectorAuthError(error: unknown): error is ConnectorAuthError {
  return error instanceof ConnectorAuthError;
}

/** Throw a ConnectorAuthError if an HTTP status indicates expired/invalid auth. */
export function throwIfAuthStatus(channel: ChannelKey, status: number) {
  if (status === 401 || status === 403) {
    throw new ConnectorAuthError(channel, status);
  }
}

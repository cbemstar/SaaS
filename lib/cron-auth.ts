import { timingSafeEqual } from "crypto";

/**
 * Validates the bearer token on a cron/webhook request against CRON_SECRET.
 *
 * Fails CLOSED: if CRON_SECRET is not configured, every request is rejected.
 * A missing secret must never mean "open to the public" for an endpoint that
 * can send emails, sync connectors, or mutate every workspace.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    console.error("CRON_SECRET is not configured; rejecting cron request.");
    return false;
  }

  const providedSecret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!providedSecret) {
    return false;
  }

  const expected = Buffer.from(expectedSecret);
  const provided = Buffer.from(providedSecret);

  // timingSafeEqual throws on length mismatch, so guard first.
  if (expected.length !== provided.length) {
    return false;
  }

  return timingSafeEqual(expected, provided);
}

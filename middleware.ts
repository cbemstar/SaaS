import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Authenticated areas of the app. Everything else (landing, /login, /sign-up,
// /privacy, /terms, /waitlist, Clerk's own routes, and webhooks) stays public.
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/insights(.*)",
  "/clients(.*)",
  "/reports(.*)",
  "/connectors(.*)",
  "/settings(.*)",
  "/onboarding(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    // Redirects unauthenticated users to NEXT_PUBLIC_CLERK_SIGN_IN_URL (/login).
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|gif|png|svg|ico|webp|woff2?|ttf|otf|eot|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for Clerk's auto-proxy path and API routes.
    "/__clerk/:path*",
    "/(api|trpc)(.*)",
  ],
};

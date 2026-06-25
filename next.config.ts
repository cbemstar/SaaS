import type { NextConfig } from "next";

// Content-Security-Policy with allowlists for the third parties we load: Clerk
// (auth), Stripe (payments), Supabase (data), Google Fonts, AI providers and
// Vercel analytics.
//
// Shipped as **Report-Only** so it CANNOT break auth/payments — the browser only
// reports violations (DevTools console / report-uri) instead of blocking. Watch
// for violations in production, refine the lists, then enforce by renaming the
// header key to "Content-Security-Policy" (see headers() below).
const csp = [
  "default-src 'self'",
  // 'unsafe-inline'/'unsafe-eval' are required by Next's inline runtime + Clerk;
  // tighten to nonces in a later pass if desired.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://js.stripe.com https://challenges.cloudflare.com https://*.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co https://*.clerk.accounts.dev https://*.clerk.com https://api.stripe.com https://*.upstash.io https://generativelanguage.googleapis.com https://api.anthropic.com https://api.openai.com https://vitals.vercel-insights.com",
  "frame-src 'self' https://js.stripe.com https://*.clerk.com https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

// Baseline security headers applied to every route.
const securityHeaders = [
  // CSP in observe-only mode. Flip the key to "Content-Security-Policy" to enforce.
  { key: "Content-Security-Policy-Report-Only", value: csp },
  // Force HTTPS for two years incl. subdomains; eligible for browser preload lists.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Block MIME sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking protection — allow framing only from our own origin.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Don't leak full URLs to third parties.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Drop powerful APIs we don't use.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  // Don't advertise the framework/version.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

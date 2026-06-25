import type { NextConfig } from "next";

// Baseline security headers applied to every route. A strict Content-Security-Policy
// is intentionally omitted here: with Clerk, Stripe, Supabase and Google Fonts loading
// across surfaces it needs per-source allowlisting + testing, so it's a separate
// hardening step rather than a guess that breaks auth/payments.
const securityHeaders = [
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

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
export const hasSupabaseAdminConfig = Boolean(supabaseUrl && supabaseServiceRoleKey);

export const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const resendApiKey = process.env.RESEND_API_KEY;
export const notificationEmail = process.env.NOTIFICATION_EMAIL;
export const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
// Default AI provider: Google Gemini (free tier). Workspaces can bring their own key.
export const googleAiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
export const aiDefaultModel = process.env.AI_MODEL ?? "gemini-2.5-flash";
// Secret used to encrypt BYOK provider keys at rest (AES-256-GCM).
export const aiKeySecret = process.env.AI_KEY_SECRET;
// Upstash Redis (REST) for distributed rate limiting. When unset, rate limiting
// is a no-op (fail-open) so local/dev and unconfigured deploys keep working.
export const upstashRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
export const upstashRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
export const hasRateLimitConfig = Boolean(upstashRedisUrl && upstashRedisToken);

export const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
export const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
// When set, every checkout uses this Stripe price instead of the real plan price
// — a temporary live test switch (e.g. a NZD $0.50 plan). Unset for production.
export const stripeTestPriceId = process.env.STRIPE_TEST_PRICE_ID;

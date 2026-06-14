export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
export const hasSupabaseAdminConfig = Boolean(supabaseUrl && supabaseServiceRoleKey);

export const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const resendApiKey = process.env.RESEND_API_KEY;
export const notificationEmail = process.env.NOTIFICATION_EMAIL;
export const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
export const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
export const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

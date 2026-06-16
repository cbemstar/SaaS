import type { ChannelKey, Client, Insight } from "@/lib/mock-data";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ConnectorStatus = "connected" | "action_required" | "disconnected";

export type DailyPerformanceRow = {
  id: string;
  workspace_id: string;
  client_id: string | null;
  date: string;
  label: string;
  meta: number;
  google_ads: number;
  linkedin: number;
  tiktok: number;
  ga4: number;
  search_console: number;
  conversions: number;
  created_at: string;
};

export type ConnectorSyncRunRow = {
  id: string;
  workspace_id: string;
  channel: string;
  status: "success" | "partial" | "failed";
  synced_clients: number;
  skipped_clients: number;
  rows_imported: number;
  error_message: string | null;
  triggered_by: "user" | "cron" | "all";
  started_at: string;
  finished_at: string | null;
};

export type ConnectorAccountRow = {
  id: string;
  workspace_id: string;
  channel: ChannelKey;
  label: string;
  description: string;
  status: ConnectorStatus;
  accounts: number;
  last_sync: string;
  token_expires_at: string | null;
  created_at: string;
};

export type ReportTemplateRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  pages: number;
  used: number;
  sections?: string[];
  accent?: string | null;
  is_default?: boolean;
  layout?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string;
};

export type ReportTemplateInsert = Omit<ReportTemplateRow, "created_at" | "updated_at"> & {
  id?: string;
};

export type LeadInsert = {
  email: string;
  name?: string | null;
  agency?: string | null;
  intent: "waitlist" | "partner" | "trial" | "sales";
  plan?: string | null;
  message?: string | null;
};

export type ReportRow = {
  id: string;
  workspace_id: string;
  client_id: string;
  template_id: string;
  name: string;
  blocks: Json;
  status: "draft" | "scheduled" | "sent";
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
};

export type ReportInsert = Omit<ReportRow, "id" | "created_at" | "updated_at"> & { id?: string };

export type ReportDeliveryRow = {
  id: string;
  workspace_id: string;
  client_id: string;
  report_id: string | null;
  scheduled_report_id: string | null;
  recipient_email: string;
  report_name: string;
  blocks: Json;
  delivery_type: "manual" | "scheduled";
  status: "sent" | "failed";
  error_message: string | null;
  sent_by: string | null;
  sent_at: string;
  created_at: string;
};

export type ReportDeliveryInsert = Omit<ReportDeliveryRow, "id" | "created_at" | "sent_at"> & {
  id?: string;
  sent_at?: string;
};

export type ScheduledReportRow = {
  id: string;
  workspace_id: string;
  client_id: string;
  template_id: string;
  name: string;
  blocks: Json;
  recipient_email: string;
  cadence: "weekly" | "monthly";
  day_of_week: number | null;
  day_of_month: number | null;
  send_hour: number;
  timezone: string;
  active: boolean;
  next_run_at: string;
  last_run_at: string | null;
  last_status: "sent" | "failed" | "skipped" | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type ScheduledReportInsert = Omit<
  ScheduledReportRow,
  "id" | "created_at" | "updated_at" | "last_run_at" | "last_status" | "last_error" | "active"
> & { id?: string; active?: boolean };

export type StripeCustomerRow = {
  id: string;
  workspace_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  plan: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

export type StripeCustomerInsert = Omit<StripeCustomerRow, "id" | "created_at" | "updated_at"> & { id?: string };

export type WorkspaceRow = {
  id: string;
  name: string;
  timezone: string;
  currency: string;
  created_at: string;
  onboarded?: boolean;
  logo_url?: string | null;
  accent_color?: string | null;
  report_footer?: string | null;
  primary_contact?: string | null;
  white_label?: boolean;
  ai_cite_evidence?: boolean;
  ai_human_review?: boolean;
  ai_tone?: "concise" | "detailed" | "persuasive" | null;
};

export type WorkspaceBrandingUpdate = Partial<
  Pick<
    WorkspaceRow,
    | "name"
    | "timezone"
    | "currency"
    | "onboarded"
    | "logo_url"
    | "accent_color"
    | "report_footer"
    | "primary_contact"
    | "white_label"
    | "ai_cite_evidence"
    | "ai_human_review"
    | "ai_tone"
  >
>;

export type WorkspaceInsert = Pick<WorkspaceRow, "name"> & Partial<Pick<WorkspaceRow, "timezone" | "currency" | "onboarded">>;

export type WorkspaceMemberRow = {
  workspace_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
};

export type WorkspaceMemberInsert = Pick<WorkspaceMemberRow, "workspace_id" | "user_id" | "role">;

export type WorkspaceInviteRow = {
  id: string;
  workspace_id: string;
  email: string;
  role: "admin" | "member";
  token: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

export type WorkspaceInviteInsert = Pick<
  WorkspaceInviteRow,
  "workspace_id" | "email" | "role" | "invited_by" | "expires_at"
> & { token?: string; accepted_at?: string | null };

export type ConnectorTokenRow = {
  id: string;
  workspace_id: string;
  channel: ChannelKey;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientConnectorLinkRow = {
  id: string;
  workspace_id: string;
  client_id: string;
  channel: ChannelKey;
  external_account_id: string | null;
  external_account_name: string | null;
  created_at: string;
};

export const ga4MetricKeys = [
  "total_users",
  "new_users",
  "active_users",
  "sessions",
  "engaged_sessions",
  "engagement_rate",
  "average_session_duration",
  "user_engagement_duration",
  "sessions_per_user",
  "screen_page_views",
  "views_per_session",
  "event_count",
  "key_events",
  "bounce_rate",
  "total_revenue",
  "transactions",
  "purchase_revenue",
] as const;

export type Ga4MetricKey = (typeof ga4MetricKeys)[number];

export type Ga4DailyMetricsRow = {
  id: string;
  workspace_id: string;
  client_id: string;
  date: string;
  created_at: string;
  updated_at: string;
} & Record<Ga4MetricKey, number>;

export type Ga4DailyMetricsInsert = {
  workspace_id: string;
  client_id: string;
  date: string;
} & Partial<Record<Ga4MetricKey, number>> & { id?: string; updated_at?: string };

export type Ga4DimensionType = "channel_group" | "device" | "country" | "landing_page";

export type Ga4BreakdownRow = {
  id: string;
  workspace_id: string;
  client_id: string;
  date: string;
  dimension_type: Ga4DimensionType;
  dimension_value: string;
  sessions: number;
  total_users: number;
  engaged_sessions: number;
  key_events: number;
  screen_page_views: number;
  created_at: string;
};

export type Ga4BreakdownInsert = Omit<Ga4BreakdownRow, "id" | "created_at"> & { id?: string };

export type DashboardPreferenceRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  scope: string;
  layout: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type DashboardPreferenceInsert = {
  workspace_id: string;
  user_id: string;
  scope: string;
  layout: Record<string, unknown>;
  id?: string;
  updated_at?: string;
};

export type MetricDailyRow = {
  workspace_id: string;
  client_id: string;
  source: string;
  date: string;
  metric_key: string;
  value: number;
  updated_at?: string;
};

export type MetricBreakdownRow = {
  workspace_id: string;
  client_id: string;
  source: string;
  date: string;
  dimension_type: string;
  dimension_value: string;
  metric_key: string;
  value: number;
  updated_at?: string;
};

export type ReportShareRow = {
  token: string;
  workspace_id: string;
  template_id: string;
  client_id: string;
  days: number;
  created_by?: string | null;
  created_at?: string;
};

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: WorkspaceRow;
        Insert: WorkspaceInsert;
        Update: WorkspaceBrandingUpdate;
        Relationships: [];
      };
      workspace_members: {
        Row: WorkspaceMemberRow;
        Insert: WorkspaceMemberInsert;
        Update: Partial<WorkspaceMemberInsert>;
        Relationships: [];
      };
      workspace_invites: {
        Row: WorkspaceInviteRow;
        Insert: WorkspaceInviteInsert;
        Update: Partial<WorkspaceInviteInsert>;
        Relationships: [];
      };
      clients: {
        Row: Client & { workspace_id: string; created_at: string };
        Insert: Partial<Client> & Pick<Client, "id" | "name" | "industry"> & { workspace_id: string };
        Update: Partial<Client>;
        Relationships: [];
      };
      connector_accounts: {
        Row: ConnectorAccountRow;
        Insert: Omit<ConnectorAccountRow, "id" | "created_at"> & { id?: string };
        Update: Partial<ConnectorAccountRow>;
        Relationships: [];
      };
      connector_sync_runs: {
        Row: ConnectorSyncRunRow;
        Insert: Pick<ConnectorSyncRunRow, "workspace_id" | "channel" | "status" | "triggered_by"> & {
          id?: string;
          synced_clients?: number;
          skipped_clients?: number;
          rows_imported?: number;
          error_message?: string | null;
          started_at?: string;
          finished_at?: string | null;
        };
        Update: Partial<ConnectorSyncRunRow>;
        Relationships: [];
      };
      daily_performance: {
        Row: DailyPerformanceRow;
        Insert: Omit<DailyPerformanceRow, "id" | "created_at"> & { id?: string };
        Update: Partial<DailyPerformanceRow>;
        Relationships: [];
      };
      insights: {
        Row: Insight & { workspace_id: string; created_at_db: string; dismissed?: boolean; approved?: boolean };
        Insert: Partial<Insight> & Pick<Insight, "client" | "clientId" | "channel" | "severity" | "type" | "title" | "body" | "action" | "evidence" | "estImpact"> & { workspace_id: string; dismissed?: boolean; approved?: boolean };
        Update: Partial<Insight> & { dismissed?: boolean; approved?: boolean };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          agency: string | null;
          intent: "waitlist" | "partner" | "trial" | "sales";
          plan: string | null;
          message: string | null;
          created_at: string;
        };
        Insert: LeadInsert;
        Update: Partial<LeadInsert>;
        Relationships: [];
      };
      report_templates: {
        Row: ReportTemplateRow;
        Insert: ReportTemplateInsert;
        Update: Partial<ReportTemplateInsert> & { updated_at?: string };
        Relationships: [];
      };
      reports: {
        Row: ReportRow;
        Insert: ReportInsert;
        Update: Partial<ReportInsert> & { updated_at?: string };
        Relationships: [];
      };
      report_deliveries: {
        Row: ReportDeliveryRow;
        Insert: ReportDeliveryInsert;
        Update: Partial<ReportDeliveryInsert>;
        Relationships: [];
      };
      scheduled_reports: {
        Row: ScheduledReportRow;
        Insert: ScheduledReportInsert;
        Update: Partial<ScheduledReportInsert> & {
          updated_at?: string;
          last_run_at?: string | null;
          last_status?: ScheduledReportRow["last_status"];
          last_error?: string | null;
          next_run_at?: string;
        };
        Relationships: [];
      };
      stripe_customers: {
        Row: StripeCustomerRow;
        Insert: StripeCustomerInsert;
        Update: Partial<StripeCustomerInsert>;
        Relationships: [];
      };
      connector_tokens: {
        Row: ConnectorTokenRow;
        Insert: Omit<ConnectorTokenRow, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<ConnectorTokenRow, "id" | "created_at">>;
        Relationships: [];
      };
      client_connector_links: {
        Row: ClientConnectorLinkRow;
        Insert: Omit<ClientConnectorLinkRow, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<ClientConnectorLinkRow, "id" | "created_at">>;
        Relationships: [];
      };
      ga4_daily_metrics: {
        Row: Ga4DailyMetricsRow;
        Insert: Ga4DailyMetricsInsert;
        Update: Partial<Ga4DailyMetricsInsert>;
        Relationships: [];
      };
      ga4_breakdowns: {
        Row: Ga4BreakdownRow;
        Insert: Ga4BreakdownInsert;
        Update: Partial<Ga4BreakdownInsert>;
        Relationships: [];
      };
      dashboard_preferences: {
        Row: DashboardPreferenceRow;
        Insert: DashboardPreferenceInsert;
        Update: Partial<DashboardPreferenceInsert> & { updated_at?: string };
        Relationships: [];
      };
      metric_daily: {
        Row: MetricDailyRow;
        Insert: MetricDailyRow;
        Update: Partial<MetricDailyRow>;
        Relationships: [];
      };
      metric_breakdown: {
        Row: MetricBreakdownRow;
        Insert: MetricBreakdownRow;
        Update: Partial<MetricBreakdownRow>;
        Relationships: [];
      };
      report_shares: {
        Row: ReportShareRow;
        Insert: ReportShareRow;
        Update: Partial<ReportShareRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

import { AppShell } from "@/components/app-shell";
import { WorkspaceSettingsForm } from "@/components/workspace-settings-form";
import { BrandingSettingsForm } from "@/components/settings/branding-settings-form";
import { AiSettingsForm } from "@/components/settings/ai-settings-form";
import { AiProviderForm } from "@/components/settings/ai-provider-form";
import { BillingPanel } from "@/components/settings/billing-panel";
import { TeamPanel } from "@/components/settings/team-panel";
import { DataPanel } from "@/components/settings/data-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  getClientLimitForWorkspace,
  getWorkspacePlanName,
  getWorkspaceSubscription,
  pricingPlans,
  PAID_PLANS,
  type PricingPlanName,
} from "@/lib/billing";
import { canManageTeam, getMemberRole, listPendingInvites, listTeamMembers } from "@/lib/team";
import { getActiveWorkspace, getActiveWorkspaceId, getAuthenticatedUser, getClientCount } from "@/lib/workspace";
import { getAiUsage } from "@/lib/ai/usage";
import { isEncryptionConfigured } from "@/lib/crypto";

type SettingsPageProps = {
  searchParams: Promise<{ tab?: string; checkout?: string }>;
};

const planCards = PAID_PLANS.map((name) => {
  const plan = pricingPlans[name];
  return {
    name,
    monthly: plan.amount / 100,
    clientLimitLabel: plan.clientLimitLabel,
    features: plan.features,
    highlight: name === "Agency",
  };
});

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const [workspace, workspaceId, user] = await Promise.all([
    getActiveWorkspace(),
    getActiveWorkspaceId(),
    getAuthenticatedUser(),
  ]);

  const memberRole = workspaceId && user ? await getMemberRole(workspaceId, user.id) : null;
  const teamMembers = workspaceId ? await listTeamMembers(workspaceId) : [];
  const teamInvites =
    workspaceId && memberRole && canManageTeam(memberRole) ? await listPendingInvites(workspaceId) : [];

  const clientCount = workspaceId ? await getClientCount(workspaceId) : 0;
  const clientLimit = workspaceId
    ? await getClientLimitForWorkspace(workspaceId)
    : pricingPlans.Free.clientLimit;
  const currentPlan: PricingPlanName = workspaceId ? await getWorkspacePlanName(workspaceId) : "Free";
  const subscriptionRow = workspaceId ? await getWorkspaceSubscription(workspaceId) : null;
  const subscription = subscriptionRow
    ? {
        status: subscriptionRow.status,
        currentPeriodEnd: subscriptionRow.current_period_end,
        cancelAtPeriodEnd: subscriptionRow.cancel_at_period_end,
        hasCustomer: Boolean(subscriptionRow.stripe_customer_id),
      }
    : null;
  const canManageBilling = canManageTeam(memberRole);
  const aiUsage = workspaceId ? await getAiUsage(workspaceId, workspace) : null;
  const encryptionConfigured = isEncryptionConfigured();

  return (
    <AppShell title="Settings" subtitle="Workspace, branding, AI, templates and billing">
      <main className="flex-1 p-4 lg:p-6">
        {params.checkout === "success" && (
          <div className="mb-4 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
            Checkout completed. Your plan will update shortly.
          </div>
        )}

        <Tabs defaultValue={params.tab ?? "workspace"} className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="workspace">Workspace</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="ai">AI engine</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="workspace">
            <Card>
              <CardHeader>
                <CardTitle>Workspace</CardTitle>
                <CardDescription>Identifying details for your agency</CardDescription>
              </CardHeader>
              <CardContent className="max-w-xl">
                {workspace ? (
                  <WorkspaceSettingsForm workspace={workspace} clientCount={clientCount} clientLimit={clientLimit} />
                ) : (
                  <p className="text-sm text-muted-foreground">Sign in to manage your workspace.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding">
            <Card>
              <CardHeader>
                <CardTitle>Branding &amp; customisation</CardTitle>
                <CardDescription>How your reports and client-facing surfaces look</CardDescription>
              </CardHeader>
              <CardContent>
                {workspace ? (
                  <BrandingSettingsForm workspace={workspace} />
                ) : (
                  <p className="text-sm text-muted-foreground">Sign in to manage branding.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI provider &amp; credits</CardTitle>
                <CardDescription>
                  Kōrero includes AI credits on every plan (Google Gemini). Bring your own key for any provider to skip
                  limits and pick your model.
                </CardDescription>
              </CardHeader>
              <CardContent className="max-w-xl">
                {workspace ? (
                  <AiProviderForm
                    initial={{
                      provider: workspace.ai_byok_provider ?? null,
                      model: workspace.ai_byok_model ?? null,
                      baseUrl: workspace.ai_byok_base_url ?? null,
                      keyHint: workspace.ai_byok_key_hint ?? null,
                      hasKey: Boolean(workspace.ai_byok_key_cipher),
                    }}
                    usage={aiUsage}
                    encryptionConfigured={encryptionConfigured}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Sign in to manage AI settings.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>AI engine</CardTitle>
                <CardDescription>Guardrails and voice for AI-generated narratives</CardDescription>
              </CardHeader>
              <CardContent className="max-w-xl">
                {workspace ? (
                  <AiSettingsForm workspace={workspace} />
                ) : (
                  <p className="text-sm text-muted-foreground">Sign in to manage AI settings.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Team</CardTitle>
                <CardDescription>Invite colleagues and manage workspace access</CardDescription>
              </CardHeader>
              <CardContent>
                {workspace && user && memberRole ? (
                  <TeamPanel
                    members={teamMembers}
                    invites={teamInvites}
                    currentUser={{
                      id: user.id,
                      email: user.email ?? null,
                      role: memberRole,
                      canManageTeam: canManageTeam(memberRole),
                    }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Sign in to manage your team.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data">
            <DataPanel />
          </TabsContent>

          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle>Plan &amp; billing</CardTitle>
                <CardDescription>NZD pricing · transparent and all-inclusive</CardDescription>
              </CardHeader>
              <CardContent>
                <BillingPanel
                  plans={planCards}
                  currentPlan={currentPlan}
                  clientCount={clientCount}
                  clientLimit={clientLimit}
                  aiUsage={aiUsage}
                  subscription={subscription}
                  canManage={canManageBilling}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </AppShell>
  );
}

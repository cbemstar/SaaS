import { AppShell } from "@/components/app-shell";
import { WorkspaceSettingsForm } from "@/components/workspace-settings-form";
import { BrandingSettingsForm } from "@/components/settings/branding-settings-form";
import { AiSettingsForm } from "@/components/settings/ai-settings-form";
import { BillingPanel } from "@/components/settings/billing-panel";
import { TeamPanel } from "@/components/settings/team-panel";
import { DataPanel } from "@/components/settings/data-panel";
import { TemplatesManager } from "@/components/settings/templates-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  getClientLimitForWorkspace,
  getWorkspacePlanName,
  pricingPlans,
  type PricingPlanName,
} from "@/lib/billing";
import { getReportTemplates } from "@/lib/data";
import { canManageTeam, getMemberRole, listPendingInvites, listTeamMembers } from "@/lib/team";
import { getActiveWorkspace, getActiveWorkspaceId, getAuthenticatedUser, getClientCount } from "@/lib/workspace";

type SettingsPageProps = {
  searchParams: Promise<{ tab?: string; checkout?: string }>;
};

const planCards = (Object.values(pricingPlans) as (typeof pricingPlans)[PricingPlanName][]).map((plan) => ({
  name: plan.name,
  monthly: plan.amount / 100,
  clientLimitLabel: plan.clientLimitLabel,
  features: plan.features,
  highlight: plan.name === "Agency",
}));

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const [workspace, workspaceId, templates, user] = await Promise.all([
    getActiveWorkspace(),
    getActiveWorkspaceId(),
    getReportTemplates(),
    getAuthenticatedUser(),
  ]);

  const memberRole = workspaceId && user ? await getMemberRole(workspaceId, user.id) : null;
  const teamMembers = workspaceId ? await listTeamMembers(workspaceId) : [];
  const teamInvites =
    workspaceId && memberRole && canManageTeam(memberRole) ? await listPendingInvites(workspaceId) : [];

  const clientCount = workspaceId ? await getClientCount(workspaceId) : 0;
  const clientLimit = workspaceId
    ? await getClientLimitForWorkspace(workspaceId)
    : pricingPlans.Solo.clientLimit;
  const currentPlan: PricingPlanName = workspaceId ? await getWorkspacePlanName(workspaceId) : "Solo";

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
            <TabsTrigger value="templates">Templates</TabsTrigger>
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

          <TabsContent value="ai">
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

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>Report templates</CardTitle>
                <CardDescription>Build and manage reusable report layouts</CardDescription>
              </CardHeader>
              <CardContent>
                <TemplatesManager initialTemplates={templates} />
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
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </AppShell>
  );
}

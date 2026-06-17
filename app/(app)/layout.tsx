import { AppSidebar } from "@/components/app-sidebar";
import { WorkspaceBootstrap } from "@/components/workspace-bootstrap";
import { getActiveWorkspace, getActiveWorkspaceId } from "@/lib/workspace";
import { getAiUsage } from "@/lib/ai/usage";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const workspaceId = await getActiveWorkspaceId();
  const workspace = workspaceId ? await getActiveWorkspace() : null;
  const aiUsage = workspaceId ? await getAiUsage(workspaceId, workspace) : null;

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <WorkspaceBootstrap />
      <AppSidebar aiUsage={aiUsage} />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</div>
    </div>
  );
}

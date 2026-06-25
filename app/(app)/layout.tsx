import { AppSidebar } from "@/components/app-sidebar";
import { WorkspaceBootstrap } from "@/components/workspace-bootstrap";
import { CommandMenu } from "@/components/command-menu";
import { getActiveWorkspace, getActiveWorkspaceId } from "@/lib/workspace";
import { getAiUsage } from "@/lib/ai/usage";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const workspaceId = await getActiveWorkspaceId();
  const workspace = workspaceId ? await getActiveWorkspace() : null;
  const aiUsage = workspaceId ? await getAiUsage(workspaceId, workspace) : null;

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <WorkspaceBootstrap />
      <CommandMenu />
      <AppSidebar aiUsage={aiUsage} />
      {/* scrollbar-gutter: stable reserves the scrollbar's space on every page so the
          sticky topbar + content keep identical width/padding whether or not a page is
          tall enough to scroll (otherwise short pages render ~15px wider than tall ones). */}
      <div
        data-app-scroll
        className="flex min-w-0 flex-1 flex-col overflow-y-auto [scrollbar-gutter:stable]"
      >
        {children}
      </div>
    </div>
  );
}

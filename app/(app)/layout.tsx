import { AppSidebar } from "@/components/app-sidebar";
import { WorkspaceBootstrap } from "@/components/workspace-bootstrap";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <WorkspaceBootstrap />
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

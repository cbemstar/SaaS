import { getAuthenticatedUser, getActiveWorkspace } from "@/lib/workspace";
import { Topbar } from "@/components/topbar";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export async function AppShell({ title, subtitle, children }: AppShellProps) {
  const [user, workspace] = await Promise.all([getAuthenticatedUser(), getActiveWorkspace()]);

  return (
    <>
      <Topbar
        title={title}
        subtitle={subtitle}
        workspaceName={workspace?.name}
        userEmail={user?.email ?? undefined}
      />
      {children}
    </>
  );
}

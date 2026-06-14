import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { SignIn } from "@clerk/nextjs";
import { BrandMark } from "@/components/brand-mark";
import { getInvitePreview } from "@/lib/team";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; invite?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const invitePreview = params.invite ? await getInvitePreview(params.invite) : null;
  const redirectUrl = params.next && params.next.startsWith("/") ? params.next : "/dashboard";

  return (
    <main className="min-h-screen bg-background">
      <div className="hero-mesh pointer-events-none fixed inset-0" />
      <div className="container relative flex min-h-screen flex-col py-6">
        <div className="flex items-center justify-between">
          <BrandMark />
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to landing
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 py-12">
          {invitePreview && (
            <div className="flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <Users className="h-4 w-4" />
              Invitation to {invitePreview.workspaceName} — sign in as {invitePreview.email}
            </div>
          )}
          <SignIn routing="hash" signUpUrl="/sign-up" fallbackRedirectUrl={redirectUrl} />
        </div>
      </div>
    </main>
  );
}

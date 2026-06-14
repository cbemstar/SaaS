import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { OnboardingForm } from "@/components/onboarding-form";
import { getActiveWorkspace, getAuthenticatedUser } from "@/lib/workspace";

export default async function OnboardingPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?next=%2Fonboarding");
  }

  const workspace = await getActiveWorkspace();
  if (workspace?.onboarded) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="hero-mesh pointer-events-none fixed inset-0" />
      <div className="container relative flex min-h-screen flex-col py-6">
        <BrandMark />
        <div className="mx-auto flex w-full flex-1 items-center py-12">
          <OnboardingForm defaultName={workspace?.name ?? ""} />
        </div>
      </div>
    </main>
  );
}

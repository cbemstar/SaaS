import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-3xl py-8">
        <div className="mb-12 flex items-center justify-between">
          <BrandMark />
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Back home
          </Link>
        </div>
        <article className="space-y-5">
          <h1 className="font-display text-4xl font-semibold">Privacy</h1>
          <p className="leading-relaxed text-muted-foreground">
            Kōrero is built for agencies that handle client marketing data. This prototype stores submitted waitlist
            details only when Supabase is configured, and production deployments should keep data in a region and
            retention model appropriate for NZ and AU privacy obligations.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            Production data processing should cover workspace access controls, connector token encryption, audit logs,
            and client data deletion requests before onboarding real customers.
          </p>
        </article>
      </div>
    </main>
  );
}

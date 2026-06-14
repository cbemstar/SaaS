import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export default function TermsPage() {
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
          <h1 className="font-display text-4xl font-semibold">Terms</h1>
          <p className="leading-relaxed text-muted-foreground">
            Kōrero is currently a prototype for design-partner evaluation. Do not use it as the source of record for
            client reporting until production connector sync, billing, support, and data-processing agreements are in
            place.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            Commercial terms should be finalized before paid launch, including service levels, connector limitations,
            AI review requirements, and cancellation rules.
          </p>
        </article>
      </div>
    </main>
  );
}

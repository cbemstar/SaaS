import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileBarChart2,
  Globe,
  Plug,
  Quote,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { HeroPreview } from "@/components/landing/hero-preview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { channels } from "@/lib/catalog";

const channelKeys = ["meta", "google_ads", "linkedin", "tiktok", "ga4", "search_console"] as const;

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#ai", label: "AI engine" },
  { href: "#pricing", label: "Pricing" },
  { href: "#local", label: "Why local" },
] as const;

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <BrandMark />
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm" className="gap-1.5">
                Open app <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative min-h-[100dvh] overflow-hidden border-b">
        <div className="hero-mesh pointer-events-none absolute inset-0" />
        <div className="grid-bg pointer-events-none absolute inset-0 mask-fade-b opacity-30" />
        <div className="container relative grid items-center gap-12 py-16 md:grid-cols-[1fr_1.05fr] lg:gap-16 lg:py-24">
          <div>
            <Badge variant="soft" className="animate-fade-up stagger-1 gap-2 px-3 py-1 font-mono text-2xs uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Built in Aotearoa · for NZ & AU agencies
            </Badge>
            <h1 className="type-hero animate-fade-up stagger-2 mt-6 text-balance font-semibold">
              The reporting platform that tells you{" "}
              <span className="text-primary">what to do next.</span>
            </h1>
            <p className="type-lead animate-fade-up stagger-3 mt-5 text-pretty text-muted-foreground">
              Pull every channel — Meta, Google, LinkedIn, TikTok, GA4 — into one place. Get AI-written
              recommendations grounded in your clients&apos; data. Ship white-label reports in minutes, not days.
            </p>
            <div className="animate-fade-up stagger-4 mt-8 flex flex-wrap items-center gap-3">
              <Link href="/dashboard">
                <Button size="lg" className="gap-2">
                  See it live <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button asChild size="lg" variant="outline">
                <Link href="/waitlist">Join the waitlist</Link>
              </Button>
            </div>
            <ul className="animate-fade-up stagger-5 mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["All connectors included", "Unlimited users", "NZD pricing"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <HeroPreview />
        </div>

        <div className="container border-t border-border/60 py-10">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            One platform, every channel agencies use
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {channelKeys.map((k) => (
              <div key={k} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <span className="h-2 w-2 rounded-full ring-2 ring-background" style={{ background: channels[k].color }} />
                {channels[k].label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-b border-border/80 bg-surface-2 py-20 lg:py-28">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="soft">Four pillars</Badge>
            <h2 className="mt-4 font-display text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Built around what incumbents won&apos;t fix
            </h2>
            <p className="mt-4 text-pretty text-muted-foreground">
              Most tools tell you what happened. Kōrero tells you what to do — in client-ready reports, with fair
              pricing and real local support.
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Sparkles,
                title: "AI-native recommendations",
                body: "Actions, not summaries. Every recommendation cites the exact data behind it, with expected impact attached.",
              },
              {
                icon: Plug,
                title: "Fair, transparent pricing",
                body: "All connectors. Unlimited users. AI included. No per-campaign or per-seat stacking — ever.",
              },
              {
                icon: Globe,
                title: "Local trust & support",
                body: "Built in Aotearoa, in your timezone, with NZ data-handling assurances. Humans answer tickets.",
              },
              {
                icon: FileBarChart2,
                title: "Report in minutes",
                body: "Pick a template, white-label it, schedule the send. First report out the door on day one.",
              },
            ].map((f, i) => (
              <article
                key={f.title}
                className="group rounded-2xl border bg-card p-6 shadow-panel transition-all hover:-translate-y-0.5 hover:shadow-panel-lg"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="ai" className="py-20 lg:py-28">
        <div className="container grid gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <Badge variant="soft" className="gap-1.5">
              <Sparkles className="h-3 w-3" /> AI engine
            </Badge>
            <h2 className="mt-4 font-display text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Recommendations you can defend to your client
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              Every insight ships with evidence — campaigns, metrics, time windows. No black box. If you wouldn&apos;t
              take the action, the AI shouldn&apos;t suggest it.
            </p>
            <ul className="mt-8 space-y-3.5">
              {[
                "Cites the data behind every recommendation",
                "Flags anomalies before the client notices",
                "Ranks actions by estimated revenue impact",
                "Voice and tone matches your agency",
                "Human-review gate before anything goes to the client",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/12">
                    <Check className="h-3 w-3 text-success" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            {[
              {
                t: "Shift $1,240/wk from broad-match to brand",
                e: "Brand CPA $4.10 vs broad $62 · IS lost to budget 38%",
                i: "+$3,800/wk revenue",
              },
              {
                t: "Pause two highest-frequency Meta creatives",
                e: "Frequency 4.7 · CTR -64% w/w",
                i: "CPA $22 → $14 in 5–7 days",
              },
              {
                t: "Raise LinkedIn LAL audience cap to $260/day",
                e: "LAL 42 MQLs at $118 vs broad $402",
                i: "+18–24 MQLs/mo",
              },
            ].map((r) => (
              <div
                key={r.t}
                className="rounded-2xl border border-l-[3px] border-l-primary bg-card p-5 shadow-panel transition-shadow hover:shadow-panel-lg"
              >
                <p className="font-medium leading-snug">{r.t}</p>
                <p className="mt-1.5 font-mono text-xs text-muted-foreground">{r.e}</p>
                <p className="mt-2 text-sm font-semibold text-success">{r.i}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="local" className="border-y bg-gradient-to-b from-surface-2/60 to-background py-20 lg:py-28">
        <div className="container grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="space-y-4 lg:order-1">
            {[
              {
                quote: "It saves my account managers a day a week. Each.",
                by: "Design partner · Auckland performance agency",
              },
              {
                quote: "The AI doesn't make things up. It cites the report it's looking at.",
                by: "Design partner · Melbourne B2B agency",
              },
            ].map((t) => (
              <blockquote key={t.quote} className="rounded-2xl border bg-card p-6 shadow-panel">
                <Quote className="h-8 w-8 text-primary/25" aria-hidden />
                <p className="mt-3 text-base font-medium leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-3 text-xs text-muted-foreground">{t.by}</footer>
              </blockquote>
            ))}
          </div>
          <div className="lg:order-2">
            <Badge variant="soft" className="gap-1.5">
              <ShieldCheck className="h-3 w-3" /> Local
            </Badge>
            <h2 className="mt-4 font-display text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              An NZ team. Your timezone. Tickets answered in hours.
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              The big incumbents are US and EU companies. We&apos;re a few hours away, not a few sleeps. Data stored per
              NZ Privacy Act requirements. We bill in NZD and AUD — no surprise FX fees.
            </p>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 lg:py-28">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="soft">Pricing</Badge>
            <h2 className="mt-4 font-display text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              One bill. No connector tax.
            </h2>
            <p className="mt-4 text-muted-foreground">
              All connectors, unlimited users, and AI insights on every plan — no per-seat or per-campaign stacking.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-3">
            {[
              {
                name: "Solo",
                price: "$149",
                clients: "Up to 5 clients",
                cta: "Start trial",
                featured: false,
                intent: "trial",
                extras: ["2,000 AI credits/mo"],
              },
              {
                name: "Agency",
                price: "$499",
                clients: "Up to 25 clients",
                cta: "Start trial",
                featured: true,
                intent: "trial",
                extras: ["Scheduled reports", "Slack digest", "Priority support"],
              },
              {
                name: "Scale",
                price: "$899+",
                clients: "50+ clients",
                cta: "Contact sales",
                featured: false,
                intent: "sales",
                extras: ["SSO", "Custom domains", "API access"],
              },
            ].map((p) => (
              <div
                key={p.name}
                className={`flex flex-col rounded-2xl border bg-card p-6 shadow-panel ${
                  p.featured ? "relative border-primary/40 ring-2 ring-primary/15 md:-mt-2 md:mb-2 md:py-8" : ""
                }`}
              >
                {p.featured && <Badge className="mb-3 w-fit">Most popular</Badge>}
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{p.name}</p>
                <p className="mt-2 font-display text-4xl font-semibold tracking-tight">
                  {p.price}
                  {p.price.startsWith("$") && (
                    <span className="text-base font-normal text-muted-foreground"> /mo NZD</span>
                  )}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{p.clients}</p>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {["All connectors", "Unlimited users", "AI insights included", "White-label reports", "NZ/AU support", ...p.extras].map(
                    (b) => (
                      <li key={b} className="flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0 text-success" />
                        {b}
                      </li>
                    ),
                  )}
                </ul>
                <Button asChild className="mt-8 w-full" variant={p.featured ? "default" : "outline"}>
                  <Link href={`/waitlist?intent=${p.intent}&plan=${encodeURIComponent(p.name)}`}>{p.cta}</Link>
                </Button>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-16 max-w-4xl overflow-x-auto">
            <h3 className="mb-4 text-center font-display text-lg font-semibold">How we compare</h3>
            <table className="w-full min-w-[540px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium" />
                  <th className="py-2 px-4 font-medium">Kōrero Solo</th>
                  <th className="py-2 px-4 font-medium">AgencyAnalytics</th>
                  <th className="py-2 pl-4 font-medium">DashThis</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Monthly price", "$149 NZD flat", "~$79+ USD + scaling", "~$33+ USD + dashboards"],
                  ["All connectors", "Included", "Tier-dependent", "Limited"],
                  ["Unlimited users", "Yes", "Extra cost", "Per dashboard"],
                  ["AI insights", "Included", "Higher tiers", "Limited"],
                  ["NZ/AU support", "Yes", "US-centric", "US/EU-centric"],
                ].map(([label, ...cols]) => (
                  <tr key={label} className="border-b border-border/60">
                    <td className="py-3 pr-4 font-medium">{label}</td>
                    {cols.map((col) => (
                      <td key={col} className="px-4 py-3 text-muted-foreground">
                        {col}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-t bg-surface-2/40 py-16 lg:py-20">
        <div className="container">
          <div className="overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/12 via-card to-card p-8 shadow-panel-lg sm:p-12">
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <h3 className="font-display text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                  We&apos;re taking 5 NZ and AU design partners this quarter
                </h3>
                <p className="mt-3 text-pretty text-muted-foreground">
                  Honest feedback in exchange for free trial use, lifetime founder pricing, and a direct line to the team.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
                <Link href="/dashboard">
                  <Button size="lg" className="w-full gap-2 sm:w-auto">
                    Try the live prototype <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                  <Link href="/waitlist?intent=partner">Apply to be a partner</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-10">
        <div className="container flex flex-col items-center justify-between gap-6 sm:flex-row">
          <BrandMark />
          <p className="text-sm text-muted-foreground">© 2026 Kōrero · Made in Aotearoa</p>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground" aria-label="Footer">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/waitlist?intent=sales" className="hover:text-foreground">
              Contact
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

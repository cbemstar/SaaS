import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinWaitlist } from "./actions";

type WaitlistPageProps = {
  searchParams: Promise<{
    intent?: string;
    plan?: string;
    submitted?: string;
  }>;
};

export default async function WaitlistPage({ searchParams }: WaitlistPageProps) {
  const params = await searchParams;
  const intent = params.intent === "partner" || params.intent === "trial" || params.intent === "sales" ? params.intent : "waitlist";
  const submitted = params.submitted === "1";
  const title = intent === "partner" ? "Apply to be a design partner" : intent === "sales" ? "Talk to sales" : "Join the Kōrero waitlist";

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

        <div className="mx-auto flex w-full max-w-xl flex-1 items-center py-12">
          <Card className="w-full shadow-panel-lg">
            <CardHeader>
              {submitted && (
                <div className="mb-2 flex w-fit items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Received
                </div>
              )}
              <CardTitle className="font-display text-3xl">{submitted ? "Thanks, we’ll be in touch." : title}</CardTitle>
              <CardDescription>
                {submitted
                  ? "We captured your details. The next step is a short discovery call to understand your agency workflow."
                  : "Tell us who you are and what you want to test. We’re prioritising NZ and AU agencies with real reporting pain."}
              </CardDescription>
            </CardHeader>
            {!submitted && (
              <CardContent>
                <form action={joinWaitlist} className="space-y-4">
                  <input type="hidden" name="intent" value={intent} />
                  <input type="hidden" name="plan" value={params.plan ?? ""} />
                  <div className="grid gap-1.5">
                    <Label htmlFor="email">Work email</Label>
                    <Input id="email" name="email" type="email" placeholder="you@agency.co.nz" required />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" placeholder="Karan Kumar" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="agency">Agency</Label>
                      <Input id="agency" name="agency" placeholder="Pōhutukawa Group" />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="message">What should Kōrero help with first?</Label>
                    <textarea
                      id="message"
                      name="message"
                      className="min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="Example: Our team spends 12 hours a month turning Meta, Google Ads, and GA4 exports into reports."
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full">
                    Submit
                  </Button>
                </form>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}

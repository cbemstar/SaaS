"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type OnboardingFormProps = {
  defaultName?: string;
};

export function OnboardingForm({ defaultName = "" }: OnboardingFormProps) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [currency, setCurrency] = useState("NZD");
  const [timezone, setTimezone] = useState("Pacific/Auckland");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    const response = await fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, currency, timezone, onboarded: true }),
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      toast.error(payload.error ?? "Could not save workspace");
      return;
    }

    toast.success("Workspace ready — let's add your first client");
    router.replace("/clients?welcome=1");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-lg shadow-panel-lg">
      <CardHeader>
        <CardTitle className="font-display text-3xl">Set up your agency</CardTitle>
        <CardDescription>Tell us how you report so we can tailor your workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Agency name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="currency">Reporting currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NZD">NZD — New Zealand Dollar</SelectItem>
                <SelectItem value="AUD">AUD — Australian Dollar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pacific/Auckland">Pacific/Auckland</SelectItem>
                <SelectItem value="Australia/Sydney">Australia/Sydney</SelectItem>
                <SelectItem value="Australia/Melbourne">Australia/Melbourne</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving…" : "Continue to add your first client"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

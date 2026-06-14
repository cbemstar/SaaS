import { Sparkles, Filter, ChevronDown } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InsightCard } from "@/components/insight-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getClients, getInsights } from "@/lib/data";

export default async function InsightsPage() {
  const [insights, clients] = await Promise.all([getInsights(), getClients()]);
  const high = insights.filter((i) => i.severity === "high");
  const medium = insights.filter((i) => i.severity === "medium");
  const low = insights.filter((i) => i.severity === "low");
  const activeClients = clients.filter((c) => c.status === "active").length;

  return (
    <AppShell title="AI Insights" subtitle="What we'd do next, with the evidence to prove it">
      <main className="flex-1 space-y-6 p-4 lg:p-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="font-display text-lg">Weekly brief</CardTitle>
                <CardDescription>
                  {insights.length} open insights across {activeClients} active client{activeClients === 1 ? "" : "s"}
                </CardDescription>
              </div>
            </div>
            <form action="/api/insights/generate" method="post">
              <Button type="submit" variant="outline" size="sm" className="gap-1.5">
                Regenerate <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </form>
          </CardHeader>
          <CardContent>
            {insights.length > 0 ? (
              <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                Top priority: <span className="font-semibold text-foreground">{insights[0].title}</span> for{" "}
                <span className="font-semibold text-foreground">{insights[0].client}</span>. Review evidence before
                sending anything client-facing.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No insights yet. Add clients, sync connectors, then regenerate to create AI recommendations grounded in your data.
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="destructive">{high.length} high priority</Badge>
              <Badge variant="warning">{medium.length} medium</Badge>
              <Badge variant="soft">{low.length} low</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">All insights</h2>
          <Button variant="outline" size="sm" className="gap-1.5" disabled>
            <Filter className="h-3.5 w-3.5" /> Filters coming soon
          </Button>
        </div>

        {insights.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Generate your first insight using the button above.
          </Card>
        ) : (
          <Tabs defaultValue="high">
            <TabsList>
              <TabsTrigger value="high">High priority · {high.length}</TabsTrigger>
              <TabsTrigger value="medium">Medium · {medium.length}</TabsTrigger>
              <TabsTrigger value="low">Low · {low.length}</TabsTrigger>
              <TabsTrigger value="all">All · {insights.length}</TabsTrigger>
            </TabsList>
            <TabsContent value="high" className="space-y-3">
              {high.map((i) => <InsightCard key={i.id} insight={i} />)}
            </TabsContent>
            <TabsContent value="medium" className="space-y-3">
              {medium.map((i) => <InsightCard key={i.id} insight={i} />)}
            </TabsContent>
            <TabsContent value="low" className="space-y-3">
              {low.map((i) => <InsightCard key={i.id} insight={i} />)}
            </TabsContent>
            <TabsContent value="all" className="space-y-3">
              {insights.map((i) => <InsightCard key={i.id} insight={i} />)}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </AppShell>
  );
}

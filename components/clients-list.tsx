"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChannelPill } from "@/components/channel-pill";
import { AddClientDialog } from "@/components/add-client-dialog";
import type { ChannelKey, Client } from "@/lib/catalog";
import { cn, formatCurrency } from "@/lib/utils";

type ClientsListProps = {
  clients: Client[];
  welcome?: boolean;
};

export function ClientsList({ clients, welcome }: ClientsListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(search.toLowerCase()) ||
        client.industry.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, search, statusFilter]);

  if (clients.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        {welcome && (
          <Badge variant="soft" className="mb-1">
            Welcome to Kōrero
          </Badge>
        )}
        <div>
          <h2 className="font-display text-xl font-semibold">Add your first client</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Create a client to start tracking channels, generating AI insights, and building reports.
          </p>
        </div>
        <AddClientDialog />
      </Card>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setStatusFilter(statusFilter === "active" ? "all" : "active")}
          >
            <Filter className="h-3.5 w-3.5" /> {statusFilter === "active" ? "Active only" : "All statuses"}
          </Button>
          <AddClientDialog />
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-12 border-b bg-muted/30 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div className="col-span-4">Client</div>
          <div className="col-span-2">Channels</div>
          <div className="col-span-2 text-right">30-day spend</div>
          <div className="col-span-1 text-right">ROAS</div>
          <div className="col-span-1 text-right">Conv.</div>
          <div className="col-span-1 text-right">Alerts</div>
          <div className="col-span-1 text-right">Status</div>
        </div>
        <div className="divide-y">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="grid grid-cols-12 items-center gap-2 px-4 py-3 transition-colors hover:bg-accent/40"
            >
              <div className="col-span-4 flex items-center gap-3 min-w-0">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className={cn("text-xs font-semibold text-foreground", `bg-gradient-to-br ${c.accent}`)}>
                    {c.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{c.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.industry}</div>
                </div>
              </div>
              <div className="col-span-2 flex flex-wrap gap-1">
                {c.channels.slice(0, 3).map((ch) => (
                  <ChannelPill key={ch} channel={ch as ChannelKey} />
                ))}
              </div>
              <div className="col-span-2 text-right text-sm tabular-nums">{formatCurrency(c.monthlySpend)}</div>
              <div className="col-span-1 text-right text-sm tabular-nums">{c.roas.toFixed(1)}×</div>
              <div className="col-span-1 text-right text-sm tabular-nums">{c.conversions}</div>
              <div className="col-span-1 text-right text-sm tabular-nums">{c.alerts}</div>
              <div className="col-span-1 flex justify-end">
                <Badge variant={c.status === "active" ? "success" : "muted"} className="capitalize">
                  {c.status}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">No clients match your filters.</div>
        )}
      </Card>
    </>
  );
}

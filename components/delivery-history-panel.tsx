"use client";

import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Client } from "@/lib/catalog";
import type { ReportDeliveryView } from "@/lib/report-deliveries";

type DeliveryHistoryPanelProps = {
  deliveries: ReportDeliveryView[];
  clients: Client[];
};

function formatSentAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DeliveryHistoryPanel({ deliveries, clients }: DeliveryHistoryPanelProps) {
  if (deliveries.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        No reports sent yet. Use Send to client in the builder once a recipient email is set.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      {deliveries.map((delivery) => {
        const client = clients.find((item) => item.id === delivery.clientId);
        const blocksParam = encodeURIComponent(delivery.blocks.join(","));
        return (
          <div
            key={delivery.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{delivery.reportName}</p>
                <Badge variant={delivery.status === "sent" ? "success" : "destructive"} className="gap-1 text-2xs">
                  {delivery.status === "sent" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {delivery.status}
                </Badge>
                <Badge variant="muted" className="text-2xs capitalize">
                  {delivery.deliveryType}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {client?.name ?? delivery.clientId} · {delivery.recipientEmail} · {formatSentAt(delivery.sentAt)}
              </p>
              {delivery.errorMessage && (
                <p className="mt-1 text-xs text-destructive">{delivery.errorMessage}</p>
              )}
            </div>
            {delivery.status === "sent" && delivery.blocks.length > 0 && (
              <Button asChild size="sm" variant="outline">
                <Link
                  href={`/api/reports/pdf?clientId=${delivery.clientId}&blocks=${blocksParam}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  PDF
                </Link>
              </Button>
            )}
          </div>
        );
      })}
    </Card>
  );
}

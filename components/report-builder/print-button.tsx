"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Opens the browser print dialog (Save as PDF) for the current report view. */
export function PrintButton() {
  return (
    <Button size="sm" className="gap-1.5" onClick={() => window.print()}>
      <Printer className="h-3.5 w-3.5" /> Print / Save as PDF
    </Button>
  );
}

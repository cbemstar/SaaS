"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useClerk } from "@clerk/nextjs";
import { Command } from "cmdk";
import {
  BarChart3,
  Building2,
  CreditCard,
  FileBarChart2,
  LayoutTemplate,
  LogOut,
  MoonStar,
  Plug,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Client } from "@/lib/catalog";

export const OPEN_COMMAND_MENU_EVENT = "open-command-menu";

type Item = {
  label: string;
  icon: LucideIcon;
  perform: () => void;
  keywords?: string[];
};

/**
 * App-wide command palette (⌘K / Ctrl+K). Also opens via the sidebar search box,
 * which dispatches an `open-command-menu` event. Sources navigation, quick
 * actions, and client jump-to (fetched on first open).
 */
export function CommandMenu() {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadedClients, setLoadedClients] = useState(false);

  // Global shortcut + sidebar-search trigger.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_COMMAND_MENU_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_COMMAND_MENU_EVENT, onOpen);
    };
  }, []);

  // Lazy-load clients the first time the palette opens.
  useEffect(() => {
    if (!open || loadedClients) return;
    setLoadedClients(true);
    void fetch("/api/clients")
      .then((res) => (res.ok ? res.json() : { clients: [] }))
      .then((data: { clients?: Client[] }) => setClients(data.clients ?? []))
      .catch(() => {});
  }, [open, loadedClients]);

  const run = useCallback((fn: () => void) => {
    setOpen(false);
    // Defer so the dialog closes cleanly before navigation/side-effects.
    setTimeout(fn, 0);
  }, []);

  const nav: Item[] = [
    { label: "Dashboard", icon: BarChart3, perform: () => router.push("/dashboard") },
    { label: "AI Insights", icon: Sparkles, perform: () => router.push("/insights") },
    { label: "Clients", icon: Building2, perform: () => router.push("/clients") },
    { label: "Reports", icon: FileBarChart2, perform: () => router.push("/reports"), keywords: ["send", "deliver"] },
    { label: "Report builder", icon: LayoutTemplate, perform: () => router.push("/reports/builder"), keywords: ["template", "design", "edit"] },
    { label: "Connectors", icon: Plug, perform: () => router.push("/connectors"), keywords: ["integrations", "ga4", "meta"] },
    { label: "Settings", icon: Settings, perform: () => router.push("/settings") },
    { label: "AI credits & provider", icon: Sparkles, perform: () => router.push("/settings?tab=ai"), keywords: ["gemini", "byok", "key"] },
    { label: "Billing & plan", icon: CreditCard, perform: () => router.push("/settings?tab=billing"), keywords: ["upgrade", "subscription"] },
  ];

  const actions: Item[] = [
    { label: "New report design", icon: Plus, perform: () => router.push("/reports/builder"), keywords: ["create", "template"] },
    { label: "Sync connectors", icon: RefreshCw, perform: () => router.push("/connectors"), keywords: ["refresh", "data"] },
    {
      label: resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme",
      icon: resolvedTheme === "dark" ? Sun : MoonStar,
      perform: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
      keywords: ["theme", "dark", "light", "appearance"],
    },
    { label: "Sign out", icon: LogOut, perform: () => void signOut(() => router.push("/login")), keywords: ["logout"] },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-panel-lg sm:max-w-[560px]">
        <DialogTitle className="sr-only">Command menu</DialogTitle>
        <Command
          loop
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
        >
          <div className="border-b px-3">
            <Command.Input
              autoFocus
              placeholder="Search or jump to…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">No results found.</Command.Empty>

            <Command.Group heading="Navigation">
              {nav.map((item) => (
                <CommandRow key={item.label} item={item} onRun={run} />
              ))}
            </Command.Group>

            <Command.Group heading="Actions">
              {actions.map((item) => (
                <CommandRow key={item.label} item={item} onRun={run} />
              ))}
            </Command.Group>

            {clients.length > 0 && (
              <Command.Group heading="Clients">
                {clients.map((client) => (
                  <CommandRow
                    key={client.id}
                    item={{
                      label: client.name,
                      icon: Building2,
                      perform: () => router.push(`/clients/${client.id}`),
                      keywords: ["client"],
                    }}
                    onRun={run}
                  />
                ))}
              </Command.Group>
            )}
          </Command.List>
          <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-2xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" /> Kōrero command menu
            </span>
            <span className="flex items-center gap-2">
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">↑↓</kbd> navigate
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">↵</kbd> select
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">esc</kbd> close
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function CommandRow({ item, onRun }: { item: Item; onRun: (fn: () => void) => void }) {
  const Icon = item.icon;
  return (
    <Command.Item
      value={`${item.label} ${item.keywords?.join(" ") ?? ""}`}
      onSelect={() => onRun(item.perform)}
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      {item.label}
    </Command.Item>
  );
}

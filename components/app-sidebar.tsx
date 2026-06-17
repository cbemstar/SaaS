"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  FileBarChart2,
  HelpCircle,
  LayoutTemplate,
  LifeBuoy,
  Loader2,
  Plug,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { BrandMark } from "./brand-mark";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { cn } from "@/lib/utils";

const sections: Array<{
  label: string;
  items: Array<{ href: string; label: string; icon: React.ElementType; badge?: string }>;
}> = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
      { href: "/insights", label: "AI Insights", icon: Sparkles, badge: "12" },
      { href: "/clients", label: "Clients", icon: Building2 },
      { href: "/reports", label: "Reports", icon: FileBarChart2 },
      { href: "/reports/builder", label: "Report builder", icon: LayoutTemplate },
    ],
  },
  {
    label: "Configure",
    items: [
      { href: "/connectors", label: "Connectors", icon: Plug, badge: "1" },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

/** Shows a spinner while the link's destination is being fetched (Next 15 useLinkStatus). */
function NavPending({ badge, active }: { badge?: string; active: boolean }) {
  const { pending } = useLinkStatus();
  if (pending) return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
  if (badge)
    return (
      <Badge variant={active ? "soft" : "muted"} className="font-mono text-2xs">
        {badge}
      </Badge>
    );
  return null;
}

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border/80 bg-surface-2 lg:flex">
      <div className="flex h-14 items-center border-b border-border/80 px-4">
        <Link href="/dashboard">
          <BrandMark compact />
        </Link>
      </div>
      <div className="px-3 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search clients, reports…" className="h-9 border-border/80 bg-background pl-9" />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5 scrollbar-thin">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="type-label mb-2 px-2">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                      active
                        ? "nav-active-indicator bg-accent pl-4 text-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className={cn("h-4 w-4", active && "text-primary")} />
                      {item.label}
                    </span>
                    <NavPending badge={item.badge} active={active} />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="space-y-2 border-t border-border/80 p-3">
        <div className="rounded-lg border border-border/80 bg-card p-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">AI credits</p>
              <p className="font-mono text-2xs text-muted-foreground">2,840 / 5,000</p>
            </div>
          </div>
          <Progress value={57} className="mt-3 h-1" />
        </div>
        <div className="flex gap-1 px-1 text-muted-foreground">
          <Link
            href="#"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs hover:bg-accent hover:text-foreground"
          >
            <LifeBuoy className="h-3.5 w-3.5" /> Help
          </Link>
          <Link
            href="#"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs hover:bg-accent hover:text-foreground"
          >
            <HelpCircle className="h-3.5 w-3.5" /> Changelog
          </Link>
        </div>
      </div>
    </aside>
  );
}

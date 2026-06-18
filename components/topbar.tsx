"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";
import { MobileNav } from "./mobile-nav";
import { SignOutButton } from "./sign-out-button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";

type TopbarProps = {
  title: string;
  subtitle?: string;
  workspaceName?: string;
  userEmail?: string;
  userInitials?: string;
};

export function Topbar({ title, subtitle, workspaceName, userEmail, userInitials }: TopbarProps) {
  const workspaceInitials = workspaceName?.slice(0, 2).toUpperCase() ?? "WS";
  const accountInitials = userInitials ?? userEmail?.slice(0, 1).toUpperCase() ?? "U";
  const displayName = userEmail?.split("@")[0] ?? "Account";
  const [scrolled, setScrolled] = useState(false);

  // Separate the top bar from content with a hairline shadow once you scroll.
  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>("[data-app-scroll]");
    if (!scroller) return;
    const onScroll = () => setScrolled(scroller.scrollTop > 4);
    onScroll();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b px-4 backdrop-blur-md transition-shadow duration-200 lg:px-6",
        scrolled ? "border-border bg-background/95 shadow-[0_1px_0_hsl(var(--border)),0_6px_16px_-12px_hsl(0_0%_0%/0.5)]" : "border-transparent bg-background/80",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="-ml-1 h-9 max-w-[10rem] gap-2 px-2 sm:max-w-none">
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarFallback className="bg-primary/12 text-xs font-semibold text-primary">
                  {workspaceInitials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden truncate text-sm font-medium sm:inline">{workspaceName ?? "Workspace"}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Current workspace</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>{workspaceName ?? "Workspace"}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">Workspace settings</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="hidden h-5 w-px bg-border sm:block" />
        <div className="hidden min-w-0 sm:block">
          <h1 className="truncate text-sm font-semibold">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <div className="min-w-0 sm:hidden">
          <h1 className="truncate text-sm font-semibold">{title}</h1>
        </div>
        <Button asChild size="sm" variant="outline" className="hidden gap-1.5 md:inline-flex">
          <Link href="/reports/builder">
            <Plus className="h-3.5 w-3.5" /> New report
          </Link>
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
        </Button>
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Account">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                  {accountInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
            {userEmail && <p className="px-2 pb-2 text-xs text-muted-foreground">{userEmail}</p>}
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings?tab=billing">Billing</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <SignOutButton />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

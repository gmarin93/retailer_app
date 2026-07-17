"use client";

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Logout01Icon,
  Menu01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AssistantChat } from "@/features/assistant/components/assistant-chat";
import { useLogout, useSession } from "@/features/auth/hooks";
import { formatUserInitials, formatUserName } from "@/features/auth/schemas";
import { formatUserRole } from "@/features/auth/types";
import { CommandPalette } from "@/features/command-palette/components/command-palette";
import { ReminderBell } from "@/features/dashboard/components/reminder-bell";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { getPagesForRole, type Page } from "@/shared/constants/pages";
import { env } from "@/shared/lib/env";
import { cn } from "@/shared/lib/utils";
import { useUiStore } from "@/stores/ui-store";

function NavLinks({
  pages,
  collapsed,
  onNavigate,
}: {
  pages: Page[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className={cn("flex flex-col", collapsed ? "gap-1.5 px-2 py-2" : "gap-1 px-3 py-2 pl-4")}
    >
      {pages.map((page) => {
        const href = `/${page.id}`;
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={`${page.id}-${page.title}`}
            href={href}
            onClick={onNavigate}
            title={collapsed ? page.title : undefined}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex min-h-11 items-center rounded-xl text-base font-medium transition-all duration-150",
              collapsed ? "justify-center px-0 py-2.5" : "gap-4 px-3 py-2.5",
              isActive
                ? "bg-[linear-gradient(135deg,#5b7bff_0%,#4c6fff_50%,#3a5cf0_100%)] text-white shadow-[0_8px_18px_rgba(76,111,255,0.38),0_2px_4px_rgba(76,111,255,0.25)]"
                : "text-[rgba(17,24,39,0.82)] hover:bg-[rgba(76,111,255,0.1)] hover:text-primary",
            )}
          >
            {isActive && !collapsed && (
              <span
                aria-hidden="true"
                className="absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r-full bg-white/90"
              />
            )}
            <HugeiconsIcon
              icon={page.icon}
              aria-hidden="true"
              className={cn(
                "size-6 shrink-0 transition-transform",
                isActive
                  ? "text-white"
                  : "text-[#3669ff] group-hover:scale-[1.08] group-hover:text-primary",
              )}
            />
            {!collapsed && <span className="truncate">{page.title}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function BrandMark({ collapsed }: { collapsed?: boolean }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center border-b border-[rgba(76,111,255,0.12)]",
        collapsed ? "flex-col gap-0 px-0 py-4" : "gap-3 px-4 py-4 pb-5",
      )}
    >
      <Image
        src="/brand/logo.png"
        alt="Powerhouse"
        width={collapsed ? 40 : 85}
        height={collapsed ? 40 : 85}
        className="object-contain"
        priority
      />
    </div>
  );
}

/**
 * Authenticated chrome — visual twin of Angular `main-hud`:
 * 64px toolbar, collapsible 240↔90 sidenav with brand logo + active gradient pills.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const logout = useLogout();
  const mobileNavOpen = useUiStore((state) => state.mobileNavOpen);
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebarCollapsed = useUiStore((state) => state.toggleSidebarCollapsed);
  const setCommandPaletteOpen = useUiStore((state) => state.setCommandPaletteOpen);

  if (!session) return null;

  const pages = getPagesForRole(session.user.role);
  const userName = formatUserName(session.user);
  const userInitials = formatUserInitials(session.user);
  const roleLabel = formatUserRole(session.user.role);

  return (
    <div className="relative flex min-h-dvh">
      {/* Desktop sidenav — overlays content; content inset stays at collapsed width. */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-30 hidden flex-col border-r border-[rgba(76,111,255,0.08)] shadow-[0_0_8px_rgba(0,0,0,0.06)] transition-[width] duration-150 ease-out md:flex",
          sidebarCollapsed
            ? "w-[90px] bg-[linear-gradient(180deg,#f4f7ff_0%,#e9f0ff_55%,#e2ecff_100%)]"
            : "w-60 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_60%,#f5f8ff_100%)]",
        )}
      >
        <BrandMark collapsed={sidebarCollapsed} />
        <div className="flex justify-center border-b border-[rgba(76,111,255,0.08)] p-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggleSidebarCollapsed}
            className="text-muted-foreground hover:text-primary"
          >
            <HugeiconsIcon
              icon={sidebarCollapsed ? ArrowRight01Icon : ArrowLeft01Icon}
              aria-hidden="true"
              className="size-5"
            />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <NavLinks pages={pages} collapsed={sidebarCollapsed} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:ml-[90px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b bg-white px-4 text-[rgba(0,0,0,0.87)] shadow-[0_1px_3px_0_rgba(0,0,0,0.1)]">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open navigation"
                className="md:hidden"
              >
                <HugeiconsIcon icon={Menu01Icon} aria-hidden="true" className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Powerhouse</SheetTitle>
              </SheetHeader>
              <BrandMark />
              <NavLinks pages={pages} onNavigate={() => setMobileNavOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              className="ml-2 h-9 gap-2 rounded-full px-2.5 text-[rgba(0,0,0,0.6)] hover:bg-primary-soft hover:text-primary"
              aria-label="Open command palette"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <HugeiconsIcon icon={Search01Icon} aria-hidden="true" className="size-[18px]" />
              <span className="hidden text-sm sm:inline">Search</span>
              <kbd className="pointer-events-none hidden rounded-[5px] border border-[rgba(0,0,0,0.18)] px-[5px] py-px font-sans text-[11px] text-[rgba(0,0,0,0.45)] sm:inline">
                ⌘K
              </kbd>
            </Button>
            <ReminderBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 gap-2 px-2">
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                    {userInitials}
                  </span>
                  <span className="hidden flex-col items-start text-left sm:flex">
                    <span className="text-base font-medium leading-tight">{userName}</span>
                    <span className="text-xs font-normal text-muted-foreground">{roleLabel}</span>
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" searchable={false}>
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{userName}</span>
                    <span className="text-xs font-normal text-muted-foreground">{roleLabel}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={logout}>
                  <HugeiconsIcon icon={Logout01Icon} aria-hidden="true" className="size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 bg-[#f5f5f5] p-6 md:px-8 md:pt-6 md:pb-10">{children}</main>
      </div>

      <CommandPalette />
      {env.assistantHost ? <AssistantChat /> : null}
    </div>
  );
}

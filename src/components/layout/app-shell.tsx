"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, BriefcaseBusiness, Building2, CalendarDays, ChevronDown, LogOut, Menu, UserRound, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppUser } from "@/types/database";
import { hasPermission } from "@/lib/permissions";
import { cn, initials } from "@/lib/utils";
import { getNavItems, navItemVisible } from "@/components/layout/nav-items";
import { createClient } from "@/lib/supabase/browser";
import { AnnouncementBell } from "@/components/layout/announcement-bell";
import { BrandingFaviconSync } from "@/components/layout/branding-favicon-sync";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import type { WorkflowNotification } from "@/lib/services/notifications";

type SchoolBranding = {
  logoUrl: string | null;
  faviconUrl: string | null;
  shortName: string | null;
  fullName: string;
};

function ordinal(day: number) {
  const remainder = day % 100;
  if (remainder >= 11 && remainder <= 13) return "th";
  return ({ 1: "st", 2: "nd", 3: "rd" }[day % 10] ?? "th");
}

function formatNavDate(date: Date) {
  return `${date.toLocaleDateString("en-GB", { weekday: "long" })}, ${date.getDate()}${ordinal(date.getDate())} ${date.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`;
}

export function AppShell({
  user,
  branding,
  sidebarBadges = { attendance: 0, leave: 0 },
  initialWorkflowNotifications = [],
  principalCanAccessAcademicControl = false,
  children
}: {
  user: AppUser;
  branding: SchoolBranding;
  sidebarBadges?: { attendance: number; leave: number };
  initialWorkflowNotifications?: WorkflowNotification[];
  principalCanAccessAcademicControl?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [navDate, setNavDate] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const sidebarNavRef = useRef<HTMLElement>(null);
  const sidebarScrollTimeoutRef = useRef<number | null>(null);
  const [sidebarScrolling, setSidebarScrolling] = useState(false);
  const items = getNavItems(user.role, { principalCanAccessAcademicControl }).filter((item) => {
    if (item.href === "/academics" && hasPermission(user.role, "classes:manage", user.permissions)) {
      return false;
    }

    return navItemVisible(user.role, item.permission, user.permissions, item.anyPermissions);
  });
  const supabase = useMemo(() => createClient(), []);
  const schoolDisplayName = branding.shortName ?? branding.fullName;

  useEffect(() => {
    setProfileOpen(false);
    setAnnouncementsOpen(false);
  }, [pathname]);

  useEffect(() => {
    setNavDate(formatNavDate(new Date()));
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    const previousPath = prevPathnameRef.current;
    if (pathname === previousPath) return; // only run on actual path change
    prevPathnameRef.current = pathname;

    setExpandedModules((current) => {
      let next = current;
      for (const item of items) {
        if (!item.subItems) continue;

        const inModule = pathname === item.href || pathname.startsWith(`${item.href}/`);

        if (inModule && !current[item.href]) {
          if (next === current) next = { ...current };
          next[item.href] = true;
        } else if (!inModule && current[item.href]) {
          if (next === current) next = { ...current };
          next[item.href] = false;
        }
      }
      return next;
    });
  }, [items, pathname]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const navElement = sidebarNavRef.current;
    if (!navElement) return;

    function handleScroll() {
      setSidebarScrolling(true);
      if (sidebarScrollTimeoutRef.current != null) {
        window.clearTimeout(sidebarScrollTimeoutRef.current);
      }
      sidebarScrollTimeoutRef.current = window.setTimeout(() => {
        setSidebarScrolling(false);
        sidebarScrollTimeoutRef.current = null;
      }, 700);
    }

    navElement.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      navElement.removeEventListener("scroll", handleScroll);
      if (sidebarScrollTimeoutRef.current != null) {
        window.clearTimeout(sidebarScrollTimeoutRef.current);
      }
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  function badgeForHref(href: string) {
    if (href === "/attendance") return sidebarBadges.attendance;
    if (href === "/leave") return sidebarBadges.leave;
    return 0;
  }

  const renderBadge = (count: number) =>
    count > 0 ? (
      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold leading-none text-white">
        {count > 99 ? "99+" : count}
      </span>
    ) : null;

  const renderProfileAvatar = () => (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-sm font-bold text-primary ring-1 ring-outline/70">
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(user.fullName)
      )}
    </div>
  );

  // Group visible items by their section label, preserving order
  const groupedItems = items.reduce<{ section: string; items: typeof items }[]>((acc, item) => {
    const sectionLabel = item.section ?? "";
    const last = acc[acc.length - 1];
    if (last && last.section === sectionLabel) {
      last.items.push(item);
    } else {
      acc.push({ section: sectionLabel, items: [item] });
    }
    return acc;
  }, []);

  const sidebar = (
    <aside className="flex h-full min-h-0 w-[292px] flex-col bg-white">
      {/* Brand header */}
      <div className="flex h-[92px] items-center gap-3 border-b border-slate-200 px-7 py-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-950 text-white shadow-sm">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={`${branding.fullName} logo`} className="h-full w-full object-cover" />
          ) : (
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight text-slate-950" title={schoolDisplayName}>{schoolDisplayName}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Powered by Darsgah</p>
        </div>
      </div>

      {/* Navigation */}
      <nav
        ref={sidebarNavRef}
        className={cn(
          "sidebar-scroll min-h-0 flex-1 overflow-y-auto px-4 py-5",
          sidebarScrolling && "sidebar-scroll--active"
        )}
      >
        {groupedItems.map(({ section, items: sectionItems }, groupIndex) => (
          <div key={`${section}-${groupIndex}`} className={groupIndex > 0 ? "mt-6" : ""}>
            {/* Section label */}
            {section && (
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                {section}
              </p>
            )}

            <div className="space-y-1">
              {sectionItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                if (item.subItems) {
                  const allowedSubItems = item.subItems.filter((sub) =>
                    navItemVisible(user.role, sub.permission, user.permissions, sub.anyPermissions)
                  );
                  if (allowedSubItems.length === 0) return null;
                  const expanded = expandedModules[item.href] ?? active;
                  return (
                    <div key={item.href}>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedModules((current) => {
                            const isExpanded = current[item.href] ?? active;
                            return { ...current, [item.href]: !isExpanded };
                          })
                        }
                        className={cn(
                          "group flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold transition-all duration-150",
                          active
                            ? "bg-blue-50 text-primary"
                            : "text-slate-700 hover:bg-slate-50 hover:text-primary"
                        )}
                        aria-expanded={expanded}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={cn("h-[18px] w-[18px] shrink-0 transition-colors duration-150", active ? "text-primary" : "text-slate-600 group-hover:text-primary")}
                            aria-hidden="true"
                          />
                          <span className="font-semibold">{item.label}</span>
                        </div>
                        <ChevronDown
                          className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-200", expanded ? "rotate-180" : "", active ? "text-primary/70" : "text-slate-400")}
                          aria-hidden="true"
                        />
                      </button>

                      {expanded && (
                        <div className="ml-[24px] mt-1 space-y-1 border-l border-slate-200 pl-3">
                          {allowedSubItems.map((sub) => {
                            const isSubActive = pathname === sub.href || pathname.startsWith(`${sub.href}/`);
                            return (
                              <Link
                                href={sub.href}
                                key={sub.href}
                                onClick={() => setOpen(false)}
                                className={cn(
                                  "flex items-center rounded-md px-3 py-2 text-xs font-semibold transition-all duration-150",
                                  isSubActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-primary"
                                )}
                              >
                                {sub.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    href={item.href}
                    key={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "group flex items-center justify-between gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition-all duration-150",
                      active
                        ? "bg-blue-50 text-primary"
                        : "text-slate-700 hover:bg-slate-50 hover:text-primary"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn("h-[18px] w-[18px] shrink-0 transition-colors duration-150", active ? "text-primary" : "text-slate-600 group-hover:text-primary")}
                        aria-hidden="true"
                      />
                      <span>{item.label}</span>
                    </div>
                    {renderBadge(badgeForHref(item.href))}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background text-ink">
      <NavigationProgress />
      <BrandingFaviconSync faviconUrl={branding.faviconUrl} />
      <div className="fixed inset-y-0 left-0 z-40 hidden h-dvh w-[292px] overflow-hidden border-r border-slate-200 bg-white lg:block">{sidebar}</div>
      <div
        className={cn(
          "fixed inset-0 z-50 h-dvh bg-black/50 backdrop-blur-[1px] transition-opacity duration-200 lg:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-[60] flex h-dvh w-[min(292px,calc(100vw-2rem))] flex-col overflow-hidden bg-white shadow-2xl transition-transform duration-200 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Navigation</span>
          <button className="rounded-xl p-2 text-slate-500 hover:bg-surface-low hover:text-slate-900" onClick={() => setOpen(false)} aria-label="Close navigation">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          {sidebar}
        </div>
      </div>

      <div className="lg:pl-[292px]">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6 lg:relative lg:h-[92px] lg:px-10">
          <div className="absolute inset-y-0 left-0 hidden w-px bg-slate-200 lg:block" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-low lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden items-center gap-2 text-sm font-bold text-slate-900 sm:flex">
              <CalendarDays className="h-5 w-5 text-slate-700" aria-hidden="true" />
              <span>{navDate ?? ""}</span>
            </div>
          </div>
          <div className="relative flex items-center gap-3" ref={menuRef}>
            {hasPermission(user.role, "announcements:view", user.permissions) && (
              <AnnouncementBell user={user} initialWorkflowNotifications={initialWorkflowNotifications} open={announcementsOpen} onOpenChange={(nextOpen) => {
                setAnnouncementsOpen(nextOpen);
                if (nextOpen) setProfileOpen(false);
              }} />
            )}
            <button
              type="button"
              onClick={() => {
                setAnnouncementsOpen(false);
                setProfileOpen((value) => !value);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full text-primary transition duration-200 hover:bg-surface-low"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              aria-label="Open profile menu"
            >
              {renderProfileAvatar()}
            </button>

            <div
              className={cn(
                "absolute right-0 top-[calc(100%+0.75rem)] z-50 w-72 rounded-[20px] bg-white p-2 opacity-0 shadow-lift ring-1 ring-outline transition duration-200",
                profileOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1"
              )}
              role="menu"
            >
              <div className="flex gap-3 rounded-2xl bg-surface-low p-3">
                {renderProfileAvatar()}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{user.fullName}</p>
                  <p className="truncate text-xs font-semibold text-muted">{user.email ?? user.schoolName}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="truncate">{user.jobTitle ?? user.department ?? user.role.replace("_", " ")}</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 grid gap-1">
                <Link
                  href="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted transition hover:bg-surface-low hover:text-primary"
                  role="menuitem"
                >
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">View Profile</span>
                    <span className="block truncate text-xs font-medium text-muted">{user.fullName}</span>
                  </span>
                </Link>
                <Link
                  href="/school-profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface-low hover:text-primary"
                  role="menuitem"
                >
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  School Profile
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-muted transition hover:bg-danger-soft hover:text-danger"
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1520px] px-4 py-5 sm:px-6 sm:py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}

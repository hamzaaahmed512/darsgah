"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, BriefcaseBusiness, Building2, ChevronDown, LogOut, Menu, UserRound, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppUser } from "@/types/database";
import { hasPermission } from "@/lib/permissions";
import { cn, initials } from "@/lib/utils";
import { getNavItems, navItemVisible } from "@/components/layout/nav-items";
import { createClient } from "@/lib/supabase/browser";
import { AnnouncementBell } from "@/components/layout/announcement-bell";
import { BrandingFaviconSync } from "@/components/layout/branding-favicon-sync";

type SchoolBranding = {
  logoUrl: string | null;
  faviconUrl: string | null;
};

export function AppShell({ user, branding, children }: { user: AppUser; branding: SchoolBranding; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const items = getNavItems(user.role).filter((item) => {
    if (item.href === "/academics" && hasPermission(user.role, "classes:manage", user.permissions)) {
      return false;
    }

    return navItemVisible(user.role, item.permission, user.permissions, item.anyPermissions);
  });
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    setProfileOpen(false);
  }, [pathname]);

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
    if (!hasPermission(user.role, "approvals:review", user.permissions)) return;

    // Fetch initial count
    async function fetchCount() {
      const { count } = await supabase
        .from("approval_requests")
        .select("*", { count: "exact", head: true })
        .eq("school_id", user.schoolId)
        .eq("status", "pending");
      if (count !== null) setPendingCount(count);
    }
    
    fetchCount();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("approval_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "approval_requests",
          filter: `school_id=eq.${user.schoolId}`
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.permissions, user.schoolId, user.role, supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/sign-in";
  }

  const renderProfileAvatar = () => (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-low text-sm font-bold text-primary ring-1 ring-outline/70">
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(user.fullName)
      )}
    </div>
  );

  const sidebar = (
    <aside className="flex h-full w-[280px] flex-col bg-white p-5">
      <div className="mb-10 flex items-center gap-3 px-1">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-primary text-white shadow-button">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={`${user.schoolName} logo`} className="h-full w-full object-cover" />
          ) : (
            <BookOpen aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-2xl font-bold leading-tight tracking-tight text-ink" title={user.schoolName}>{user.schoolName}</p>
          <p className="font-label text-[10px] font-semibold uppercase tracking-wider text-muted">Powered by Darsgah</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const isApprovals = item.href === "/approvals";
          const showBadge = isApprovals && pendingCount > 0 && hasPermission(user.role, "approvals:review", user.permissions);

          if (item.subItems) {
            const allowedSubItems = item.subItems.filter((sub) =>
              navItemVisible(user.role, sub.permission, user.permissions, sub.anyPermissions)
            );
            if (allowedSubItems.length === 0) return null;
            const expanded = expandedModules[item.href] ?? active;
            return (
              <div key={item.href} className="space-y-1">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedModules((current) => {
                      const isExpanded = current[item.href] ?? active;
                      return { ...current, [item.href]: !isExpanded };
                    })
                  }
                  className={cn(
                    "group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition-all duration-200",
                    active ? "bg-primary text-white shadow-button" : "text-muted hover:bg-surface-low hover:text-ink"
                  )}
                  aria-expanded={expanded}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-xl transition duration-200",
                        active ? "bg-white/20 text-white" : "bg-surface-low text-muted group-hover:bg-white group-hover:text-primary group-hover:shadow-sm"
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    {item.label}
                  </div>
                  <ChevronDown className={cn("h-4 w-4 transition", expanded ? "rotate-180" : "")} aria-hidden="true" />
                </button>

                {expanded && (
                  <div className="ml-5 space-y-1 border-l border-outline/70 pl-3">
                    {allowedSubItems.map((sub) => {
                      const isSubActive = pathname === sub.href || pathname.startsWith(`${sub.href}/`);
                      return (
                        <Link
                          href={sub.href}
                          key={sub.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition duration-200",
                            isSubActive
                              ? "bg-primary-soft text-primary font-bold"
                              : "text-muted hover:bg-surface-low hover:text-ink"
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
                "group flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200",
                active ? "bg-primary text-white shadow-button" : "text-muted hover:bg-surface-low hover:text-ink"
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl transition duration-200",
                    active ? "bg-white/20 text-white" : "bg-surface-low text-muted group-hover:bg-white group-hover:text-primary group-hover:shadow-sm"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {item.label}
              </div>
              {showBadge && (
                <span className="flex h-5 items-center justify-center rounded-full bg-danger px-2 text-xs font-bold text-white shadow-sm">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background text-ink">
      <BrandingFaviconSync faviconUrl={branding.faviconUrl} />
      <div className="fixed inset-y-0 left-0 z-40 hidden w-[280px] bg-white shadow-[1px_0_0_rgba(226,232,240,0.9)] lg:block">{sidebar}</div>
      <div className={cn("fixed inset-0 z-50 bg-black/30 lg:hidden", open ? "block" : "hidden")} onClick={() => setOpen(false)} />
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] transform bg-white shadow-lift transition duration-200 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex justify-end p-3">
          <button className="rounded-xl p-2 hover:bg-surface-low" onClick={() => setOpen(false)} aria-label="Close navigation">
            <X className="h-5 w-5" />
          </button>
        </div>
        {sidebar}
      </div>

      <div className="lg:pl-[280px]">
        <header className="flex min-h-20 items-center justify-between gap-3 bg-white px-4 shadow-[0_1px_0_rgba(226,232,240,0.9)] sm:px-6 lg:px-10">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button className="rounded-xl p-2 hover:bg-surface-low lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <div className="relative flex items-center gap-3" ref={menuRef}>
            {hasPermission(user.role, "announcements:view", user.permissions) && (
              <AnnouncementBell user={user} />
            )}
            <button
              type="button"
              onClick={() => setProfileOpen((value) => !value)}
              className="flex h-11 w-11 items-center justify-center rounded-full transition duration-200 hover:bg-surface-low"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              aria-label="Open profile menu"
            >
              {renderProfileAvatar()}
            </button>

            <div
              className={cn(
                "absolute right-0 top-[calc(100%+0.75rem)] w-72 rounded-[20px] bg-white p-2 opacity-0 shadow-lift ring-1 ring-outline transition duration-200",
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
        <main className="mx-auto w-full max-w-[1520px] px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}

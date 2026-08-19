"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CreditCard, ExternalLink, LayoutDashboard, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { GetDarsgahLogo } from "@/components/brand/getdarsgah-logo";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const links = [
  { href: "/platform", label: "Overview", icon: LayoutDashboard },
  { href: "/platform/schools", label: "Schools", icon: Building2 },
  { href: "/platform/subscriptions", label: "Subscriptions", icon: CreditCard }
];

export function PlatformShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    setOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const adminAvatar = (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary ring-1 ring-outline/70">
      <ShieldCheck className="h-5 w-5" aria-hidden="true" />
    </div>
  );

  const sidebar = (
    <aside className="flex h-full w-[280px] flex-col bg-white p-5">
      <Link href="/platform" onClick={() => setOpen(false)} className="mb-10 flex items-center gap-3 px-1">
        <GetDarsgahLogo className="h-12 w-12" priority />
        <span className="min-w-0">
          <span className="block truncate font-display text-2xl font-bold leading-tight tracking-tight text-ink">getdarsgah</span>
          <span className="block font-label text-[10px] font-semibold uppercase tracking-wider text-muted">Platform Control</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1" aria-label="Platform administration">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/platform" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              onClick={() => setOpen(false)}
              href={href}
              key={href}
              className={cn(
                "group flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200",
                active ? "bg-primary text-white shadow-button" : "text-muted hover:bg-surface-low hover:text-ink"
              )}
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl transition duration-200",
                    active ? "bg-white/20 text-white" : "bg-surface-low text-muted group-hover:bg-white group-hover:text-primary group-hover:shadow-sm"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background text-ink">
      <div className="fixed inset-y-0 left-0 z-40 hidden w-[280px] bg-white shadow-[1px_0_0_rgba(226,232,240,0.9)] lg:block">
        {sidebar}
      </div>

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
        <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-3 bg-white px-4 shadow-[0_1px_0_rgba(226,232,240,0.9)] sm:px-6 lg:px-10">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button className="rounded-xl p-2 hover:bg-surface-low lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <div className="relative flex items-center gap-3" ref={menuRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((value) => !value)}
              className="flex h-11 w-11 items-center justify-center rounded-full text-primary transition duration-200 hover:bg-surface-low"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              aria-label="Open platform administrator menu"
            >
              {adminAvatar}
            </button>

            <div
              className={cn(
                "absolute right-0 top-[calc(100%+0.75rem)] w-72 rounded-[20px] bg-white p-2 opacity-0 shadow-lift ring-1 ring-outline transition duration-200",
                profileOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1"
              )}
              role="menu"
            >
              <div className="flex gap-3 rounded-2xl bg-surface-low p-3">
                {adminAvatar}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink">Platform Admin</p>
                  <p className="truncate text-xs font-semibold text-muted">{email}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    GetDarsgah Control
                  </div>
                </div>
              </div>
              <div className="mt-2 grid gap-1">
                <Link
                  href="/"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface-low hover:text-primary"
                  role="menuitem"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  View public website
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

        <main className="p-4 sm:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}

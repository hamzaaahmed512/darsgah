"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Brand } from "@/components/marketing/brand";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Overview" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/faqs", label: "FAQs" },
  { href: "/contact", label: "Contact" }
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="marketing-container flex h-[72px] items-center justify-between gap-6">
        <Brand />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {navigation.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                href={item.href}
                key={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-low hover:text-ink"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/sign-in" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface-low">
            Sign in
          </Link>
          <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-button hover:bg-primary-ink">
            Book a demo <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <button
          type="button"
          className="rounded-xl border border-outline p-2.5 text-ink lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? "Close navigation" : "Open navigation"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open ? (
        <div className="border-t border-outline bg-white px-4 pb-5 pt-3 lg:hidden">
          <nav className="mx-auto grid max-w-7xl gap-1" aria-label="Mobile navigation">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-xl px-4 py-3 text-sm font-semibold text-muted hover:bg-surface-low hover:text-ink">
                {item.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-outline pt-4">
              <Link href="/sign-in" className="rounded-xl border border-outline px-4 py-3 text-center text-sm font-semibold text-ink">Sign in</Link>
              <Link href="/contact" className="rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-white">Book a demo</Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

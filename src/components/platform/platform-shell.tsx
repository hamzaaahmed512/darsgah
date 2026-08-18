"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Building2, CreditCard, LayoutDashboard, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
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
  async function signOut() { await createClient().auth.signOut(); window.location.href = "/"; }
  const sidebar = <div className="flex h-full flex-col bg-[#0b1d3a] p-5 text-white">
    <Link href="/platform" className="flex items-center gap-3 px-1"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-button"><BookOpen className="h-5 w-5" /></span><div><p className="text-lg font-bold tracking-tight">getdarsgah</p><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-blue-300">Platform control</p></div></Link>
    <div className="my-8 h-px bg-white/10" />
    <nav className="flex-1 space-y-1">{links.map(({ href, label, icon: Icon }) => { const active = href === "/platform" ? pathname === href : pathname.startsWith(href); return <Link onClick={() => setOpen(false)} href={href} key={href} className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold", active ? "bg-white text-[#0b1d3a]" : "text-blue-100/70 hover:bg-white/10 hover:text-white")}><Icon className="h-4 w-4" />{label}</Link>; })}</nav>
    <div className="border-t border-white/10 pt-5"><div className="flex items-center gap-3 px-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/20 text-blue-200"><ShieldCheck className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-wider text-blue-300">Platform admin</p><p className="truncate text-xs text-blue-100/70">{email}</p></div><button onClick={signOut} className="rounded-lg p-2 text-blue-200 hover:bg-white/10" aria-label="Sign out"><LogOut className="h-4 w-4" /></button></div></div>
  </div>;
  return <div className="min-h-screen bg-[#f6f8fc] text-ink"><aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] lg:block">{sidebar}</aside><div onClick={() => setOpen(false)} className={cn("fixed inset-0 z-40 bg-slate-950/35 lg:hidden", open ? "block" : "hidden")} /><aside className={cn("fixed inset-y-0 left-0 z-50 w-[280px] transform transition-transform lg:hidden", open ? "translate-x-0" : "-translate-x-full")}>{sidebar}<button onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-lg p-2 text-white"><X className="h-5 w-5" /></button></aside><div className="lg:pl-[260px]"><header className="sticky top-0 z-30 flex h-18 items-center border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl sm:px-8"><button onClick={() => setOpen(true)} className="rounded-xl border border-outline p-2 lg:hidden"><Menu className="h-5 w-5" /></button><div className="ml-auto"><Link href="/" className="text-xs font-semibold text-muted hover:text-primary">View public website</Link></div></header><main className="p-4 sm:p-8 lg:p-10">{children}</main></div></div>;
}

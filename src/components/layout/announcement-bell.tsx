"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Archive, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { CreateAnnouncementDialog } from "@/components/announcements/create-announcement-dialog";
import { archiveAnnouncementAction } from "@/app/(app)/announcements/actions";
import { hasPermission } from "@/lib/permissions";
import { cn, formatDatePK } from "@/lib/utils";
import type { AppUser, AnnouncementWithRead, AnnouncementPriority } from "@/types/database";

const PRIORITY_STYLES: Record<AnnouncementPriority, string> = {
  low: "bg-surface-low text-muted",
  medium: "bg-primary-soft text-primary",
  high: "bg-warning-soft text-warning",
  critical: "bg-danger-soft text-danger"
};

const PRIORITY_DOT: Record<AnnouncementPriority, string> = {
  low: "bg-muted",
  medium: "bg-primary",
  high: "bg-warning",
  critical: "bg-danger"
};

export function AnnouncementBell({ user, open, onOpenChange }: { user: AppUser; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [announcements, setAnnouncements] = useState<AnnouncementWithRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const supabase = useCallback(() => createClient(), []);
  const canManage = hasPermission(user.role, "announcements:manage", user.permissions);
  const today = new Date().toISOString().split("T")[0];

  const unreadCount = announcements.filter((a) => !a.is_read && !a.is_archived && a.publish_date <= today).length;

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/announcements");
      if (!res.ok) throw new Error("Announcements could not be loaded.");
      const data = await res.json();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Announcements could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Realtime subscription
  useEffect(() => {
    const client = supabase();
    const channel = client
      .channel("announcements_bell")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements", filter: `school_id=eq.${user.schoolId}` }, () => {
        fetchAnnouncements();
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [user.schoolId, supabase, fetchAnnouncements]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) onOpenChange(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onOpenChange]);

  async function handleMarkRead(id: string) {
    // Optimistically update
    setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
    await fetch("/api/announcements/mark-read", { method: "POST", body: JSON.stringify({ id }), headers: { "Content-Type": "application/json" } });
  }

  async function handleMarkAllRead() {
    setAnnouncements((prev) => prev.map((a) => ({ ...a, is_read: true })));
    await fetch("/api/announcements/mark-all-read", { method: "POST" });
  }

  async function handleArchive(id: string) {
    const previous = announcements;
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    const res = await archiveAnnouncementAction(id);
    if (res && "error" in res) {
      setAnnouncements(previous);
    } else {
      fetchAnnouncements();
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => {
          const nextOpen = !open;
          onOpenChange(nextOpen);
          if (nextOpen) void fetchAnnouncements();
        }}
        className="relative flex h-11 w-11 items-center justify-center rounded-full text-muted transition duration-200 hover:bg-primary-soft hover:text-primary"
        aria-label={`Announcements${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5 text-muted" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <div
        className={cn(
          "fixed inset-x-3 top-20 z-50 w-auto max-w-[calc(100vw-1.5rem)] rounded-[20px] bg-white shadow-lift ring-1 ring-outline transition-all duration-200 sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+0.75rem)] sm:w-[360px]",
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        )}
        role="dialog"
        aria-label="Announcements panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-outline px-4 py-4">
          <div>
            <p className="font-semibold text-ink">Announcements</p>
            {unreadCount > 0 && (
              <p className="text-xs text-muted">{unreadCount} unread</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[calc(100dvh-11rem)] overflow-y-auto sm:max-h-[400px]">
          {loading ? (
            <div className="py-10 text-center text-sm text-muted">Loading…</div>
          ) : loadError ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-semibold text-danger">{loadError}</p>
              <button type="button" onClick={() => void fetchAnnouncements()} className="mt-3 text-sm font-semibold text-primary hover:underline">Try again</button>
            </div>
          ) : !announcements.length ? (
            <div className="py-10 text-center">
              <Bell className="mx-auto mb-2 h-8 w-8 text-outline" />
              <p className="text-sm text-muted">No active announcements</p>
            </div>
          ) : (
            <div className="divide-y divide-outline/30">
              {announcements.map((a) => {
                const isExpired = Boolean(a.expiry_date && a.expiry_date < today);
                return (
                <div
                  key={a.id}
                  className={cn(
                    "group cursor-pointer px-4 py-3 transition hover:bg-surface-low",
                    !a.is_read && "bg-primary-soft/20"
                  )}
                  onClick={() => !a.is_read && handleMarkRead(a.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && !a.is_read && handleMarkRead(a.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex-shrink-0">
                      <span className={cn("inline-flex h-2 w-2 rounded-full", PRIORITY_DOT[a.priority])} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-start gap-2">
                        <p className={cn("min-w-0 break-words text-sm font-semibold", a.is_read ? "text-ink" : "text-primary")}>
                          {a.title}
                        </p>
                        {!a.is_read && (
                          <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-xs leading-5 text-muted sm:line-clamp-3">{a.description}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", PRIORITY_STYLES[a.priority])}>
                          {a.priority}
                        </span>
                        {a.is_archived && (
                          <span className="rounded bg-surface-high px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                            Archived
                          </span>
                        )}
                        {!a.is_archived && isExpired && (
                          <span className="rounded bg-surface-high px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                            Expired
                          </span>
                        )}
                        <span className="text-[10px] text-muted">{formatDatePK(a.publish_date)}</span>
                        {a.created_by_name && (
                          <span className="text-[10px] text-muted">by {a.created_by_name}</span>
                        )}
                      </div>
                      {canManage && !a.is_archived && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleArchive(a.id);
                          }}
                          className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-danger"
                        >
                          <Archive className="h-3 w-3" aria-hidden="true" />
                          Archive
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-outline px-4 py-3">
          {canManage ? (
            <CreateAnnouncementDialog
              triggerLabel="Make Announcement"
              triggerClassName="inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-button hover:bg-primary-ink"
              onSuccess={fetchAnnouncements}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

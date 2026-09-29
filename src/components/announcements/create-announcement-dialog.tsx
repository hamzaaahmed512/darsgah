"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { createAnnouncementAction } from "@/app/(app)/announcements/actions";
import type { AnnouncementPriority, AnnouncementType, AnnouncementAudienceType } from "@/types/database";

export function CreateAnnouncementDialog({
  triggerLabel = "New Announcement",
  triggerClassName,
  audienceScope = "staff",
  onSuccess
}: {
  triggerLabel?: string;
  triggerClassName?: string;
  audienceScope?: "staff" | "parents";
  onSuccess?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().split("T")[0];
  const defaultAudience: AnnouncementAudienceType = audienceScope === "parents" ? "parents" : "all";
  const audienceOptions: Array<{ value: AnnouncementAudienceType; label: string }> = audienceScope === "parents"
    ? [{ value: "parents", label: "All Parents" }]
    : [
        { value: "all", label: "All Staff" },
        { value: "teachers", label: "Teachers Only" },
        { value: "registrar", label: "Registrar Only" },
        { value: "admin", label: "Admin Only" }
      ];

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium" as AnnouncementPriority,
    type: "general" as AnnouncementType,
    audience_type: defaultAudience as AnnouncementAudienceType,
    audience_value: "",
    publish_date: today,
    expiry_date: ""
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    startTransition(async () => {
      const res = await createAnnouncementAction({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        expiry_date: form.expiry_date || null,
        audience_value: form.audience_value || null
      } as any);
      if (res.error) {
        setError(res.error);
      } else {
        setOpen(false);
        setForm({ title: "", description: "", priority: "medium", type: "general", audience_type: defaultAudience, audience_value: "", publish_date: today, expiry_date: "" });
        if (onSuccess) {
          await onSuccess();
        }
        router.refresh();
      }
    });
  }

  const modal = open ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/30 p-3 sm:p-4">
      <div className="max-h-[calc(100dvh-1.5rem)] w-full overflow-hidden flex flex-col max-w-lg min-h-0 flex-1 overflow-y-auto rounded-[20px] bg-white shadow-lift ring-1 ring-outline sm:max-h-[calc(100dvh-2rem)]">
        <div className="border-b border-outline px-4 py-4 sm:px-6 sm:py-5">
          <h2 className="font-display text-xl font-bold text-ink">New Announcement</h2>
          <p className="text-sm text-muted">Send a notification to parents or members of the school staff.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-6">
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink">Title<span className="ml-0.5 text-danger" aria-hidden="true">*</span></label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Important Staff Meeting" className="w-full rounded-xl border border-outline px-4 py-2.5 text-sm font-medium focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink">Description <span className="text-xs text-muted">(optional)</span></label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="Add announcement details if needed..." className="w-full resize-none rounded-xl border border-outline px-4 py-3 text-sm font-medium focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">Priority</label>
              <select value={form.priority} onChange={(e) => set("priority", e.target.value)} className="w-full rounded-xl border border-outline px-4 py-2.5 text-sm font-medium focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">Type</label>
              <select value={form.type} onChange={(e) => set("type", e.target.value)} className="w-full rounded-xl border border-outline px-4 py-2.5 text-sm font-medium focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10">
                <option value="general">General</option>
                <option value="academic">Academic</option>
                <option value="holiday">Holiday</option>
                <option value="emergency">Emergency</option>
                <option value="meeting">Meeting</option>
                <option value="examination">Examination</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink">Audience</label>
            <select value={form.audience_type} onChange={(e) => set("audience_type", e.target.value)} className="w-full rounded-xl border border-outline px-4 py-2.5 text-sm font-medium focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10">
              {audienceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">Publish Date</label>
              <input type="date" value={form.publish_date} onChange={(e) => set("publish_date", e.target.value)} className="w-full rounded-xl border border-outline px-4 py-2.5 text-sm font-medium focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">Expiry Date <span className="text-xs text-muted">(optional)</span></label>
              <input type="date" value={form.expiry_date} onChange={(e) => set("expiry_date", e.target.value)} className="w-full rounded-xl border border-outline px-4 py-2.5 text-sm font-medium focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
            </div>
          </div>
          {error && <p className="text-sm font-semibold text-danger">{error}</p>}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-outline bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-low">Cancel</button>
            <button type="submit" disabled={isPending} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-button hover:bg-primary-ink disabled:opacity-60">
              {isPending ? "Publishing..." : "Publish Announcement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName ?? "inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-button hover:bg-primary-ink"}
      >
        {triggerLabel}
      </button>

      {mounted ? createPortal(modal, document.body) : null}
    </>
  );
}

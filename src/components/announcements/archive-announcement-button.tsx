"use client";

import { useState, useTransition } from "react";
import { archiveAnnouncementAction } from "@/app/(app)/announcements/actions";
import { Archive } from "lucide-react";

export function ArchiveAnnouncementButton({ announcementId }: { announcementId: string }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (done) return <span className="text-xs text-muted">Archived</span>;

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("Archive this announcement?")) return;
        startTransition(async () => {
          const res = await archiveAnnouncementAction(announcementId);
          if (res.ok) setDone(true);
        });
      }}
      title="Archive announcement"
      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-low hover:text-danger disabled:opacity-40"
    >
      <Archive className="h-4 w-4" />
    </button>
  );
}

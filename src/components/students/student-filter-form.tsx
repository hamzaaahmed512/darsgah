"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { Input, Select } from "@/components/ui/form-field";
import { formatClassDisplayName } from "@/lib/utils";

type ClassOption = {
  id: string;
  name: string;
  grade_name: string;
  section_name: string | null;
};

export function StudentFilterForm({ classes, limitedView = false }: { classes: ClassOption[]; limitedView?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);

  const currentQ = searchParams.get("q") ?? "";
  const currentStatus = searchParams.get("status") ?? "active";
  const currentClassId = searchParams.get("classId") ?? "all";

  const pushFilters = useCallback(
    (next: { q?: string; status?: string; classId?: string }) => {
      const params = new URLSearchParams(searchParams);
      const q = next.q ?? searchRef.current?.value ?? currentQ;
      const status = next.status ?? currentStatus;
      const classId = next.classId ?? currentClassId;

      params.delete("page");
      if (q.trim()) params.set("q", q.trim());
      else params.delete("q");

      if (status && status !== "active") params.set("status", status);
      else params.delete("status");

      if (classId && classId !== "all") params.set("classId", classId);
      else params.delete("classId");

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [currentClassId, currentQ, currentStatus, pathname, router, searchParams]
  );

  useEffect(() => {
    const input = searchRef.current;
    if (!input) return;
    const element = input;

    function handleInput() {
      window.clearTimeout(Number(element.dataset.timer));
      const timer = window.setTimeout(() => pushFilters({ q: element.value }), 250);
      element.dataset.timer = String(timer);
    }

    element.addEventListener("input", handleInput);
    return () => element.removeEventListener("input", handleInput);
  }, [pushFilters]);

  return (
    <div className={`grid gap-4 ${limitedView ? "md:grid-cols-[minmax(0,1fr)_260px]" : "md:grid-cols-[minmax(0,1.55fr)_320px_320px]"}`}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <Input ref={searchRef} defaultValue={currentQ} className="min-h-14 rounded-2xl border-slate-200 pl-12 text-base shadow-none" placeholder="Search by name, admission no. or father's name..." />
      </div>
      {!limitedView ? <Select value={currentStatus} onChange={(event) => pushFilters({ status: event.target.value })} aria-label="Student status" className="min-h-14 rounded-2xl border-slate-200 text-base shadow-none">
        <option value="all">All statuses</option>
        <option value="active">Active</option>
        <option value="pending_approval">Pending approval</option>
        <option value="pending_cancellation">Pending cancellation</option>
        <option value="graduated">Graduated</option>
        <option value="transferred">Transferred</option>
        <option value="cancelled">Cancelled</option>
        <option value="archived">Archived</option>
      </Select> : null}
      <Select value={currentClassId} onChange={(event) => pushFilters({ classId: event.target.value })} aria-label="Student class" className="min-h-14 rounded-2xl border-slate-200 text-base shadow-none">
        <option value="all">All classes</option>
        {classes.map((item) => (
          <option key={item.id} value={item.id}>
            {formatClassDisplayName(item.grade_name, item.name, item.section_name)}
          </option>
        ))}
      </Select>
    </div>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { libraryAssignableStaffAction, libraryTeamRoleAction } from "@/app/(app)/library/actions";
import type { LibraryTeamMember } from "@/lib/services/library";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function LibraryTeamCard({ team, canAdmin }: { team: LibraryTeamMember[]; canAdmin: boolean }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [members, setMembers] = useState(team);
  const [staff, setStaff] = useState<LibraryTeamMember[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(canAdmin);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => { setMembers(team); }, [team]);
  useEffect(() => {
    if (!canAdmin) return;
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    libraryAssignableStaffAction().then(result => {
      if (cancelled) return;
      if (result.staff) setStaff(result.staff);
      else setLoadError(result.error || "Could not load staff.");
    }).catch(() => {
      if (!cancelled) setLoadError("Could not load staff. Please try again.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [canAdmin, reload, team]);

  const candidates = staff.filter(person => person.status === "active" && person.role !== "librarian" && !members.some(member => member.member_id === person.member_id));
  const selected = candidates.find(person => person.member_id === selectedId);

  function changeRole(member: LibraryTeamMember, action: "assign" | "unassign") {
    if (pending) return;
    if (action === "unassign" && !window.confirm(`Unassign ${member.full_name} as Librarian? Their role will change to Staff.`)) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await libraryTeamRoleAction({ memberId: member.member_id, action });
        if (!result.member) {
          const message = result.error || "Could not update the librarian role.";
          setError(message);
          pushToast(message, "error");
          return;
        }
        const updated = result.member;
        setMembers(current => action === "assign"
          ? [...current.filter(person => person.member_id !== updated.member_id), updated].sort((a, b) => a.full_name.localeCompare(b.full_name))
          : current.filter(person => person.member_id !== updated.member_id));
        setStaff(current => [...current.filter(person => person.member_id !== updated.member_id), updated]);
        setSelectedId("");
        pushToast(action === "assign" ? `${updated.full_name} was assigned as Librarian.` : `${updated.full_name} was unassigned as Librarian.`, "success");
        router.refresh();
      } catch {
        const message = "Connection interrupted. Refresh to check whether the role changed before retrying.";
        setError(message);
        pushToast(message, "error");
      }
    });
  }

  return (
    <section aria-labelledby="library-team-heading" className="rounded-2xl border border-outline/70 bg-white p-5 shadow-sm sm:p-6">
      <h2 id="library-team-heading" className="mb-5 text-lg font-bold text-ink">Assigned Librarians</h2>
      {members.length ? (
        <ul className="space-y-3" aria-label="Assigned librarians">
          {members.map(member => (
            <li key={member.member_id} className="flex flex-wrap items-center gap-3 rounded-xl border border-outline p-3">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                {member.full_name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "L"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-bold text-ink">{member.full_name}</p>
                <p className="break-all text-xs text-muted">{member.email || "No email"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${member.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {member.status === "active" ? "Active Librarian" : "Inactive Librarian"}
                </span>
                {member.must_change_password && <span className="text-xs text-muted">Account setup required</span>}
                {canAdmin && <Button type="button" variant="secondary" size="sm" disabled={pending} aria-label={`Unassign ${member.full_name}`} onClick={() => changeRole(member, "unassign")}>Unassign</Button>}
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-muted">No librarians currently assigned.</p>}
      {canAdmin && (
        <form className="mt-5 space-y-2 border-t border-outline/60 pt-4" onSubmit={event => { event.preventDefault(); if (selected) changeRole(selected, "assign"); }}>
          <label htmlFor="assign-library-member" className="block text-sm font-semibold text-ink">Assign New Librarian</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select id="assign-library-member" aria-describedby="library-role-help" value={selectedId} onChange={event => setSelectedId(event.target.value)} disabled={loading || pending || !!loadError} className="min-w-0 flex-1 rounded-xl border border-outline bg-white px-3 py-2 text-sm text-ink">
              <option value="">{loading ? "Loading staff..." : "Select a staff member"}</option>
              {candidates.map(member => <option key={member.member_id} value={member.member_id}>{member.full_name}{member.email ? ` (${member.email})` : ""}</option>)}
            </select>
            <Button type="submit" disabled={!selected || loading || pending || !!loadError}>{pending ? "Saving..." : "Assign Role"}</Button>
          </div>
          <p id="library-role-help" className="text-xs text-muted">Assigning replaces the current role with Librarian and its permissions. Unassigning changes the role to Staff.</p>
          {!loading && !loadError && !candidates.length && <p className="text-xs text-muted">No eligible active staff members available.</p>}
          {loadError && <div role="alert" className="text-sm text-red-700">{loadError} <button type="button" className="font-semibold underline" onClick={() => setReload(value => value + 1)}>Retry</button></div>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </form>
      )}
    </section>
  );
}

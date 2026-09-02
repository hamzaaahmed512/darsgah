"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createCustomRoleAction,
  deleteMemberAction,
  updateMemberRoleAssignmentAction,
  updateMemberStatusAction
} from "@/app/(app)/settings/actions";
import { AVAILABLE_PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-field";

type CustomRoleRecord = {
  id: string;
  name: string;
  base_role: string;
};

type MemberRow = {
  member_id: string;
  full_name: string;
  role: string;
  status?: string;
  custom_role_id?: string | null;
  custom_role_name?: string | null;
};

const BASE_ROLE_LABELS: Record<string, string> = {
  administrator: "Administrator",
  teacher: "Teacher",
  student_staff: "Student-management staff",
  staff: "Staff",
  cashier: "Cashier",
  principal: "Principal",
  head_teacher: "Teacher"
};

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  size = "lg"
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/30 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className={`flex max-h-[calc(100dvh-0.75rem)] min-w-0 w-full flex-col overflow-hidden rounded-t-[20px] bg-white shadow-lift ring-1 ring-outline sm:max-h-[calc(100dvh-2rem)] sm:rounded-[20px] ${size === "md" ? "max-w-lg" : "max-w-4xl"}`}>
        <div className="shrink-0 border-b border-outline px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
              <p className="mt-1 break-words text-sm leading-5 text-muted">{subtitle}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-muted transition hover:bg-surface-low hover:text-ink" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
          <div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CreateRoleModal({
  currentUserRole,
  triggerLabel = "Create Role"
}: {
  currentUserRole: string;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const canManageCustomRoles = currentUserRole === "principal";
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [baseRole, setBaseRole] = useState("teacher");
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!canManageCustomRoles) return null;

  function togglePermission(permission: string) {
    setPermissions((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCustomRoleAction(name, baseRole, permissions);
      if (result.error) {
        setError(result.error);
        return;
      }
      setName("");
      setBaseRole("teacher");
      setPermissions([]);
      setOpen(false);
      router.refresh();
    });
  }

  const modal = open ? (
        <ModalShell
          title="Create Role"
          subtitle="Name the role and choose the extra permissions it should carry."
          size="lg"
          onClose={() => setOpen(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {error ? <div className="rounded-lg bg-danger-soft p-3 text-sm font-semibold text-danger">{error}</div> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-semibold text-ink">Role Name</label>
                <Input value={name} onChange={(event) => setName(event.target.value)} required placeholder="e.g. Vice Principal" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-semibold text-ink">Base Role</label>
                <Select value={baseRole} onChange={(event) => setBaseRole(event.target.value)}>
                  <option value="teacher">Teacher</option>
                  <option value="administrator">Administrator</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">Permissions</label>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {AVAILABLE_PERMISSIONS.map((permission) => (
                  <label key={permission} className="flex items-center gap-2 rounded-lg border border-outline/40 px-2.5 py-2 text-xs sm:text-sm">
                    <input
                      type="checkbox"
                      checked={permissions.includes(permission)}
                      onChange={() => togglePermission(permission)}
                      className="h-3.5 w-3.5 rounded"
                    />
                    <span className="leading-5">{permission}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-outline bg-white px-4 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-3 sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:p-0">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save Role"}
              </Button>
            </div>
          </form>
        </ModalShell>
  ) : null;

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)} className="w-full sm:w-auto">
        <Plus className="h-4 w-4" /> {triggerLabel}
      </Button>
      {mounted ? createPortal(modal, document.body) : null}
    </>
  );
}

export function EditUserModal({
  currentUserRole,
  member,
  customRoles
}: {
  currentUserRole: string;
  member: MemberRow;
  customRoles: CustomRoleRecord[];
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const canManageElevatedRoles = currentUserRole === "principal";
  const canEditMember = currentUserRole === "principal"
    ? member.role !== "principal"
    : member.role !== "principal" && member.role !== "administrator";

  const baseRoleOptions = canManageElevatedRoles
    ? ["administrator", "teacher", "student_staff", "staff", "cashier"]
    : ["teacher", "student_staff", "staff", "cashier"];
  const availableCustomRoles = customRoles.filter((role) =>
    canManageElevatedRoles ? role.base_role !== "principal" : role.base_role !== "principal" && role.base_role !== "administrator"
  );
  const initialValue = member.custom_role_id ? `custom:${member.custom_role_id}` : `base:${member.role}`;
  const [selectedValue, setSelectedValue] = useState(initialValue);
  const [statusValue, setStatusValue] = useState(member.status ?? "active");

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!canEditMember) return <span className="text-xs text-muted">Protected</span>;

  function handleOpen() {
    setSelectedValue(member.custom_role_id ? `custom:${member.custom_role_id}` : `base:${member.role}`);
    setStatusValue(member.status ?? "active");
    setError(null);
    setOpen(true);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const selectedCustomRole = selectedValue.startsWith("custom:")
        ? availableCustomRoles.find((role) => role.id === selectedValue.slice("custom:".length))
        : null;
      const nextRole = selectedCustomRole ? selectedCustomRole.base_role : selectedValue.slice("base:".length);
      const nextCustomRoleId = selectedCustomRole?.id ?? null;

      const roleResult = await updateMemberRoleAssignmentAction(member.member_id, nextRole, nextCustomRoleId);
      if (roleResult.error) {
        setError(roleResult.error);
        return;
      }

      const statusResult = await updateMemberStatusAction(member.member_id, statusValue);
      if (statusResult.error) {
        setError(statusResult.error);
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  const modal = open ? (
        <ModalShell
          title={`Edit Account: ${member.full_name}`}
          subtitle="Update the assigned role and account status."
          size="md"
          onClose={() => setOpen(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {error ? <div className="rounded-lg bg-danger-soft p-3 text-sm font-semibold text-danger">{error}</div> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">Role</label>
                <Select value={selectedValue} onChange={(event) => setSelectedValue(event.target.value)}>
                  {baseRoleOptions.map((role) => (
                    <option key={`base:${role}`} value={`base:${role}`}>{BASE_ROLE_LABELS[role] ?? role}</option>
                  ))}
                  {availableCustomRoles.length ? (
                    <optgroup label="Custom roles">
                      {availableCustomRoles.map((role) => (
                        <option key={`custom:${role.id}`} value={`custom:${role.id}`}>{role.name}</option>
                      ))}
                    </optgroup>
                  ) : null}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">Status</label>
                <Select value={statusValue} onChange={(event) => setStatusValue(event.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="disabled">Disabled</option>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </ModalShell>
  ) : null;

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={handleOpen} aria-label={`Edit ${member.full_name}`} className="min-h-9 px-2.5">
        <Pencil className="h-4 w-4" />
      </Button>
      {mounted ? createPortal(modal, document.body) : null}
    </>
  );
}

export function DeleteUserButton({ memberId, memberName }: { memberId: string; memberName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Delete ${memberName}'s account? This removes school access and related assignments. Do you still want to continue?`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteMemberAction(memberId);
      if (result.error) {
        window.alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handleDelete}
      disabled={pending}
      aria-label={`Delete ${memberName}`}
      className="min-h-9 px-2.5 text-danger hover:text-danger"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

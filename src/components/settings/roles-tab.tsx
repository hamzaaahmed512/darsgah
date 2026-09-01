"use client";

import { useState, useTransition } from "react";
import { 
  updateMemberRoleAction, 
  updateMemberStatusAction,
  assignCustomRoleToUserAction
} from "@/app/(app)/settings/actions";
import { CustomRolesPanel } from "@/components/settings/custom-roles-panel";
import { StandardRolePermissionsCard } from "@/components/settings/standard-role-permissions-card";

interface Props {
  currentUserRole: string;
  members: any[];
  customRoles: any[];
  rolePermissions: any[];
  userOverrides: any[];
}

export function RolesTab({ currentUserRole, members, customRoles, rolePermissions }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const canManageElevatedRoles = currentUserRole === "principal";
  const assignableBaseRoles = canManageElevatedRoles
    ? [
        { value: "administrator", label: "Administrator" },
        { value: "student_staff", label: "Registrar" },
        { value: "teacher", label: "Teacher" },
        { value: "head_teacher", label: "Head Teacher" },
        { value: "staff", label: "Staff" },
        { value: "cashier", label: "Cashier" }
      ]
    : [
        { value: "student_staff", label: "Registrar" },
        { value: "teacher", label: "Teacher" },
        { value: "head_teacher", label: "Head Teacher" },
        { value: "staff", label: "Staff" },
        { value: "cashier", label: "Cashier" }
      ];
  // Helpers
  const handleAction = async (actionFn: () => Promise<{ok?: boolean; error?: string}>, successMsg: string) => {
    setMessage(null);
    startTransition(async () => {
      const res = await actionFn();
      if (res.error) setMessage({ type: "error", text: res.error });
      else setMessage({ type: "success", text: successMsg });
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-xl font-bold text-ink">Role & Account Management</h3>
        <p className="text-sm text-muted">Manage staff roles, custom roles, and fine-grained permissions.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm font-semibold ${message.type === "success" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
          {message.text}
        </div>
      )}

      <StandardRolePermissionsCard currentUserRole={currentUserRole} />

      <CustomRolesPanel currentUserRole={currentUserRole} customRoles={customRoles} rolePermissions={rolePermissions} />

      {/* STAFF LIST SECTION */}
      <div className="border border-outline/40 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="bg-surface-low px-4 py-3 border-b border-outline/40 flex items-center justify-between">
          <h4 className="font-bold text-ink text-sm">Staff Members</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-low font-label text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Base Role</th>
                <th className="px-4 py-3">Custom Role</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.memberId} className="border-t border-outline/60 hover:bg-surface-low/50">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-ink">{member.fullName}</p>
                    <p className="text-xs text-muted">{member.email}</p>
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={member.role}
                      onChange={(e) => handleAction(() => updateMemberRoleAction(member.memberId, e.target.value), "Base role updated.")}
                      className="rounded border border-outline/60 px-2 py-1 text-xs focus:outline-none"
                    >
                      {assignableBaseRoles.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={member.customRoleId || ""}
                      onChange={(e) => handleAction(() => assignCustomRoleToUserAction(member.memberId, e.target.value || null), "Custom role assigned.")}
                      className="rounded border border-outline/60 px-2 py-1 text-xs focus:outline-none"
                    >
                      <option value="">None (Use Base Role)</option>
                      {customRoles.map(cr => (
                        <option key={cr.id} value={cr.id}>{cr.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={member.status}
                      onChange={(e) => handleAction(() => updateMemberStatusAction(member.memberId, e.target.value), "Status updated.")}
                      className="rounded border border-outline/60 px-2 py-1 text-xs focus:outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                      <option value="inactive">Inactive</option>
                      <option value="archived">Archived</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

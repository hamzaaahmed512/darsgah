"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit, ShieldAlert, Trash2 } from "lucide-react";
import {
  createCustomRoleAction,
  deleteCustomRoleAction,
  updateRolePermissionsAction
} from "@/app/(app)/settings/actions";
import { Badge } from "@/components/ui/badge";
import { AVAILABLE_PERMISSIONS } from "@/lib/permissions";

type CustomRoleRecord = {
  id: string;
  name: string;
  base_role: string;
};

type RolePermissionRecord = {
  id: string;
  role_key: string;
  permission: string;
  granted: boolean;
};

export function CustomRolesPanel({
  currentUserRole,
  customRoles,
  rolePermissions,
  title = "Custom Roles"
}: {
  currentUserRole: string;
  customRoles: CustomRoleRecord[];
  rolePermissions: RolePermissionRecord[];
  title?: string;
}) {
  const router = useRouter();
  const canManageCustomRoles = currentUserRole === "principal";
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleBase, setNewRoleBase] = useState("teacher");
  const [newRolePerms, setNewRolePerms] = useState<string[]>([]);
  const [editingRoleKey, setEditingRoleKey] = useState<string | null>(null);
  const [editRolePerms, setEditRolePerms] = useState<string[]>([]);

  const customRoleBaseOptions = canManageCustomRoles
    ? [
        { value: "teacher", label: "Teacher" },
        { value: "administrator", label: "Administrator" }
      ]
    : [];

  const handleAction = async (actionFn: () => Promise<{ ok?: boolean; error?: string }>, successMsg: string) => {
    setMessage(null);
    startTransition(async () => {
      const res = await actionFn();
      if (res.error) setMessage({ type: "error", text: res.error });
      else {
        setMessage({ type: "success", text: successMsg });
        setShowCreateRole(false);
        setEditingRoleKey(null);
        setNewRoleName("");
        setNewRoleBase("teacher");
        setNewRolePerms([]);
        router.refresh();
      }
    });
  };

  const togglePerm = (permList: string[], setPermList: (value: string[]) => void, perm: string) => {
    if (permList.includes(perm)) setPermList(permList.filter((item) => item !== perm));
    else setPermList([...permList, perm]);
  };

  const handleCreateRole = (event: React.FormEvent) => {
    event.preventDefault();
    handleAction(() => createCustomRoleAction(newRoleName, newRoleBase, newRolePerms), "Custom role created successfully.");
  };

  const startEditRole = (roleKey: string) => {
    setEditingRoleKey(roleKey);
    setEditRolePerms(rolePermissions.filter((row) => row.role_key === roleKey && row.granted).map((row) => row.permission));
  };

  const saveEditedRole = () => {
    if (!editingRoleKey) return;
    handleAction(() => updateRolePermissionsAction(editingRoleKey, editRolePerms), "Permissions updated successfully.");
  };

  const removeCustomRole = (id: string) => {
    if (!confirm("Are you sure? Members with this role will fall back to their base role.")) return;
    handleAction(() => deleteCustomRoleAction(id), "Custom role deleted.");
  };

  return (
    <div className="border border-outline/40 rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="bg-surface-low px-4 py-3 border-b border-outline/40 flex items-center justify-between">
        <h4 className="font-bold text-ink text-sm flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" />
          {title}
        </h4>
        {canManageCustomRoles && !showCreateRole ? (
          <button
            onClick={() => {
              setShowCreateRole(true);
              setNewRoleName("");
              setNewRoleBase("teacher");
              setNewRolePerms([]);
              setMessage(null);
            }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            + Create Custom Role
          </button>
        ) : null}
      </div>

      {message ? (
        <div className={`mx-4 mt-4 rounded-lg p-3 text-sm font-semibold ${message.type === "success" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
          {message.text}
        </div>
      ) : null}

      {canManageCustomRoles && showCreateRole ? (
        <form onSubmit={handleCreateRole} className="p-4 border-b border-outline/40 bg-surface-low/30">
          <div className="grid gap-3 sm:grid-cols-2 mb-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Role Name<span className="ml-0.5 text-danger" aria-hidden="true">*</span></label>
              <input required value={newRoleName} onChange={(event) => setNewRoleName(event.target.value)} className="w-full rounded border border-outline/60 px-3 py-1.5 text-sm" placeholder="e.g. Vice Principal" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Base Role</label>
              <select value={newRoleBase} onChange={(event) => setNewRoleBase(event.target.value)} className="w-full rounded border border-outline/60 px-3 py-1.5 text-sm">
                {customRoleBaseOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">Additional Permissions</label>
            <div className="grid sm:grid-cols-2 gap-2">
              {AVAILABLE_PERMISSIONS.map((perm) => (
                <label key={perm} className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={newRolePerms.includes(perm)} onChange={() => togglePerm(newRolePerms, setNewRolePerms, perm)} className="rounded text-primary h-3.5 w-3.5" />
                  {perm}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowCreateRole(false)} className="px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink">Cancel</button>
            <button type="submit" disabled={isPending} className="px-3 py-1.5 bg-primary text-white rounded text-xs font-semibold">Save Custom Role</button>
          </div>
        </form>
      ) : null}

      <div className="p-4">
        {customRoles.length === 0 ? (
          <p className="text-sm text-muted italic">No custom roles defined.</p>
        ) : (
          <div className="space-y-4">
            {customRoles.map((role) => (
              <div key={role.id} className="border border-outline/60 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-bold text-ink">{role.name}</span>
                    <Badge tone="gray" className="ml-2">Base: {role.base_role}</Badge>
                  </div>
                  {canManageCustomRoles ? (
                    <div className="flex gap-2">
                      <button onClick={() => startEditRole(role.id)} className="text-muted hover:text-primary"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => removeCustomRole(role.id)} className="text-muted hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ) : null}
                </div>

                {canManageCustomRoles && editingRoleKey === role.id ? (
                  <div className="mt-3 border-t border-outline/40 pt-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">Edit Additional Permissions</label>
                    <div className="grid sm:grid-cols-2 gap-2 mb-3">
                      {AVAILABLE_PERMISSIONS.map((perm) => (
                        <label key={perm} className="flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={editRolePerms.includes(perm)} onChange={() => togglePerm(editRolePerms, setEditRolePerms, perm)} className="rounded text-primary h-3.5 w-3.5" />
                          {perm}
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingRoleKey(null)} className="px-3 py-1 text-xs font-semibold text-muted">Cancel</button>
                      <button onClick={saveEditedRole} disabled={isPending} className="px-3 py-1 bg-primary text-white rounded text-xs font-semibold">Update Permissions</button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted flex flex-wrap gap-1 mt-2">
                    {rolePermissions.filter((row) => row.role_key === role.id && row.granted).map((row) => (
                      <span key={row.id} className="bg-surface-low px-1.5 py-0.5 rounded border border-outline/40">{row.permission}</span>
                    ))}
                    {rolePermissions.filter((row) => row.role_key === role.id && row.granted).length === 0 ? (
                      <span className="italic">No additional permissions beyond base role.</span>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

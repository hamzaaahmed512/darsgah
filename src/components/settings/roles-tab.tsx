"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { 
  updateMemberRoleAction, 
  updateMemberStatusAction,
  createCustomRoleAction,
  deleteCustomRoleAction,
  assignCustomRoleToUserAction,
  updateRolePermissionsAction,
  updateUserPermissionOverridesAction
} from "@/app/(app)/settings/actions";
import { Check, Edit, ShieldAlert, Trash2, X } from "lucide-react";
import { AVAILABLE_PERMISSIONS } from "@/lib/permissions";

interface Props {
  members: any[];
  customRoles: any[];
  rolePermissions: any[];
  userOverrides: any[];
}

export function RolesTab({ members, customRoles, rolePermissions, userOverrides }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // States for creating custom role
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleBase, setNewRoleBase] = useState("teacher");
  const [newRolePerms, setNewRolePerms] = useState<string[]>([]);
  
  // State for editing a role's permissions
  const [editingRoleKey, setEditingRoleKey] = useState<string | null>(null);
  const [editRolePerms, setEditRolePerms] = useState<string[]>([]);

  // Helpers
  const handleAction = async (actionFn: () => Promise<{ok?: boolean; error?: string}>, successMsg: string) => {
    setMessage(null);
    startTransition(async () => {
      const res = await actionFn();
      if (res.error) setMessage({ type: "error", text: res.error });
      else {
        setMessage({ type: "success", text: successMsg });
        setShowCreateRole(false);
        setEditingRoleKey(null);
      }
    });
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    handleAction(() => createCustomRoleAction(newRoleName, newRoleBase, newRolePerms), "Custom role created successfully.");
  };

  const startEditRole = (roleKey: string) => {
    setEditingRoleKey(roleKey);
    const existingPerms = rolePermissions.filter(rp => rp.role_key === roleKey && rp.granted).map(rp => rp.permission);
    setEditRolePerms(existingPerms);
  };

  const saveEditedRole = () => {
    if (!editingRoleKey) return;
    handleAction(() => updateRolePermissionsAction(editingRoleKey, editRolePerms), "Permissions updated successfully.");
  };

  const deleteCustomRole = (id: string) => {
    if (!confirm("Are you sure? Members with this role will fall back to their base role.")) return;
    handleAction(() => deleteCustomRoleAction(id), "Custom role deleted.");
  };

  const togglePerm = (permList: string[], setPermList: (p: string[]) => void, perm: string) => {
    if (permList.includes(perm)) setPermList(permList.filter(p => p !== perm));
    else setPermList([...permList, perm]);
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

      {/* CUSTOM ROLES SECTION */}
      <div className="border border-outline/40 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="bg-surface-low px-4 py-3 border-b border-outline/40 flex items-center justify-between">
          <h4 className="font-bold text-ink text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            Custom Roles
          </h4>
          {!showCreateRole && (
            <button 
              onClick={() => { setShowCreateRole(true); setNewRoleName(""); setNewRolePerms([]); }}
              className="text-xs font-semibold text-primary hover:underline"
            >
              + Create Custom Role
            </button>
          )}
        </div>
        
        {showCreateRole && (
          <form onSubmit={handleCreateRole} className="p-4 border-b border-outline/40 bg-surface-low/30">
            <div className="grid gap-3 sm:grid-cols-2 mb-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Role Name</label>
                <input required value={newRoleName} onChange={e => setNewRoleName(e.target.value)} className="w-full rounded border border-outline/60 px-3 py-1.5 text-sm" placeholder="e.g. Senior Teacher" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Base Role (inherits permissions)</label>
                <select value={newRoleBase} onChange={e => setNewRoleBase(e.target.value)} className="w-full rounded border border-outline/60 px-3 py-1.5 text-sm">
                  <option value="teacher">Teacher</option>
                  <option value="student_staff">Registrar (Student Staff)</option>
                  <option value="principal">Principal</option>
                  <option value="administrator">Administrator</option>
                </select>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">Additional Permissions</label>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                {AVAILABLE_PERMISSIONS.map(perm => (
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
        )}

        <div className="p-4">
          {customRoles.length === 0 ? (
            <p className="text-sm text-muted italic">No custom roles defined.</p>
          ) : (
            <div className="space-y-4">
              {customRoles.map(role => (
                <div key={role.id} className="border border-outline/60 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-bold text-ink">{role.name}</span>
                      <Badge tone="gray" className="ml-2">Base: {role.base_role}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEditRole(role.id)} className="text-muted hover:text-primary"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => deleteCustomRole(role.id)} className="text-muted hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  
                  {editingRoleKey === role.id ? (
                    <div className="mt-3 border-t border-outline/40 pt-3">
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">Edit Additional Permissions</label>
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                        {AVAILABLE_PERMISSIONS.map(perm => (
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
                      {rolePermissions.filter(rp => rp.role_key === role.id && rp.granted).map(rp => (
                        <span key={rp.id} className="bg-surface-low px-1.5 py-0.5 rounded border border-outline/40">{rp.permission}</span>
                      ))}
                      {rolePermissions.filter(rp => rp.role_key === role.id && rp.granted).length === 0 && (
                        <span className="italic">No additional permissions beyond base role.</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
                      <option value="principal">Principal</option>
                      <option value="administrator">Administrator</option>
                      <option value="student_staff">Registrar</option>
                      <option value="teacher">Teacher</option>
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

"use client";

import { useState, useTransition } from "react";
import {
  createAcademicYearAction,
  deleteAcademicYearAction,
  updateNotificationPreferencesAction,
  updatePrincipalTeachingAssignmentAction,
  updateResultCardTemplateAction
} from "@/app/(app)/settings/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-field";
import { RolesTab } from "@/components/settings/roles-tab";
import { resolveNotificationPreferences } from "@/lib/notification-preferences";

interface Props {
  user: any;
  schoolSettings: any;
  academicYears: any[];
  principalTeachingSettings: {
    assignedClassId: string | null;
    classes: Array<{
      id: string;
      name: string;
      grade_name: string;
      section_name: string | null;
      academic_year_name: string;
      assigned_to_principal: boolean;
      has_other_head_teacher: boolean;
    }>;
  };
  members: any[];
  customRoles: any[];
  rolePermissions: any[];
  userOverrides: any[];
  initialTab?: string;
}

export function SettingsTabs({
  user,
  schoolSettings,
  academicYears,
  principalTeachingSettings,
  members,
  customRoles,
  rolePermissions,
  userOverrides,
  initialTab = "notifications"
}: Props) {
  const isAdmin = user.role === "administrator";
  const isPrincipal = user.role === "principal";
  const allowedTabs = new Set(["notifications", ...(isPrincipal ? ["teaching", "result-cards"] : []), ...(isAdmin ? ["academics", "roles", "result-cards"] : [])]);
  const startingTab = allowedTabs.has(initialTab) ? initialTab : "notifications";
  const [activeTab, setActiveTab] = useState(startingTab);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const initialNotifications = resolveNotificationPreferences(schoolSettings?.settings);

  const [notifications, setNotifications] = useState({
    attendanceDeadlineEnabled: initialNotifications.attendanceDeadlineEnabled,
    attendanceDeadlineTime: initialNotifications.attendanceDeadlineTime,
    leaveRequestNotificationsEnabled: initialNotifications.leaveRequestNotificationsEnabled
  });
  const [newYear, setNewYear] = useState({
    name: "",
    starts_on: "",
    ends_on: "",
    is_active: false
  });
  const [principalTeaches, setPrincipalTeaches] = useState(Boolean(principalTeachingSettings.assignedClassId));
  const [principalClassId, setPrincipalClassId] = useState(principalTeachingSettings.assignedClassId ?? principalTeachingSettings.classes[0]?.id ?? "");
  const initialResultCardTemplate = schoolSettings?.settings?.resultCardTemplate ?? {};
  const initialAccentColor = typeof initialResultCardTemplate.accentColor === "string" && /^#[0-9a-f]{6}$/i.test(initialResultCardTemplate.accentColor)
    ? initialResultCardTemplate.accentColor
    : "#2563eb";
  const [resultCardTemplate, setResultCardTemplate] = useState({
    title: initialResultCardTemplate.title ?? "Result Card",
    accentColor: initialAccentColor,
    layout: initialResultCardTemplate.layout === "compact" ? "compact" : "standard",
    showAcademicYear: initialResultCardTemplate.showAcademicYear !== false,
    showAdmissionNumber: initialResultCardTemplate.showAdmissionNumber !== false,
    showTeacherComments: initialResultCardTemplate.showTeacherComments === true,
    signatureLabels: Array.isArray(initialResultCardTemplate.signatureLabels) ? initialResultCardTemplate.signatureLabels.join(", ") : "Class Teacher, Principal"
  });

  function selectTab(tab: string) {
    setActiveTab(tab);
    setMessage(null);
  }

  function handleCreateYear(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!newYear.name || !newYear.starts_on || !newYear.ends_on) {
      setMessage({ type: "error", text: "Please fill all academic year fields." });
      return;
    }
    startTransition(async () => {
      const res = await createAcademicYearAction(newYear);
      if (res.error) setMessage({ type: "error", text: res.error });
      else {
        setMessage({ type: "success", text: "Academic session created successfully." });
        setNewYear({ name: "", starts_on: "", ends_on: "", is_active: false });
        setTimeout(() => window.location.reload(), 1000);
      }
    });
  }

  function handleDeleteYear(id: string) {
    if (!confirm("Are you sure you want to delete this academic year?")) return;
    setMessage(null);
    startTransition(async () => {
      const res = await deleteAcademicYearAction(id);
      if (res.error) setMessage({ type: "error", text: res.error });
      else {
        setMessage({ type: "success", text: "Academic session deleted." });
        setTimeout(() => window.location.reload(), 1000);
      }
    });
  }

  function handleTeachingSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await updatePrincipalTeachingAssignmentAction(principalTeaches ? principalClassId || null : null);
      if (res.error) setMessage({ type: "error", text: res.error });
      else setMessage({ type: "success", text: "Teaching assignment saved." });
    });
  }

  function handleNotificationSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await updateNotificationPreferencesAction(notifications);
      if (res.error) setMessage({ type: "error", text: res.error });
      else setMessage({ type: "success", text: "Notification settings saved." });
    });
  }

  function handleResultCardTemplateSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await updateResultCardTemplateAction(resultCardTemplate);
      if (res.error) setMessage({ type: "error", text: res.error });
      else setMessage({ type: "success", text: "Result card template saved." });
    });
  }


  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => selectTab("notifications")}
          className={`w-full rounded-lg px-4 py-2.5 text-left text-sm font-semibold transition ${activeTab === "notifications" ? "bg-primary text-white" : "text-muted hover:bg-surface-low"}`}
        >
          Notifications
        </button>

        {isPrincipal ? (
          <button
            onClick={() => selectTab("teaching")}
            className={`w-full rounded-lg px-4 py-2.5 text-left text-sm font-semibold transition ${activeTab === "teaching" ? "bg-primary text-white" : "text-muted hover:bg-surface-low"}`}
          >
            Teaching
          </button>
        ) : null}

        {isPrincipal || isAdmin ? (
          <button
            onClick={() => selectTab("result-cards")}
            className={`w-full rounded-lg px-4 py-2.5 text-left text-sm font-semibold transition ${activeTab === "result-cards" ? "bg-primary text-white" : "text-muted hover:bg-surface-low"}`}
          >
            Result Cards
          </button>
        ) : null}

        {isAdmin ? (
          <>
            <div className="my-2 h-px bg-outline/40" />
            <span className="mb-1 px-4 text-[10px] font-bold uppercase tracking-wider text-muted">
              Admin Only
            </span>
            <button
              onClick={() => selectTab("academics")}
              className={`w-full rounded-lg px-4 py-2.5 text-left text-sm font-semibold transition ${activeTab === "academics" ? "bg-primary text-white" : "text-muted hover:bg-surface-low"}`}
            >
              Academic Sessions
            </button>
            <button
              onClick={() => selectTab("roles")}
              className={`w-full rounded-lg px-4 py-2.5 text-left text-sm font-semibold transition ${activeTab === "roles" ? "bg-primary text-white" : "text-muted hover:bg-surface-low"}`}
            >
              Role Management
            </button>
          </>
        ) : null}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-soft ring-1 ring-outline/25">
        {message ? (
          <div className={`mb-6 rounded-lg p-4 text-sm font-semibold ${message.type === "success" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
            {message.text}
          </div>
        ) : null}

        {activeTab === "notifications" ? (
          <form onSubmit={handleNotificationSave} className="space-y-5">
            <h3 className="font-display text-xl font-bold text-ink">Notification Preferences</h3>

            <div className="space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-outline/40 bg-surface-low/50 p-4">
                <input
                  type="checkbox"
                  checked={notifications.attendanceDeadlineEnabled}
                  onChange={(e) => setNotifications({ ...notifications, attendanceDeadlineEnabled: e.target.checked })}
                  className="h-4 w-4 rounded border-outline/60 text-primary focus:ring-primary/30"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink">Attendance deadline notifications</span>
                  <span className="mt-1 block text-xs font-medium leading-5 text-muted">
                    Teachers are reminded one hour before the deadline. Principal and admin are alerted after the deadline if attendance is still pending.
                  </span>
                </span>
              </label>

              <div className="max-w-xs">
                <label className="mb-1.5 block text-sm font-semibold text-ink">Daily attendance deadline</label>
                <input
                  type="time"
                  value={notifications.attendanceDeadlineTime}
                  onChange={(e) => setNotifications({ ...notifications, attendanceDeadlineTime: e.target.value })}
                  disabled={!notifications.attendanceDeadlineEnabled}
                  className="min-h-11 w-full rounded-xl border border-outline bg-white px-4 py-2.5 text-sm font-medium text-ink shadow-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:bg-surface-low disabled:text-muted"
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-outline/40 bg-surface-low/50 p-4">
                <input
                  type="checkbox"
                  checked={notifications.leaveRequestNotificationsEnabled}
                  onChange={(e) => setNotifications({ ...notifications, leaveRequestNotificationsEnabled: e.target.checked })}
                  className="h-4 w-4 rounded border-outline/60 text-primary focus:ring-primary/30"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink">Leave request notifications</span>
                  <span className="mt-1 block text-xs font-medium leading-5 text-muted">
                    Principal and admin see pending leave alerts in the notification bell and Leave Center badge.
                  </span>
                </span>
              </label>
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Preferences"}
            </Button>
          </form>
        ) : null}

        {activeTab === "teaching" && isPrincipal ? (
          <form onSubmit={handleTeachingSave} className="space-y-5">
            <div>
              <h3 className="font-display text-xl font-bold text-ink">Teaching Assignment</h3>
              <p className="mt-1 text-sm text-muted">Set this principal as head teacher for one class to unlock the My Class workflow.</p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-outline/40 bg-surface-low/50 p-4">
              <input
                type="checkbox"
                checked={principalTeaches}
                onChange={(e) => setPrincipalTeaches(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-outline/60 text-primary focus:ring-primary/30"
              />
              <span>
                <span className="block text-sm font-semibold text-ink">Principal also teaches a class</span>
                <span className="mt-1 block text-xs font-medium leading-5 text-muted">
                  Attendance will show both School Register and My Class views.
                </span>
              </span>
            </label>

            {principalTeaches ? (
              <div className="max-w-xl">
                <label className="mb-1.5 block text-sm font-semibold text-ink">My Class</label>
                <Select value={principalClassId} onChange={(e) => setPrincipalClassId(e.target.value)} disabled={!principalTeachingSettings.classes.length}>
                  {principalTeachingSettings.classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.grade_name} - {item.name}
                      {item.section_name ? ` - ${item.section_name}` : ""}
                      {item.has_other_head_teacher ? " - replacing current head teacher" : ""}
                    </option>
                  ))}
                </Select>
                {!principalTeachingSettings.classes.length ? (
                  <p className="mt-2 text-xs font-medium text-muted">Create classes first, then return here to choose one.</p>
                ) : null}
              </div>
            ) : null}

            <Button type="submit" disabled={isPending || (principalTeaches && !principalClassId)}>
              {isPending ? "Saving..." : "Save Teaching Assignment"}
            </Button>
          </form>
        ) : null}

        {activeTab === "result-cards" && (isPrincipal || isAdmin) ? (
          <form onSubmit={handleResultCardTemplateSave} className="space-y-5">
            <div>
              <h3 className="font-display text-xl font-bold text-ink">Result Card Template</h3>
              <p className="mt-1 text-sm text-muted">School-specific layout used by Registrar print and PDF export.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold text-ink">
                Card title
                <Input
                  value={resultCardTemplate.title}
                  onChange={(event) => setResultCardTemplate((current) => ({ ...current, title: event.target.value }))}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-ink">
                Accent color
                <Input
                  type="color"
                  value={resultCardTemplate.accentColor}
                  onChange={(event) => setResultCardTemplate((current) => ({ ...current, accentColor: event.target.value }))}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-ink">
                Layout
                <Select
                  value={resultCardTemplate.layout}
                  onChange={(event) => setResultCardTemplate((current) => ({ ...current, layout: event.target.value }))}
                >
                  <option value="standard">Standard</option>
                  <option value="compact">Compact</option>
                </Select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-ink">
                Signature labels
                <Input
                  value={resultCardTemplate.signatureLabels}
                  onChange={(event) => setResultCardTemplate((current) => ({ ...current, signatureLabels: event.target.value }))}
                />
                <span className="text-xs font-medium text-muted">Comma-separated, up to three.</span>
              </label>
            </div>

            <div className="flex flex-wrap gap-5 text-sm font-semibold text-ink">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={resultCardTemplate.showAcademicYear}
                  onChange={(event) => setResultCardTemplate((current) => ({ ...current, showAcademicYear: event.target.checked }))}
                  className="h-4 w-4 accent-primary"
                />
                Academic year
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={resultCardTemplate.showAdmissionNumber}
                  onChange={(event) => setResultCardTemplate((current) => ({ ...current, showAdmissionNumber: event.target.checked }))}
                  className="h-4 w-4 accent-primary"
                />
                Admission number
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={resultCardTemplate.showTeacherComments}
                  onChange={(event) => setResultCardTemplate((current) => ({ ...current, showTeacherComments: event.target.checked }))}
                  className="h-4 w-4 accent-primary"
                />
                Teacher comments
              </label>
            </div>

            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Result Card Template"}
            </Button>
          </form>
        ) : null}

        {activeTab === "academics" && isAdmin ? (
          <div className="space-y-6">
            <h3 className="font-display text-xl font-bold text-ink">Academic Sessions</h3>

            <form onSubmit={handleCreateYear} className="space-y-4 rounded-xl border border-outline/40 bg-surface-low/50 p-4">
              <h4 className="text-sm font-bold text-ink">Add New Session</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted">Session Name</label>
                  <input
                    placeholder="e.g. 2026-2027"
                    value={newYear.name}
                    onChange={(e) => setNewYear({ ...newYear, name: e.target.value })}
                    className="w-full rounded-lg border border-outline/60 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted">Starts On</label>
                  <input
                    type="date"
                    value={newYear.starts_on}
                    onChange={(e) => setNewYear({ ...newYear, starts_on: e.target.value })}
                    className="w-full rounded-lg border border-outline/60 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted">Ends On</label>
                  <input
                    type="date"
                    value={newYear.ends_on}
                    onChange={(e) => setNewYear({ ...newYear, ends_on: e.target.value })}
                    className="w-full rounded-lg border border-outline/60 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={newYear.is_active}
                  onChange={(e) => setNewYear({ ...newYear, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-outline/60 text-primary"
                />
                <span className="text-sm font-semibold text-ink">Set as active academic session</span>
              </label>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-60"
              >
                {isPending ? "Creating..." : "Create Session"}
              </button>
            </form>

            <div className="overflow-x-auto rounded-xl border border-outline/40">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-surface-low font-label text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">Session Name</th>
                    <th className="px-4 py-3">Starts</th>
                    <th className="px-4 py-3">Ends</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {academicYears.map((year) => (
                    <tr key={year.id} className="border-t border-outline/60 hover:bg-surface-low/50">
                      <td className="px-4 py-4 font-semibold text-ink">{year.name}</td>
                      <td className="px-4 py-4 text-muted">{year.starts_on}</td>
                      <td className="px-4 py-4 text-muted">{year.ends_on}</td>
                      <td className="px-4 py-4">
                        <Badge tone={year.is_active ? "green" : "gray"}>
                          {year.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        {!year.is_active ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteYear(year.id)}
                            className="text-xs font-semibold text-danger hover:underline"
                          >
                            Delete
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}


        {activeTab === "roles" && isAdmin ? (
          <RolesTab
            members={members}
            customRoles={customRoles}
            rolePermissions={rolePermissions}
            userOverrides={userOverrides}
          />
        ) : null}
      </div>
    </div>
  );
}

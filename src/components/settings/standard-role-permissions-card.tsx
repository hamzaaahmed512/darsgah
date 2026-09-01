import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRolePermissions } from "@/lib/permissions";

export function StandardRolePermissionsCard({ currentUserRole }: { currentUserRole: string }) {
  const visibleRoleCards =
    currentUserRole === "principal"
      ? (["administrator", "principal", "teacher", "head_teacher", "student_staff", "staff", "cashier"] as const)
      : (["teacher", "head_teacher", "student_staff", "staff", "cashier"] as const);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Permissions</CardTitle>
        <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
      </CardHeader>
      <CardContent className="space-y-4">
        {visibleRoleCards.map((role) => (
          <div key={role} className="rounded-lg bg-surface-low p-4">
            <p className="font-semibold capitalize text-ink">{role.replace("_", " ")}</p>
            <p className="mt-1 text-sm text-muted">{getRolePermissions(role).join(", ")}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

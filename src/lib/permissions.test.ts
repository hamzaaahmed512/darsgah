import { describe, expect, it } from "vitest";
import { hasPermission, roleHome } from "@/lib/permissions";

describe("role permissions", () => {
  it("allows administrators to manage users and settings", () => {
    expect(hasPermission("administrator", "users:manage")).toBe(true);
    expect(hasPermission("administrator", "settings:manage")).toBe(true);
  });

  it("lets teachers view their own operational work without student management rights", () => {
    expect(hasPermission("teacher", "students:create")).toBe(false);
    expect(hasPermission("teacher", "students:archive")).toBe(false);
    expect(hasPermission("teacher", "students:view")).toBe(true);
    expect(hasPermission("teacher", "attendance:view")).toBe(true);
    expect(hasPermission("teacher", "attendance:submit")).toBe(true);
    expect(hasPermission("teacher", "academics:view")).toBe(true);
  });

  it("keeps attendance submission limited to teachers", () => {
    expect(hasPermission("principal", "attendance:submit")).toBe(false);
    expect(hasPermission("teacher", "attendance:submit")).toBe(true);
    expect(hasPermission("student_staff", "attendance:submit")).toBe(false);
  });

  it("limits exam approval and result-card capabilities by role", () => {
    expect(hasPermission("principal", "marks:approve")).toBe(true);
    expect(hasPermission("principal", "marks:manage")).toBe(false);
    expect(hasPermission("principal", "results:generate")).toBe(false);
    expect(hasPermission("teacher", "marks:manage")).toBe(true);
    expect(hasPermission("teacher", "marks:approve")).toBe(false);
    expect(hasPermission("student_staff", "results:generate")).toBe(true);
    expect(hasPermission("student_staff", "marks:manage")).toBe(false);
  });

  it("routes users to role-aware homes", () => {
    expect(roleHome("teacher")).toBe("/dashboard");
    expect(roleHome("administrator")).toBe("/admin");
    expect(roleHome("principal")).toBe("/dashboard");
    expect(roleHome("student_staff")).toBe("/students");
  });

  it("restricts finance actions correctly based on user roles", () => {
    // Principal & Admin can view and manage finance
    expect(hasPermission("principal", "finance:view")).toBe(true);
    expect(hasPermission("principal", "finance:manage")).toBe(true);
    expect(hasPermission("administrator", "finance:view")).toBe(true);
    expect(hasPermission("administrator", "finance:manage")).toBe(true);

    // Registrar (student_staff) can view but cannot manage finance
    expect(hasPermission("student_staff", "finance:view")).toBe(true);
    expect(hasPermission("student_staff", "finance:manage")).toBe(false);

    // Teachers have no access to finance
    expect(hasPermission("teacher", "finance:view")).toBe(false);
    expect(hasPermission("teacher", "finance:manage")).toBe(false);
  });
});

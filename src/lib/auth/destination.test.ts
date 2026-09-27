import { describe, expect, it } from "vitest";
import { defaultDestinationForRole, resolveAuthDestination } from "@/lib/auth/destination";

describe("resolveAuthDestination", () => {
  it("returns the correct default portal", () => {
    expect(resolveAuthDestination(undefined, false)).toBe("/dashboard");
    expect(resolveAuthDestination(undefined, true)).toBe("/platform");
  });

  it("routes school roles directly to their final workspace", () => {
    expect(defaultDestinationForRole("principal")).toBe("/dashboard/principal");
    expect(defaultDestinationForRole("administrator")).toBe("/dashboard/admin");
    expect(defaultDestinationForRole("student_staff")).toBe("/dashboard/registrar");
    expect(defaultDestinationForRole("teacher")).toBe("/dashboard/teacher");
    expect(defaultDestinationForRole("head_teacher")).toBe("/dashboard/teacher");
    expect(defaultDestinationForRole("librarian")).toBe("/library");
    expect(resolveAuthDestination(undefined, false, "/dashboard/principal")).toBe("/dashboard/principal");
  });

  it("preserves safe internal destinations", () => {
    expect(resolveAuthDestination("/students?page=2", false)).toBe("/students?page=2");
    expect(resolveAuthDestination("/platform/schools", true)).toBe("/platform/schools");
  });

  it("rejects external, auth-loop, and unauthorized platform destinations", () => {
    expect(resolveAuthDestination("https://example.com", false)).toBe("/dashboard");
    expect(resolveAuthDestination("//example.com", false)).toBe("/dashboard");
    expect(resolveAuthDestination("/change-password", false)).toBe("/dashboard");
    expect(resolveAuthDestination("/platform", false)).toBe("/dashboard");
  });
});

import { describe, expect, it } from "vitest";
import { resolveAuthDestination } from "@/lib/auth/destination";

describe("resolveAuthDestination", () => {
  it("returns the correct default portal", () => {
    expect(resolveAuthDestination(undefined, false)).toBe("/dashboard");
    expect(resolveAuthDestination(undefined, true)).toBe("/platform");
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

import { describe, expect, it } from "vitest";
import { sortClassesNaturally } from "@/lib/class-sort";

describe("sortClassesNaturally", () => {
  it("orders numbered classes before text-only classes", () => {
    const sorted = sortClassesNaturally([
      { name: "Falcons" },
      { name: "10" },
      { name: "9B" },
      { name: "9A" },
      { name: "Eagles" }
    ]);

    expect(sorted.map((item) => item.name)).toEqual(["9A", "9B", "10", "Eagles", "Falcons"]);
  });
});

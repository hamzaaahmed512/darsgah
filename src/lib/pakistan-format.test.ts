import { describe, expect, it } from "vitest";
import { formatCnic, formatPakistaniPhone, normalizedPakistaniPhone } from "@/lib/pakistan-format";

describe("Pakistan contact formatting", () => {
  it("formats local mobile numbers after the first three digits", () => {
    expect(formatPakistaniPhone("3216666666")).toBe("321 6666666");
    expect(formatPakistaniPhone("+92 321 6666666")).toBe("321 6666666");
    expect(normalizedPakistaniPhone("0321 6666666")).toBe("3216666666");
  });

  it("formats CNIC from digits only", () => {
    expect(formatCnic("0000012345678")).toBe("00000-1234567-8");
    expect(formatCnic("00000-1234567-8")).toBe("00000-1234567-8");
  });
});

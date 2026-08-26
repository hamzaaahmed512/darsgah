import { describe, expect, it } from "vitest";
import { formatCnic, formatPakistaniPhone, normalizedPakistaniPhone } from "@/lib/pakistan-format";

describe("Pakistan contact formatting", () => {
  it("formats local mobile numbers with 11 local digits", () => {
    expect(formatPakistaniPhone("03216666666")).toBe("0321-6666666");
    expect(formatPakistaniPhone("+92 321 6666666")).toBe("0321-6666666");
    expect(normalizedPakistaniPhone("0321-6666666")).toBe("03216666666");
  });

  it("formats CNIC from digits only", () => {
    expect(formatCnic("0000012345678")).toBe("00000-1234567-8");
    expect(formatCnic("00000-1234567-8")).toBe("00000-1234567-8");
  });
});

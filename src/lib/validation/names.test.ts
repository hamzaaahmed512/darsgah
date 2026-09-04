import { describe, expect, it } from "vitest";
import { englishNameSchema } from "@/lib/validation/names";

describe("englishNameSchema", () => {
  it("accepts grade names containing numbers", () => {
    expect(englishNameSchema("Grade name", 80).parse("Grade 11")).toBe("Grade 11");
  });

  it("continues rejecting unsupported symbols", () => {
    expect(() => englishNameSchema("Grade name", 80).parse("Grade 11 / A")).toThrow();
  });
});

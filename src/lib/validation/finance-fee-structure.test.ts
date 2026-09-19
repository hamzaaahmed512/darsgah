import { describe, expect, it } from "vitest";
import { feeStructureSchema } from "@/lib/validation/finance";

const base = {
  academic_year_id: "11111111-1111-4111-8111-111111111111",
  class_id: "22222222-2222-4222-8222-222222222222"
};

describe("feeStructureSchema", () => {
  it("stores blank and missing optional fees as zero", () => {
    const result = feeStructureSchema.parse({
      ...base,
      tuition_fee: "5000",
      admission_fee: "",
      examination_fee: "1000",
      library_fee: "   ",
      laboratory_fee: null
    });

    expect(result).toMatchObject({
      tuition_fee: 5000,
      admission_fee: 0,
      examination_fee: 1000,
      library_fee: 0,
      laboratory_fee: 0,
      transport_fee: 0,
      miscellaneous_charges: 0
    });
  });

  it("requires tuition but accepts a deliberate zero", () => {
    expect(feeStructureSchema.safeParse({ ...base, tuition_fee: "" }).success).toBe(false);
    expect(feeStructureSchema.safeParse({ ...base }).success).toBe(false);
    expect(feeStructureSchema.parse({ ...base, tuition_fee: "0" }).tuition_fee).toBe(0);
  });

  it("rejects invalid or negative optional amounts", () => {
    expect(feeStructureSchema.safeParse({ ...base, tuition_fee: "5000", admission_fee: "abc" }).success).toBe(false);
    expect(feeStructureSchema.safeParse({ ...base, tuition_fee: "5000", library_fee: "-1" }).success).toBe(false);
  });
});

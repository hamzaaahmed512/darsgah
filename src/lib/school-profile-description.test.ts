import { describe, expect, it } from "vitest";
import {
  countSchoolDescriptionWords,
  limitSchoolDescription,
  SCHOOL_DESCRIPTION_MAX_CHARACTERS,
  SCHOOL_DESCRIPTION_MAX_WORDS
} from "@/lib/school-profile-description";

describe("school profile description limits", () => {
  it("counts words separated by any whitespace", () => {
    expect(countSchoolDescriptionWords("  A clear\nlearning community  ")).toBe(4);
    expect(countSchoolDescriptionWords("   ")).toBe(0);
  });

  it("keeps at most fifty complete words", () => {
    const value = Array.from({ length: SCHOOL_DESCRIPTION_MAX_WORDS + 5 }, (_, index) => `w${index + 1}`).join(" ");
    const limited = limitSchoolDescription(value);

    expect(countSchoolDescriptionWords(limited)).toBe(SCHOOL_DESCRIPTION_MAX_WORDS);
    expect(limited.endsWith(`w${SCHOOL_DESCRIPTION_MAX_WORDS}`)).toBe(true);
  });

  it("keeps the existing character limit", () => {
    expect(limitSchoolDescription("x".repeat(SCHOOL_DESCRIPTION_MAX_CHARACTERS + 20)))
      .toHaveLength(SCHOOL_DESCRIPTION_MAX_CHARACTERS);
  });
});

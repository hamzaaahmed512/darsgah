export const STUDENT_MAJORS = [
  "computer",
  "biology",
  "pre_engineering",
  "computer_economics",
  "computer_economics_stats"
] as const;

export type StudentMajor = typeof STUDENT_MAJORS[number];
export type MajorValue = StudentMajor | `custom:${string}`;

export type StudentCombinationOption = {
  value: MajorValue;
  label: string;
  kind: "default" | "custom";
  subjectIds?: string[];
  classIds?: string[];
};

export const STUDENT_MAJOR_LABELS: Record<StudentMajor, string> = {
  computer: "ICS with Physics",
  biology: "Pre-Medical",
  pre_engineering: "Pre-Engineering",
  computer_economics: "ICS with Economics",
  computer_economics_stats: "ICS with Economics and Stats"
};

const LEGACY_STUDENT_MAJOR_ALIASES: Record<string, StudentMajor> = {
  biology: "biology",
  "pre-medical": "biology",
  computer: "computer",
  "ics with physics": "computer",
  pre_engineering: "pre_engineering",
  "pre engineering": "pre_engineering",
  "pre-engineering": "pre_engineering",
  computer_economics: "computer_economics",
  "computer with economics": "computer_economics",
  "ics with economics": "computer_economics",
  computer_economics_stats: "computer_economics_stats",
  "computer with economics and stats": "computer_economics_stats",
  "ics with economics and stats": "computer_economics_stats"
};

export function gradeNumber(gradeName?: string | null) {
  const match = gradeName?.match(/(?:grade\s*)?(9|10|11|12)(?:th|st|nd)?/i);
  return match ? Number(match[1]) : null;
}

export function canSelectStudentCombination(gradeName?: string | null) {
  const grade = gradeNumber(gradeName);
  return grade === 11 || grade === 12;
}

export function majorsForGrade(gradeName?: string | null): StudentMajor[] {
  if (canSelectStudentCombination(gradeName)) return ["biology", "computer", "pre_engineering", "computer_economics", "computer_economics_stats"];
  return [];
}

export function defaultCombinationOptionsForGrade(gradeName?: string | null): StudentCombinationOption[] {
  return majorsForGrade(gradeName).map((major) => ({
    value: major,
    label: STUDENT_MAJOR_LABELS[major],
    kind: "default"
  }));
}

export function isDefaultStudentMajor(value: string | null | undefined): value is StudentMajor {
  return STUDENT_MAJORS.includes(value as StudentMajor);
}

export function normalizeStudentMajorValue(value: string | null | undefined): MajorValue | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isCustomStudentMajor(trimmed)) return trimmed;
  if (isDefaultStudentMajor(trimmed)) return trimmed;
  return LEGACY_STUDENT_MAJOR_ALIASES[trimmed.toLocaleLowerCase()] ?? null;
}

export function isCustomStudentMajor(value: string | null | undefined): value is `custom:${string}` {
  return Boolean(value?.startsWith("custom:"));
}

export function customCombinationId(value: string | null | undefined) {
  return isCustomStudentMajor(value) ? value.slice("custom:".length) : null;
}

export function studentMajorLabel(value: string | null | undefined, options: StudentCombinationOption[] = []) {
  const normalizedValue = normalizeStudentMajorValue(value);
  if (!normalizedValue) return "";
  const option = options.find((item) => item.value === normalizedValue);
  if (option) return option.label;
  if (isDefaultStudentMajor(normalizedValue)) return STUDENT_MAJOR_LABELS[normalizedValue];
  return "Custom combination";
}

const normalized = (name: string) => name.trim().replace(/\s+/g, " ").toLocaleLowerCase();

export function isSubjectExcludedForMajor(gradeName: string, major: string | null | undefined, subjectName: string) {
  if (isCustomStudentMajor(major)) return false;
  if (major && !isDefaultStudentMajor(major)) return false;
  if (!major) return false;
  const grade = gradeNumber(gradeName);
  const subject = normalized(subjectName);
  const isComputer = subject === "computer" || subject === "computer science" || subject === "computer studies";
  if ((grade === 9 || grade === 10) && major === "computer") return subject === "biology";
  if ((grade === 9 || grade === 10) && major === "biology") return isComputer;
  if ((grade === 11 || grade === 12) && major === "computer") return subject === "biology" || subject === "chemistry";
  if ((grade === 11 || grade === 12) && major === "pre_engineering") return subject === "biology" || isComputer;
  if ((grade === 11 || grade === 12) && major === "biology") return isComputer || subject === "mathematics" || subject === "maths";
  if ((grade === 11 || grade === 12) && subject === "statistics" && major !== "computer_economics_stats") return true;
  if ((grade === 11 || grade === 12) && (major === "computer_economics" || major === "computer_economics_stats")) {
    return subject === "biology" || subject === "chemistry" || (major === "computer_economics_stats" && subject === "physics");
  }
  return false;
}

export const STUDENT_MAJORS = [
  "computer",
  "biology",
  "pre_engineering",
  "computer_economics",
  "computer_economics_stats"
] as const;

export type StudentMajor = typeof STUDENT_MAJORS[number];

export const STUDENT_MAJOR_LABELS: Record<StudentMajor, string> = {
  computer: "Computer",
  biology: "Biology",
  pre_engineering: "Pre-Engineering",
  computer_economics: "Computer with Economics",
  computer_economics_stats: "Computer with Economics and Stats"
};

export function gradeNumber(gradeName?: string | null) {
  const match = gradeName?.match(/(?:grade\s*)?(9|10|11|12)(?:th|st|nd)?/i);
  return match ? Number(match[1]) : null;
}

export function majorsForGrade(gradeName?: string | null): StudentMajor[] {
  const grade = gradeNumber(gradeName);
  if (grade === 9 || grade === 10) return ["computer", "biology"];
  if (grade === 11 || grade === 12) return ["biology", "computer", "pre_engineering", "computer_economics", "computer_economics_stats"];
  return [];
}

const normalized = (name: string) => name.trim().replace(/\s+/g, " ").toLocaleLowerCase();

export function isSubjectExcludedForMajor(gradeName: string, major: StudentMajor | null | undefined, subjectName: string) {
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

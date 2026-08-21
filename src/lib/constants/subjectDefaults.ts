import { DEFAULT_GRADE_NAMES, HIGH_SCHOOL_GRADE_NAMES } from "@/lib/constants/onboarding";

export type SubjectDefault = {
  name: string;
  is_elective?: boolean;
};

const CORE = (name: string): SubjectDefault => ({ name });
const ELECTIVE = (name: string): SubjectDefault => ({ name, is_elective: true });

/** Grade-level curriculum defaults used when classes are generated. */
export const GRADE_SUBJECT_DEFAULTS: Record<string, SubjectDefault[]> = {
  PG: [CORE("English"), CORE("Urdu"), CORE("Mathematics"), CORE("General Knowledge")],
  Nursery: [CORE("English"), CORE("Urdu"), CORE("Mathematics"), CORE("General Knowledge")],
  Prep: [CORE("English"), CORE("Urdu"), CORE("Mathematics"), CORE("General Knowledge")],
  "Grade 1": [
    CORE("English"),
    CORE("Urdu"),
    CORE("Mathematics"),
    CORE("General Knowledge"),
    CORE("Islamiat"),
    CORE("Nazra Quran")
  ],
  "Grade 2": [
    CORE("English"),
    CORE("Urdu"),
    CORE("Mathematics"),
    CORE("General Knowledge"),
    CORE("Islamiat"),
    CORE("Nazra Quran")
  ],
  "Grade 3": [
    CORE("English"),
    CORE("Urdu"),
    CORE("Mathematics"),
    CORE("General Knowledge"),
    CORE("Islamiat"),
    CORE("Nazra Quran")
  ],
  "Grade 4": [
    CORE("English"),
    CORE("Urdu"),
    CORE("Mathematics"),
    CORE("General Science"),
    CORE("Social Studies"),
    CORE("Islamiat"),
    CORE("Computer Studies")
  ],
  "Grade 5": [
    CORE("English"),
    CORE("Urdu"),
    CORE("Mathematics"),
    CORE("General Science"),
    CORE("Social Studies"),
    CORE("Islamiat"),
    CORE("Computer Studies")
  ],
  "Grade 6": [
    CORE("English"),
    CORE("Urdu"),
    CORE("Mathematics"),
    CORE("General Science"),
    CORE("History"),
    CORE("Geography"),
    CORE("Islamiat"),
    CORE("Computer Science")
  ],
  "Grade 7": [
    CORE("English"),
    CORE("Urdu"),
    CORE("Mathematics"),
    CORE("General Science"),
    CORE("History"),
    CORE("Geography"),
    CORE("Islamiat"),
    CORE("Computer Science")
  ],
  "Grade 8": [
    CORE("English"),
    CORE("Urdu"),
    CORE("Mathematics"),
    CORE("General Science"),
    CORE("History"),
    CORE("Geography"),
    CORE("Islamiat"),
    CORE("Computer Science")
  ],
  "Grade 9": [
    CORE("English"),
    CORE("Urdu"),
    CORE("Islamiat"),
    CORE("Translation of the Holy Quran"),
    CORE("Mathematics"),
    CORE("Physics"),
    CORE("Chemistry"),
    ELECTIVE("Biology"),
    ELECTIVE("Computer Science")
  ],
  "Grade 10": [
    CORE("English"),
    CORE("Urdu"),
    CORE("Pakistan Studies"),
    CORE("Translation of the Holy Quran"),
    CORE("Mathematics"),
    CORE("Physics"),
    CORE("Chemistry"),
    ELECTIVE("Biology"),
    ELECTIVE("Computer Science")
  ],
  "Grade 11": [
    CORE("English Compulsory"),
    CORE("Urdu Compulsory"),
    CORE("Islamiat Compulsory"),
    CORE("Translation of the Holy Quran"),
    CORE("Mathematics"),
    CORE("Physics"),
    CORE("Chemistry"),
    ELECTIVE("Biology"),
    ELECTIVE("Computer Science"),
    ELECTIVE("Principles of Accounting"),
    ELECTIVE("Principles of Economics")
  ],
  "Grade 12": [
    CORE("English Compulsory"),
    CORE("Urdu Compulsory"),
    CORE("Pakistan Studies Compulsory"),
    CORE("Translation of the Holy Quran"),
    CORE("Mathematics"),
    CORE("Physics"),
    CORE("Chemistry"),
    ELECTIVE("Biology"),
    ELECTIVE("Computer Science"),
    ELECTIVE("Advanced Accounting"),
    ELECTIVE("Commercial Geography")
  ]
};

export function getDefaultSubjectsForGrade(gradeName: string): SubjectDefault[] {
  return GRADE_SUBJECT_DEFAULTS[gradeName] ?? [];
}

export function getAllUniqueDefaultSubjectNames(): string[] {
  const names = new Set<string>();
  for (const gradeName of DEFAULT_GRADE_NAMES) {
    for (const subject of getDefaultSubjectsForGrade(gradeName)) {
      names.add(subject.name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export function isHighSchoolGrade(gradeName: string) {
  return HIGH_SCHOOL_GRADE_NAMES.has(gradeName);
}

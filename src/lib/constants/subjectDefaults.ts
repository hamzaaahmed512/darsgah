import { DEFAULT_GRADE_NAMES, HIGH_SCHOOL_GRADE_NAMES } from "@/lib/constants/onboarding";

export type SubjectDefault = {
  name: string;
  is_elective?: boolean;
};

const CORE = (name: string): SubjectDefault => ({ name });
const ELECTIVE = (name: string): SubjectDefault => ({ name, is_elective: true });

const SCHOOL_DEFAULT_SUBJECT_CATALOG = [
  "Urdu",
  "English",
  "Islamiat",
  "Translation of the Holy Quran",
  "Pak Studies",
  "Social Studies",
  "History",
  "Geography",
  "Mathematics",
  "Computer",
  "Urdu Grammar",
  "English Grammar",
  "Science",
  "Biology",
  "Chemistry",
  "Physics",
  "Economics",
  "Statistics"
] as const;

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
    ELECTIVE("Computer")
  ],
  "Grade 10": [
    CORE("English"),
    CORE("Urdu"),
    CORE("Pak Studies"),
    CORE("Translation of the Holy Quran"),
    CORE("Mathematics"),
    CORE("Physics"),
    CORE("Chemistry"),
    ELECTIVE("Biology"),
    ELECTIVE("Computer")
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
    ELECTIVE("Statistics"),
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
    ELECTIVE("Statistics"),
    ELECTIVE("Advanced Accounting"),
    ELECTIVE("Commercial Geography")
  ]
};

export function getDefaultSubjectsForGrade(gradeName: string): SubjectDefault[] {
  return GRADE_SUBJECT_DEFAULTS[gradeName] ?? [];
}

export function getAllUniqueDefaultSubjectNames(): string[] {
  const names = new Set<string>();
  for (const subjectName of SCHOOL_DEFAULT_SUBJECT_CATALOG) {
    names.add(subjectName);
  }
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

export function canonicalSubjectName(name: string) {
  const normalized = name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  const withoutCompulsory = normalized.replace(/\s+compulsory$/, "");
  if (withoutCompulsory === "urdu" || withoutCompulsory === "english" || withoutCompulsory === "mathematics") {
    return withoutCompulsory;
  }
  if (normalized === "computer science" || normalized === "computer studies") {
    return "computer";
  }
  if (
    normalized === "pak study" ||
    normalized === "pak studies" ||
    normalized === "pakistan studies" ||
    normalized === "pakistan study" ||
    normalized === "pakistan studies compulsory" ||
    normalized === "pak studies compulsory"
  ) {
    return "pak studies";
  }
  if (
    normalized === "islamiat" ||
    normalized === "islamiyat" ||
    normalized === "islamic education" ||
    normalized === "islamic studies" ||
    normalized === "islamiat compulsory" ||
    normalized === "islamiyat compulsory"
  ) {
    return "islamiat";
  }
  return normalized;
}

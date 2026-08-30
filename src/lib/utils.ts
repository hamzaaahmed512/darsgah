import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "No data";
  return `${Math.round(value)}%`;
}

export function toCsv(rows: Array<Record<string, string | number | null | undefined>>) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [keys.join(","), ...rows.map((row) => keys.map((key) => escape(row[key])).join(","))].join("\n");
}

// ─── Pakistan Localization ────────────────────────────────────────────────────

const PK_LOCALE = "en-PK";
const PK_TZ = "Asia/Karachi";

/**
 * Format a number as Pakistani Rupees.
 * Output: "Rs. 5,000" or "Rs. 1,25,000"
 */
export function formatPKR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "Rs. 0";
  return new Intl.NumberFormat(PK_LOCALE, {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
    currencyDisplay: "narrowSymbol"
  }).format(amount);
}

/**
 * Format a date string or Date object as "14 Jul 2026" (DD MMM YYYY) in PKT.
 */
export function formatDatePK(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(PK_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: PK_TZ
  }).format(d);
}

/**
 * Format a timestamp as "14 Jul 2026, 11:32 AM" in PKT.
 */
export function formatDateTimePK(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(PK_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: PK_TZ
  }).format(d);
}

/**
 * Format a date as numeric "14/07/2026" in PKT.
 */
export function formatDateNumericPK(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(PK_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: PK_TZ
  }).format(d);
}

// ─── Academic Sorting ─────────────────────────────────────────────────────────

const GRADE_ORDER = [
  "PG",
  "Nursery",
  "Prep",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12"
];

/**
 * Sort grades based on standard academic progression.
 */
export function sortGrades(a: string, b: string): number {
  const indexA = GRADE_ORDER.indexOf(a);
  const indexB = GRADE_ORDER.indexOf(b);

  if (indexA === -1 && indexB === -1) {
    return a.localeCompare(b);
  }
  if (indexA === -1) return 1;
  if (indexB === -1) return -1;
  return indexA - indexB;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Format Grade and Section as "Grade number - Section".
 * Examples: "Grade 10" + "A" -> "Grade 10 - A"
 * "Grade 10A" + "A" -> "Grade 10 - A"
 * "Grade 9" + "Grade 9 orange - orange" -> "Grade 9 - Orange"
 */
export function formatGradeSection(grade: string | null | undefined, section: string | null | undefined): string {
  let cleanGrade = grade?.trim() ?? "";
  let cleanSection = section?.trim() ?? "";

  // Normalize numeric grade e.g. "9" -> "Grade 9"
  if (/^\d+$/.test(cleanGrade)) {
    cleanGrade = `Grade ${cleanGrade}`;
  }

  // Remove "section" or "sec" prefix
  cleanSection = cleanSection.replace(/^section\s+/i, "").replace(/^sec\s+/i, "");

  // If grade is missing but section contains "Grade X - Y" or "Grade X Y"
  if (!cleanGrade && cleanSection) {
    const match = cleanSection.match(/^(Grade\s+\d+|PG|Nursery|Prep)\s*[- ]\s*(.+)$/i);
    if (match) {
      cleanGrade = match[1];
      cleanSection = match[2];
    }
  }

  // If cleanSection starts with cleanGrade, remove it
  if (cleanGrade && cleanSection.toLowerCase().startsWith(cleanGrade.toLowerCase())) {
    cleanSection = cleanSection.slice(cleanGrade.length).replace(/^[^a-zA-Z0-9]+/, "").trim();
  }

  // If cleanGrade ends with cleanSection, remove it
  if (cleanGrade && cleanSection && cleanGrade.toLowerCase().endsWith(cleanSection.toLowerCase())) {
    cleanGrade = cleanGrade.slice(0, -cleanSection.length).replace(/[^a-zA-Z0-9]+$/, "").trim();
  }

  // If cleanGrade contains cleanSection as a distinct word, strip it
  if (cleanGrade && cleanSection) {
    const wordPattern = new RegExp(`\\b${escapeRegExp(cleanSection)}\\b`, "gi");
    cleanGrade = cleanGrade.replace(wordPattern, "").replace(/\s+/g, " ").trim();
  }

  // Clean trailing/leading non-alphanumeric characters
  cleanGrade = cleanGrade.replace(/^[^a-zA-Z0-9]+/, "").replace(/[^a-zA-Z0-9]+$/, "").trim();
  cleanSection = cleanSection.replace(/^[^a-zA-Z0-9]+/, "").replace(/[^a-zA-Z0-9]+$/, "").trim();

  // Deduplicate repeated section (e.g. "orange - orange" or "Orange Orange")
  cleanSection = cleanSection.replace(/^(.+?)\s*[- ]+\1$/i, "$1").trim();

  // Fix A.A / B.B duplication bug specifically
  cleanSection = cleanSection.replace(/^([A-Za-z])\.\1$/i, "$1").trim();

  // Deduplicate repeated grade (e.g. "Grade 9 - Grade 9" or "Grade 9 Grade 9")
  cleanGrade = cleanGrade.replace(/^(\bGrade\s+\d+\b|\bPG\b|\bNursery\b|\bPrep\b)\s*[- ]+\1$/i, "$1").trim();

  cleanSection = cleanSection.toUpperCase();
  cleanGrade = cleanGrade.toUpperCase();

  if (cleanGrade && !cleanGrade.startsWith("GRADE") && /^\d+$/.test(cleanGrade.replace(/[^0-9]/g, ""))) {
     cleanGrade = cleanGrade.replace(/^(\d+.*)$/, "GRADE $1");
  } else if (cleanGrade && !cleanGrade.startsWith("GRADE") && !cleanGrade.startsWith("PG") && !cleanGrade.startsWith("NURSERY") && !cleanGrade.startsWith("PREP")) {
     // Optional fallback for things that might just say "NINE" or something
  }

  if (!cleanGrade) return cleanSection;
  if (!cleanSection || cleanGrade === cleanSection) return cleanGrade;

  return `${cleanGrade} - ${cleanSection}`;
}

export function formatClassDisplayName(
  grade: string | null | undefined,
  className: string | null | undefined,
  section: string | null | undefined
): string {
  const cleanClassName = className?.trim() ?? "";
  let cleanGrade = grade?.trim() ?? "";
  let cleanSection = section?.trim() ?? "";

  // If grade is missing, try to extract from className
  if (!cleanGrade && cleanClassName) {
    const match = cleanClassName.match(/^(Grade\s+\d+|PG|Nursery|Prep)\b/i);
    if (match) cleanGrade = match[1];
  }

  // If section is missing, try to extract from className
  if (!cleanSection && cleanClassName && cleanGrade && cleanClassName.toLowerCase().startsWith(cleanGrade.toLowerCase())) {
    cleanSection = cleanClassName.slice(cleanGrade.length).replace(/^[^a-zA-Z0-9]+/, "").trim();
  }

  const gradeSection = formatGradeSection(cleanGrade, cleanSection);
  if (!cleanClassName) return gradeSection;
  if (!gradeSection) return cleanClassName.toUpperCase();

  // Check if cleanClassName is redundant with grade and section
  // Strip out grade, section, "grade", "section", numbers, delimiters from cleanClassName
  let residual = cleanClassName;
  if (cleanGrade) {
    residual = residual.replace(new RegExp(escapeRegExp(cleanGrade), "gi"), "");
  }
  if (cleanSection) {
    residual = residual.replace(new RegExp(escapeRegExp(cleanSection), "gi"), "");
  }
  residual = residual.replace(/\bgrade\b/gi, "").replace(/\bsection\b/gi, "");
  residual = residual.replace(/[^a-zA-Z0-9]/g, "").trim();

  // If nothing meaningful is left, className was just redundant repetition
  if (!residual) {
    return gradeSection;
  }

  if (cleanClassName.toLowerCase() === gradeSection.toLowerCase()) {
    return gradeSection;
  }

  // Clean distinct class label
  let distinctClassLabel = cleanClassName;
  if (cleanGrade) {
    distinctClassLabel = distinctClassLabel.replace(new RegExp(`\\b${escapeRegExp(cleanGrade)}\\b`, "gi"), "");
  }
  if (cleanSection) {
    distinctClassLabel = distinctClassLabel.replace(new RegExp(`\\b${escapeRegExp(cleanSection)}\\b`, "gi"), "");
  }
  distinctClassLabel = distinctClassLabel.replace(/\bgrade\b/gi, "").replace(/\bsection\b/gi, "");
  distinctClassLabel = distinctClassLabel.replace(/^[^a-zA-Z0-9]+/, "").replace(/[^a-zA-Z0-9]+$/, "").trim();

  if (!distinctClassLabel || distinctClassLabel.toLowerCase() === cleanSection.toLowerCase() || distinctClassLabel.toLowerCase() === cleanGrade.toLowerCase()) {
    return gradeSection;
  }

  return `${gradeSection} - ${distinctClassLabel.toUpperCase()}`;
}

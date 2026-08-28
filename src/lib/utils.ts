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

/**
 * Format Grade and Section as "Grade number.Section" or "Name.Section".
 * Examples: "Grade 10" + "A" -> "Grade 10.A"
 * "Grade 10A" + "A" -> "Grade 10.A"
 */
export function formatGradeSection(grade: string | null | undefined, section: string | null | undefined): string {
  if (!grade) return section?.trim() || "";
  if (!section) return grade.trim();

  let cleanGrade = grade.trim();
  const cleanSection = section.trim();

  // If grade ends with the section name (ignoring case), remove it
  if (cleanGrade.toLowerCase().endsWith(cleanSection.toLowerCase())) {
    cleanGrade = cleanGrade.slice(0, -cleanSection.length).trim();
  }

  // Remove trailing non-alphanumeric characters (like '-' or space)
  cleanGrade = cleanGrade.replace(/[^a-zA-Z0-9]+$/, "");

  return `${cleanGrade}.${cleanSection}`;
}


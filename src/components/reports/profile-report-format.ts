export const DEFAULT_REPORT_SCHOOL = "National Garrison Secondary School";

export function reportText(value: string | null | undefined, fallback = "Not recorded") {
  return value?.trim().replace(/\s+/g, " ") || fallback;
}

export function reportDate(value: string | null | undefined, withTime = false) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi", day: "2-digit", month: "short", year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {})
  }).format(date) + (withTime ? " PKT" : "");
}

export function reportMoney(value: number | null | undefined) {
  return value == null || !Number.isFinite(value)
    ? "Not recorded"
    : `PKR ${new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(value)}`;
}

export function reportRate(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) || value < 0 || value > 100
    ? "No records" : `${Math.round(value)}%`;
}

export function reportFilename(type: "staff" | "student", fullName: string, generatedAt: string) {
  const name = fullName.normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 70) || "profile";
  return `${type}-${name}-${generatedAt.slice(0, 10)}.pdf`;
}

export const ADMISSION_NUMBER_REGEX = /^\d{4}-(?:0*[1-9]\d*)$/;

export function getCurrentAdmissionYear(date = new Date(), timeZone = "Asia/Karachi") {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric" }).format(date));
}

export function formatAdmissionNumber(year: number, sequence: number | string) {
  const numericSequence = typeof sequence === "number" ? String(sequence) : sequence.trim();
  return `${year}-${numericSequence}`;
}

export function parseAdmissionNumber(value: string) {
  const trimmed = value.trim();
  if (!ADMISSION_NUMBER_REGEX.test(trimmed)) return null;

  const [year, sequence] = trimmed.split("-");
  return {
    year: Number(year),
    sequence: Number(sequence)
  };
}

export function sanitizeAdmissionNumberInput(value: string, year: number) {
  const prefix = `${year}-`;
  const trimmed = value.trim();

  if (!trimmed) return "";

  let sequencePart = trimmed;
  if (trimmed.startsWith(prefix)) {
    sequencePart = trimmed.slice(prefix.length);
  } else if (trimmed.includes("-")) {
    sequencePart = trimmed.split("-").slice(1).join("-");
  }

  const digits = sequencePart.replace(/\D/g, "");
  return digits ? `${prefix}${digits}` : `${prefix}`;
}

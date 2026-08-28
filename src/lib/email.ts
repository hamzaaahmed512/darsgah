export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeOptionalEmail(value: unknown) {
  if (typeof value !== "string") return value ?? null;
  const normalized = normalizeEmail(value);
  return normalized || null;
}

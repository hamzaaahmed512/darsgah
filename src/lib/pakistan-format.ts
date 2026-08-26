export function digitsOnly(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

export function localPakistaniPhoneDigits(value: string | null | undefined) {
  let digits = digitsOnly(value);
  if (digits.startsWith("0092")) digits = digits.slice(4);
  else if (digits.startsWith("92")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("3")) digits = `0${digits}`;
  return digits.slice(0, 11);
}

export function formatPakistaniPhone(value: string | null | undefined) {
  const digits = localPakistaniPhoneDigits(value);
  return digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits;
}

export function normalizedPakistaniPhone(value: string | null | undefined) {
  return localPakistaniPhoneDigits(value);
}

export function isValidPakistaniPhone(value: string | null | undefined) {
  const digits = localPakistaniPhoneDigits(value);
  return /^03\d{9}$/.test(digits);
}

export function formatPakistaniPhoneForStorage(value: string | null | undefined) {
  if (!value) return null;
  const digits = localPakistaniPhoneDigits(value);
  if (!digits) return null;
  if (!isValidPakistaniPhone(digits)) {
    throw new Error("Phone number must be exactly 11 digits, like 0300-0000000.");
  }
  return `+92 ${digits.slice(1, 4)} ${digits.slice(4)}`;
}

export function formatCnic(value: string | null | undefined) {
  const digits = digitsOnly(value).slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

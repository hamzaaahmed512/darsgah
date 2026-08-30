export type StudentNameParts = {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
};

export function formatFullName(firstName?: string | null, lastName?: string | null): string {
  const first = firstName?.trim() ?? "";
  const last = lastName?.trim() ?? "";

  if (!last || first.toLocaleLowerCase() === last.toLocaleLowerCase()) return first;
  if (!first) return last;
  return `${first} ${last}`;
}

export function splitFullName(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ")
  };
}

export function formatDisplayName(name?: string | null) {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return "";

  const parts = trimmed.split(/\s+/);
  if (parts.length === 2 && parts[0].toLocaleLowerCase() === parts[1].toLocaleLowerCase()) {
    return parts[0];
  }

  return trimmed;
}

export function formatStudentName(student: StudentNameParts) {
  const name = student.name?.trim();
  if (name) return formatDisplayName(name);

  return formatFullName(student.firstName, student.lastName);
}

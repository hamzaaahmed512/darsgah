export type StudentNameParts = {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
};

export function formatStudentName(student: StudentNameParts) {
  const name = student.name?.trim();
  if (name) return name;

  const first = student.firstName?.trim() ?? "";
  const last = student.lastName?.trim() ?? "";

  if (!last || first.toLocaleLowerCase() === last.toLocaleLowerCase()) return first;
  if (!first) return last;
  return `${first} ${last}`;
}

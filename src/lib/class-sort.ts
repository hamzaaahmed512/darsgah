type ClassSortInput = {
  name?: string | null;
  class_name?: string | null;
  section_name?: string | null;
  grade_name?: string | null;
};

function classNameForSort(item: ClassSortInput) {
  return (item.class_name ?? item.name ?? "").trim();
}

function classSortParts(item: ClassSortInput) {
  const name = classNameForSort(item);
  const numberMatch = name.match(/\d+/);

  return {
    hasNumber: Boolean(numberMatch),
    number: numberMatch ? Number(numberMatch[0]) : Number.POSITIVE_INFINITY,
    suffix: numberMatch ? name.slice((numberMatch.index ?? 0) + numberMatch[0].length).trim() : name,
    section: item.section_name ?? "",
    name
  };
}

export function compareClassesNaturally(a: ClassSortInput, b: ClassSortInput) {
  const left = classSortParts(a);
  const right = classSortParts(b);

  if (left.hasNumber !== right.hasNumber) return left.hasNumber ? -1 : 1;
  if (left.number !== right.number) return left.number - right.number;

  const suffixCompare = left.suffix.localeCompare(right.suffix, undefined, { numeric: true, sensitivity: "base" });
  if (suffixCompare !== 0) return suffixCompare;

  const sectionCompare = left.section.localeCompare(right.section, undefined, { numeric: true, sensitivity: "base" });
  if (sectionCompare !== 0) return sectionCompare;

  return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" });
}

export function sortClassesNaturally<T extends ClassSortInput>(items: T[]) {
  return [...items].sort(compareClassesNaturally);
}

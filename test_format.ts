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

  if (cleanGrade && cleanSection) {
    const wordPattern = new RegExp(`\\b${cleanSection}\\b`, "gi");
    cleanGrade = cleanGrade.replace(wordPattern, "").replace(/\s+/g, " ").trim();
  }

  cleanGrade = cleanGrade.replace(/^[^a-zA-Z0-9]+/, "").replace(/[^a-zA-Z0-9]+$/, "").trim();
  cleanSection = cleanSection.replace(/^[^a-zA-Z0-9]+/, "").replace(/[^a-zA-Z0-9]+$/, "").trim();

  // Deduplicate repeated section
  cleanSection = cleanSection.replace(/^(.+?)\s*[- ]+\1$/i, "$1").trim();

  // Deduplicate repeated grade
  cleanGrade = cleanGrade.replace(/^(\bGrade\s+\d+\b|\bPG\b|\bNursery\b|\bPrep\b)\s*[- ]+\1$/i, "$1").trim();

  // uppercase EVERYTHING
  cleanSection = cleanSection.toUpperCase();
  cleanGrade = cleanGrade.toUpperCase();
  
  if (!cleanGrade) return cleanSection;
  if (!cleanSection || cleanGrade === cleanSection) return cleanGrade;

  return `${cleanGrade} - ${cleanSection}`;
}

console.log(formatGradeSection("Grade 9", "A"));
console.log(formatGradeSection("Grade 9", "A.A"));

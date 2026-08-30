import { formatGradeSection, formatClassDisplayName } from "./src/lib/utils";

console.log(1, formatClassDisplayName("Grade 9", "Grade 9 A.A", "A"));
console.log(2, formatClassDisplayName("Grade 9", "Grade 9 - A.A", "A"));
console.log(3, formatClassDisplayName("Grade 9", "9 A.A", "A"));
console.log(4, formatClassDisplayName("Grade 9", "A", "A.A"));

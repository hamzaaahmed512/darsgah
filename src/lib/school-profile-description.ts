export const SCHOOL_DESCRIPTION_MAX_WORDS = 50;
export const SCHOOL_DESCRIPTION_MAX_CHARACTERS = 300;

export function countSchoolDescriptionWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

export function limitSchoolDescription(value: string) {
  const withinCharacterLimit = value.slice(0, SCHOOL_DESCRIPTION_MAX_CHARACTERS);
  const words = Array.from(withinCharacterLimit.matchAll(/\S+/g));
  if (words.length <= SCHOOL_DESCRIPTION_MAX_WORDS) return withinCharacterLimit;

  const lastAllowedWord = words[SCHOOL_DESCRIPTION_MAX_WORDS - 1];
  return withinCharacterLimit.slice(0, (lastAllowedWord.index ?? 0) + lastAllowedWord[0].length);
}

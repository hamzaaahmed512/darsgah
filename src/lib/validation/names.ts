import { z } from "zod";

export const ENGLISH_NAME_REGEX = /^[\p{Script=Latin}\p{Mark}\s'.-]+$/u;
export const URDU_NAME_REGEX = /^[\u0621-\u064A\u066E-\u06D3\u06D5\u06EE-\u06FF\s'.-]+$/u;

const ENGLISH_NAME_SANITIZER_REGEX = /[^\p{Script=Latin}\p{Mark}\s'.-]+/gu;
const URDU_NAME_SANITIZER_REGEX = /[^\u0621-\u064A\u066E-\u06D3\u06D5\u06EE-\u06FF\s'.-]+/gu;

const ENGLISH_NAME_RULE = "can only contain letters, spaces, hyphens, apostrophes, and periods";
const URDU_NAME_RULE = "can only contain valid Urdu letters, spaces, hyphens, apostrophes, and periods";

export function sanitizeEnglishNameInput(value: string) {
  return value.replace(ENGLISH_NAME_SANITIZER_REGEX, "");
}

export function sanitizeUrduNameInput(value: string) {
  return value.replace(URDU_NAME_SANITIZER_REGEX, "");
}

export function englishNameSchema(label: string, max: number, min = 1) {
  return z
    .string()
    .trim()
    .min(min, `${label} is required`)
    .max(max)
    .regex(ENGLISH_NAME_REGEX, `${label} ${ENGLISH_NAME_RULE}`);
}

export function urduNameSchema(label: string, max: number, min = 1) {
  return z
    .string()
    .trim()
    .min(min, `${label} is required`)
    .max(max)
    .regex(URDU_NAME_REGEX, `${label} ${URDU_NAME_RULE}`);
}

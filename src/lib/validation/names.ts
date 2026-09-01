import { z } from "zod";

export const ENGLISH_NAME_REGEX = /^[a-zA-Z\s'\-.]+$/;
export const URDU_NAME_REGEX = /^[\u0600-\u06FF\s'\-.]+$/;
export const CLASS_NAME_REGEX = /^[a-zA-Z0-9\s'./-]+$/;

const ENGLISH_NAME_SANITIZER_REGEX = /[^a-zA-Z\s'\-.]/g;
const URDU_NAME_SANITIZER_REGEX = /[^\u0600-\u06FF\s'\-.]/g;
const CLASS_NAME_SANITIZER_REGEX = /[^a-zA-Z0-9\s'./-]/g;

const ENGLISH_NAME_RULE = "can only contain letters, spaces, hyphens, apostrophes, and periods";
const URDU_NAME_RULE = "can only contain valid Urdu letters, spaces, hyphens, apostrophes, and periods";
const CLASS_NAME_RULE = "can only contain letters, numbers, spaces, hyphens, slashes, apostrophes, and periods";

export function sanitizeEnglishNameInput(value: string) {
  return value.replace(ENGLISH_NAME_SANITIZER_REGEX, "");
}

export function sanitizeUrduNameInput(value: string) {
  return value.replace(URDU_NAME_SANITIZER_REGEX, "");
}

export function sanitizeClassNameInput(value: string) {
  return value.replace(CLASS_NAME_SANITIZER_REGEX, "");
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

export function classNameSchema(label: string, max: number, min = 1) {
  return z
    .string()
    .trim()
    .min(min, `${label} is required`)
    .max(max)
    .regex(CLASS_NAME_REGEX, `${label} ${CLASS_NAME_RULE}`);
}

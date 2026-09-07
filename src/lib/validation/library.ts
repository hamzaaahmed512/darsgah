import { z } from "zod";

const id = z.string().uuid();
const text = (max: number) => z.string().trim().max(max);
const money = z.coerce.number().finite().min(0).max(1000000).multipleOf(0.01);

/**
 * Parse a replacement cost field from a form submission.
 * Empty string, null, or undefined → null (unknown / not specified).
 * A numeric-coercible string or number → validated number.
 * This uses z.any() + superRefine so it works safely inside z.discriminatedUnion.
 */
function makeOptionalMoney() {
  return z.any().superRefine((v, ctx) => {
    if (v === "" || v === null || v === undefined) return; // null allowed
    const n = Number(v);
    if (!isFinite(n)) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Replacement cost must be a valid number" }); return; }
    if (n < 0) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Replacement cost cannot be negative" }); return; }
    if (n > 1000000) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Replacement cost exceeds maximum" }); return; }
    if (Math.round(n * 100) !== n * 100) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Maximum two decimal places" }); return; }
  }).transform((v): number | null => {
    if (v === "" || v === null || v === undefined) return null;
    return Number(v);
  });
}

const book = {
  title: text(200).min(1),
  // Author is optional — empty string is valid.
  author: text(200).default(""),
  // All remaining fields default to empty string so forms omitting them still parse.
  isbn: text(32).default(""),
  category: text(80).default(""),
  publisher: text(200).default(""),
  shelf: text(80).default(""),
  // Book-level default replacement cost; used to pre-fill "Add copies" form.
  default_replacement_cost: makeOptionalMoney(),
};
const borrower = { borrower_id: id, borrower_kind: z.enum(["student", "staff"]) };

export const libraryActionSchema = z.discriminatedUnion("action", [
  // ── Existing actions (preserved verbatim) ─────────────────────────────────
  z.object({ action: z.literal("book"), ...book }),
  z.object({ action: z.literal("edit_book"), id, ...book }),
  // Legacy single-copy registration: accession entered manually by librarian.
  z.object({ action: z.literal("copy"), book_id: id, accession: text(80).min(1), replacement_cost: makeOptionalMoney() }),
  z.object({ action: z.literal("archive"), id, archived: z.enum(["true", "false"]) }),
  z.object({ action: z.literal("copy_status"), id, status: z.enum(["available", "damaged", "lost", "withdrawn"]) }),
  z.object({ action: z.literal("issue"), copy_id: id, ...borrower, due_date: z.string().date() }),
  z.object({ action: z.literal("reserve"), book_id: id, ...borrower }),
  z.object({ action: z.literal("cancel_reservation"), id }),
  z.object({ action: z.literal("renew"), id }),
  z.object({ action: z.literal("return"), id, outcome: z.enum(["returned", "damaged", "lost"]) }),
  z.object({ action: z.literal("payment"), id, amount: money.positive() }),
  z.object({ action: z.literal("waive"), id, amount: money.positive(), reason: text(500).min(3) }),
  z.object({ action: z.literal("settings"), loan_days: z.coerce.number().int().min(1).max(90), max_loans: z.coerce.number().int().min(1).max(30), max_renewals: z.coerce.number().int().min(0).max(10), fine_per_day: money.max(10000) }),
  // ── New actions ───────────────────────────────────────────────────────────
  // Create a book title AND atomically generate N physical copies.
  z.object({ action: z.literal("add_book_with_copies"), ...book, quantity: z.coerce.number().int().min(1).max(50), replacement_cost: makeOptionalMoney() }),
  // Add more copies to an existing book without creating a duplicate title record.
  z.object({ action: z.literal("add_copies"), book_id: id, quantity: z.coerce.number().int().min(1).max(50), replacement_cost: makeOptionalMoney() }),
]);

export function libraryToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function libraryDueDate(days: number, today = libraryToday()) {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function overdueDays(due: string, today = libraryToday()) {
  return Math.max(0, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${due}T00:00:00Z`)) / 86400000));
}

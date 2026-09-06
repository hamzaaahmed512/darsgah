import { z } from "zod";

const id = z.string().uuid();
const text = (max: number) => z.string().trim().max(max);
const money = z.coerce.number().finite().min(0).max(1000000).multipleOf(0.01);
const book = { title: text(200).min(1), author: text(200).min(1), isbn: text(32), category: text(80), publisher: text(200), shelf: text(80) };
const borrower = { borrower_id: id, borrower_kind: z.enum(["student", "staff"]) };
export const libraryActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("book"), ...book }),
  z.object({ action: z.literal("edit_book"), id, ...book }),
  z.object({ action: z.literal("copy"), book_id: id, accession: text(80).min(1), replacement_cost: money }),
  z.object({ action: z.literal("archive"), id, archived: z.enum(["true", "false"]) }),
  z.object({ action: z.literal("copy_status"), id, status: z.enum(["available", "damaged", "lost", "withdrawn"]) }),
  z.object({ action: z.literal("issue"), copy_id: id, ...borrower, due_date: z.string().date() }),
  z.object({ action: z.literal("reserve"), book_id: id, ...borrower }),
  z.object({ action: z.literal("cancel_reservation"), id }),
  z.object({ action: z.literal("renew"), id }),
  z.object({ action: z.literal("return"), id, outcome: z.enum(["returned", "damaged", "lost"]) }),
  z.object({ action: z.literal("payment"), id, amount: money.positive() }),
  z.object({ action: z.literal("waive"), id, amount: money.positive(), reason: text(500).min(3) }),
  z.object({ action: z.literal("settings"), loan_days: z.coerce.number().int().min(1).max(90), max_loans: z.coerce.number().int().min(1).max(30), max_renewals: z.coerce.number().int().min(0).max(10), fine_per_day: money.max(10000) })
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

import { beforeEach, describe, expect, it, vi } from "vitest";
import * as server from "@/lib/supabase/server";
import { getAttendanceContext, submitAttendance } from "./attendance";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/services/activity", () => ({ logActivity: vi.fn() }));

const schoolId = "50000000-0000-0000-0000-000000000001";
const oldClassId = "60000000-0000-0000-0000-000000000001";
const newClassId = "60000000-0000-0000-0000-000000000002";
const studentId = "70000000-0000-0000-0000-000000000001";
const user = { id: "user1", schoolId, role: "principal", permissions: ["attendance:view"] } as any;

beforeEach(() => vi.clearAllMocks());

describe("historical attendance register", () => {
  it("shows a promoted student in the old class on an effective past date", async () => {
    const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
    const rows: Record<string, any[]> = {
      classes: [
        { id: oldClassId, name: "Grade 9 A", head_teacher_id: "teacher1", grades: { name: "Grade 9" }, sections: { name: "A" }, academic_years: { name: "2025-26" } },
        { id: newClassId, name: "Grade 10 A", head_teacher_id: "teacher2", grades: { name: "Grade 10" }, sections: { name: "A" }, academic_years: { name: "2026-27" } }
      ],
      enrollments: [
        { id: "old-enrollment", class_id: oldClassId, student_id: studentId, status: "completed", starts_on: "2025-04-01", ends_on: "2026-09-29", students: { id: studentId, first_name: "Ayesha", last_name: "Khan", admission_number: "2025-01" } },
        { id: "new-enrollment", class_id: newClassId, student_id: studentId, status: "active", starts_on: "2026-09-29", ends_on: null, students: { id: studentId, first_name: "Ayesha", last_name: "Khan", admission_number: "2025-01" } }
      ],
      attendance_records: [{ student_id: studentId, class_id: oldClassId, attendance_date: "2026-03-15", status: "present", note: null }]
    };
    (server.createClient as any).mockResolvedValue({
      from(table: string) {
        const predicates: Array<(row: any) => boolean> = [];
        const query: any = {
          select() { return query; },
          eq(key: string, value: unknown) { calls.push({ table, method: "eq", args: [key, value] }); predicates.push((row) => key === "school_id" || row[key] === value); return query; },
          lte(key: string, value: string) { calls.push({ table, method: "lte", args: [key, value] }); predicates.push((row) => row[key] <= value); return query; },
          or(value: string) { calls.push({ table, method: "or", args: [value] }); const date = value.slice("ends_on.is.null,ends_on.gte.".length); predicates.push((row) => row.ends_on === null || row.ends_on >= date); return query; },
          order() { return query; },
          maybeSingle() { return Promise.resolve({ data: null, error: null }); },
          then(resolve: (value: any) => void) { resolve({ data: (rows[table] ?? []).filter((row) => predicates.every((predicate) => predicate(row))), error: null }); }
        };
        return query;
      }
    });

    const context = await getAttendanceContext(user, oldClassId, "2026-03-15");
    expect(context.roster).toMatchObject([{ enrollment_id: "old-enrollment", student_id: studentId, current_status: "present" }]);
    expect(calls).toContainEqual({ table: "enrollments", method: "lte", args: ["starts_on", "2026-03-15"] });
    expect(calls).not.toContainEqual({ table: "enrollments", method: "eq", args: ["status", "active"] });
  });

  it("reports a duplicate submission from the atomic RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: { code: "23505", message: "duplicate key" } });
    (server.createClient as any).mockResolvedValue({ rpc });
    await expect(submitAttendance(user, {
      class_id: oldClassId,
      attendance_date: "2026-03-15",
      records: [{ student_id: studentId, status: "present" }]
    })).rejects.toThrow("Attendance already marked for today.");
  });
});

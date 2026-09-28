import { describe, expect, it, vi } from "vitest";
import { getPrintableResultCards } from "./marks";

const schoolId = "10000000-0000-4000-8000-000000000001";
const studentId = "10000000-0000-4000-8000-000000000002";
const oldClassId = "10000000-0000-4000-8000-000000000003";
const newClassId = "10000000-0000-4000-8000-000000000004";
const oldSessionId = "10000000-0000-4000-8000-000000000005";
const newSessionId = "10000000-0000-4000-8000-000000000006";
const biologyId = "10000000-0000-4000-8000-000000000007";
const computerId = "10000000-0000-4000-8000-000000000008";
const oldExamId = "10000000-0000-4000-8000-000000000009";
const newExamId = "10000000-0000-4000-8000-000000000010";

const store: Record<string, any[]> = {};
const queryFor = (table: string) => {
  const filters: Array<(row: any) => boolean> = [];
  const query: any = {
    select() { return query; },
    eq(key: string, value: unknown) { filters.push((row) => row[key] === value); return query; },
    in(key: string, values: unknown[]) { filters.push((row) => values.includes(row[key])); return query; },
    order() { return query; },
    maybeSingle() { return Promise.resolve({ data: (store[table] ?? []).find((row) => filters.every((f) => f(row))) ?? null, error: null }); },
    then(resolve: (value: any) => void) { resolve({ data: (store[table] ?? []).filter((row) => filters.every((f) => f(row))), error: null }); }
  };
  return query;
};
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: queryFor }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: queryFor }) }));

describe("promoted custom-combination result cards", () => {
  it("keeps both sessions' subject rows and totals after a later mapping edit", async () => {
    const student = { id: studentId, first_name: "Ayesha", last_name: "Khan", admission_number: "2025-01" };
    store.classes = [
      { id: oldClassId, school_id: schoolId, academic_year_id: oldSessionId, name: "9 A", grades: { name: "Grade 9" }, sections: { name: "A" }, academic_years: { name: "2025-26", is_active: false } },
      { id: newClassId, school_id: schoolId, academic_year_id: newSessionId, name: "10 A", grades: { name: "Grade 10" }, sections: { name: "A" }, academic_years: { name: "2026-27", is_active: true } }
    ];
    store.school_settings = [{ school_id: schoolId, settings: {} }];
    store.enrollments = [
      { school_id: schoolId, student_id: studentId, class_id: oldClassId, status: "completed", roll_no: "9", students: student },
      { school_id: schoolId, student_id: studentId, class_id: newClassId, status: "active", roll_no: "5", students: student }
    ];
    store.exams = [
      { id: oldExamId, school_id: schoolId, class_id: oldClassId, subject_id: biologyId, title: "1st Term", exam_type: "first_term", exam_date: "2026-02-15", month: null, max_marks: 100, status: "approved", approval_status: "approved", subjects: { id: biologyId, name: "Biology" }, result_approvals: [] },
      { id: newExamId, school_id: schoolId, class_id: newClassId, subject_id: biologyId, title: "1st Term", exam_type: "first_term", exam_date: "2026-08-15", month: null, max_marks: 100, status: "approved", approval_status: "approved", subjects: { id: biologyId, name: "Biology" }, result_approvals: [] }
    ];
    store.marks = [
      { school_id: schoolId, student_id: studentId, exam_id: oldExamId, marks_obtained: 80, is_absent: false, grade: "A", exams: { id: oldExamId } },
      { school_id: schoolId, student_id: studentId, exam_id: newExamId, marks_obtained: 85, is_absent: false, grade: "A", exams: { id: newExamId } }
    ];
    store.student_subject_enrollments = [
      { school_id: schoolId, class_id: oldClassId, student_id: studentId, subject_id: biologyId, enrolled_at: "2025-04-01T00:00:00Z", subjects: { id: biologyId, name: "Biology" } },
      { school_id: schoolId, class_id: newClassId, student_id: studentId, subject_id: biologyId, enrolled_at: "2026-04-01T00:00:00Z", subjects: { id: biologyId, name: "Biology" } }
    ];
    store.student_subject_enrollment_history = [];
    const user = { schoolId, role: "principal", permissions: ["results:generate"] } as any;
    const readCards = async () => Promise.all([
      getPrintableResultCards(user, { sessionId: oldSessionId, classId: oldClassId, examType: "first_term", studentId }),
      getPrintableResultCards(user, { sessionId: newSessionId, classId: newClassId, examType: "first_term", studentId })
    ]);

    const before = await readCards();
    store.student_subject_enrollments = [
      store.student_subject_enrollments[0],
      { school_id: schoolId, class_id: newClassId, student_id: studentId, subject_id: computerId, enrolled_at: "2026-10-01T00:00:00Z", subjects: { id: computerId, name: "Computer Science" } }
    ];
    store.student_subject_enrollment_history = [
      { school_id: schoolId, class_id: newClassId, student_id: studentId, subject_id: biologyId, valid_from: "2026-04-01T00:00:00Z", valid_to: "2026-10-01T00:00:00Z", subjects: { id: biologyId, name: "Biology" } }
    ];
    const after = await readCards();

    for (const pair of [before, after]) {
      expect(pair.map((result) => result.cards[0].rows.map((row) => row.subject_name))).toEqual([["Biology"], ["Biology"]]);
      expect(pair.map((result) => result.cards[0].percentage)).toEqual([80, 85]);
      expect(pair.map((result) => result.complete)).toEqual([true, true]);
    }
    expect(after.map((result) => result.cards)).toEqual(before.map((result) => result.cards));
  });
});

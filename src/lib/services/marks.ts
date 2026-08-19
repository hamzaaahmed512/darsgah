import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateGrade, defaultGradeScale, percentage, type GradeScale } from "@/lib/grades";
import { logActivity } from "@/lib/services/activity";
import type {
  AppUser,
  AssessmentCategory,
  ExamStatus,
  ExamType,
  ResultApprovalStatus,
  ResultWorkflowStatus
} from "@/types/database";
import { examSchema, markEntrySchema, specialExamTypes, type ExamFormValues, type MarkEntryValues } from "@/lib/validation/marks";

export const requiredResultExamTypes: ExamType[] = ["monthly", "first_term", "second_term", "third_term"];
export const regularAssessmentTypes: ExamType[] = ["quiz", "class_test", "assignment", "presentation", "lab", "viva", "attendance"];
export const majorAssessmentTypes: ExamType[] = requiredResultExamTypes;

const examTypeLabels: Record<ExamType, string> = {
  quiz: "Quiz",
  class_test: "Class Test",
  assignment: "Assignment",
  presentation: "Presentation",
  lab: "Lab",
  viva: "Viva",
  attendance: "Attendance",
  monthly: "Monthly Test",
  first_term: "1st Term",
  second_term: "2nd Term",
  third_term: "3rd Term",
  mid_term: "Mid Term",
  final_term: "Final Term",
  pre_board: "Pre-Board",
  annual_exam: "Annual Exam"
};

function isMissingCurrentExamWorkflow(error: { code?: string; message?: string } | null | undefined) {
  return Boolean(
    error &&
      (error.code === "42703" ||
        error.code === "22P02" ||
        error.message?.includes("exams.month") ||
        error.message?.includes("first_term") ||
        error.message?.includes("pending_approval"))
  );
}

function examWorkflowMigrationMessage() {
  return "Apply the latest Exams & Results database migrations to enable Monthly and Term workflows.";
}

export function formatWorkflowStatus(status: ResultWorkflowStatus) {
  const labels: Record<ResultWorkflowStatus, string> = {
    draft: "Draft",
    uploaded: "Uploaded",
    pending_approval: "Pending Approval",
    approved: "Approved",
    rejected: "Rejected"
  };
  return labels[status] ?? status;
}

export function formatExamType(type: ExamType) {
  return examTypeLabels[type] ?? type;
}

export function requiresApprovalForExamType(type: ExamType) {
  return (specialExamTypes as readonly string[]).includes(type);
}

export function getAssessmentCategory(type: ExamType, requiresApproval?: boolean): AssessmentCategory {
  return requiresApproval ?? requiresApprovalForExamType(type) ? "major" : "regular";
}

export function getWorkflowStatusFromExam(exam: any): ResultWorkflowStatus {
  if (exam.approval_status) return exam.approval_status as ResultWorkflowStatus;
  if (exam.status === "submitted") return "pending_approval";
  return exam.status as ResultWorkflowStatus;
}

export function getWorkflowStatusTone(status: ResultWorkflowStatus): "gray" | "blue" | "yellow" | "green" | "red" {
  if (status === "uploaded") return "blue";
  if (status === "pending_approval") return "yellow";
  if (status === "approved") return "green";
  if (status === "rejected") return "red";
  return "gray";
}

async function getGradeScale(user: AppUser): Promise<GradeScale[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grading_scales")
    .select("grade,min_percentage,max_percentage")
    .eq("school_id", user.schoolId)
    .order("sort_order");

  if (isMissingCurrentExamWorkflow(error)) throw new Error(examWorkflowMigrationMessage());
  if (error) throw new Error(error.message);
  return data?.length ? data.map((row: any) => ({ ...row, min_percentage: Number(row.min_percentage), max_percentage: Number(row.max_percentage) })) : defaultGradeScale;
}

async function assertTeacherCanUseSubject(user: AppUser, classId: string, subjectId: string) {
  if (user.role !== "teacher" && user.role !== "head_teacher") throw new Error("Only teachers can manage marks.");
  const supabase = await createClient();
  const assignment = await supabase
    .from("teacher_assignments")
    .select("id")
    .eq("school_id", user.schoolId)
    .eq("teacher_id", user.id)
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .maybeSingle();

  if (assignment.error) throw new Error(assignment.error.message);
  if (!assignment.data) throw new Error("You can enter marks only for subjects explicitly assigned to you.");
}

async function getEditableExam(user: AppUser, examId: string) {
  const supabase = await createClient();
  const { data: exam, error } = await supabase
    .from("exams")
    .select("*")
    .eq("school_id", user.schoolId)
    .eq("id", examId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!exam) throw new Error("Exam not found.");
  await assertTeacherCanUseSubject(user, exam.class_id, exam.subject_id);
  const canEdit = exam.requires_approval
    ? ["pending_approval", "rejected"].includes(exam.status)
    : ["draft", "approved"].includes(exam.status);
  if (!canEdit) {
    throw new Error("This exam is locked and cannot be edited.");
  }
  return exam as any;
}

export async function getTeacherMarksWorkspace(user: AppUser, filters: { classId?: string; subjectId?: string; examId?: string } = {}) {
  const supabase = await createClient();
  const assignments = await supabase
    .from("teacher_assignments")
    .select("class_id,subject_id,classes(id,name,room,grades(name),sections(name)),subjects(id,name,code)")
    .eq("school_id", user.schoolId)
    .eq("teacher_id", user.id)
    .not("subject_id", "is", null)
    .order("created_at", { ascending: false });

  if (assignments.error) throw new Error(assignments.error.message);

  const optionMap = new Map<string, any>();
  for (const row of assignments.data ?? []) {
    const item: any = row;
    if (!item.classes?.id || !item.subjects?.id) continue;
    optionMap.set(`${item.classes.id}:${item.subjects.id}`, {
      class_id: item.classes.id,
      class_name: item.classes.name,
      grade_name: item.classes.grades?.name,
      section_name: item.classes.sections?.name,
      subject_id: item.subjects.id,
      subject_name: item.subjects.name,
      is_head_teacher: user.role === "head_teacher"
    });
  }

  const options = [...optionMap.values()].sort((a, b) => `${a.class_name} ${a.subject_name}`.localeCompare(`${b.class_name} ${b.subject_name}`));
  const selected = options.find((item) => item.class_id === filters.classId && item.subject_id === filters.subjectId) ?? options[0];

  const exams = selected
    ? await supabase
        .from("exams")
        .select("*")
        .eq("school_id", user.schoolId)
        .eq("class_id", selected.class_id)
        .eq("subject_id", selected.subject_id)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (exams.error) throw new Error(exams.error.message);
  const selectedExam = (exams.data ?? []).find((exam: any) => exam.id === filters.examId) ?? exams.data?.[0] ?? null;

  const [roster, marks] = selected
    ? await Promise.all([
        supabase
          .from("student_subject_enrollments")
          .select("student_id,students(id,first_name,last_name,admission_number)")
          .eq("school_id", user.schoolId)
          .eq("class_id", selected.class_id)
          .eq("subject_id", selected.subject_id)
          .order("enrolled_at"),
        selectedExam
          ? supabase.from("marks").select("*").eq("school_id", user.schoolId).eq("exam_id", selectedExam.id)
          : Promise.resolve({ data: [], error: null })
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (roster.error) throw new Error(roster.error.message);
  if (marks.error) throw new Error(marks.error.message);

  const markMap = new Map((marks.data ?? []).map((mark: any) => [mark.student_id, mark]));

  return {
    options,
    selected,
    exams: (exams.data ?? []).map((exam: any) => ({
      ...exam,
      workflow_status: getWorkflowStatusFromExam(exam)
    })),
    selectedExam: selectedExam ? { ...selectedExam, workflow_status: getWorkflowStatusFromExam(selectedExam) } : null,
    roster: (roster.data ?? [])
      .map((row: any) => ({
        student_id: row.student_id,
        student_name: `${row.students?.first_name ?? ""} ${row.students?.last_name ?? ""}`.trim(),
        admission_number: row.students?.admission_number,
        mark: markMap.get(row.students?.id) ?? null
      }))
      .filter((row) => row.student_id)
      .sort((a, b) => a.student_name.localeCompare(b.student_name))
  };
}

export async function getTeacherResultHistory(user: AppUser) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exams")
    .select("id,exam_type,title,term,status,approval_status,uploaded_at,created_at,classes(name,grades(name),sections(name)),subjects(name)")
    .eq("school_id", user.schoolId)
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((exam: any) => ({
    ...exam,
    workflow_status: getWorkflowStatusFromExam(exam)
  }));
}

export async function createExam(user: AppUser, values: ExamFormValues) {
  const parsed = examSchema.parse(values);
  await assertTeacherCanUseSubject(user, parsed.class_id, parsed.subject_id);
  const supabase = await createClient();
  const requiresApproval = requiresApprovalForExamType(parsed.exam_type);
  const assessmentCategory = getAssessmentCategory(parsed.exam_type, requiresApproval);
  const initialStatus: ExamStatus = requiresApproval ? "pending_approval" : "draft";
  const queuedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("exams")
    .insert({
      ...parsed,
      requires_approval: requiresApproval,
      assessment_category: assessmentCategory,
      school_id: user.schoolId,
      created_by: user.id,
      is_special: requiresApproval,
      assigned_teacher_id: null,
      status: initialStatus,
      approval_status: requiresApproval ? "pending_approval" : "draft",
      submitted_at: requiresApproval ? queuedAt : null,
      uploaded_by_teacher_id: requiresApproval ? user.id : null,
      uploaded_by_teacher_name: requiresApproval ? user.fullName : null,
      uploaded_at: requiresApproval ? queuedAt : null
    })
    .select("id")
    .single();

  if (isMissingCurrentExamWorkflow(error)) throw new Error(examWorkflowMigrationMessage());
  if (error) throw new Error(error.message);
  if (requiresApproval) {
    const { error: approvalError } = await supabase.from("result_approvals").insert({
      school_id: user.schoolId,
      exam_id: data.id,
      submitted_by: user.id,
      status: "pending",
      submitted_at: queuedAt
    });
    if (approvalError) throw new Error(approvalError.message);
  }
  await logActivity(user, "exam_created", "exam", data.id, { exam_type: parsed.exam_type, title: parsed.title, requires_approval: requiresApproval });
  return data.id as string;
}

export async function saveMarks(user: AppUser, values: MarkEntryValues) {
  const parsed = markEntrySchema.parse(values);
  const exam = await getEditableExam(user, parsed.exam_id);
  const scale = await getGradeScale(user);
  const supabase = await createClient();

  const { data: enrolled, error: enrolledError } = await supabase
    .from("student_subject_enrollments")
    .select("student_id")
    .eq("school_id", user.schoolId)
    .eq("class_id", exam.class_id)
    .eq("subject_id", exam.subject_id)
    .in("student_id", parsed.records.map((record) => record.student_id));
  if (enrolledError) throw new Error(enrolledError.message);
  if ((enrolled ?? []).length !== parsed.records.length) throw new Error("Marks can be saved only for students enrolled in this subject.");

  for (const record of parsed.records) {
    if (record.marks_obtained > Number(exam.max_marks)) {
      throw new Error("Marks obtained cannot exceed max marks.");
    }
  }

  const regularAssessment = !exam.requires_approval;
  const markStatus = regularAssessment ? "approved" : "draft";
  const { error } = await supabase.from("marks").upsert(
    parsed.records.map((record) => ({
      school_id: user.schoolId,
      exam_id: exam.id,
      student_id: record.student_id,
      class_id: exam.class_id,
      subject_id: exam.subject_id,
      teacher_id: user.id,
      marks_obtained: record.marks_obtained,
      grade: calculateGrade(record.marks_obtained, Number(exam.max_marks), scale),
      status: markStatus,
      teacher_comment: record.teacher_comment || null
    })),
    { onConflict: "school_id,exam_id,student_id" }
  );

  if (error) throw new Error(error.message);

  if (regularAssessment) {
    const now = new Date().toISOString();
    const { error: examError } = await supabase
      .from("exams")
      .update({
        status: "approved",
        submitted_at: now,
        uploaded_by_teacher_id: user.id,
        uploaded_by_teacher_name: user.fullName,
        uploaded_at: now,
        approval_status: "approved",
        approved_at: now,
        finalized_at: now,
        approved_by_principal_id: null,
        approved_by_principal_name: null,
        rejection_reason: null
      })
      .eq("school_id", user.schoolId)
      .eq("id", exam.id);
    if (examError) throw new Error(examError.message);
  }

  await logActivity(user, "marks_saved", "exam", exam.id, { records: parsed.records.length });
}

export async function submitExamForApproval(user: AppUser, examId: string) {
  const exam = await getEditableExam(user, examId);
  if (!exam.requires_approval) throw new Error("This assessment does not require principal approval.");
  if (exam.status !== "rejected") throw new Error("This exam is already queued for Principal review.");
  const supabase = await createClient();

  const [roster, marks] = await Promise.all([
    supabase
      .from("student_subject_enrollments")
      .select("student_id")
      .eq("school_id", user.schoolId)
      .eq("class_id", exam.class_id)
      .eq("subject_id", exam.subject_id),
    supabase.from("marks").select("student_id").eq("school_id", user.schoolId).eq("exam_id", exam.id)
  ]);

  if (roster.error) throw new Error(roster.error.message);
  if (marks.error) throw new Error(marks.error.message);
  const marked = new Set((marks.data ?? []).map((row: any) => row.student_id));
  const missing = (roster.data ?? []).filter((row: any) => !marked.has(row.student_id));
  if (missing.length) throw new Error("All enrolled students must be marked before submitting for approval.");

  const now = new Date().toISOString();
  const { error: marksError } = await supabase.from("marks").update({ status: "draft" }).eq("school_id", user.schoolId).eq("exam_id", exam.id);
  if (marksError) throw new Error(marksError.message);

  const approvalPayload = {
    school_id: user.schoolId,
    exam_id: exam.id,
    submitted_by: user.id,
    status: "pending" as ResultApprovalStatus,
    principal_comment: null,
    reviewed_by: null,
    reviewed_at: null,
    submitted_at: now
  };

  const { data: existing, error: existingError } = await supabase.from("result_approvals").select("id,status").eq("school_id", user.schoolId).eq("exam_id", exam.id).maybeSingle();
  if (existingError) throw new Error(existingError.message);
  const approvalResult = existing
    ? await supabase.from("result_approvals").update(approvalPayload).eq("id", existing.id)
    : await supabase.from("result_approvals").insert(approvalPayload);

  if (approvalResult.error) throw new Error(approvalResult.error.message);

  const { error: examError } = await supabase
    .from("exams")
    .update({
      status: "pending_approval",
      submitted_at: now,
      uploaded_by_teacher_id: user.id,
      uploaded_by_teacher_name: user.fullName,
      uploaded_at: now,
      approval_status: "pending_approval",
      approved_by_principal_id: null,
      approved_by_principal_name: null,
      approved_at: null,
      rejection_reason: null,
      finalized_at: null
    })
    .eq("school_id", user.schoolId)
    .eq("id", exam.id);
  if (examError) throw new Error(examError.message);

  await logActivity(user, "exam_submitted_for_approval", "exam", exam.id, { exam_type: exam.exam_type, title: exam.title });
}

export async function getPrincipalExamApprovals(user: AppUser, status: ResultApprovalStatus | "all" = "pending") {
  const supabase = await createClient();
  let query = supabase
    .from("result_approvals")
    .select(
      "*,exams!inner(id,class_id,title,exam_type,assessment_category,requires_approval,term,exam_date,max_marks,status,approval_status,uploaded_by_teacher_id,uploaded_by_teacher_name,uploaded_at,approved_by_principal_id,approved_by_principal_name,approved_at,rejection_reason,classes(name,grades(name),sections(name)),subjects(name),creator:profiles!exams_created_by_fkey(id,full_name)),submitter:profiles!result_approvals_submitted_by_fkey(id,full_name),reviewer:profiles!result_approvals_reviewed_by_fkey(id,full_name)"
    )
    .eq("school_id", user.schoolId)
    .eq("exams.requires_approval", true)
    .order("submitted_at", { ascending: false });

  if (status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getExamResultsForReviewByApprovalId(user: AppUser, approvalId: string) {
  if (user.role !== "principal") throw new Error("Unauthorized to review exam results.");
  const supabase = await createClient();

  // 1. Get the approval and exam details
  const { data: approval, error: approvalError } = await supabase
    .from("result_approvals")
    .select(
      "*,exams!inner(id,title,exam_type,term,exam_date,max_marks,status,classes(name,grades(name),sections(name)),subjects(name),creator:profiles!exams_created_by_fkey(id,full_name)),submitter:profiles!result_approvals_submitted_by_fkey(id,full_name)"
    )
    .eq("school_id", user.schoolId)
    .eq("id", approvalId)
    .maybeSingle();

  if (approvalError) throw new Error(approvalError.message);
  if (!approval) throw new Error("Approval request not found.");

  // 2. Fetch all marks and student details for this exam
  const { data: marks, error: marksError } = await supabase
    .from("marks")
    .select("id,student_id,marks_obtained,grade,teacher_comment,status,students(first_name,last_name,admission_number)")
    .eq("school_id", user.schoolId)
    .eq("exam_id", approval.exam_id)
    .order("students(last_name)", { ascending: true });

  if (marksError) throw new Error(marksError.message);

  return {
    approval,
    exam: approval.exams,
    marks: marks ?? []
  };
}

export async function reviewExamApproval(user: AppUser, approvalId: string, decision: "approved" | "rejected", principalComment?: string | null) {
  if (user.role !== "principal") throw new Error("Only the principal can approve or reject results.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_special_exam", {
    p_approval_id: approvalId,
    p_decision: decision,
    p_comment: principalComment || null
  });
  if (error) throw new Error(error.message);
  await logActivity(user, `exam_${decision}`, "result_approval", approvalId, { principal_comment: principalComment || null });
}

export async function getResultCardsWorkspace(user: AppUser, filters: { classId?: string; examType?: ExamType; month?: number } = {}) {
  if (user.role !== "student_staff") throw new Error("Only the Registrar can generate result cards.");
  const supabase = await createClient();
  const examType = requiredResultExamTypes.includes(filters.examType as ExamType) ? filters.examType as ExamType : "monthly";
  const month = examType === "monthly" ? filters.month ?? new Date().getMonth() + 1 : undefined;
  const { data: classes, error: classError } = await supabase
    .from("classes")
    .select("id,name,grades(name),sections(name)")
    .eq("school_id", user.schoolId)
    .order("name");
  if (classError) throw new Error(classError.message);

  const selectedClassId = filters.classId ?? classes?.[0]?.id;
  const readiness = selectedClassId ? await getResultReadiness(user, selectedClassId, examType, month) : null;
  return { classes: classes ?? [], selectedClassId, examType, month, readiness };
}

export async function getResultsManagementWorkspace(user: AppUser, filters: { classId?: string; term?: string; status?: ResultWorkflowStatus | "all"; from?: string; to?: string } = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("exams")
    .select(
      "id,class_id,title,exam_type,assessment_category,requires_approval,term,status,approval_status,exam_date,uploaded_by_teacher_id,uploaded_by_teacher_name,uploaded_at,approved_by_principal_id,approved_by_principal_name,approved_at,rejection_reason,created_at,classes(name,grades(name),sections(name)),subjects(name),creator:profiles!exams_created_by_fkey(id,full_name),result_approvals(id,status,principal_comment,submitted_at,reviewed_at)"
    )
    .eq("school_id", user.schoolId)
    .order("created_at", { ascending: false });

  if (filters.classId) query = query.eq("class_id", filters.classId);
  if (filters.term) query = query.eq("term", filters.term);
  if (filters.status && filters.status !== "all") query = query.eq("approval_status", filters.status);
  if (filters.from) query = query.gte("exam_date", filters.from);
  if (filters.to) query = query.lte("exam_date", filters.to);

  if (user.role === "teacher") {
    query = query.eq("created_by", user.id);
  } else if (user.role === "student_staff") {
    query = query.eq("requires_approval", true).eq("approval_status", "approved");
  } else if (user.role === "principal") {
    query = query.eq("requires_approval", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => {
    const workflowStatus = getWorkflowStatusFromExam(row);
    const approval = Array.isArray(row.result_approvals) ? row.result_approvals[0] : row.result_approvals;
    return {
      ...row,
      workflowStatus,
      approvalId: approval?.id ?? null,
      uploadedByTeacherId: row.uploaded_by_teacher_id ?? row.creator?.id ?? null,
      uploadedByTeacherName: row.uploaded_by_teacher_name ?? row.creator?.full_name ?? "Teacher",
      canApprove: user.role === "principal" && row.requires_approval && workflowStatus === "pending_approval",
      canReject: user.role === "principal" && row.requires_approval && workflowStatus === "pending_approval",
      canPrint:
        user.role === "student_staff" &&
        row.requires_approval &&
        workflowStatus === "approved" &&
        requiredResultExamTypes.includes(row.exam_type)
    };
  });
}

export async function getExamResultDetail(user: AppUser, examId: string) {
  const supabase = await createClient();
  const { data: exam, error } = await supabase
    .from("exams")
    .select(
      "*,classes(name,grades(name),sections(name)),subjects(name),creator:profiles!exams_created_by_fkey(id,full_name),result_approvals(id,status,principal_comment,submitted_at,reviewed_at,reviewer:profiles!result_approvals_reviewed_by_fkey(id,full_name))"
    )
    .eq("school_id", user.schoolId)
    .eq("id", examId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!exam) throw new Error("Result not found.");

  if (user.role === "teacher" && exam.created_by !== user.id) {
    throw new Error("You can view only your own uploaded results.");
  }
  if (user.role === "student_staff" && (!exam.requires_approval || exam.approval_status !== "approved")) {
    throw new Error("The registrar can view only approved major examination results.");
  }

  const { data: marks, error: marksError } = await supabase
    .from("marks")
    .select("marks_obtained,grade,teacher_comment,students(id,first_name,last_name,admission_number)")
    .eq("school_id", user.schoolId)
    .eq("exam_id", examId)
    .order("created_at");

  if (marksError) throw new Error(marksError.message);

  const workflowStatus = getWorkflowStatusFromExam(exam);
  const approval = Array.isArray(exam.result_approvals) ? exam.result_approvals[0] : exam.result_approvals;

  return {
    exam: { ...exam, workflowStatus },
    approval,
    marks: (marks ?? []).map((row: any) => ({
      student_name: `${row.students?.first_name ?? ""} ${row.students?.last_name ?? ""}`.trim(),
      admission_number: row.students?.admission_number,
      marks_obtained: Number(row.marks_obtained),
      grade: row.grade,
      teacher_comment: row.teacher_comment
    })),
    canApprove: user.role === "principal" && exam.requires_approval && workflowStatus === "pending_approval",
    canReject: user.role === "principal" && exam.requires_approval && workflowStatus === "pending_approval",
    canPrint:
      user.role === "student_staff" &&
      exam.requires_approval &&
      workflowStatus === "approved" &&
      requiredResultExamTypes.includes(exam.exam_type)
  };
}

async function getResultReadiness(user: AppUser, classId: string, examType: ExamType, month?: number) {
  const supabase = await createClient();
  let examsQuery = supabase
    .from("exams")
    .select("id,subject_id,exam_type,status,approval_status,month")
    .eq("school_id", user.schoolId)
    .eq("class_id", classId)
    .eq("exam_type", examType)
    .eq("status", "approved")
    .eq("approval_status", "approved");
  if (examType === "monthly") examsQuery = examsQuery.eq("month", month ?? 0);

  const [subjects, exams, students] = await Promise.all([
    supabase
      .from("student_subject_enrollments")
      .select("subject_id,subjects(id,name)")
      .eq("school_id", user.schoolId)
      .eq("class_id", classId),
    examsQuery,
    supabase
      .from("enrollments")
      .select("students(id,first_name,last_name,admission_number)")
      .eq("school_id", user.schoolId)
      .eq("class_id", classId)
      .eq("status", "active")
      .order("created_at")
  ]);

  if (subjects.error) throw new Error(subjects.error.message);
  if (isMissingCurrentExamWorkflow(exams.error)) {
    return {
      complete: false,
      missing: [examWorkflowMigrationMessage()],
      examType,
      month,
      students: (students.data ?? [])
        .map((row: any) => ({
          id: row.students?.id,
          name: `${row.students?.first_name ?? ""} ${row.students?.last_name ?? ""}`.trim(),
          admission_number: row.students?.admission_number
        }))
        .filter((row) => row.id),
      migrationRequired: true
    };
  }
  if (exams.error) throw new Error(exams.error.message);
  if (students.error) throw new Error(students.error.message);

  const subjectMap = new Map<string, string>();
  for (const row of subjects.data ?? []) {
    const item: any = row;
    if (item.subjects?.id) subjectMap.set(item.subjects.id, item.subjects.name);
  }

  const approvedSubjects = new Set((exams.data ?? []).map((exam: any) => exam.subject_id));
  const missing: string[] = [];
  for (const [subjectId, subjectName] of subjectMap.entries()) {
    if (!approvedSubjects.has(subjectId)) missing.push(`${subjectName} ${formatExamType(examType)}`);
  }

  return {
    complete: subjectMap.size > 0 && missing.length === 0,
    missing,
    examType,
    month,
    students: (students.data ?? [])
      .map((row: any) => ({
        id: row.students?.id,
        name: `${row.students?.first_name ?? ""} ${row.students?.last_name ?? ""}`.trim(),
        admission_number: row.students?.admission_number
      }))
      .filter((row) => row.id)
  };
}

export async function getPrintableResultCards(user: AppUser, filters: { classId: string; examType: ExamType; month?: number; studentId?: string }) {
  if (user.role !== "student_staff") throw new Error("Only the registrar can print official result cards.");
  if (!requiredResultExamTypes.includes(filters.examType)) throw new Error("Result cards are limited to the four approved exam types.");
  if (filters.examType === "monthly" && (!filters.month || filters.month < 1 || filters.month > 12)) throw new Error("Choose a valid month.");
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const readiness = await getResultReadiness(user, filters.classId, filters.examType, filters.month);
  const [classResult, settingsResult] = await Promise.all([
    supabase.from("classes").select("id,name,grades(name),sections(name),academic_years(name)").eq("school_id", user.schoolId).eq("id", filters.classId).maybeSingle(),
    adminClient.from("school_settings").select("settings").eq("school_id", user.schoolId).maybeSingle()
  ]);
  const { data: classRow, error: classError } = classResult;
  if (classError) throw new Error(classError.message);
  if (!classRow) throw new Error("Class not found.");

  if (settingsResult.error) throw new Error(settingsResult.error.message);
  const schoolSettings = (settingsResult.data?.settings ?? {}) as Record<string, any>;
  const rawTemplate = schoolSettings.resultCardTemplate ?? {};
  const template = {
    title: typeof rawTemplate.title === "string" && rawTemplate.title.trim() ? rawTemplate.title.trim().slice(0, 80) : "Result Card",
    accentColor: typeof rawTemplate.accentColor === "string" && /^#[0-9a-f]{6}$/i.test(rawTemplate.accentColor) ? rawTemplate.accentColor : "#2563eb",
    layout: rawTemplate.layout === "compact" ? "compact" as const : "standard" as const,
    showAcademicYear: rawTemplate.showAcademicYear !== false,
    showAdmissionNumber: rawTemplate.showAdmissionNumber !== false,
    showTeacherComments: rawTemplate.showTeacherComments === true,
    signatureLabels: Array.isArray(rawTemplate.signatureLabels)
      ? rawTemplate.signatureLabels.filter((item: unknown) => typeof item === "string" && item.trim()).slice(0, 3)
      : ["Class Teacher", "Principal"]
  };
  const branding = { logoUrl: typeof schoolSettings.schoolLogoUrl === "string" ? schoolSettings.schoolLogoUrl : "" };

  if (!readiness.complete) return { complete: false, missing: readiness.missing, classRow, cards: [], template, branding };

  let studentsQuery = supabase
    .from("enrollments")
    .select("students(id,first_name,last_name,admission_number)")
    .eq("school_id", user.schoolId)
    .eq("class_id", filters.classId)
    .eq("status", "active")
    .order("created_at");

  if (filters.studentId) studentsQuery = studentsQuery.eq("student_id", filters.studentId);

  let marksQuery = supabase
    .from("marks")
    .select("student_id,marks_obtained,grade,teacher_comment,exams!inner(id,title,exam_type,month,max_marks,status,subjects(name),requires_approval,approval_status)")
    .eq("school_id", user.schoolId)
    .eq("class_id", filters.classId)
    .eq("exams.exam_type", filters.examType)
    .eq("exams.status", "approved")
    .eq("exams.requires_approval", true)
    .eq("exams.approval_status", "approved")
    .order("student_id");
  let examsQuery = supabase.from("exams")
    .select("id,subject_id,title,exam_type,month,max_marks")
    .eq("school_id", user.schoolId)
    .eq("class_id", filters.classId)
    .eq("exam_type", filters.examType)
    .eq("status", "approved")
    .eq("requires_approval", true)
    .eq("approval_status", "approved");
  if (filters.examType === "monthly") {
    marksQuery = marksQuery.eq("exams.month", filters.month ?? 0);
    examsQuery = examsQuery.eq("month", filters.month ?? 0);
  }

  const [students, marks, subjectEnrollments, approvedExams] = await Promise.all([
    studentsQuery,
    marksQuery,
    supabase
      .from("student_subject_enrollments")
      .select("student_id,subject_id,subjects(name)")
      .eq("school_id", user.schoolId)
      .eq("class_id", filters.classId),
    examsQuery
  ]);

  if (students.error) throw new Error(students.error.message);
  if (marks.error) throw new Error(marks.error.message);
  if (subjectEnrollments.error) throw new Error(subjectEnrollments.error.message);
  if (approvedExams.error) throw new Error(approvedExams.error.message);

  const marksByStudent = new Map<string, any[]>();
  for (const mark of marks.data ?? []) {
    const item: any = mark;
    const list = marksByStudent.get(item.student_id) ?? [];
    list.push(item);
    marksByStudent.set(item.student_id, list);
  }

  const cards = (students.data ?? []).map((row: any) => {
    const student = row.students;
    const marksForStudent = marksByStudent.get(student?.id) ?? [];
    const enrolledSubjects = (subjectEnrollments.data ?? []).filter((item: any) => item.student_id === student?.id);
    const rows = enrolledSubjects.flatMap((enrollment: any) => (approvedExams.data ?? []).filter((exam: any) => exam.subject_id === enrollment.subject_id).map((exam: any) => {
      const mark = marksForStudent.find((item: any) => item.exams?.id === exam.id);
      return { subject_name: enrollment.subjects?.name, exam_title: exam.title, exam_type: exam.exam_type as ExamType, marks_obtained: mark ? Number(mark.marks_obtained) : null, max_marks: Number(exam.max_marks), grade: mark?.grade ?? "Pending", teacher_comment: mark?.teacher_comment ?? null };
    }));
    const completedRows = rows.filter((item) => item.marks_obtained !== null);
    const totalObtained = completedRows.reduce((sum, item) => sum + Number(item.marks_obtained), 0);
    const totalMax = completedRows.reduce((sum, item) => sum + Number(item.max_marks ?? 0), 0);
    return {
      student: {
        id: student?.id,
        name: `${student?.first_name ?? ""} ${student?.last_name ?? ""}`.trim(),
        admission_number: student?.admission_number
      },
      rows,
      totalObtained,
      totalMax,
      percentage: percentage(totalObtained, totalMax),
      overallGrade: calculateGrade(totalObtained, totalMax)
    };
  });

  return { complete: true, missing: [], classRow, cards, template, branding };
}

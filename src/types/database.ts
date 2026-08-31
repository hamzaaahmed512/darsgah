export type UserRole = "principal" | "teacher" | "student_staff" | "administrator" | "cashier" | "staff" | "head_teacher";
export type StudentStatus =
  | "active"
  | "graduated"
  | "transferred"
  | "archived"
  | "cancelled"
  | "pending_approval"
  | "pending_cancellation";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export type ApprovalRequestType = "admission" | "cancellation";
export type ApprovalRequestStatus = "pending" | "approved" | "denied";
export type ExamType =
  | "quiz"
  | "class_test"
  | "assignment"
  | "presentation"
  | "lab"
  | "viva"
  | "attendance"
  | "monthly"
  | "first_term"
  | "second_term"
  | "third_term"
  | "mid_term"
  | "final_term"
  | "pre_board"
  | "annual_exam";
export type ExamStatus = "draft" | "pending_approval" | "approved" | "rejected";
export type MarkStatus = "draft" | "submitted" | "approved" | "rejected";
export type ResultApprovalStatus = "pending" | "approved" | "rejected";
export type AssessmentCategory = "regular" | "major";
export type ResultWorkflowStatus = "draft" | "uploaded" | "pending_approval" | "approved" | "rejected";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
};

export type SchoolMember = {
  id: string;
  school_id: string;
  user_id: string;
  role: UserRole;
  status: "active" | "invited" | "disabled";
  department: string | null;
  job_title: string | null;
  custom_role_id: string | null;
};

export type CustomRole = {
  id: string;
  school_id: string;
  name: string;
  base_role: UserRole;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type UserPermissionOverride = {
  id: string;
  school_id: string;
  user_id: string;
  permission: string;
  granted: boolean;
  created_at: string;
  updated_at: string;
};

export type RolePermission = {
  id: string;
  school_id: string;
  role_key: string;
  permission: string;
  granted: boolean;
  created_at: string;
};

export type AppUser = {
  id: string;
  email: string | null;
  fullName: string;
  avatarUrl: string | null;
  schoolId: string;
  schoolName: string;
  schoolShortName?: string | null;
  schoolFullName?: string | null;
  role: UserRole;
  department: string | null;
  jobTitle: string | null;
  mustChangePassword: boolean;
  /** Resolved permission list (base role + custom role + overrides). Null means "use static defaults". */
  permissions: string[] | null;
  customRoleId: string | null;
  /** Branding is loaded with the session when the optimized database RPC is installed. */
  schoolLogoUrl?: string | null;
  schoolFaviconUrl?: string | null;
};

export type Student = {
  id: string;
  school_id: string;
  admission_number: string;
  student_cnic?: string | null;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  date_of_birth: string;
  gender: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  admission_date: string;
  status: StudentStatus;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentListRow = Student & {
  grade_name: string | null;
  class_name: string | null;
  section_name: string | null;
  guardian_name: string | null;
  attendance_rate: number | null;
};

export type ClassRow = {
  id: string;
  school_id: string;
  name: string;
  grade_name: string;
  section_name: string | null;
  academic_year_name: string;
  room: string | null;
  head_teacher_id: string | null;
  head_teacher_name?: string | null;
  head_teacher_email?: string | null;
  student_count?: number;
};

export type AttendanceRosterRow = {
  enrollment_id: string;
  student_id: string;
  student_name: string;
  admission_number: string;
  current_status: AttendanceStatus | null;
  note: string | null;
};

export type ApprovalRequest = {
  id: string;
  school_id: string;
  request_type: ApprovalRequestType;
  student_id: string;
  submitted_by: string;
  reviewed_by: string | null;
  status: ApprovalRequestStatus;
  denial_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
  // Joined fields
  student_first_name?: string | null;
  student_last_name?: string | null;
  student_admission_number?: string | null;
  submitted_by_name?: string | null;
  reviewed_by_name?: string | null;
  class_name?: string | null;
  grade_name?: string | null;
};

export type Exam = {
  id: string;
  school_id: string;
  class_id: string;
  subject_id: string;
  exam_type: ExamType;
  assessment_category: AssessmentCategory;
  requires_approval: boolean;
  title: string;
  term: string;
  exam_date: string;
  max_marks: number;
  created_by: string;
  uploaded_by_teacher_id: string | null;
  uploaded_by_teacher_name: string | null;
  uploaded_at: string | null;
  approval_status: ResultWorkflowStatus;
  approved_by_principal_id: string | null;
  approved_by_principal_name: string | null;
  approved_at: string | null;
  approved_by: string | null;
  month: number | null;
  rejection_reason: string | null;
  is_special: boolean;
  assigned_teacher_id: string | null;
  status: ExamStatus;
  submitted_at: string | null;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Mark = {
  id: string;
  school_id: string;
  exam_id: string;
  student_id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  marks_obtained: number;
  grade: string;
  status: MarkStatus;
  teacher_comment: string | null;
  created_at: string;
  updated_at: string;
};

export type ResultApproval = {
  id: string;
  school_id: string;
  exam_id: string;
  submitted_by: string;
  reviewed_by: string | null;
  status: ResultApprovalStatus;
  principal_comment: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Payroll & Salary Types ───────────────────────────────────────────────────

export type EmploymentStatus = "active" | "inactive" | "archived";
export type PaymentMethod = "cash" | "bank_transfer" | "cheque";
export type SalaryActionType = "initial" | "increase" | "decrease";
export type AdjustmentType = "bonus" | "deduction";
export type PayrollStatus = "generated" | "paid";

export type TeacherEmploymentDetails = {
  teacher_id: string;
  school_id: string;
  designation: string | null;
  department: string | null;
  joining_date: string;
  monthly_salary: number;
  payment_method: PaymentMethod;
  salary_start_date: string;
  employment_status: EmploymentStatus;
  created_at: string;
  updated_at: string;
};

export type SalaryHistory = {
  id: string;
  school_id: string;
  teacher_id: string;
  previous_salary: number;
  new_salary: number;
  action_type: SalaryActionType;
  effective_date: string;
  approved_by: string | null;
  remarks: string | null;
  created_at: string;
};

export type SalaryAdjustment = {
  id: string;
  school_id: string;
  teacher_id: string;
  amount: number;
  type: AdjustmentType;
  reason: string;
  effective_date: string;
  approved_by: string | null;
  created_at: string;
};

export type Payroll = {
  id: string;
  school_id: string;
  teacher_id: string;
  month: string;
  base_salary: number;
  total_bonus: number;
  total_deductions: number;
  net_salary: number;
  status: PayrollStatus;
  payment_date: string | null;
  approved_by: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
};

export type PayrollRow = Payroll & {
  teacher_name?: string | null;
  teacher_email?: string | null;
};

export type StaffLeaveStatus = "pending" | "approved" | "rejected";
export type StaffLeaveType = "casual" | "medical" | "annual" | "unpaid" | "other";

export type StaffLeave = {
  id: string;
  school_id: string;
  user_id: string;
  leave_type: StaffLeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  status: StaffLeaveStatus;
  is_paid_leave: boolean;
  principal_remarks: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  applicant_name?: string | null;
  reviewed_by_name?: string | null;
};

export type TransportRoute = {
  id: string;
  school_id: string;
  name: string;
  start_point: string;
  end_point: string;
  monthly_fare: number;
};

export type TransportDriver = {
  id: string;
  school_id: string;
  full_name: string;
  phone: string;
  license_number: string;
  status: "active" | "inactive";
};

export type TransportVehicle = {
  id: string;
  school_id: string;
  plate_number: string;
  seat_capacity: number;
  driver_id: string | null;
  route_id: string | null;
  status: "active" | "maintenance" | "inactive";
  driver_name?: string | null;
  driver_phone?: string | null;
  route_name?: string | null;
  start_point?: string | null;
  end_point?: string | null;
  monthly_fare?: number | null;
  passenger_count?: number;
};

// ─── Announcement Types ───────────────────────────────────────────────────────

export type AnnouncementPriority = "low" | "medium" | "high" | "critical";
export type AnnouncementType = "general" | "academic" | "holiday" | "emergency" | "meeting" | "examination" | "urgent";
export type AnnouncementAudienceType = "all" | "teachers" | "registrar" | "admin" | "class" | "department" | "roles";

export type Announcement = {
  id: string;
  school_id: string;
  title: string;
  description: string;
  priority: AnnouncementPriority;
  type: AnnouncementType;
  audience_type: AnnouncementAudienceType;
  audience_value: string | null;
  publish_date: string;
  expiry_date: string | null;
  attachment_url: string | null;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type AnnouncementRead = {
  id: string;
  school_id: string;
  announcement_id: string;
  user_id: string;
  read_at: string;
};

export type AnnouncementWithRead = Announcement & {
  is_read?: boolean;
  created_by_name?: string | null;
};

export type PendingAttendanceClass = {
  id: string;
  name: string;
  room: string | null;
  grade_name: string | null;
  section_name: string | null;
  head_teacher_id: string | null;
  head_teacher_name: string | null;
  head_teacher_email: string | null;
  head_teacher_phone: string | null;
};

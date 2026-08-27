import { z } from "zod";

export const attendanceStatusSchema = z.enum(["present", "absent", "late", "excused"]);

export const attendanceSubmissionSchema = z.object({
  class_id: z.string().uuid(),
  attendance_date: z.string().date(),
  records: z
    .array(
      z.object({
        student_id: z.string().uuid(),
        status: attendanceStatusSchema,
        note: z.string().trim().max(240).optional().nullable()
      })
    )
    .min(1, "At least one attendance record is required")
});

export type AttendanceSubmission = z.infer<typeof attendanceSubmissionSchema>;

export const teacherAttendanceSubmissionSchema = z.object({
  attendance_date: z.string().date(),
  records: z
    .array(
      z.object({
        teacher_id: z.string().uuid(),
        status: attendanceStatusSchema,
        note: z.string().trim().max(240).optional().nullable()
      })
    )
    .min(1, "At least one teacher attendance record is required")
});

export type TeacherAttendanceSubmission = z.infer<typeof teacherAttendanceSubmissionSchema>;

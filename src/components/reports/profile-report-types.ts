export interface ReportSchool {
  name?: string | null;
  subtitle?: string | null;
  address?: string | null;
  logoUrl?: string | null;
}

interface ProfileReportData {
  fullName: string;
  status: string;
  school?: ReportSchool;
  /** Percentage from 0 to 100; null means no recorded attendance. */
  attendanceRate?: number | null;
  attendanceNote?: string;
}

export interface StaffReportData extends ProfileReportData {
  staffId: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  joiningDate?: string | null;
  /** Omit restricted values on the server, before crossing the client boundary. */
  monthlyPay?: number | null;
  payRestricted?: boolean;
  daysPresent?: number | null;
}

export interface StudentReportData extends ProfileReportData {
  admissionId: string;
  rollNumber?: string | null;
  classSection: string;
  guardianName?: string | null;
  phone?: string | null;
  address?: string | null;
  feeStatus?: string | null;
  feesRestricted?: boolean;
}

export type DownloadReportButtonProps = (
  | { type: "staff"; data: StaffReportData }
  | { type: "student"; data: StudentReportData }
) & { className?: string };

export interface PDFRenderOptions {
  /** ISO timestamp captured when the user requests the report. */
  generatedAt: string;
  /** A validated PNG/JPEG data URL; the download button resolves remote logos. */
  logoDataUrl?: string | null;
}

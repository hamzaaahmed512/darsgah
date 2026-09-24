import { ProfileReportLayout } from "./ProfileReportLayout";
import { reportDate, reportMoney, reportRate, reportText } from "./profile-report-format";
import type { PDFRenderOptions, StaffReportData } from "./profile-report-types";

export function StaffReportPDF({ data, ...options }: { data: StaffReportData } & PDFRenderOptions) {
  return <ProfileReportLayout {...options} type="STAFF REPORT" school={data.school} fullName={data.fullName} status={data.status} primaryRole={data.role}
    metrics={[
      { label: "Monthly pay", value: data.payRestricted ? "Restricted" : reportMoney(data.monthlyPay), note: "Base monthly compensation" },
      { label: "Attendance rate", value: reportRate(data.attendanceRate), note: data.attendanceNote || "Present and late / recorded days" },
      { label: "Days present", value: data.daysPresent == null ? "No records" : String(data.daysPresent), note: "Excludes late arrivals" }
    ]}
    details={[
      ["Staff ID", reportText(data.staffId)], ["Email", reportText(data.email)],
      ["Phone", reportText(data.phone)], ["Role", reportText(data.role)],
      ["Department", reportText(data.department)], ["Joining date", reportDate(data.joiningDate)]
    ]}
  />;
}

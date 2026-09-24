import { ProfileReportLayout } from "./ProfileReportLayout";
import { reportRate, reportText } from "./profile-report-format";
import type { PDFRenderOptions, StudentReportData } from "./profile-report-types";

export function StudentReportPDF({ data, ...options }: { data: StudentReportData } & PDFRenderOptions) {
  return <ProfileReportLayout {...options} type="STUDENT REPORT" school={data.school} fullName={data.fullName} status={data.status} primaryRole={data.classSection}
    metrics={[
      { label: "Fee status", value: data.feesRestricted ? "Restricted" : reportText(data.feeStatus, "No records"), note: "Recorded fee accounts" },
      { label: "Attendance rate", value: reportRate(data.attendanceRate), note: data.attendanceNote || "Present and late / recorded days" },
      { label: "Class assignment", value: reportText(data.classSection, "Unassigned"), note: "Current grade and section" }
    ]}
    details={[
      ["Admission ID", reportText(data.admissionId)], ["Roll number", reportText(data.rollNumber)],
      ["Class & section", reportText(data.classSection, "Unassigned")], ["Parent / guardian", reportText(data.guardianName)],
      ["Phone", reportText(data.phone)], ["Address", reportText(data.address)]
    ]}
  />;
}

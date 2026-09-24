# Individual profile PDF reports

## Shared template across the app

All app PDF export controls now use the same vector branding and layout:
staff/student profiles, staff/student/class directories, student/teacher attendance,
fee challans, filtered fee-account reports, payment receipts, result cards, and
the results register's legacy print link. The Reports catalog's `print=1` links
open the vector export dialog. Preview/Print opens the generated PDF, rather than
printing the application UI. CSV exports are unaffected.

`ReportBrandingProvider` supplies the authenticated school's name/logo (including
legacy branding settings) from the protected layout. `ReportHeader`, `ReportFooter`,
and `ReportMetrics` in `ProfileReportLayout.tsx` are shared by individual profiles
and `ReportTemplatePDF.tsx`. Update those primitives to change every PDF.

For new exports, use `<ReportExport data={report} />` with `ReportTemplateData`.
Each section contains a title, optional subtitle/status/three metrics, key-value
details, table headers/rows, notes, and signature labels. Each section starts a
fresh page; tables continue onto additional A4 pages with repeated headers and
page numbers. Long table cells continue in additional rows without dropping text.
Result cards retain approval notices, optional admission/year/comments, and
configured signatures; their former decorative theme is replaced by this shared
minimal template. The older jsPDF dependencies and application-page print helpers
have been removed.

```tsx
import { ReportExport } from "@/components/reports/ReportExport";

<ReportExport data={{
  title: "Attendance Report",
  sections: [{
    title: "Daily Attendance",
    subtitle: "Grade 9 / Section A",
    headers: ["Student", "Admission ID", "Status"],
    rows: [["Ali Khan", "ADM-123", "Present"]]
  }]
}} />
```

`DownloadReportButton` is integrated into `/staff/[id]` and `/students/[id]`.
It lazy-loads `@react-pdf/renderer` after **Download report**, shows a preparing
state, then presents **Download PDF**. Retry regenerates the document and timestamp.
No screenshot or print-dialog dependency is used. Text, borders, and cards are
vector PDF content; the optional school logo retains its original image resolution.

## Use in a modal or directory row

```tsx
import { DownloadReportButton } from "@/components/reports/DownloadReportButton";
import type { StudentReportData } from "@/components/reports/profile-report-types";

const report: StudentReportData = {
  fullName: "Muhammad Ali Khan",
  status: "active",
  admissionId: "NGSS-2026-0184",
  rollNumber: "24",
  classSection: "Grade 9 / Section A",
  guardianName: "Ahmed Khan",
  phone: "+92 321 7654321",
  address: "Satellite Town, Rawalpindi",
  attendanceRate: 94,
  feeStatus: "Paid",
  school: {
    name: "National Garrison Secondary School",
    address: "Your school's address",
    logoUrl: "/school-logo.png"
  }
};

// Inside the modal's action area or a table <td>:
<DownloadReportButton type="student" data={report} />
```

For staff, use `type="staff"` with `StaffReportData`: `fullName`, `status`,
`staffId`, `role`, and optional `email`, `phone`, `department`, `joiningDate`,
`monthlyPay`, `attendanceRate`, `attendanceNote`, `daysPresent`, and `school`.
The discriminated union rejects mismatched data/type combinations.

Directory rows often lack attendance and contact information. Fetch those through
an authenticated, school-scoped server action before mounting this button, or open
the existing profile page. Do not invent zeros for unavailable data.

## Permissions and data

Prepare a minimal DTO on the server. Never send unauthorized fields and rely on
the PDF to hide them. Existing staff integration sends salary only to principals
and administrators. Student integration respects finance permissions and teacher
contact restrictions. `payRestricted` and `feesRestricted` show a Restricted label.
Attendance percentages include present and late records; staff Days present excludes
late arrivals. Staff attendance covers the current year; student attendance covers
all fetched records. Fee status summarizes the profile's recorded challans.

The default school name is National Garrison Secondary School. Existing pages use
the signed-in school's configured name/logo. Pass `school.address` or
`school.subtitle` for a custom second header line; otherwise a neutral school
administration subtitle is shown. Missing roll numbers show Not recorded because
the current profile query provides an admission ID, not a separate roll number.

## Rendering

- `StaffReportPDF.tsx` and `StudentReportPDF.tsx` share `ProfileReportLayout.tsx`.
- Layout uses `StyleSheet.create()`, A4 portrait, six bounded detail rows and one
  page. Exceptionally long fields are ellipsized to keep the report to one page;
  the full record remains available in the profile.
- Dates and generation timestamps use Asia/Karachi (PKT).
- Missing, corrupt, oversized (>2 MB), unsupported, CORS-blocked, or timed-out
  logos fall back to a school-initials tile. Use a PNG/JPEG with CORS enabled or
  a same-origin URL. Logo retrieval times out after five seconds.
- The built-in Helvetica fonts cover Latin-script reports. For Urdu or other
  scripts, register and embed an appropriate licensed font before using these
  templates for those records.
- The CSP includes `wasm-unsafe-eval` for React PDF's Yoga layout engine; production
  JavaScript `eval` remains blocked. Logo origins must also be allowed by
  `connect-src` (the app already allows its Supabase origin); other origins fall
  back to initials. See the [CSP specification](https://www.w3.org/TR/CSP/#framework-directive-source-list).
- For direct/server rendering, supply `generatedAt` and an optional validated
  `logoDataUrl` to either document. Remote `school.logoUrl` resolution belongs to
  the client download component. Do not pass arbitrary remote URLs to server PDF
  image loading.

## Verification

Run `npm run typecheck` and
`npm test -- src/components/reports/profile-report.test.tsx src/components/reports/report-logo.test.ts`.
The render tests exercise actual vector PDF generation, A4 page dimensions,
one-page output for normal/long/missing data, and font-backed text. Set
`PDF_QA_OUTPUT=1` to write synthetic sample PDFs under `tmp/pdfs/` for visual QA.

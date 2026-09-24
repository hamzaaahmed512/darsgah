"use client";
import { DownloadActionModal } from "./DownloadActionModal";
import { reportFilename } from "./profile-report-format";
import type { DownloadReportButtonProps } from "./profile-report-types";

type Props = DownloadReportButtonProps & { generatedAt: string; onRetry: () => void; onClose?: () => void };
export default function ReportDownloadLink(props: Props) {
  const filename = reportFilename(props.type, props.data.fullName, props.generatedAt);
  return <DownloadActionModal title={`${props.data.fullName} — ${props.type === "staff" ? "Staff" : "Student"} Report`} filename={filename} onClose={props.onClose ?? props.onRetry} generate={async () => {
    const [{ pdf }, { StaffReportPDF }, { StudentReportPDF }, { loadReportLogo }] = await Promise.all([import("@react-pdf/renderer"), import("./StaffReportPDF"), import("./StudentReportPDF"), import("./report-logo")]);
    const logoDataUrl = await loadReportLogo(props.data.school?.logoUrl, AbortSignal.timeout(5000));
    const options = { generatedAt: props.generatedAt, logoDataUrl };
    const document = props.type === "staff" ? <StaffReportPDF data={props.data} {...options} /> : <StudentReportPDF data={props.data} {...options} />;
    return { blob: await pdf(document).toBlob(), filename };
  }} />;
}

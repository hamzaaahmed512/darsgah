import { requireUser } from "@/lib/auth/session";
import { formatExamType, getPrintableResultCards } from "@/lib/services/marks";
import type { ExamType } from "@/types/database";
import { formatClassDisplayName } from "@/lib/utils";
import { ReportExport } from "@/components/reports/ReportExport";
import type { ReportTemplateData } from "@/components/reports/report-template-types";

export default async function PrintableResultsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const user = await requireUser("results:generate");
  const classId = params.classId ?? "";
  const examType = (params.examType ?? "monthly") as ExamType;
  const month = params.month ? Number(params.month) : undefined;
  const result = await getPrintableResultCards(user, { classId, examType, month, studentId: params.studentId });
  const classRow: any = result.classRow;
  const template = result.template;
  const examLabel = `${formatExamType(examType)}${examType === "monthly" && month ? ` / ${new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2026, month - 1, 1))}` : ""}`;

  const report: ReportTemplateData = {
    title: template.title,
    school: { name: user.schoolFullName || user.schoolName, logoUrl: result.branding.logoUrl },
    sections: result.cards.map((card) => ({
      title: card.student.name,
      subtitle: `${template.title} / ${formatClassDisplayName(classRow?.grades?.name, classRow?.name, classRow?.sections?.name)} / ${examLabel}`,
      status: result.complete ? "All subject results approved" : result.status === "pending" ? "Pending - no finalized subject results" : "Partial results - some subjects pending approval",
      metrics: [
        { label: "Total marks", value: `${card.totalObtained} / ${card.totalMax}` },
        { label: "Percentage", value: `${card.percentage.toFixed(1)}%` },
        { label: "Overall grade", value: card.overallGrade }
      ],
      details: [
        ...(template.showAdmissionNumber ? [["Admission ID", card.student.admission_number] as [string, string]] : []),
        ...(template.showAcademicYear ? [["Academic year", classRow?.academic_years?.name ?? "Current"] as [string, string]] : [])
      ],
      headers: ["Subject", "Exam", "Marks", "Grade", ...(template.showTeacherComments ? ["Comment"] : [])],
      rows: card.rows.map((row) => [row.subject_name, `${row.exam_title} (${formatExamType(row.exam_type)})`, row.marks_obtained === null ? "Pending" : `${row.marks_obtained} / ${row.max_marks}`, row.grade, ...(template.showTeacherComments ? [row.teacher_comment || "-"] : [])]),
      note: result.missing.length ? `Missing or pending approval: ${result.missing.join(", ")}` : undefined,
      signatures: template.signatureLabels
    }))
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-6 bg-white p-6 text-ink print:max-w-none print:p-0">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-3xl font-bold">Printable Result Cards</h1>
          <p className="text-sm text-muted">Download the standard school PDF, or open it to preview and print.</p>
        </div>
        <ReportExport data={report} autoOpen={params.print === "1"} label="Download / Print PDF" />
      </div>

      {!result.complete ? (
        <div className="rounded-lg bg-warning-soft p-4 text-sm font-semibold text-warning print:hidden">
          {result.status === "pending"
            ? "No subject results have been approved yet. These cards contain no finalized subject results."
            : `${result.missing.length} subject${result.missing.length === 1 ? " is" : "s are"} still missing or pending approval: ${result.missing.join(", ")}`}
        </div>
      ) : null}

      {result.cards.map((card) => (
          <article
            key={card.student.id}
            className={`relative break-after-page rounded-xl border border-outline/50 ${template.layout === "compact" ? "p-4" : "p-6"} print:rounded-none print:border-0`}
            style={{ borderTopColor: template.accentColor, borderTopWidth: 5 }}
          >
            <header className="border-b border-outline/50 pb-4 text-center">
              {result.branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={result.branding.logoUrl} alt={`${user.schoolName} logo`} className="mx-auto mb-3 h-20 w-20 object-contain" />
              ) : null}
              <p className="font-label text-sm font-bold uppercase tracking-[0.24em]" style={{ color: template.accentColor }}>{user.schoolName}</p>
              <h2 className="mt-2 font-display text-3xl font-bold">{template.title}</h2>
              <p className="mt-1 text-sm text-muted">
                {formatClassDisplayName(classRow?.grades?.name, classRow?.name, classRow?.sections?.name)} / {examLabel}
              </p>
            </header>

            <section className="grid gap-3 border-b border-outline/50 py-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-bold uppercase text-muted">Student</p>
                <p className="font-semibold">{card.student.name}</p>
              </div>
              {template.showAdmissionNumber ? <div>
                <p className="text-xs font-bold uppercase text-muted">Admission #</p>
                <p className="font-semibold">{card.student.admission_number}</p>
              </div> : null}
              {template.showAcademicYear ? <div>
                <p className="text-xs font-bold uppercase text-muted">Academic Year</p>
                <p className="font-semibold">{classRow?.academic_years?.name ?? "Current"}</p>
              </div> : null}
            </section>

            <div className="table-scroll">
            <table className="mt-5 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-outline/50 text-xs uppercase tracking-wide text-muted">
                  <th className="py-3 pr-3">Subject</th>
                  <th className="py-3 pr-3">Exam</th>
                  <th className="py-3 pr-3">Marks</th>
                  <th className="py-3 pr-3">Grade</th>
                  {template.showTeacherComments ? <th className="py-3 pr-3">Comment</th> : null}
                </tr>
              </thead>
              <tbody>
                {card.rows.map((row, index) => (
                  <tr key={`${row.subject_name}-${row.exam_type}-${index}`} className="border-b border-outline/25">
                    <td className="py-3 pr-3 font-semibold">{row.subject_name}</td>
                    <td className="py-3 pr-3">{row.exam_title} ({formatExamType(row.exam_type)})</td>
                    <td className="py-3 pr-3">{row.marks_obtained === null ? "Pending" : `${row.marks_obtained} / ${row.max_marks}`}</td>
                    <td className="py-3 pr-3 font-bold">{row.grade}</td>
                    {template.showTeacherComments ? <td className="py-3 pr-3">{row.teacher_comment || "—"}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            <footer className="mt-6 grid gap-3 rounded-lg bg-surface-low p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-bold uppercase text-muted">Total</p>
                <p className="text-xl font-bold">{card.totalObtained} / {card.totalMax}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted">Percentage</p>
                <p className="text-xl font-bold">{card.percentage.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted">Overall Grade</p>
                <p className="text-xl font-bold">{card.overallGrade}</p>
              </div>
            </footer>
            {template.signatureLabels.length ? (
              <section className="mt-12 flex flex-wrap justify-around gap-8 print:flex-nowrap">
                {template.signatureLabels.map((label: string) => (
                  <div key={label} className="min-w-32 border-t border-ink/50 pt-2 text-center text-xs font-semibold">{label}</div>
                ))}
              </section>
            ) : null}
            <p className="mt-8 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Powered by getdarsgah.com</p>
          </article>
      ))}
    </div>
  );
}

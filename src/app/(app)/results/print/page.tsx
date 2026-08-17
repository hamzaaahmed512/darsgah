import { requireUser } from "@/lib/auth/session";
import { formatExamType, getPrintableResultCards } from "@/lib/services/marks";

export default async function PrintableResultsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const user = await requireUser("results:generate");
  const classId = params.classId ?? "";
  const term = params.term ?? "Term 1";
  const result = await getPrintableResultCards(user, { classId, term, studentId: params.studentId });
  const classRow: any = result.classRow;

  return (
    <div className="mx-auto grid max-w-5xl gap-6 bg-white p-6 text-ink print:max-w-none print:p-0">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-3xl font-bold">Printable Result Cards</h1>
          <p className="text-sm text-muted">Use your browser print dialog and choose Save as PDF if needed.</p>
        </div>
        <div className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white print:hidden">
          Press Ctrl+P
        </div>
      </div>

      {!result.complete ? (
        <div className="rounded-lg bg-warning-soft p-4 font-semibold text-warning">
          Result cards are not ready. Missing: {result.missing.join(", ")}
        </div>
      ) : (
        result.cards.map((card) => (
          <article key={card.student.id} className="break-after-page rounded-xl border border-outline/50 p-6 print:rounded-none print:border-0">
            <header className="border-b border-outline/50 pb-4 text-center">
              <p className="font-label text-sm font-bold uppercase tracking-[0.24em] text-primary">{user.schoolName}</p>
              <h2 className="mt-2 font-display text-3xl font-bold">Result Card</h2>
              <p className="mt-1 text-sm text-muted">
                {classRow?.grades?.name} / {classRow?.name} / {classRow?.sections?.name ?? "Section"} / {term}
              </p>
            </header>

            <section className="grid gap-3 border-b border-outline/50 py-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-bold uppercase text-muted">Student</p>
                <p className="font-semibold">{card.student.name}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted">Admission #</p>
                <p className="font-semibold">{card.student.admission_number}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted">Academic Year</p>
                <p className="font-semibold">{classRow?.academic_years?.name ?? "Current"}</p>
              </div>
            </section>

            <table className="mt-5 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-outline/50 text-xs uppercase tracking-wide text-muted">
                  <th className="py-3 pr-3">Subject</th>
                  <th className="py-3 pr-3">Exam</th>
                  <th className="py-3 pr-3">Marks</th>
                  <th className="py-3 pr-3">Grade</th>
                </tr>
              </thead>
              <tbody>
                {card.rows.map((row, index) => (
                  <tr key={`${row.subject_name}-${row.exam_type}-${index}`} className="border-b border-outline/25">
                    <td className="py-3 pr-3 font-semibold">{row.subject_name}</td>
                    <td className="py-3 pr-3">{row.exam_title} ({formatExamType(row.exam_type)})</td>
                    <td className="py-3 pr-3">{row.marks_obtained === null ? "Pending" : `${row.marks_obtained} / ${row.max_marks}`}</td>
                    <td className="py-3 pr-3 font-bold">{row.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>

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
          </article>
        ))
      )}
    </div>
  );
}

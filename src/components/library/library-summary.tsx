import { BookCopy, BookOpen, Clock3, Users } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import type { LibraryData } from "@/lib/services/library";
import { libraryToday } from "@/lib/validation/library";

// Omitting data renders the same layout while the server fetches the library.
export function LibrarySummary({ data }: { data?: Pick<LibraryData, "books" | "copies" | "loans" | "reservations"> }) {
  const today = libraryToday();
  const activeLoans = data?.loans.filter(loan => !loan.returned_at) ?? [];
  const totalCopies = data?.copies.length ?? 0;
  const totalTitles = data?.books.length ?? 0;
  const activeLoansCount = activeLoans.length;
  const overdueCount = activeLoans.filter(loan => loan.due_date < today).length;
  const pendingReservationsCount = data?.reservations.filter(reservation => reservation.status === "waiting").length ?? 0;
  const cards = [
    { label: "Total Books", value: totalCopies, hint: `Across ${totalTitles} title${totalTitles === 1 ? "" : "s"}`, icon: BookCopy, tone: "blue" as const },
    { label: "On Loan", value: activeLoansCount, hint: "Currently active loans", icon: BookOpen, tone: "green" as const },
    { label: "Overdue Loans", value: overdueCount, hint: "Active loans past their due date", icon: Clock3, tone: "red" as const },
    { label: "Reservations / Waiting List", value: pendingReservationsCount, hint: "Pending waiting list requests", icon: Users, tone: "amber" as const }
  ];

  return (
    <section aria-label="Current library totals" aria-busy={!data}>
      {!data && <span role="status" className="sr-only">Loading library totals...</span>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, hint, icon, tone }) => (
          <div key={label} role="group" aria-label={label} className="min-w-0">
            <StatCard
              label={label}
              value={data ? value.toLocaleString("en-PK") : <span aria-hidden="true" className="animate-pulse rounded-lg bg-surface-high inline-block h-8 w-16 motion-reduce:animate-none" />}
              hint={data ? hint : <span aria-hidden="true" className="animate-pulse rounded-lg bg-surface-high inline-block h-5 w-36 max-w-full motion-reduce:animate-none" />}
              icon={icon}
              tone={tone}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

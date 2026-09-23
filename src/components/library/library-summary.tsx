import { BookCopy, BookOpen, Clock3, Users } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
    { label: "Total Books", value: totalCopies, hint: `Across ${totalTitles} title${totalTitles === 1 ? "" : "s"}`, icon: BookCopy, accent: "!border-t-blue-500", tone: "bg-blue-50 text-blue-600" },
    { label: "On Loan", value: activeLoansCount, hint: "Currently active loans", icon: BookOpen, accent: "!border-t-emerald-500", tone: "bg-emerald-50 text-emerald-600" },
    { label: "Overdue Loans", value: overdueCount, hint: "Active loans past their due date", icon: Clock3, accent: "!border-t-red-500", tone: "bg-red-50 text-red-600" },
    { label: "Reservations / Waiting List", value: pendingReservationsCount, hint: "Pending waiting list requests", icon: Users, accent: "!border-t-amber-500", tone: "bg-amber-50 text-amber-600" }
  ];

  return (
    <section aria-label="Current library totals" aria-busy={!data}>
      {!data && <span role="status" className="sr-only">Loading library totals...</span>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, hint, icon: Icon, accent, tone }) => (
          <Card key={label} role="group" aria-label={label} className={`h-full !border-t-4 shadow-sm ${accent}`}>
            <CardHeader className="flex-nowrap items-center gap-2 p-4 pb-2 sm:p-5 sm:pb-2">
              <h3 className="text-sm font-semibold text-muted">{label}</h3>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
              {data ? <>
                <p className={`text-3xl font-bold tabular-nums ${label === "Overdue Loans" && overdueCount > 0 ? "text-red-600" : "text-ink"}`}>{value.toLocaleString("en-PK")}</p>
                <p className="mt-2 text-xs text-muted">{hint}</p>
              </> : <div aria-hidden="true">
                <Skeleton className="h-9 w-16 motion-reduce:animate-none" />
                <Skeleton className="mt-2 h-4 w-36 max-w-full motion-reduce:animate-none" />
              </div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

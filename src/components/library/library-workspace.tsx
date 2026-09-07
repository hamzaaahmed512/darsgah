"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen, BookCopy, Clock3, Users, Pencil, Plus, UserRound, X, Info, ShieldCheck, UserCheck, AlertTriangle, CheckCircle2
} from "lucide-react";
import { libraryAction } from "@/app/(app)/library/actions";
import type {
  LibraryData, LibraryBook, LibraryLoan, LibraryReservation, SearchResultBorrower, SearchResultCopy
} from "@/lib/services/library";
import { libraryDueDate, libraryToday, overdueDays } from "@/lib/validation/library";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form-field";
import { BorrowerSelector } from "./borrower-selector";
import { CopySelector } from "./copy-selector";
import { ReturnBookDialog } from "./return-book-dialog";
import { RenewLoanDialog } from "./renew-loan-dialog";
import { LibraryReports } from "./library-reports";

// ─── Shared primitives ────────────────────────────────────────────────────────

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-outline/70 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-5 text-lg font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Form({
  action, children, label = "Save", id, reset = false, buttonVariant = "primary", disabled = false, onSuccess
}: {
  action: string; children?: ReactNode; label?: string; id?: string;
  reset?: boolean; buttonVariant?: "primary" | "secondary" | "danger"; disabled?: boolean;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ error?: string; ok?: boolean } | null>(null);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (pending || disabled) return;
        const element = event.currentTarget;
        const payload = new FormData(element);
        setMessage(null);
        startTransition(async () => {
          try {
            const result = await libraryAction(payload);
            setMessage(result);
            if (result.ok) { if (reset) element.reset(); onSuccess?.(); router.refresh(); }
          } catch {
            setMessage({ error: "Connection interrupted. Refresh to check whether the change saved before retrying." });
          }
        });
      }}
      className="grid gap-3"
    >
      <input type="hidden" name="action" value={action} />
      {id && <input type="hidden" name="id" value={id} />}
      <fieldset disabled={pending} className="grid min-w-0 gap-3">
        {children}
        <Button type="submit" variant={buttonVariant} disabled={pending || disabled}>
          {pending ? "Saving…" : label}
        </Button>
      </fieldset>
      {message && (
        <p role={message.error ? "alert" : "status"}
          className={`text-sm ${message.error ? "text-red-700" : "text-green-700"}`}>
          {message.error || "Saved successfully."}
        </p>
      )}
    </form>
  );
}

const formatMoney = (value: number | null | undefined) =>
  value == null ? "not specified" : `Rs ${Number(value).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;

const formatDate = (value: string) => {
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value.slice(0, 10);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return value.slice(0, 10);
  }
};

/** Coloured status badge for copy condition. */
function StatusBadge({ status }: { status: string }) {
  const label = status.replaceAll("_", " ");
  const colour =
    status === "available" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" :
    status === "on_loan"   ? "bg-amber-50 text-amber-700 ring-amber-200" :
    status === "damaged"   ? "bg-orange-50 text-orange-700 ring-orange-200" :
    status === "lost"      ? "bg-red-50 text-red-700 ring-red-200" :
                             "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${colour}`}>
      {label}
    </span>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{children}</span>;
}

// ─── Book fields (shared by add-book and edit-book forms) ─────────────────────

function BookFields({ book }: { book?: LibraryBook }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Title"><Input name="title" required maxLength={200} defaultValue={book?.title} /></Field>
      <Field label="Author"><Input name="author" maxLength={200} defaultValue={book?.author} /></Field>
      <Field label="ISBN"><Input name="isbn" maxLength={32} defaultValue={book?.isbn} /></Field>
      <Field label="Category"><Input name="category" maxLength={80} placeholder="Science, Fiction…" defaultValue={book?.category} /></Field>
      <Field label="Publisher"><Input name="publisher" maxLength={200} defaultValue={book?.publisher} /></Field>
      <Field label="Shelf / location"><Input name="shelf" maxLength={80} placeholder="A-03" defaultValue={book?.shelf} /></Field>
      <Field label="Default replacement cost (Rs)"
        hint="Optional. Used for new copies and added to the library balance if a loan is closed as lost. Separate from late fines.">
        <Input name="default_replacement_cost" type="number" min="0" max="1000000" step="0.01"
          placeholder="e.g. 850"
          defaultValue={book?.default_replacement_cost != null ? String(book.default_replacement_cost) : ""} />
      </Field>
    </div>
  );
}

// ─── Add book modal ───────────────────────────────────────────────────────────

function AddBookModal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add book
      </Button>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-2xl rounded-t-[28px] bg-white shadow-xl sm:rounded-[28px]">
            <div className="flex items-start justify-between border-b border-outline/50 px-5 py-4 sm:px-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-ink">Add a book</h2>
                <p className="mt-1 text-sm text-muted">
                  Fill in the title details and set the number of copies to register. Copy IDs are generated automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-xl p-2 text-muted hover:bg-surface-low"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto p-5 sm:p-6">
              <Form action="add_book_with_copies" label="Add book" reset>
                <BookFields />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Number of copies" hint="A unique Copy ID is generated for each.">
                    <Input name="quantity" type="number" required min="1" max="1000" defaultValue="1" />
                  </Field>
                </div>
              </Form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Add copies modal (per book) ──────────────────────────────────────────────

function AddCopiesModal({ book }: { book: LibraryBook }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-white px-3.5 text-sm font-semibold text-ink ring-1 ring-outline hover:bg-surface-low hover:text-primary"
      >
        <Plus className="h-4 w-4" /> Add copies
      </button>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-[28px] bg-white shadow-xl sm:rounded-[28px]">
            <div className="flex items-start justify-between border-b border-outline/50 px-5 py-4 sm:px-6">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Add copies</h2>
                <p className="mt-1 text-sm font-semibold text-primary">{book.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-xl p-2 text-muted hover:bg-surface-low"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 sm:p-6">
              <Form action="add_copies" label="Add copies" reset>
                <input type="hidden" name="book_id" value={book.id} />
                <Field label="Quantity to add" hint="Up to 1,000 copies per batch. Copy IDs are generated automatically.">
                  <Input name="quantity" type="number" required min="1" max="1000" defaultValue="1" />
                </Field>
                <Field label="Replacement cost (Rs)"
                  hint="Optional override for these copies. Added to the library balance if lost. Leave blank to use the book default.">
                  <Input name="replacement_cost" type="number" min="0" max="1000000" step="0.01"
                    placeholder={book.default_replacement_cost != null ? String(book.default_replacement_cost) : "Optional"}
                    defaultValue="" />
                </Field>
              </Form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// ─── Main workspace ───────────────────────────────────────────────────────────

export function LibraryWorkspace({
  data, canManage, canAdmin,
}: {
  data: LibraryData; canManage: boolean; canAdmin: boolean;
}) {
  const [tab, setTab] = useState("Catalogue");
  const [query, setQuery] = useState("");
  const [loanFilter, setLoanFilter] = useState("active");
  const [catalogFilter, setCatalogFilter] = useState("active");
  const [page, setPage] = useState(1);

  // Selected Borrower & Copy state for Issue form
  const [selectedBorrower, setSelectedBorrower] = useState<SearchResultBorrower | null>(null);
  const [selectedCopy, setSelectedCopy] = useState<SearchResultCopy | null>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [customDueDate, setCustomDueDate] = useState<string>("");
  const [issueVersion, setIssueVersion] = useState(0);
  const [reservationVersion, setReservationVersion] = useState(0);
  const [circulationNotice, setCirculationNotice] = useState("");
  function clearIssue() {
    setSelectedBorrower(null);
    setSelectedCopy(null);
    setSelectedReservationId(null);
    setCustomDueDate("");
    setIssueVersion(value => value + 1);
  }

  // Reservation Creation state
  const [reserveBookId, setReserveBookId] = useState<string>("");
  const [reserveBorrower, setReserveBorrower] = useState<SearchResultBorrower | null>(null);

  // Dialog state for Return and Renew workflows
  const [activeReturnLoan, setActiveReturnLoan] = useState<LibraryLoan | null>(null);
  const [activeRenewLoan, setActiveRenewLoan] = useState<LibraryLoan | null>(null);

  const today = libraryToday();
  const books = new Map(data.books.map(book => [book.id, book]));
  const copies = new Map(data.copies.map(copy => [copy.id, copy]));

  const activeCopies = data.copies.filter(c => c.status !== "lost" && c.status !== "withdrawn");
  const activeTitleIds = new Set(activeCopies.map(c => c.book_id));
  const activeTitleCount = data.books.filter(b => !b.archived && activeTitleIds.has(b.id)).length;

  const activeLoans = data.loans.filter(loan => !loan.returned_at);
  const overdue = activeLoans.filter(loan => loan.due_date < today);
  
  // Filter active waiting reservations ONLY (exclude fulfilled or cancelled)
  const waitingReservations = data.reservations.filter(item => item.status === "waiting");

  // Librarians team count
  const librariansCount = data.team ? data.team.length : 0;

  // Compute ready-to-fulfil reservations (FIFO queue position 1 AND eligible available copy exists)
  const readyReservations = waitingReservations.filter((res) => {
    if (res.is_ready_to_issue !== undefined) return res.is_ready_to_issue;
    const bookCopies = data.copies.filter(c => c.book_id === res.book_id && c.status === "available");
    const bookTitle = books.get(res.book_id);
    if (!bookTitle || bookTitle.archived || bookCopies.length === 0) return false;
    // Check if this reservation is at the front of the queue for this book_id
    const queueForBook = waitingReservations.filter(r => r.book_id === res.book_id);
    return queueForBook.length > 0 && queueForBook[0].id === res.id;
  });

  // Issue preview policy calculations
  const defaultLoanDuration = selectedBorrower
    ? (selectedBorrower.kind === "student"
        ? (data.settings.student_loan_days ?? data.settings.loan_days ?? 14)
        : (data.settings.staff_loan_days ?? 30))
    : (data.settings.loan_days ?? 14);

  const calculatedDueDate = libraryDueDate(defaultLoanDuration, today);
  const isIssueBlocked = Boolean(selectedBorrower && !selectedBorrower.is_eligible);

  const matches = (...values: (string | undefined)[]) =>
    values.join(" ").toLowerCase().includes(query.toLowerCase().trim());

  const filteredBooks = data.books.filter(book =>
    (catalogFilter === "all" || book.archived === (catalogFilter === "archived")) &&
    matches(book.title, book.author, book.isbn, book.category, book.shelf,
      ...data.copies.filter(c => c.book_id === book.id).map(c => c.accession))
  );

  const filteredLoans = [...data.loans].reverse().filter(loan => {
    const copy = copies.get(loan.copy_id);
    const book = books.get(copy?.book_id ?? "");
    return matches(loan.borrower_name, copy?.accession, book?.title) &&
      (loanFilter === "all" ||
        (loanFilter === "active" && !loan.returned_at) ||
        (loanFilter === "overdue" && !loan.returned_at && loan.due_date < today) ||
        (loanFilter === "returned" && !!loan.returned_at) ||
        (loanFilter === "balance" && Number(loan.fine_amount) > Number(loan.paid_amount) + Number(loan.waived_amount)));
  });

  const tabs = ["Catalogue", "Issue & return", "Reports", "Rules & team"];
  const rows = tab === "Catalogue" ? filteredBooks.length : filteredLoans.length;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows / 20)));

  // Handle one-click issue prefill from a ready reservation
  function handleOneClickFulfill(res: LibraryReservation) {
    setCustomDueDate("");
    const borrowerLoans = activeLoans.filter(loan => loan.borrower_id === res.borrower_id && loan.borrower_kind === res.borrower_kind);
    const maximum = res.borrower_kind === "staff" ? data.settings.staff_max_loans : data.settings.student_max_loans;
    const hasOverdue = borrowerLoans.some(loan => loan.due_date < today);
    const restriction = hasOverdue ? "Return overdue books before issuing another copy." : borrowerLoans.length >= maximum ? "Borrower has reached the active loan limit." : null;
    const firstAvailCopy = data.copies.find(c => c.book_id === res.book_id && c.status === "available");
    const targetBook = books.get(res.book_id);

    setSelectedReservationId(res.id);
    setSelectedBorrower({
      id: res.borrower_id,
      kind: (res.borrower_kind as "student" | "staff") || "student",
      name: res.borrower_name,
      reference: res.registration_number || res.email || "Borrower",
      grade_id: null,
      grade_name: res.grade_name || null,
      section_id: null,
      section_name: res.section_name || null,
      registration_number: res.registration_number || null,
      email: res.email || null,
      department: res.department || null,
      job_title: res.job_title || null,
      active_loans_count: borrowerLoans.length,
      max_loans_allowed: res.borrower_kind === "staff" ? (data.settings.staff_max_loans ?? 5) : (data.settings.student_max_loans ?? 3),
      has_overdue: hasOverdue,
      is_eligible: !restriction,
      ineligibility_reason: restriction
    });

    if (firstAvailCopy && targetBook) {
      setSelectedCopy({
        id: firstAvailCopy.id,
        accession: firstAvailCopy.accession,
        status: firstAvailCopy.status,
        book_id: targetBook.id,
        book_title: targetBook.title,
        author: targetBook.author,
        isbn: targetBook.isbn,
        shelf: targetBook.shelf,
        is_eligible: true,
        ineligibility_reason: null
      });
    } else {
      setSelectedCopy(null);
    }

    setTab("Issue & return");
    requestAnimationFrame(() => document.getElementById("library-issue-form")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const kpiCards = [
    {
      label: "Total books",
      value: activeCopies.length,
      sub: `Across ${activeTitleCount} title${activeTitleCount === 1 ? "" : "s"}`,
      icon: BookCopy,
      bg: "bg-blue-50",
      fg: "text-blue-600",
    },
    {
      label: "On loan",
      value: activeLoans.length,
      icon: BookOpen,
      bg: "bg-emerald-50",
      fg: "text-emerald-600",
    },
    {
      label: "Overdue loans",
      value: overdue.length,
      icon: Clock3,
      bg: "bg-red-50",
      fg: "text-red-600",
    },
    {
      label: "Reservations",
      value: waitingReservations.length,
      sub: readyReservations.length > 0 ? `${readyReservations.length} ready to issue` : undefined,
      icon: Users,
      bg: "bg-emerald-50",
      fg: "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Top Header & Team Status ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-800">
            <UserCheck className="h-4 w-4 text-primary" />
            {librariansCount > 0 ? `Librarians: ${librariansCount}` : "No librarian assigned"}
          </span>
        </div>

        {(canManage || canAdmin) && (
          <div className="flex flex-wrap items-center gap-3">
            {canManage && <AddBookModal />}
            {canAdmin && (
              <button
                type="button"
                onClick={() => setTab("Rules & team")}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-ink ring-1 ring-outline transition hover:bg-surface-low hover:text-primary"
              >
                <UserRound className="h-4 w-4" /> Manage team
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── KPI cards ── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map(({ label, value, sub, icon: Icon, bg, fg }) => (
          <div key={label} className="flex items-center gap-4 rounded-2xl border border-outline/70 bg-white p-5">
            <span className={`rounded-xl p-3 ${bg} ${fg}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-muted">{label}</p>
              <p className="text-2xl font-bold text-ink">{value}</p>
              {sub && <p className="text-xs text-muted">{sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab nav ── */}
      <nav aria-label="Library sections" className="flex gap-2 overflow-x-auto border-b border-outline pb-3">
        {tabs.map(item => (
          <button
            type="button"
            key={item}
            aria-current={tab === item ? "page" : undefined}
            onClick={() => { setTab(item); setQuery(""); setPage(1); }}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold ${tab === item ? "bg-primary text-white" : "bg-white text-muted hover:bg-slate-100"}`}
          >
            {item}
          </button>
        ))}
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          CATALOGUE TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Catalogue" && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              aria-label="Search catalogue"
              placeholder="Search title, author, ISBN, shelf or Copy ID…"
              value={query}
              onChange={event => { setQuery(event.target.value); setPage(1); }}
            />
            <Select
              aria-label="Catalogue status"
              value={catalogFilter}
              onChange={event => { setCatalogFilter(event.target.value); setPage(1); }}
            >
              <option value="active">Active titles</option>
              <option value="archived">Archived titles</option>
              <option value="all">All titles</option>
            </Select>
          </div>

          {!filteredBooks.length && (
            <Panel title="No books found">
              <p className="text-muted">Add a title, then copies with unique Copy IDs will be generated automatically.</p>
            </Panel>
          )}

          <div className="grid gap-3">
            {filteredBooks.slice((currentPage - 1) * 20, currentPage * 20).map(book => {
              const stock = data.copies.filter(c => c.book_id === book.id);
              const totalCopies  = stock.filter(c => c.status !== "lost" && c.status !== "withdrawn").length;
              const availableNow = stock.filter(c => c.status === "available").length;
              const onLoan       = stock.filter(c => c.status === "on_loan").length;
              const activeWaitingCount = waitingReservations.filter(r => r.book_id === book.id).length;

              return (
                <section
                  key={book.id}
                  className="rounded-[24px] border border-outline/65 bg-white p-4 shadow-card sm:p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-xl font-bold text-ink">{book.title}</h2>
                        {book.archived && <Tag>Archived</Tag>}
                      </div>
                      {book.author && <p className="mt-1 text-sm font-semibold text-primary">{book.author}</p>}
                      <div className="mt-3 grid gap-x-6 gap-y-2 text-sm text-muted sm:grid-cols-2 lg:grid-cols-3">
                        <p><span className="font-semibold text-ink">Publisher:</span> {book.publisher || "—"}</p>
                        <p><span className="font-semibold text-ink">Category:</span> {book.category || "—"}</p>
                        <p><span className="font-semibold text-ink">ISBN:</span> {book.isbn || "—"}</p>
                        <p><span className="font-semibold text-ink">Location:</span> {book.shelf || "—"}</p>
                      </div>

                      {/* Title Copy & Waiting Inventory Metrics */}
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <span>
                          <span className="font-semibold text-ink">Total copies:</span>{" "}
                          <span className="font-bold text-ink">{totalCopies}</span>
                        </span>
                        <span>
                          <span className="font-semibold text-ink">Available now:</span>{" "}
                          <span className="font-bold text-emerald-700">{availableNow}</span>
                        </span>
                        <span>
                          <span className="font-semibold text-ink">On loan:</span>{" "}
                          <span className="font-bold text-amber-700">{onLoan}</span>
                        </span>
                        <span>
                          <span className="font-semibold text-ink">Waiting:</span>{" "}
                          <span className="font-bold text-primary">{activeWaitingCount}</span>
                        </span>
                      </div>
                    </div>

                    {canManage && (
                      <div className="flex flex-wrap gap-2 xl:w-56 xl:justify-end">
                        <AddCopiesModal book={book} />
                        <details>
                          <summary className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-primary/15 bg-primary-soft/45 px-3.5 text-sm font-semibold text-primary hover:bg-primary-soft">
                            <Pencil className="h-4 w-4" /> Edit
                          </summary>
                          <div className="absolute right-4 z-20 mt-2 w-[min(34rem,calc(100vw-2rem))] rounded-2xl border border-outline bg-white p-4 shadow-xl">
                            <Form action="edit_book" id={book.id}>
                              <BookFields book={book} />
                            </Form>
                          </div>
                        </details>
                        <Form
                          action="archive"
                          id={book.id}
                          label={book.archived ? "Restore" : "Delete"}
                          buttonVariant={book.archived ? "secondary" : "danger"}
                        >
                          <input type="hidden" name="archived" value={String(!book.archived)} />
                        </Form>
                      </div>
                    )}
                  </div>

                  <details className="mt-4 border-t border-outline/50 pt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-primary">
                      View copies ({stock.length})
                    </summary>
                    <div className="mt-4 space-y-3">
                      {stock.length === 0 && (
                        <p className="text-sm text-muted">No copies registered yet.</p>
                      )}
                      {stock.map(copy => (
                        <div key={copy.id} className="rounded-xl bg-slate-50 p-3">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Copy ID</span>
                              <strong className="ml-2 text-sm text-ink">{copy.accession}</strong>
                            </div>
                            <StatusBadge status={copy.status} />
                          </div>
                          <p className="mb-2 text-xs text-muted">
                            Replacement cost:{" "}
                            <span className={copy.replacement_cost == null ? "italic" : ""}>
                              {formatMoney(copy.replacement_cost)}
                            </span>
                          </p>
                          {canManage && copy.status !== "on_loan" && (
                            <Form action="copy_status" id={copy.id} label="Update condition">
                              <Select
                                name="status"
                                aria-label={`Condition for ${copy.accession}`}
                                defaultValue={copy.status}
                              >
                                {["available", "damaged", "lost", "withdrawn"].map(s => (
                                  <option key={s}>{s}</option>
                                ))}
                              </Select>
                            </Form>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                </section>
              );
            })}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ISSUE & RETURN TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Issue & return" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm">
            <p>Issue books directly, process returns, or manage the waiting list here.</p>
            <a href="#library-waiting-list" className="font-semibold text-primary underline">Waiting list ({waitingReservations.length})</a>
          </div>
          {circulationNotice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{circulationNotice}</p>}

          {canManage && (
            <div id="library-issue-form" className="scroll-mt-24"><Panel title="Issue a book">
              <p className="mb-4 text-sm text-muted">
                Search and select an active borrower and eligible book copy below. Borrowing rules are applied automatically.
              </p>
              <div className="mb-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
                <p>Students: up to {data.settings.student_max_loans} books for {data.settings.student_loan_days} days; {data.settings.student_max_renewals} renewals of {data.settings.student_renewal_days} days.</p>
                <p>Staff: up to {data.settings.staff_max_loans} books for {data.settings.staff_loan_days} days; {data.settings.staff_max_renewals} renewals of {data.settings.staff_renewal_days} days.</p>
              </div>
              <Form
                key={issueVersion}
                action="issue"
                label="Issue book"
                reset
                onSuccess={() => { clearIssue(); setCirculationNotice("Book issued successfully. You can select the next borrower."); }}
                disabled={isIssueBlocked || !selectedBorrower || !selectedCopy || !selectedCopy.is_eligible}
              >
                {selectedReservationId && (
                  <input type="hidden" name="reservation_id" value={selectedReservationId} />
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                  <BorrowerSelector
                    grades={data.grades}
                    sections={data.sections}
                    selectedBorrower={selectedBorrower}
                    onSelect={(borrower) => { setSelectedBorrower(borrower); setSelectedCopy(null); setSelectedReservationId(null); setCustomDueDate(""); }}
                  />

                  <CopySelector
                    borrowerKind={selectedBorrower?.kind}
                    borrowerId={selectedBorrower?.id}
                    selectedCopy={selectedCopy}
                    onSelect={(copy) => { setSelectedCopy(copy); if (copy && selectedReservationId && data.reservations.find(r => r.id === selectedReservationId)?.book_id !== copy.book_id) setSelectedReservationId(null); }}
                  />
                </div>

                {/* Issue Preview & Policy Summary */}
                {selectedBorrower && (
                  <div className="mt-4 rounded-2xl border border-primary/25 bg-slate-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Loan Policy Summary</h3>
                      {selectedReservationId && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Fulfilling Waiting Reservation
                        </span>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                      <div>
                        <span className="text-muted block">Borrower identity</span>
                        <strong className="text-ink">{selectedBorrower.name}</strong>
                      </div>

                      <div>
                        <span className="text-muted block">Active loans</span>
                        <strong className={selectedBorrower.active_loans_count >= selectedBorrower.max_loans_allowed ? "text-red-600" : "text-ink"}>
                          {selectedBorrower.active_loans_count} of {selectedBorrower.max_loans_allowed}
                        </strong>
                      </div>

                      <div>
                        <span className="text-muted block">Loan period</span>
                        <strong className="text-ink">{defaultLoanDuration} days</strong>
                      </div>

                      <div>
                        <span className="text-muted block">Calculated due date</span>
                        <strong className="text-primary font-bold">{customDueDate || calculatedDueDate}</strong>
                      </div>
                    </div>

                    {isIssueBlocked && (
                      <div className="flex items-center gap-2 rounded-xl bg-red-100 p-3 text-xs font-semibold text-red-700">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{selectedBorrower.ineligibility_reason || "Borrower is currently restricted from taking new loans."}</span>
                      </div>
                    )}

                    <Field label="Return by due date">
                      <Input
                        name="due_date"
                        type="date"
                        min={libraryDueDate(1)}
                        max={libraryDueDate(90)}
                        value={customDueDate || calculatedDueDate}
                        onChange={(e) => setCustomDueDate(e.target.value)}
                        required
                      />
                    </Field>
                  </div>
                )}
              </Form>
              <Button type="button" variant="secondary" onClick={clearIssue} className="mt-3">Clear selection</Button>
            </Panel></div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              aria-label="Search loans"
              placeholder="Search borrower, title or Copy ID…"
              value={query}
              onChange={event => { setQuery(event.target.value); setPage(1); }}
            />
            <Select aria-label="Loan status" value={loanFilter} onChange={event => { setLoanFilter(event.target.value); setPage(1); }}>
              <option value="active">Active loans</option>
              <option value="overdue">Overdue</option>
              <option value="returned">Closed / returned</option>
              <option value="balance">Unpaid fines</option>
              <option value="all">Full history</option>
            </Select>
          </div>

          {!filteredLoans.length && (
            <Panel title="No matching loans">
              <p className="text-muted">Issued books and their return history will appear here.</p>
            </Panel>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            {filteredLoans.slice((currentPage - 1) * 20, currentPage * 20).map(loan => {
              const copy = copies.get(loan.copy_id);
              const remaining = Number(loan.fine_amount) - Number(loan.paid_amount) - Number(loan.waived_amount);
              const days = overdueDays(loan.due_date, today);
              const maxAllowedRenewals = loan.borrower_kind === "student"
                ? (data.settings.student_max_renewals ?? data.settings.max_renewals ?? 2)
                : (data.settings.staff_max_renewals ?? 3);

              return (
                <Panel key={loan.id} title={books.get(copy?.book_id ?? "")?.title || "Book"}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-ink">
                      {loan.borrower_name}{" "}
                      <span className="text-xs font-normal text-muted capitalize">({loan.borrower_kind})</span>
                    </p>
                    <Tag>Copy {copy?.accession || "N/A"}</Tag>
                  </div>

                  <p className="mt-1 text-xs text-muted">
                    Issued: <strong>{formatDate(loan.issued_at)}</strong> · Due date: <strong className={days > 0 ? "text-red-700 font-bold" : "text-ink"}>{formatDate(loan.due_date)}</strong>
                  </p>

                  <div className="my-3 flex flex-wrap gap-2">
                    <Tag>
                      {loan.returned_at
                        ? `${loan.outcome} · ${formatDate(loan.returned_at)}`
                        : days ? `${days} days overdue` : "On loan"}
                    </Tag>
                    <Tag>Renewals: {loan.renewals} of {maxAllowedRenewals}</Tag>
                  </div>

                  {!loan.returned_at && days > 0 && (
                    <p className="mb-3 text-xs font-semibold text-red-700">
                      Estimated overdue fine: {formatMoney(days * Number(loan.fine_per_day))}
                    </p>
                  )}

                  {canManage && !loan.returned_at && (
                    <div className="mt-4 flex flex-wrap gap-2.5">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => setActiveReturnLoan(loan)}
                        className="flex-1 sm:flex-none text-xs"
                      >
                        Return book
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setActiveRenewLoan(loan)}
                        className="flex-1 sm:flex-none text-xs"
                      >
                        Renew loan
                      </Button>
                    </div>
                  )}

                  {loan.returned_at && (
                    <p className="mt-2 text-xs text-muted">
                      Fine: {formatMoney(loan.fine_amount)} · Paid: {formatMoney(loan.paid_amount)} ·
                      Waived: {formatMoney(loan.waived_amount)} · Balance: {formatMoney(remaining)}
                    </p>
                  )}

                  {canManage && remaining > 0 && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-xs font-semibold text-primary">
                        Record payment {canAdmin ? "or waiver" : ""}
                      </summary>
                      <div className="mt-3 grid gap-4 sm:grid-cols-2">
                        <Form action="payment" id={loan.id} label="Record payment">
                          <Field label="Amount received (Rs)">
                            <Input name="amount" type="number" required min="0.01" max={remaining} step="0.01" />
                          </Field>
                        </Form>
                        {canAdmin && (
                          <Form action="waive" id={loan.id} label="Waive amount">
                            <Field label="Waiver amount (Rs)">
                              <Input name="amount" type="number" required min="0.01" max={remaining} step="0.01" />
                            </Field>
                            <Field label="Reason">
                              <Input name="reason" required minLength={3} maxLength={500} />
                            </Field>
                          </Form>
                        )}
                      </div>
                    </details>
                  )}
                </Panel>
              );
            })}
          </div>
        </>
      )}

      {/* Return & Renew Dialog Modals */}
      {activeReturnLoan && (
        <ReturnBookDialog
          loan={activeReturnLoan}
          copy={copies.get(activeReturnLoan.copy_id)}
          bookTitle={books.get(copies.get(activeReturnLoan.copy_id)?.book_id ?? "")?.title}
          onClose={() => setActiveReturnLoan(null)}
        />
      )}

      {activeRenewLoan && (
        <RenewLoanDialog
          loan={activeRenewLoan}
          copy={copies.get(activeRenewLoan.copy_id)}
          bookTitle={books.get(copies.get(activeRenewLoan.copy_id)?.book_id ?? "")?.title}
          settings={data.settings}
          waitingReservations={waitingReservations}
          onClose={() => setActiveRenewLoan(null)}
        />
      )}

      {/* Pagination (Catalogue + Issue & return) */}
      {(tab === "Catalogue" || tab === "Issue & return") && rows > 20 && (
        <div className="flex items-center justify-center gap-4">
          <Button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button>
          <span className="text-sm">Page {currentPage} of {Math.ceil(rows / 20)}</span>
          <Button disabled={currentPage * 20 >= rows} onClick={() => setPage(currentPage + 1)}>Next</Button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          RESERVATIONS TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Issue & return" && (
        <div id="library-waiting-list" className="scroll-mt-24 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Create Reservation Form */}
            {canManage && (
              <Panel title="Reserve a title">
                <p className="mb-4 text-xs text-muted">
                  Add a borrower to a title&apos;s waiting queue. Reservations are served in FIFO order.
                </p>

                <Form key={reservationVersion} action="reserve" label="Join waiting list" reset disabled={!reserveBookId || !reserveBorrower} onSuccess={() => { setReserveBookId(""); setReserveBorrower(null); setReservationVersion(value => value + 1); }}>
                  <Field label="Book title">
                    <Select
                      name="book_id"
                      required
                      value={reserveBookId}
                      onChange={(e) => setReserveBookId(e.target.value)}
                    >
                      <option value="" disabled>Select title</option>
                      {data.books.filter(b => !b.archived).map(b => (
                        <option key={b.id} value={b.id}>{b.title}{b.author ? ` — ${b.author}` : ""}</option>
                      ))}
                    </Select>
                  </Field>

                  {/* Title Metrics & Recommendation Banner */}
                  {reserveBookId && (() => {
                    const targetBook = books.get(reserveBookId);
                    const bookCopies = data.copies.filter(c => c.book_id === reserveBookId);
                    const totalC = bookCopies.filter(c => c.status !== "lost" && c.status !== "withdrawn").length;
                    const availC = bookCopies.filter(c => c.status === "available").length;
                    const waitingC = waitingReservations.filter(r => r.book_id === reserveBookId).length;

                    return (
                      <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-2 border border-outline/60">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 font-semibold">
                          <span>Total copies: <strong className="text-ink">{totalC}</strong></span>
                          <span>Available now: <strong className={availC > 0 ? "text-emerald-700" : "text-amber-700"}>{availC}</strong></span>
                          <span>Waiting queue: <strong className="text-primary">{waitingC}</strong></span>
                        </div>

                        {availC > 0 && waitingC === 0 && (
                          <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-800 border border-emerald-200 flex flex-col gap-2">
                            <p className="font-semibold">
                              💡 Copy is available now! We recommend issuing directly instead of adding to the waiting queue.
                            </p>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                setSelectedReservationId(null);
                                setCustomDueDate("");
                                const availCopy = bookCopies.find(c => c.status === "available");
                                if (availCopy && targetBook) {
                                  setSelectedCopy({
                                    id: availCopy.id,
                                    accession: availCopy.accession,
                                    status: availCopy.status,
                                    book_id: targetBook.id,
                                    book_title: targetBook.title,
                                    author: targetBook.author,
                                    isbn: targetBook.isbn,
                                    shelf: targetBook.shelf,
                                    is_eligible: true,
                                    ineligibility_reason: null
                                  });
                                }
                                setSelectedBorrower(reserveBorrower);
                                setTab("Issue & return");
                                document.getElementById("library-issue-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }}
                              className="self-start text-xs font-bold"
                            >
                              Issue now instead →
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <BorrowerSelector
                    grades={data.grades}
                    sections={data.sections}
                    selectedBorrower={reserveBorrower}
                    onSelect={setReserveBorrower}
                  />
                </Form>
              </Panel>
            )}

            {/* Detailed Waiting Queue Management */}
            <Panel title="Waiting queue management">
              <div className="mb-4 flex gap-3 rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <p>
                  Reservations are <strong>waiting-list requests</strong>. They do not hold a specific physical copy.
                  When a copy becomes available, issue it to the first borrower in that title&apos;s queue.
                </p>
              </div>

              {!waitingReservations.length && <p className="text-xs text-muted">No waiting reservations currently queued.</p>}

              <div className="space-y-3">
                {waitingReservations.map((item) => {
                  const bookTitle = item.book_title || books.get(item.book_id)?.title || "Book";
                  const availCount = item.available_copies ?? data.copies.filter(c => c.book_id === item.book_id && c.status === "available").length;
                  const queuePos = item.queue_position ?? (waitingReservations.filter(r => r.book_id === item.book_id).findIndex(r => r.id === item.id) + 1);
                  const isReady = item.is_ready_to_issue ?? (queuePos === 1 && availCount > 0);

                  return (
                    <div key={item.id} className="rounded-xl border border-outline p-4 space-y-3 bg-white shadow-none">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                            #{queuePos}
                          </span>
                          <h4 className="font-bold text-ink text-sm">{bookTitle}</h4>
                        </div>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          isReady ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {isReady ? "Ready to issue" : "Waiting for a return"}
                        </span>
                      </div>

                      <div className="text-xs text-muted space-y-0.5">
                        <p className="font-semibold text-ink">{item.borrower_name} <span className="font-normal text-muted capitalize">({item.borrower_kind})</span></p>
                        <p>
                          {item.borrower_kind === "student" ? (
                            <>
                              Grade {item.grade_name || "N/A"} {item.section_name ? `· Sec ${item.section_name}` : ""} {item.registration_number ? `· Reg #${item.registration_number}` : ""}
                            </>
                          ) : (
                            <>
                              {item.job_title || "Staff"} {item.department ? `· ${item.department}` : ""}
                            </>
                          )}
                        </p>
                        <p>Requested: {formatDate(item.created_at)} · Available copies: <strong>{availCount}</strong></p>
                      </div>

                      {canManage && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-outline/50">
                          {isReady && (
                            <Button
                              type="button"
                              variant="primary"
                              onClick={() => handleOneClickFulfill(item)}
                              className="text-xs font-bold py-1.5 bg-emerald-600 hover:bg-emerald-700"
                            >
                              Select for issue
                            </Button>
                          )}

                          <Form action="cancel_reservation" id={item.id} label="Cancel reservation" buttonVariant="secondary" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          REPORTS TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Reports" && (
        <LibraryReports
          data={data}
          canManage={canManage}
          canAdmin={canAdmin}
          onNavigateTab={(targetTab, targetId) => {
            setTab(targetTab === "Reservations" ? "Issue & return" : targetTab);
            if (targetId) {
              const bookTitle = books.get(targetId)?.title;
              if (bookTitle) setQuery(bookTitle);
            }
          }}
          formatMoney={formatMoney}
          formatDate={formatDate}
          overdueDays={overdueDays}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          RULES & TEAM TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Rules & team" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Borrowing Rules */}
          <Panel title="Borrowing rules">
            <p className="mb-4 text-sm text-muted">
              Configure separate loan policies for students and staff. Changes apply to new issues and future renewals.
            </p>
            <div className="mb-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-900" aria-label="Saved borrowing rules">
              <p className="font-bold">Currently saved rules</p>
              <p>Students: {data.settings.student_max_loans} books · {data.settings.student_loan_days} days · {data.settings.student_max_renewals} renewals of {data.settings.student_renewal_days} days</p>
              <p>Staff: {data.settings.staff_max_loans} books · {data.settings.staff_loan_days} days · {data.settings.staff_max_renewals} renewals of {data.settings.staff_renewal_days} days</p>
              <p>Overdue fine: {formatMoney(data.settings.fine_per_day)} per day</p>
            </div>
            {canAdmin && canManage ? (
              <Form key={JSON.stringify(data.settings)} action="settings" label="Save borrowing rules">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Student Policy</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Loan period (days)">
                      <Input name="student_loan_days" type="number" required min="1" max="90" defaultValue={data.settings.student_loan_days ?? data.settings.loan_days} />
                    </Field>
                    <Field label="Max active loans">
                      <Input name="student_max_loans" type="number" required min="1" max="30" defaultValue={data.settings.student_max_loans ?? data.settings.max_loans} />
                    </Field>
                    <Field label="Max renewals">
                      <Input name="student_max_renewals" type="number" required min="0" max="10" defaultValue={data.settings.student_max_renewals ?? data.settings.max_renewals} />
                    </Field>
                    <Field label="Renewal duration (days)">
                      <Input name="student_renewal_days" type="number" required min="1" max="90" defaultValue={data.settings.student_renewal_days ?? data.settings.loan_days} />
                    </Field>
                  </div>

                  <h3 className="pt-2 text-xs font-bold uppercase tracking-wider text-muted border-t border-outline/50">Staff Policy</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Loan period (days)">
                      <Input name="staff_loan_days" type="number" required min="1" max="90" defaultValue={data.settings.staff_loan_days ?? 30} />
                    </Field>
                    <Field label="Max active loans">
                      <Input name="staff_max_loans" type="number" required min="1" max="30" defaultValue={data.settings.staff_max_loans ?? 5} />
                    </Field>
                    <Field label="Max renewals">
                      <Input name="staff_max_renewals" type="number" required min="0" max="10" defaultValue={data.settings.staff_max_renewals ?? 3} />
                    </Field>
                    <Field label="Renewal duration (days)">
                      <Input name="staff_renewal_days" type="number" required min="1" max="90" defaultValue={data.settings.staff_renewal_days ?? 30} />
                    </Field>
                  </div>

                  <h3 className="pt-2 text-xs font-bold uppercase tracking-wider text-muted border-t border-outline/50">Overdue Fines</h3>
                  <Field label="Overdue fine per day (Rs)">
                    <Input name="fine_per_day" type="number" required min="0" max="10000" step="0.01" defaultValue={data.settings.fine_per_day} />
                  </Field>
                </div>
              </Form>
            ) : (
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-bold text-ink">Student Policy</h4>
                  <ul className="mt-1 space-y-1 text-muted">
                    <li>Loan period: {data.settings.student_loan_days ?? data.settings.loan_days} days</li>
                    <li>Active loans limit: {data.settings.student_max_loans ?? data.settings.max_loans}</li>
                    <li>Renewals allowed: {data.settings.student_max_renewals ?? data.settings.max_renewals}</li>
                    <li>Renewal duration: {data.settings.student_renewal_days ?? data.settings.loan_days} days</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-ink">Staff Policy</h4>
                  <ul className="mt-1 space-y-1 text-muted">
                    <li>Loan period: {data.settings.staff_loan_days ?? 30} days</li>
                    <li>Active loans limit: {data.settings.staff_max_loans ?? 5}</li>
                    <li>Renewals allowed: {data.settings.staff_max_renewals ?? 3}</li>
                    <li>Renewal duration: {data.settings.staff_renewal_days ?? 30} days</li>
                  </ul>
                </div>
                <p className="pt-2 border-t border-outline/50 text-muted">
                  Daily overdue fine: <strong>{formatMoney(data.settings.fine_per_day)}</strong>
                </p>
              </div>
            )}
          </Panel>

          {/* Assigned Librarians Roster */}
          <Panel title="Assigned Librarians">
            <p className="mb-4 text-sm text-muted">
              Staff members with the structured Librarian role automatically receive library permissions linked to their login accounts.
            </p>

            {data.team && data.team.length > 0 ? (
              <div className="space-y-3">
                {data.team.map((member) => (
                  <div key={member.member_id} className="flex flex-col gap-2 rounded-2xl border border-outline p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span className="font-bold text-ink">{member.full_name}</span>
                      <p className="text-xs text-muted">{member.email || "No email"}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        member.status === "active" && !member.must_change_password
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {member.status === "active" && !member.must_change_password
                          ? "Active"
                          : member.must_change_password
                          ? "Account setup required"
                          : "Inactive"}
                      </span>

                      {canAdmin && (
                        <Link
                          href="/admin"
                          className="rounded-xl border border-outline bg-white px-3 py-1.5 text-xs font-semibold text-muted hover:bg-slate-50 hover:text-ink"
                        >
                          Manage role
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-outline/80 p-6 text-center">
                <ShieldCheck className="mx-auto h-8 w-8 text-muted" />
                <p className="mt-2 text-sm font-semibold text-ink">No librarian assigned</p>
                <p className="mt-1 text-xs text-muted">
                  Assign the Librarian role to a staff member in Staff Management or Admin Console.
                </p>
                {canAdmin && (
                  <Link
                    href="/admin"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" /> Assign librarian
                  </Link>
                )}
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}

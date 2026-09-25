"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen, BookCopy, Clock3, Users, Pencil, Plus, Trash2, Eye, UserRound, X, Info, UserCheck
} from "lucide-react";
import { libraryAction } from "@/app/(app)/library/actions";
import type {
  LibraryData, LibraryBook, LibraryLoan, LibraryReservation, SearchResultBorrower, SearchResultCopy
} from "@/lib/services/library";
import { libraryDueDate, libraryToday, overdueDays } from "@/lib/validation/library";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableHeader, DataTableRow, dataTableCellClassName, dataTableHeaderCellClassName } from "@/components/ui/data-table";
import { Field, Input, Select } from "@/components/ui/form-field";
import { BorrowerSelector } from "./borrower-selector";
import { ReturnBookDialog } from "./return-book-dialog";
import { RenewLoanDialog } from "./renew-loan-dialog";
import { LibraryTeamCard } from "./library-team-card";
import { LibraryReports } from "./library-reports";
import { LibraryDialog } from "./library-dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

// ─── Shared primitives ────────────────────────────────────────────────────────

function Panel({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-outline/70 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

function Form({
  action, children, label = "Save", id, reset = false, buttonVariant = "primary", buttonSize = "md", disabled = false, className, buttonClassName, secondaryAction, onSuccess
}: {
  action: string; children?: ReactNode; label?: string; id?: string;
  reset?: boolean; buttonVariant?: "primary" | "secondary" | "danger"; buttonSize?: "sm" | "md"; disabled?: boolean;
  className?: string; buttonClassName?: string; secondaryAction?: ReactNode;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
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
            if (result.ok) { if (reset) element.reset(); pushToast("Saved successfully.", "success"); onSuccess?.(); router.refresh(); }
          } catch {
            setMessage({ error: "Connection interrupted. Refresh to check whether the change saved before retrying." });
          }
        });
      }}
      className={className ?? "grid gap-3"}
    >
      <input type="hidden" name="action" value={action} />
      {id && <input type="hidden" name="id" value={id} />}
      <fieldset disabled={pending} className={children ? "grid min-w-0 gap-3" : "min-w-0"}>
        {children}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant={buttonVariant} size={buttonSize} disabled={pending || disabled} className={cn("whitespace-nowrap", buttonClassName)}>
            {pending ? "Saving…" : label}
          </Button>
          {secondaryAction}
        </div>
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

function Tag({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{children}</span>;
}

function BookMeta({ label, value }: { label: string; value?: string | null }) {
  const display = value?.trim() || "—";
  return <div className="min-w-0">{label ? <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{label}</p> : null}<p title={display} className={`${label ? "mt-1 " : ""}truncate text-sm font-semibold text-ink`}>{display}</p></div>;
}

// ─── Book fields (shared by add-book and edit-book forms) ─────────────────────

function BookFields({ book }: { book?: LibraryBook }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Title">
<Input name="title" required maxLength={200} defaultValue={book?.title} />
</Field>
      <Field label="Author">
<Input name="author" maxLength={200} defaultValue={book?.author} />
</Field>
      <Field label="ISBN">
<Input name="isbn" maxLength={32} defaultValue={book?.isbn} />
</Field>
      <Field label="Category">
<Input name="category" maxLength={80} placeholder="Science, Fiction…" defaultValue={book?.category} />
</Field>
      <Field label="Publisher">
<Input name="publisher" maxLength={200} defaultValue={book?.publisher} />
</Field>
      <Field label="Shelf / location">
<Input name="shelf" maxLength={80} placeholder="A-03" defaultValue={book?.shelf} />
</Field>
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
      <Button type="button" onClick={() => setOpen(true)} className="h-10 min-h-10 shrink-0 rounded-lg px-4 py-2 text-sm">
        <Plus className="h-4 w-4" /> Add book
      </Button>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="dialog-panel w-full max-w-2xl rounded-t-[28px] bg-white shadow-xl sm:rounded-[28px]">
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

function AddCopiesModal({ book, iconOnly = false }: { book: LibraryBook; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={iconOnly ? "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-outline/70 bg-white text-primary transition hover:bg-primary-soft" : "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-white px-3.5 text-sm font-semibold text-ink ring-1 ring-outline hover:bg-surface-low hover:text-primary"}
        aria-label="Add copies"
        title="Add copies"
      >
        <Plus className="h-4 w-4" />{!iconOnly ? " Add copies" : null}
      </button>
      {open && (
        <LibraryDialog title="Add copies" description={book.title} onClose={() => setOpen(false)} className="max-w-lg lg:max-w-2xl">
            <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
              <Form action="add_copies" label="Add copies" reset onSuccess={() => setOpen(false)}>
                <input type="hidden" name="book_id" value={book.id} />
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Quantity to add" hint="Up to 1,000 copies per batch. Copy IDs are generated automatically.">
                    <Input name="quantity" type="number" required min="1" max="1000" defaultValue="1" />
                  </Field>
                  <Field label="Replacement cost (Rs)"
                    hint="Optional override for these copies. Added to the library balance if lost. Leave blank to use the book default.">
                    <Input name="replacement_cost" type="number" min="0" max="1000000" step="0.01"
                      placeholder={book.default_replacement_cost != null ? String(book.default_replacement_cost) : "Optional"}
                      defaultValue="" />
                  </Field>
                </div>
              </Form>
            </div>
        </LibraryDialog>
      )}
    </>
  );
}

function EditBookModal({ book }: { book: LibraryBook }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary-soft/45 text-primary transition hover:bg-primary-soft" aria-label={`Edit ${book.title}`} title="Edit book"><Pencil className="h-4 w-4" /></button>
    {open ? (
      <LibraryDialog title="Edit book" description={`Update the details for ${book.title}.`} onClose={() => setOpen(false)} className="max-w-2xl lg:max-w-4xl">
        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
          <Form action="edit_book" id={book.id} onSuccess={() => setOpen(false)}><BookFields book={book} /></Form>
        </div>
      </LibraryDialog>
    ) : null}
  </>;
}

function ArchiveBookButton({ book }: { book: LibraryBook }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const archive = !book.archived;
  return <button type="button" disabled={pending} onClick={() => { if (!confirm(`${archive ? "Delete" : "Restore"} “${book.title}”?`)) return; startTransition(async () => { const payload = new FormData(); payload.set("action", "archive"); payload.set("id", book.id); payload.set("archived", String(archive)); const result = await libraryAction(payload); if (result.ok) router.refresh(); else alert(result.error ?? "Unable to update this book."); }); }} className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition disabled:opacity-50 ${archive ? "border-red-100 bg-red-50 text-red-600 hover:bg-red-100" : "border-outline/70 bg-white text-primary hover:bg-primary-soft"}`} aria-label={archive ? `Delete ${book.title}` : `Restore ${book.title}`} title={archive ? "Delete book" : "Restore book"}><Trash2 className="h-4 w-4" /></button>;
}

function IssueBookModal({
  book, availableCopies, grades, sections, settings, onIssued, onReserved, prefilled, onClosed, showTrigger = true
}: {
  book: LibraryBook;
  availableCopies: SearchResultCopy[];
  grades: LibraryData["grades"];
  sections: LibraryData["sections"];
  settings: LibraryData["settings"];
  onIssued: () => void;
  onReserved: () => void;
  prefilled?: { reservationId: string; borrower: SearchResultBorrower };
  onClosed?: () => void;
  showTrigger?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(prefilled));
  const [borrower, setBorrower] = useState<SearchResultBorrower | null>(prefilled?.borrower ?? null);
  const [copyId, setCopyId] = useState(availableCopies[0]?.id ?? "");
  const loanDays = borrower?.kind === "staff" ? settings.staff_loan_days : settings.student_loan_days;
  const dueDate = libraryDueDate(loanDays);

  function close() {
    setOpen(false);
    onClosed?.();
  }

  return (
    <>
      {showTrigger && <button type="button" disabled={book.archived} onClick={() => setOpen(true)}
        className="inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"
        title={availableCopies.length ? "Issue book" : "Reserve book"}>Issue Book</button>}
      {open && (
        <LibraryDialog title={availableCopies.length ? "Issue book" : "Reserve book"} description={book.title} onClose={close} className="max-w-2xl lg:max-w-4xl">
            <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
              {availableCopies.length ? (
                <Form action="issue" label="Issue book" reset disabled={!borrower || !copyId || !borrower.is_eligible}
                  onSuccess={() => { close(); setBorrower(null); onIssued(); }}>
                  {prefilled ? <input type="hidden" name="reservation_id" value={prefilled.reservationId} /> : null}
                  <BorrowerSelector grades={grades} sections={sections} selectedBorrower={borrower}
                    onSelect={setBorrower} keepSearchVisible={!prefilled} />
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Field label="Available copy">
                      <Select name="copy_id" value={copyId} onChange={(event) => setCopyId(event.target.value)}>
                        {availableCopies.map(copy => <option key={copy.id} value={copy.id}>Copy {copy.accession}</option>)}
                      </Select>
                    </Field>
                    <Field label="Return by due date" hint={`School policy: up to ${loanDays} days for this borrower.`}>
                      <Input key={`${borrower?.kind ?? "student"}-${loanDays}`} name="due_date" type="date" min={libraryDueDate(1)} max={dueDate} defaultValue={dueDate} required />
                    </Field>
                  </div>
                  {borrower && !borrower.is_eligible && (
                    <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                      {borrower.ineligibility_reason || "This borrower cannot take another loan right now."}
                    </p>
                  )}
                </Form>
              ) : (
                <Form action="reserve" label="Reserve this book" reset disabled={!borrower}
                  onSuccess={() => { close(); setBorrower(null); onReserved(); }}>
                  <input type="hidden" name="book_id" value={book.id} />
                  <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">No copy is available right now. Select a borrower below to add them to the waiting list.</p>
                  <BorrowerSelector grades={grades} sections={sections} selectedBorrower={borrower} onSelect={setBorrower} />
                </Form>
              )}
            </div>
        </LibraryDialog>
      )}
    </>
  );
}

function BookActions({ book, stock, grades, sections, settings, canManage }: {
  book: LibraryBook;
  stock: LibraryData["copies"];
  grades: LibraryData["grades"];
  sections: LibraryData["sections"];
  settings: LibraryData["settings"];
  canManage: boolean;
}) {
  const availableCopies = stock.filter(copy => copy.status === "available").map(copy => ({ id: copy.id, accession: copy.accession, status: copy.status, book_id: book.id, book_title: book.title, author: book.author, isbn: book.isbn, shelf: book.shelf, is_eligible: true, ineligibility_reason: null }));

  return <div className="flex flex-wrap items-center justify-end gap-2">
    <Link href={`/library/${book.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-ink ring-1 ring-outline transition hover:bg-surface-low hover:text-primary"><Eye className="h-4 w-4" />View copies</Link>
    {canManage && <>
      <IssueBookModal book={book} availableCopies={availableCopies} grades={grades} sections={sections} settings={settings} onIssued={() => {}} onReserved={() => {}} />
      <AddCopiesModal book={book} iconOnly />
      <EditBookModal book={book} />
      <ArchiveBookButton book={book} />
    </>}
  </div>;
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
  const [catalogSort, setCatalogSort] = useState<"title" | "author" | "copies">("title");
  const [catalogSortDescending, setCatalogSortDescending] = useState(false);
  const [page, setPage] = useState(1);
  const [editingRules, setEditingRules] = useState(false);

  const [catalogIssueRequest, setCatalogIssueRequest] = useState<{ reservationId: string; bookId: string; borrower: SearchResultBorrower } | null>(null);
  const [fulfilledReservationIds, setFulfilledReservationIds] = useState<Set<string>>(() => new Set());

  // Dialog state for Return and Renew workflows
  const [activeReturnLoan, setActiveReturnLoan] = useState<LibraryLoan | null>(null);
  const [activeRenewLoan, setActiveRenewLoan] = useState<LibraryLoan | null>(null);

  const today = libraryToday();
  const books = new Map(data.books.map(book => [book.id, book]));
  const copies = new Map(data.copies.map(copy => [copy.id, copy]));

  const totalCopyCount = data.copies.length;
  const totalTitleCount = new Set(data.copies.map(copy => copy.book_id)).size;

  const activeLoans = data.loans.filter(loan => !loan.returned_at);
  const overdue = activeLoans.filter(loan => loan.due_date < today);
  
  // Filter active waiting reservations ONLY (exclude fulfilled or cancelled)
  const waitingReservations = data.reservations.filter(item => item.status === "waiting" && !fulfilledReservationIds.has(item.id));

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

  const matches = (...values: (string | undefined)[]) =>
    values.join(" ").toLowerCase().includes(query.toLowerCase().trim());

  const filteredBooks = data.books.filter(book =>
    (catalogFilter === "all" || book.archived === (catalogFilter === "archived")) &&
    matches(book.title, book.author, book.isbn, book.category, book.shelf,
      ...data.copies.filter(c => c.book_id === book.id).map(c => c.accession))
  ).sort((a, b) => {
    const comparison = catalogSort === "copies"
      ? data.copies.filter(copy => copy.book_id === a.id).length - data.copies.filter(copy => copy.book_id === b.id).length
      : (a[catalogSort] ?? "").localeCompare(b[catalogSort] ?? "");
    return (catalogSortDescending ? -1 : 1) * (comparison || a.title.localeCompare(b.title));
  });

  function sortCatalogue(column: "title" | "author" | "copies") {
    if (catalogSort === column) setCatalogSortDescending(value => !value);
    else { setCatalogSort(column); setCatalogSortDescending(false); }
    setPage(1);
  }

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

  const tabs = ["Catalogue", "Loans & reservations", "Reports", "Rules & team"];
  const rows = tab === "Catalogue" ? filteredBooks.length : filteredLoans.length;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows / 20)));

  // Open the Catalog issue dialog with the waiting reservation prefilled.
  function handleOneClickFulfill(res: LibraryReservation) {
    const borrowerLoans = activeLoans.filter(loan => loan.borrower_id === res.borrower_id && loan.borrower_kind === res.borrower_kind);
    const maximum = res.borrower_kind === "staff" ? data.settings.staff_max_loans : data.settings.student_max_loans;
    const hasOverdue = borrowerLoans.some(loan => loan.due_date < today);
    const restriction = hasOverdue ? "Return overdue books before issuing another copy." : borrowerLoans.length >= maximum ? "Borrower has reached the active loan limit." : null;
    const targetBook = books.get(res.book_id);

    if (!targetBook) return;
    const borrower: SearchResultBorrower = {
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
    };
    setCatalogIssueRequest({ reservationId: res.id, bookId: res.book_id, borrower });
    setCatalogFilter("active");
    setQuery(targetBook.title);
    setPage(1);
    setTab("Catalogue");
  }

  const kpiCards = [
    {
      label: "Total books",
      value: totalCopyCount,
      sub: `Across ${totalTitleCount} title${totalTitleCount === 1 ? "" : "s"}`,
      destination: "Catalogue",
      icon: BookCopy,
      bg: "bg-blue-50",
      fg: "text-blue-600",
      accent: "border-t-blue-500",
    },
    {
      label: "On loan",
      value: activeLoans.length,
      destination: "Loans & reservations",
      filter: "active",
      icon: BookOpen,
      bg: "bg-emerald-50",
      fg: "text-emerald-600",
      accent: "border-t-emerald-500",
    },
    {
      label: "Overdue loans",
      value: overdue.length,
      destination: "Loans & reservations",
      filter: "overdue",
      icon: Clock3,
      bg: "bg-red-50",
      fg: "text-red-600",
      accent: "border-t-red-500",
    },
    {
      label: "Reservations",
      value: waitingReservations.length,
      destination: "Loans & reservations",
      section: "library-waiting-list",
      sub: readyReservations.length > 0 ? `${readyReservations.length} ready to issue` : undefined,
      icon: Users,
      bg: "bg-emerald-50",
      fg: "text-emerald-600",
      accent: "border-t-amber-500",
    },
  ];

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      {/* ── Top Header & Team Status ── */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button type="button" disabled={!canAdmin} onClick={() => { setTab("Rules & team"); setQuery(""); setPage(1); }} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 transition enabled:hover:bg-primary-soft enabled:hover:text-primary disabled:cursor-default">
          <UserCheck className="h-4 w-4 text-primary" />
          {librariansCount > 0 ? `Librarians: ${librariansCount}` : canAdmin ? "+ Assign Librarian" : "No librarian assigned"}
        </button>

        {(canManage || canAdmin) && (
          <div className="flex flex-wrap items-center gap-3">
            {canManage && <AddBookModal />}
            {canAdmin && (
              <button
                type="button"
                onClick={() => setTab("Rules & team")}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-outline transition hover:bg-surface-low hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
              >
                <UserRound className="h-4 w-4" /> Manage team
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map(({ label, value, sub, icon: Icon, bg, fg, accent, destination, filter, section }) => (
          <button type="button" key={label} onClick={() => { setTab(destination); setQuery(""); setPage(1); if (filter) setLoanFilter(filter); if (section) setTimeout(() => document.getElementById(section)?.scrollIntoView({ behavior: "smooth" }), 0); }} className={`flex min-w-0 items-center gap-2 rounded-2xl border border-outline/70 border-t-4 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary sm:gap-4 sm:p-5 ${accent}`}>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${bg} ${fg}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted sm:text-sm">{label}</p>
              <p className="text-xl font-bold text-ink sm:text-2xl">{value}</p>
              {sub && <p className="hidden text-xs text-muted sm:block">{sub}</p>}
            </div>
          </button>
        ))}
      </div>

      {/* ── Tab nav ── */}
      <nav aria-label="Library sections" className="flex gap-1 overflow-x-auto border-b border-outline pb-3 sm:gap-2">
        {tabs.map(item => (
          <button
            type="button"
            key={item}
            aria-current={tab === item ? "page" : undefined}
            onClick={() => { setTab(item); setQuery(""); setPage(1); }}
            className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold sm:whitespace-nowrap sm:px-4 sm:text-sm ${tab === item ? "bg-primary text-white" : "bg-white text-muted hover:bg-slate-100"}`}
          >
            <span className="sm:hidden">{item === "Loans & reservations" ? "Loans" : item === "Rules & team" ? "Rules" : item}</span>
            <span className="hidden sm:inline">{item}</span>
          </button>
        ))}
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          CATALOGUE TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Catalogue" && (
        <>
          <div className="flex min-w-0 flex-col gap-3">
            <Input
              aria-label="Search catalogue"
              placeholder="Search title, author, ISBN, shelf or Copy ID…"
              value={query}
              onChange={event => { setQuery(event.target.value); setPage(1); }}
            />
            <div role="group" aria-label="Catalogue status" className="flex flex-wrap gap-2">
              {([ ["active", "Active titles"], ["archived", "Archived titles"], ["all", "All titles"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={catalogFilter === value} onClick={() => { setCatalogFilter(value); setPage(1); }} className={`min-h-10 rounded-xl border px-3 text-xs font-semibold transition sm:text-sm ${catalogFilter === value ? "border-primary bg-primary-soft text-primary" : "border-outline/70 bg-white text-muted hover:bg-surface-low"}`}>{label}</button>)}
            </div>
          </div>

          {!filteredBooks.length && (
            <Panel title="No books found">
              <p className="text-muted">Add a title, then copies with unique Copy IDs will be generated automatically.</p>
            </Panel>
          )}

          <DataTable ariaLabel="Library catalogue" count={filteredBooks.length} itemLabel="titles" page={currentPage} pageSize={20} onPageChange={setPage} minWidthClassName="min-w-[1200px] table-fixed">
              <caption className="sr-only">Library catalogue titles, details, copy counts, and actions</caption>
              <colgroup><col className="w-[28%]" /><col className="w-[34%]" /><col className="w-[12%]" /><col className="w-[26%]" /></colgroup>
              <DataTableHeader><tr>
                <th className={dataTableHeaderCellClassName}><button type="button" onClick={() => sortCatalogue("title")} aria-label="Sort catalogue by title" className="rounded hover:text-primary focus-visible:outline-2 focus-visible:outline-primary">Book {catalogSort === "title" ? catalogSortDescending ? "↓" : "↑" : ""}</button><span className="mx-1 text-outline">/</span><button type="button" onClick={() => sortCatalogue("author")} aria-label="Sort catalogue by author" className="rounded hover:text-primary focus-visible:outline-2 focus-visible:outline-primary">Author {catalogSort === "author" ? catalogSortDescending ? "↓" : "↑" : ""}</button></th>
                <th className={dataTableHeaderCellClassName}>Details</th>
                <th className={dataTableHeaderCellClassName}><button type="button" onClick={() => sortCatalogue("copies")} aria-label="Sort catalogue by copy count" className="rounded hover:text-primary focus-visible:outline-2 focus-visible:outline-primary">Copies {catalogSort === "copies" ? catalogSortDescending ? "↓" : "↑" : ""}</button></th>
                <th className={`${dataTableHeaderCellClassName} sticky right-0 bg-surface-low text-right`}>Actions</th>
              </tr></DataTableHeader>
              <tbody>
            {filteredBooks.slice((currentPage - 1) * 20, currentPage * 20).map(book => {
              const stock = data.copies.filter(c => c.book_id === book.id);
              const totalCopies = stock.length;

              return (
                <DataTableRow key={book.id}>
                  <td className={`${dataTableCellClassName} min-w-0`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <h2 title={book.title} className="truncate font-display text-base font-bold text-ink">{book.title}</h2>
                      {book.archived && <Tag>Archived</Tag>}
                    </div>
                    <p title={book.author || ""} className="mt-1 truncate text-sm font-semibold text-primary">{book.author || "Unknown author"}</p>
                  </td>
                  <td className={dataTableCellClassName}><div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    {book.category && <span className="break-words">{book.category}</span>}
                    {book.publisher && <span className="break-words">Publisher: {book.publisher}</span>}
                    {book.shelf && <span className="break-words">Location: {book.shelf}</span>}
                    {book.isbn && <span className="break-all">ISBN: {book.isbn}</span>}
                  </div></td>
                  <td className={dataTableCellClassName}><BookMeta label="" value={String(totalCopies)} /></td>
                  <td className={`${dataTableCellClassName} sticky right-0 whitespace-nowrap bg-white text-right`}><BookActions book={book} stock={stock} grades={data.grades} sections={data.sections} settings={data.settings} canManage={canManage} /></td>
                </DataTableRow>
              );
            })}
              </tbody>
          </DataTable>
          {catalogIssueRequest && (() => {
            const book = books.get(catalogIssueRequest.bookId);
            if (!book) return null;
            const availableCopies = data.copies.filter(copy => copy.book_id === book.id && copy.status === "available").map(copy => ({ id: copy.id, accession: copy.accession, status: copy.status, book_id: book.id, book_title: book.title, author: book.author, isbn: book.isbn, shelf: book.shelf, is_eligible: true, ineligibility_reason: null }));
            return <IssueBookModal key={catalogIssueRequest.reservationId} book={book} availableCopies={availableCopies} grades={data.grades} sections={data.sections} settings={data.settings} prefilled={{ reservationId: catalogIssueRequest.reservationId, borrower: catalogIssueRequest.borrower }} showTrigger={false} onClosed={() => setCatalogIssueRequest(null)} onIssued={() => setFulfilledReservationIds(current => new Set(current).add(catalogIssueRequest.reservationId))} onReserved={() => {}} />;
          })()}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          LOANS & RESERVATIONS TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Loans & reservations" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm">
            <p>Process returns, renew loans, or manage the waiting list here.</p>
            <a href="#library-waiting-list" className="font-semibold text-primary underline">Waiting list ({waitingReservations.length})</a>
          </div>
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
          <div className="grid gap-3 lg:hidden">
            {filteredLoans.slice((currentPage - 1) * 20, currentPage * 20).map(loan => {
              const copy = copies.get(loan.copy_id);
              const days = overdueDays(loan.due_date, today);
              const maxAllowedRenewals = loan.borrower_kind === "student"
                ? (data.settings.student_max_renewals ?? data.settings.max_renewals ?? 2)
                : (data.settings.staff_max_renewals ?? 3);
              const status = loan.returned_at
                ? `${loan.outcome || "Returned"} · ${formatDate(loan.returned_at)}`
                : days ? `${days} days overdue` : "On loan";

              return (
                <article key={loan.id} className="min-w-0 rounded-2xl border border-outline/70 bg-white p-4 shadow-card">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words font-display text-base font-bold text-ink">{books.get(copy?.book_id ?? "")?.title || "Book"}</h2>
                      <p className="mt-1 break-words text-sm font-semibold text-primary">{loan.borrower_name}</p>
                    </div>
                    <Tag>{status}</Tag>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                    <div><dt className="font-bold text-muted">Copy ID</dt><dd className="mt-1 break-words text-ink">{copy?.accession || "N/A"}</dd></div>
                    <div><dt className="font-bold text-muted">Borrower</dt><dd className="mt-1 capitalize text-ink">{loan.borrower_kind}</dd></div>
                    <div><dt className="font-bold text-muted">Issued</dt><dd className="mt-1 text-ink">{formatDate(loan.issued_at)}</dd></div>
                    <div><dt className="font-bold text-muted">Due date</dt><dd className={`mt-1 font-semibold ${!loan.returned_at && days > 0 ? "text-red-700" : "text-ink"}`}>{formatDate(loan.due_date)}</dd></div>
                    <div className="col-span-2"><dt className="font-bold text-muted">Renewals</dt><dd className="mt-1 text-ink">{loan.renewals} of {maxAllowedRenewals}</dd></div>
                  </dl>
                  {canManage && !loan.returned_at && (
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-outline/50 pt-4">
                      <Button type="button" onClick={() => setActiveReturnLoan(loan)} className="w-full text-xs">Return</Button>
                      <Button type="button" variant="secondary" onClick={() => setActiveRenewLoan(loan)} className="w-full text-xs">Renew</Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <DataTable ariaLabel="Library loans" count={filteredLoans.length} itemLabel="loans" page={currentPage} pageSize={20} onPageChange={setPage} minWidthClassName="min-w-[900px]">
              <DataTableHeader><tr><th className={dataTableHeaderCellClassName}>Book / copy</th><th className={dataTableHeaderCellClassName}>Borrower</th><th className={dataTableHeaderCellClassName}>Issued</th><th className={dataTableHeaderCellClassName}>Due date</th><th className={dataTableHeaderCellClassName}>Status</th><th className={`${dataTableHeaderCellClassName} sticky right-0 bg-surface-low text-right`}>Actions</th></tr></DataTableHeader>
              <tbody>
            {filteredLoans.slice((currentPage - 1) * 20, currentPage * 20).map(loan => {
              const copy = copies.get(loan.copy_id);
              const days = overdueDays(loan.due_date, today);
              const maxAllowedRenewals = loan.borrower_kind === "student"
                ? (data.settings.student_max_renewals ?? data.settings.max_renewals ?? 2)
                : (data.settings.staff_max_renewals ?? 3);

              return (
                <DataTableRow key={loan.id}>
                  <td className={dataTableCellClassName}><p className="font-semibold text-ink">{books.get(copy?.book_id ?? "")?.title || "Book"}</p><p className="mt-1 text-xs text-muted">Copy {copy?.accession || "N/A"} · Renewals {loan.renewals}/{maxAllowedRenewals}</p></td>
                  <td className={dataTableCellClassName}><p className="font-semibold text-ink">{loan.borrower_name}</p><p className="mt-1 text-xs capitalize text-muted">{loan.borrower_kind}</p></td>
                  <td className={`${dataTableCellClassName} text-muted`}>{formatDate(loan.issued_at)}</td>
                  <td className={`${dataTableCellClassName} font-semibold ${!loan.returned_at && days > 0 ? "text-red-700" : "text-ink"}`}>{formatDate(loan.due_date)}</td>
                  <td className={dataTableCellClassName}><Tag>{loan.returned_at ? `${loan.outcome || "Returned"} · ${formatDate(loan.returned_at)}` : days ? `${days} days overdue` : "On loan"}</Tag></td>
                  <td className={`${dataTableCellClassName} sticky right-0 bg-white`}><div className="flex justify-end gap-2 whitespace-nowrap">{canManage && !loan.returned_at && <><Button type="button" onClick={() => setActiveReturnLoan(loan)} className="text-xs">Return</Button><Button type="button" variant="secondary" onClick={() => setActiveRenewLoan(loan)} className="text-xs">Renew</Button></>}</div></td>
                </DataTableRow>
              );
            })}
              </tbody>
          </DataTable>
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

      {/* ══════════════════════════════════════════════════════════════════════
          RESERVATIONS TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Loans & reservations" && (
        <div id="library-waiting-list" className="scroll-mt-24 space-y-6">
          <div className="space-y-6">
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

              {waitingReservations.length > 0 && (
                <>
                  <DataTable ariaLabel="Library reservation queue" count={waitingReservations.length} itemLabel="reservations" minWidthClassName="min-w-[800px]">
                      <DataTableHeader>
                        <tr>
                          <th className={dataTableHeaderCellClassName}>#</th>
                          <th className={dataTableHeaderCellClassName}>Book</th>
                          <th className={dataTableHeaderCellClassName}>Borrower</th>
                          <th className={dataTableHeaderCellClassName}>Requested</th>
                          <th className={dataTableHeaderCellClassName}>Status</th>
                          <th className={`${dataTableHeaderCellClassName} sticky right-0 bg-surface-low text-right`}>Actions</th>
                        </tr>
                      </DataTableHeader>
                      <tbody>
                        {waitingReservations.map((item) => {
                          const bookTitle = item.book_title || books.get(item.book_id)?.title || "Book";
                          const availCount = item.available_copies ?? data.copies.filter(c => c.book_id === item.book_id && c.status === "available").length;
                          const queuePos = item.queue_position ?? (waitingReservations.filter(r => r.book_id === item.book_id).findIndex(r => r.id === item.id) + 1);
                          const isReady = item.is_ready_to_issue ?? (queuePos === 1 && availCount > 0);

                          return (
                            <DataTableRow key={item.id}>
                              <td className={`${dataTableCellClassName} font-semibold text-ink`}>#{queuePos}</td>
                              <td className={dataTableCellClassName}>
                                <p className="font-semibold text-ink">{bookTitle}</p>
                                <p className="mt-1 text-xs text-muted">{availCount} available</p>
                              </td>
                              <td className={dataTableCellClassName}>
                                <p className="font-semibold text-ink">{item.borrower_name}</p>
                                <p className="mt-1 text-xs capitalize text-muted">{item.borrower_kind}</p>
                              </td>
                              <td className={`${dataTableCellClassName} text-muted`}>{formatDate(item.created_at)}</td>
                              <td className={dataTableCellClassName}>
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${isReady ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                                  {isReady ? "Ready to issue" : "Waiting for a return"}
                                </span>
                              </td>
                              <td className={`${dataTableCellClassName} sticky right-0 bg-white responsive-table-actions`}>
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                  {canManage && isReady ? (
                                    <Button
                                      type="button"
                                      onClick={() => handleOneClickFulfill(item)}
                                      size="sm"
                                      className="whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                      Select for issue
                                    </Button>
                                  ) : null}
                                  {canManage ? (
                                    <Form
                                      action="cancel_reservation"
                                      id={item.id}
                                      label="Cancel reservation"
                                      buttonVariant="secondary"
                                      buttonSize="sm"
                                      buttonClassName="whitespace-nowrap"
                                    />
                                  ) : null}
                                </div>
                              </td>
                            </DataTableRow>
                          );
                        })}
                      </tbody>
                  </DataTable>
                </>
              )}
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
          onNavigateTab={(targetTab, targetId) => {
            setTab(targetTab === "Reservations" ? "Loans & reservations" : targetTab);
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
          <Panel
            title="Borrowing rules"
            actions={canAdmin && canManage && !editingRules ? (
              <Button type="button" size="sm" onClick={() => setEditingRules(true)}>
                <Pencil className="h-4 w-4" /> Edit rules
              </Button>
            ) : undefined}
          >
            {editingRules && canAdmin && canManage ? (
              <Form
                key={JSON.stringify(data.settings)}
                action="settings"
                label="Save changes"
                secondaryAction={<Button type="button" variant="secondary" size="sm" onClick={() => setEditingRules(false)}>Cancel</Button>}
                onSuccess={() => setEditingRules(false)}
              >
                <p className="text-sm text-muted">
                  Changes apply to new issues and future renewals.
                </p>
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
              <div className="grid gap-3 text-sm sm:grid-cols-2" aria-label="Saved borrowing rules">
                <section className="rounded-xl bg-slate-50 p-4">
                  <h3 className="font-bold text-ink">Students</h3>
                  <dl className="mt-3 space-y-2 text-muted">
                    <div className="flex justify-between gap-3"><dt>Loan period</dt><dd className="font-semibold text-ink">{data.settings.student_loan_days ?? data.settings.loan_days} days</dd></div>
                    <div className="flex justify-between gap-3"><dt>Active loans</dt><dd className="font-semibold text-ink">{data.settings.student_max_loans ?? data.settings.max_loans}</dd></div>
                    <div className="flex justify-between gap-3"><dt>Renewals</dt><dd className="font-semibold text-ink">{data.settings.student_max_renewals ?? data.settings.max_renewals}</dd></div>
                    <div className="flex justify-between gap-3"><dt>Renewal period</dt><dd className="font-semibold text-ink">{data.settings.student_renewal_days ?? data.settings.loan_days} days</dd></div>
                  </dl>
                </section>
                <section className="rounded-xl bg-slate-50 p-4">
                  <h3 className="font-bold text-ink">Staff</h3>
                  <dl className="mt-3 space-y-2 text-muted">
                    <div className="flex justify-between gap-3"><dt>Loan period</dt><dd className="font-semibold text-ink">{data.settings.staff_loan_days ?? 30} days</dd></div>
                    <div className="flex justify-between gap-3"><dt>Active loans</dt><dd className="font-semibold text-ink">{data.settings.staff_max_loans ?? 5}</dd></div>
                    <div className="flex justify-between gap-3"><dt>Renewals</dt><dd className="font-semibold text-ink">{data.settings.staff_max_renewals ?? 3}</dd></div>
                    <div className="flex justify-between gap-3"><dt>Renewal period</dt><dd className="font-semibold text-ink">{data.settings.staff_renewal_days ?? 30} days</dd></div>
                  </dl>
                </section>
                <section className="rounded-xl bg-blue-50 p-4 text-blue-950 sm:col-span-2">
                  <h3 className="font-bold">Overdue fine</h3>
                  <p className="mt-1 text-sm">{formatMoney(data.settings.fine_per_day)} per day</p>
                </section>
              </div>
            )}
          </Panel>

          <LibraryTeamCard team={data.team} canAdmin={canAdmin} />
        </div>
      )}
    </div>
  );
}

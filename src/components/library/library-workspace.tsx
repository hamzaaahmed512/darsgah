"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen, BookCopy, Clock3, Users, Download, Pencil, Plus, UserRound, X, Info,
} from "lucide-react";
import { libraryAction } from "@/app/(app)/library/actions";
import type { LibraryData, LibraryBook } from "@/lib/services/library";
import { libraryDueDate, libraryToday, overdueDays } from "@/lib/validation/library";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form-field";

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
  action, children, label = "Save", id, reset = false, buttonVariant = "primary",
}: {
  action: string; children?: ReactNode; label?: string; id?: string;
  reset?: boolean; buttonVariant?: "primary" | "secondary" | "danger";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ error?: string; ok?: boolean } | null>(null);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const element = event.currentTarget;
        const payload = new FormData(element);
        setMessage(null);
        startTransition(async () => {
          try {
            const result = await libraryAction(payload);
            setMessage(result);
            if (result.ok) { if (reset) element.reset(); router.refresh(); }
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
        <Button type="submit" variant={buttonVariant} disabled={pending}>
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
const formatDate = (value: string) => value.slice(0, 10);

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
        hint="Estimated cost to replace a lost or irreparably damaged copy. This is separate from late-return fines.">
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
                    <Input name="quantity" type="number" required min="1" max="50" defaultValue="1" />
                  </Field>
                  <Field label="Replacement cost (Rs)"
                    hint="Estimated cost to replace a lost or irreparably damaged copy. This is separate from late-return fines.">
                    <Input name="replacement_cost" type="number" min="0" max="1000000" step="0.01"
                      placeholder="Optional" />
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
                <Field label="Quantity to add" hint="Copy IDs are generated automatically.">
                  <Input name="quantity" type="number" required min="1" max="50" defaultValue="1" />
                </Field>
                <Field label="Replacement cost (Rs)"
                  hint="Estimated cost to replace a lost or irreparably damaged copy. Leave blank to use the book default.">
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

// ─── CSV export helper ────────────────────────────────────────────────────────

function exportCsv(rows: string[][], name: string) {
  const csv = rows.map(row =>
    row.map(value => `"${(/^[=+\-@\t\r]/.test(value) ? "'" : "") + value.replaceAll('"', '""')}"`).join(",")
  ).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
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
  const today = libraryToday();
  const books = new Map(data.books.map(book => [book.id, book]));
  const copies = new Map(data.copies.map(copy => [copy.id, copy]));

  // ── Inventory definitions ──────────────────────────────────────────────────
  // Active copies: not permanently removed (lost / withdrawn copies are excluded).
  const activeCopies = data.copies.filter(c => c.status !== "lost" && c.status !== "withdrawn");
  // Available now: can be issued.
  const availableCopies = data.copies.filter(c => c.status === "available" && !books.get(c.book_id)?.archived);
  // Titles with at least one active copy (for the "Across N titles" sub-line).
  const activeTitleIds = new Set(activeCopies.map(c => c.book_id));
  const activeTitleCount = data.books.filter(b => !b.archived && activeTitleIds.has(b.id)).length;

  const activeLoans = data.loans.filter(loan => !loan.returned_at);
  const overdue = activeLoans.filter(loan => loan.due_date < today);
  const balance = data.loans.reduce((sum, loan) => sum + Number(loan.fine_amount) - Number(loan.paid_amount) - Number(loan.waived_amount), 0);
  const waiting = data.reservations.filter(item => item.status === "waiting");

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

  const borrowerSelect = (
    <Field label="Borrower">
      <Select name="borrower" required defaultValue="">
        <option value="" disabled>Select student or staff</option>
        {data.borrowers.map(b => (
          <option key={`${b.kind}:${b.id}`} value={`${b.kind}:${b.id}`}>
            {b.name} · {b.kind} · {b.reference}
          </option>
        ))}
      </Select>
    </Field>
  );
  const bookSelect = (
    <Field label="Book title">
      <Select name="book_id" required defaultValue="">
        <option value="" disabled>Select title</option>
        {data.books.filter(b => !b.archived).map(b => (
          <option key={b.id} value={b.id}>{b.title}{b.author ? ` — ${b.author}` : ""}</option>
        ))}
      </Select>
    </Field>
  );

  const tabs = ["Catalogue", "Issue & return", "Reservations", "Reports", "Rules & team"];
  const rows = tab === "Catalogue" ? filteredBooks.length : filteredLoans.length;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows / 20)));

  // ── KPI card definitions ────────────────────────────────────────────────────
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
      value: waiting.length,
      icon: Users,
      bg: "bg-emerald-50",
      fg: "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Top actions ── */}
      {(canManage || canAdmin) && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {canManage && <AddBookModal />}
          {canAdmin && (
            <Link
              href="/admin"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-ink ring-1 ring-outline transition hover:bg-surface-low hover:text-primary"
            >
              <UserRound className="h-4 w-4" /> Assign librarian
            </Link>
          )}
        </div>
      )}

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
              // Counts per the inventory rules.
              const totalCopies  = stock.filter(c => c.status !== "lost" && c.status !== "withdrawn").length;
              const availableNow = stock.filter(c => c.status === "available").length;
              const onLoan       = stock.filter(c => c.status === "on_loan").length;

              return (
                <section
                  key={book.id}
                  className="rounded-[24px] border border-outline/65 bg-white p-4 shadow-card sm:p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    {/* ── Title metadata ── */}
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
                      {/* ── Per-book copy counts ── */}
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
                      </div>
                    </div>

                    {/* ── Management actions ── */}
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

                  {/* ── Expandable copy list ── */}
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
          {canManage && (
            <Panel title="Issue a copy">
              <p className="mb-4 text-sm text-muted">
                Up to {data.settings.max_loans} active loans per borrower, for {data.settings.loan_days} days.
                Overdue borrowers must return their books first.
              </p>
              <Form action="issue" label="Issue book" reset>
                <div className="grid gap-4 lg:grid-cols-3">
                  <Field label="Available copy">
                    <Select name="copy_id" required defaultValue="">
                      <option value="" disabled>Select Copy ID / title</option>
                      {availableCopies.map(copy => (
                        <option key={copy.id} value={copy.id}>
                          {copy.accession} · {books.get(copy.book_id)?.title}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {borrowerSelect}
                  <Field label="Due date">
                    <Input name="due_date" type="date"
                      min={libraryDueDate(1)}
                      max={libraryDueDate(data.settings.loan_days)}
                      defaultValue={libraryDueDate(data.settings.loan_days)}
                      required />
                  </Field>
                </div>
              </Form>
            </Panel>
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
              return (
                <Panel key={loan.id} title={books.get(copy?.book_id ?? "")?.title || "Book"}>
                  <p className="font-semibold">
                    {loan.borrower_name}{" "}
                    <span className="text-sm font-normal text-muted">({loan.borrower_kind})</span>
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Copy ID {copy?.accession} · Issued {formatDate(loan.issued_at)} · Due {loan.due_date}
                  </p>
                  <div className="my-3 flex flex-wrap gap-2">
                    <Tag>
                      {loan.returned_at
                        ? `${loan.outcome} · ${formatDate(loan.returned_at)}`
                        : days ? `${days} days overdue` : "On loan"}
                    </Tag>
                    <Tag>{loan.renewals} renewals</Tag>
                  </div>
                  {!loan.returned_at && days > 0 && (
                    <p className="mb-3 text-sm text-red-700">
                      Estimated overdue fine: {formatMoney(days * Number(loan.fine_per_day))}
                    </p>
                  )}
                  {canManage && !loan.returned_at && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Form action="return" id={loan.id} label="Close loan">
                        <Field label="Return condition">
                          <Select name="outcome">
                            <option value="returned">Returned in good condition</option>
                            <option value="damaged">Returned damaged</option>
                            <option value="lost">Lost — charge replacement cost</option>
                          </Select>
                        </Field>
                      </Form>
                      {days === 0 && loan.renewals < data.settings.max_renewals && (
                        <Form action="renew" id={loan.id} label={`Renew +${data.settings.loan_days} days`} />
                      )}
                    </div>
                  )}
                  {loan.returned_at && (
                    <p className="text-sm text-muted">
                      Fine: {formatMoney(loan.fine_amount)} · Paid: {formatMoney(loan.paid_amount)} ·
                      Waived: {formatMoney(loan.waived_amount)} · Balance: {formatMoney(remaining)}
                    </p>
                  )}
                  {canManage && remaining > 0 && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-semibold text-primary">
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
      {tab === "Reservations" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {canManage && (
            <Panel title="Reserve a title">
              <p className="mb-4 text-sm text-muted">
                Reservations are served in order for each title. Issue any available copy to the first borrower
                in its queue to fulfil the reservation.
              </p>
              <Form action="reserve" label="Add reservation" reset>
                {bookSelect}
                {borrowerSelect}
              </Form>
            </Panel>
          )}
          <Panel title="Waiting queue">
            {/* Reservation policy note */}
            <div className="mb-4 flex gap-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <p>
                Reservations are <strong>waiting-list requests</strong>. The system does not allocate a specific
                physical copy — issue any available copy to the first borrower in the queue to fulfil the
                reservation. Available copy counts are not reduced by waiting requests.
              </p>
            </div>
            {!waiting.length && <p className="text-muted">No waiting reservations.</p>}
            <div className="space-y-4">
              {waiting.map(item => (
                <div key={item.id} className="rounded-xl border border-outline p-4">
                  <p className="font-semibold">{books.get(item.book_id)?.title}</p>
                  <p className="my-2 text-sm text-muted">{item.borrower_name} · {formatDate(item.created_at)}</p>
                  {canManage && (
                    <Form action="cancel_reservation" id={item.id} label="Cancel reservation" />
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          REPORTS TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Reports" && (
        <>
          <Panel title="Library summary">
            <div className="grid gap-4 sm:grid-cols-3">
              <p>Total titles <strong className="block text-2xl">{data.books.length}</strong></p>
              <p>Total copies <strong className="block text-2xl">{activeCopies.length}</strong></p>
              <p>Outstanding fines <strong className="block text-2xl">{formatMoney(balance)}</strong></p>
            </div>
            <p className="mt-4 text-sm text-muted">
              Fine payments are library records. They are not automatically posted to the school finance ledger.
              Overdue estimates become charges when a loan is closed.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                onClick={() => exportCsv(
                  [["Copy ID", "Title", "Author", "ISBN", "Shelf", "Status", "Replacement cost"],
                    ...data.copies.map(copy => {
                      const book = books.get(copy.book_id);
                      return [copy.accession, book?.title || "", book?.author || "", book?.isbn || "",
                        book?.shelf || "", copy.status, copy.replacement_cost != null ? String(copy.replacement_cost) : ""];
                    })],
                  "library-inventory.csv"
                )}
              >
                <Download className="mr-2 h-4 w-4" />Inventory CSV
              </Button>
              <Button
                onClick={() => exportCsv(
                  [["Borrower", "Type", "Copy ID", "Title", "Issued", "Due", "Returned", "Outcome", "Fine", "Paid", "Waived"],
                    ...data.loans.map(loan => {
                      const copy = copies.get(loan.copy_id);
                      return [loan.borrower_name, loan.borrower_kind, copy?.accession || "",
                        books.get(copy?.book_id || "")?.title || "", formatDate(loan.issued_at), loan.due_date,
                        loan.returned_at ? formatDate(loan.returned_at) : "", loan.outcome || "on loan",
                        String(loan.fine_amount), String(loan.paid_amount), String(loan.waived_amount)];
                    })],
                  "library-loans.csv"
                )}
              >
                <Download className="mr-2 h-4 w-4" />Loan history CSV
              </Button>
              <Button
                onClick={() => exportCsv(
                  [["Borrower", "Copy ID", "Title", "Due", "Days overdue"],
                    ...overdue.map(loan => {
                      const copy = copies.get(loan.copy_id);
                      return [loan.borrower_name, copy?.accession || "",
                        books.get(copy?.book_id || "")?.title || "", loan.due_date,
                        String(overdueDays(loan.due_date))];
                    })],
                  "library-overdue.csv"
                )}
              >
                Overdue CSV
              </Button>
            </div>
          </Panel>

          <Panel title="Recent activity">
            <p className="mb-4 text-sm text-muted">Latest 100 actions. Full audit records are retained.</p>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {data.events.map(event => (
                <div key={event.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <strong className="capitalize">{event.action.replaceAll("_", " ")}</strong>
                  <span className="ml-3 text-muted">
                    {new Date(event.created_at).toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}
                  </span>
                  {event.details.title && <span className="ml-3">{event.details.title}</span>}
                  {event.details.accession && <span className="ml-3">{event.details.accession}</span>}
                  {event.details.amount && <span className="ml-3">Rs {event.details.amount}</span>}
                  {event.details.reason && <p className="mt-1">{event.details.reason}</p>}
                </div>
              ))}
              {!data.events.length && <p className="text-muted">No activity yet.</p>}
            </div>
          </Panel>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          RULES & TEAM TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Rules & team" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Borrowing rules">
            <p className="mb-4 text-sm text-muted">
              Changes apply to new issues and future renewals. Existing loans keep their original daily fine rate.
            </p>
            {canAdmin && canManage ? (
              <Form action="settings" label="Save borrowing rules">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Loan period (days)">
                    <Input name="loan_days" type="number" required min="1" max="90" defaultValue={data.settings.loan_days} />
                  </Field>
                  <Field label="Maximum active loans">
                    <Input name="max_loans" type="number" required min="1" max="30" defaultValue={data.settings.max_loans} />
                  </Field>
                  <Field label="Maximum renewals">
                    <Input name="max_renewals" type="number" required min="0" max="10" defaultValue={data.settings.max_renewals} />
                  </Field>
                  <Field label="Overdue fine per day (Rs)">
                    <Input name="fine_per_day" type="number" required min="0" max="10000" step="0.01" defaultValue={data.settings.fine_per_day} />
                  </Field>
                </div>
              </Form>
            ) : (
              <ul className="space-y-3 text-sm">
                <li>Loan period: {data.settings.loan_days} days</li>
                <li>Active loans per borrower: {data.settings.max_loans}</li>
                <li>Renewals allowed: {data.settings.max_renewals}</li>
                <li>Daily fine: {formatMoney(data.settings.fine_per_day)}</li>
              </ul>
            )}
          </Panel>

          <Panel title="Library team & workflow">
            <ol className="list-decimal space-y-3 pl-5 text-sm leading-6">
              <li>The principal creates a staff account with the Librarian role, or assigns Librarian to an existing member in Admin Console.</li>
              <li>The librarian adds titles and sets the number of copies — Copy IDs (e.g. LIB-0001) are generated automatically.</li>
              <li>Issue a copy to an active student or staff member with a due date.</li>
              <li>Renew eligible loans, process returns, or record damaged and lost copies.</li>
              <li>Review overdue records and record fine payments. The principal or administrator can approve waivers.</li>
            </ol>
            <p className="mt-4 text-sm text-muted">
              Assigning the Librarian role replaces the member's current role. New librarian accounts use the existing staff sign-in and password setup.
            </p>
            {canAdmin && (
              <div className="mt-5 flex gap-4 text-sm font-semibold text-primary">
                <Link href="/staff">Create librarian account →</Link>
                <Link href="/admin">Assign existing member →</Link>
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}

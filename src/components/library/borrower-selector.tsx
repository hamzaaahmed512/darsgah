"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X, Check, AlertCircle, Loader2, User, GraduationCap, Briefcase } from "lucide-react";
import { searchBorrowersAction } from "@/app/(app)/library/actions";
import type { LibraryGrade, LibrarySection, SearchResultBorrower } from "@/lib/services/library";
import { Input, Select } from "@/components/ui/form-field";

interface BorrowerSelectorProps {
  grades?: LibraryGrade[];
  sections?: LibrarySection[];
  onSelect: (borrower: SearchResultBorrower | null) => void;
  selectedBorrower: SearchResultBorrower | null;
  keepSearchVisible?: boolean;
}

export function BorrowerSelector({
  grades = [],
  sections = [],
  onSelect,
  selectedBorrower,
  keepSearchVisible = true
}: BorrowerSelectorProps) {
  const [kind, setKind] = useState<"student" | "staff">("student");
  const [selectedGradeId, setSelectedGradeId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultBorrower[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [searchError, setSearchError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const availableSections = sections || [];

  function handleKindChange(newKind: "student" | "staff") {
    setKind(newKind);
    setSelectedGradeId("");
    setSelectedSectionId("");
    setQuery("");
    setResults([]);
    onSelect(null);
    setIsOpen(true);
  }

  function handleGradeChange(gradeId: string) {
    setSelectedGradeId(gradeId);
    setSelectedSectionId("");
    if (selectedBorrower && selectedBorrower.kind === "student" && gradeId && selectedBorrower.grade_id !== gradeId) {
      onSelect(null);
    }
    setIsOpen(true);
  }

  function handleSectionChange(sectionId: string) {
    setSelectedSectionId(sectionId);
    if (selectedBorrower && selectedBorrower.kind === "student" && sectionId && selectedBorrower.section_id !== sectionId) {
      onSelect(null);
    }
    setIsOpen(true);
  }

  useEffect(() => {
    let isCancelled = false;
    const handler = setTimeout(() => {
      startTransition(async () => {
        try {
          setSearchError(null);
          const data = await searchBorrowersAction(
            kind,
            query,
            kind === "student" ? selectedGradeId || undefined : undefined,
            kind === "student" ? selectedSectionId || undefined : undefined
          );
          if (!isCancelled) {
            setResults(data);
            setFocusedIndex(-1);
          }
        } catch (err) {
          if (!isCancelled) {
            setSearchError("Failed to search borrowers. Please try again.");
          }
        }
      });
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(handler);
    };
  }, [kind, query, selectedGradeId, selectedSectionId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < results.length) {
        onSelect(results[focusedIndex]);
        setQuery(results[focusedIndex].name);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative space-y-3">
      <input type="hidden" name="borrower_kind" value={selectedBorrower ? selectedBorrower.kind : kind} />
      <input type="hidden" name="borrower_id" value={selectedBorrower ? selectedBorrower.id : ""} />
      <input type="hidden" name="borrower" value={selectedBorrower ? `${selectedBorrower.kind}:${selectedBorrower.id}` : ""} />

      <label className="block text-sm font-semibold text-ink">
        Borrower <span className="text-red-500">*</span>
      </label>

      {selectedBorrower && !keepSearchVisible ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-primary-soft/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-primary/10 p-2.5 text-primary">
              {selectedBorrower.kind === "student" ? <GraduationCap className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-ink">{selectedBorrower.name}</span>
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 capitalize">
                  {selectedBorrower.kind}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted">
                {selectedBorrower.kind === "student" ? (
                  <>
                    Grade {selectedBorrower.grade_name || "N/A"} · Section {selectedBorrower.section_name || "N/A"} · Registration #{selectedBorrower.registration_number || selectedBorrower.reference}
                  </>
                ) : (
                  <>
                    {selectedBorrower.job_title || "Staff"} {selectedBorrower.department ? `· ${selectedBorrower.department}` : ""} {selectedBorrower.email ? `· ${selectedBorrower.email}` : ""}
                  </>
                )}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                <span className={`rounded-full px-2 py-0.5 ${selectedBorrower.has_overdue ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                  Active loans: {selectedBorrower.active_loans_count} of {selectedBorrower.max_loans_allowed}
                </span>
                {selectedBorrower.has_overdue && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">
                    OVERDUE BOOKS EXIST
                  </span>
                )}
              </div>
              {selectedBorrower.ineligibility_reason && (
                <p className="mt-1.5 text-xs font-medium text-red-600">
                  ⚠️ {selectedBorrower.ineligibility_reason}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="self-start rounded-xl border border-outline bg-white px-3 py-1.5 text-xs font-semibold text-muted hover:bg-slate-50 hover:text-ink sm:self-center"
          >
            Change borrower
          </button>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-outline/70 bg-white p-4 shadow-sm">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleKindChange("student")}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${kind === "student" ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => handleKindChange("staff")}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${kind === "staff" ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              Staff
            </button>
          </div>

          {kind === "student" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">Grade Filter</label>
                <Select
                  value={selectedGradeId}
                  onChange={(e) => handleGradeChange(e.target.value)}
                  className="text-xs"
                >
                  <option value="">All grades</option>
                  {(grades || []).map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">Section Filter</label>
                <Select
                  value={selectedSectionId}
                  onChange={(e) => handleSectionChange(e.target.value)}
                  className="text-xs"
                >
                  <option value="">All sections</option>
                  {(availableSections || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={
                kind === "student"
                  ? "Search by student name or registration number…"
                  : "Search by staff name, ID, or department…"
              }
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              className="pl-9 text-sm"
              role="combobox"
              aria-expanded={isOpen}
              aria-autocomplete="list"
            />
            {isPending && (
              <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted" />
            )}
          </div>

          {isOpen && (
            <div className="max-h-60 overflow-y-auto rounded-xl border border-outline bg-white py-1 shadow-lift">
              {searchError && (
                <div className="p-3 text-center text-xs font-semibold text-red-600">
                  {searchError}
                </div>
              )}

              {!isPending && results.length === 0 && !searchError && (
                <div className="p-4 text-center text-xs text-muted">
                  No {kind}s found matching your search.
                </div>
              )}

              {results.map((b, index) => {
                const isFocused = index === focusedIndex;
                return (
                  <button
                    key={`${b.kind}:${b.id}`}
                    type="button"
                    onClick={() => {
                      onSelect(b);
                      setQuery(b.name);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={`flex w-full cursor-pointer flex-col px-4 py-2.5 text-left transition ${
                      isFocused ? "bg-primary-soft/30" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink">{b.name}</span>
                      <span className={`text-[11px] font-semibold ${b.is_eligible ? "text-emerald-700" : "text-red-600"}`}>
                        {b.is_eligible ? "Eligible" : "Restricted"}
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      {b.kind === "student" ? (
                        <>
                          Grade {b.grade_name || "N/A"} · Section {b.section_name || "N/A"} · Registration #{b.registration_number || b.reference}
                        </>
                      ) : (
                        <>
                          {b.job_title || "Staff"} {b.department ? `· ${b.department}` : ""} {b.email ? `· ${b.email}` : ""}
                        </>
                      )}
                    </p>
                    {b.ineligibility_reason && (
                      <p className="mt-0.5 text-[11px] text-red-600">
                        {b.ineligibility_reason}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

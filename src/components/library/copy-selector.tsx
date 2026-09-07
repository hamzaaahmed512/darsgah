"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search, Loader2, BookOpen, Check, AlertCircle } from "lucide-react";
import { searchCopiesAction } from "@/app/(app)/library/actions";
import type { SearchResultCopy } from "@/lib/services/library";
import { Input } from "@/components/ui/form-field";

interface CopySelectorProps {
  borrowerKind?: string | null;
  borrowerId?: string | null;
  onSelect: (copy: SearchResultCopy | null) => void;
  selectedCopy: SearchResultCopy | null;
}

export function CopySelector({
  borrowerKind,
  borrowerId,
  onSelect,
  selectedCopy
}: CopySelectorProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultCopy[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [searchError, setSearchError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced copy search
  useEffect(() => {
    let isCancelled = false;
    const handler = setTimeout(() => {
      startTransition(async () => {
        try {
          setSearchError(null);
          const data = await searchCopiesAction(query, borrowerKind || undefined, borrowerId || undefined);
          if (!isCancelled) {
            setResults(data);
            setFocusedIndex(-1);
          }
        } catch (err) {
          if (!isCancelled) {
            setSearchError("Failed to search book copies. Please try again.");
          }
        }
      });
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(handler);
    };
  }, [query, borrowerKind, borrowerId]);

  // Click outside listener
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
      if (e.key === "ArrowDown" || e.key === "Enter") setIsOpen(true);
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
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative space-y-2">
      <input type="hidden" name="copy_id" value={selectedCopy ? selectedCopy.id : ""} />

      <label className="block text-sm font-semibold text-ink">
        Book copy <span className="text-red-500">*</span>
      </label>

      {/* Selected Copy Card */}
      {selectedCopy ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-emerald-300 bg-emerald-50/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-emerald-100 p-2.5 text-emerald-800">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-ink">{selectedCopy.book_title}</span>
                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  Copy {selectedCopy.accession}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                {selectedCopy.author ? `${selectedCopy.author} · ` : ""}
                Shelf: {selectedCopy.shelf || "General"}
                {selectedCopy.isbn ? ` · ISBN: ${selectedCopy.isbn}` : ""}
              </p>
              {selectedCopy.ineligibility_reason && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  ⚠️ {selectedCopy.ineligibility_reason}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="self-start rounded-xl border border-outline bg-white px-3 py-1.5 text-xs font-semibold text-muted hover:bg-slate-50 hover:text-ink sm:self-center"
          >
            Change copy
          </button>
        </div>
      ) : (
        /* Copy Search Input */
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <Input
            type="text"
            placeholder="Search by book title, ISBN, or Copy ID (e.g. LIB-001)…"
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
          />
          {isPending && (
            <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted" />
          )}

          {isOpen && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-outline bg-white py-1 shadow-lift">
              {searchError && (
                <div className="p-3 text-center text-xs font-semibold text-red-600">
                  {searchError}
                </div>
              )}

              {!isPending && results.length === 0 && !searchError && (
                <div className="p-4 text-center text-xs text-muted">
                  No copies found matching your search.
                </div>
              )}

              {results.map((c, index) => {
                const isFocused = index === focusedIndex;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSelect(c);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={`flex w-full cursor-pointer flex-col px-4 py-2.5 text-left transition ${
                      isFocused ? "bg-primary-soft/30" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink">{c.book_title}</span>
                      <span className={`text-[11px] font-semibold ${c.is_eligible ? "text-emerald-700" : "text-amber-700"}`}>
                        {c.is_eligible ? "Available" : c.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      Copy <strong className="text-ink">{c.accession}</strong> · Shelf {c.shelf || "General"}
                      {c.isbn ? ` · ISBN ${c.isbn}` : ""}
                    </p>
                    {c.ineligibility_reason && (
                      <p className="mt-0.5 text-[11px] text-amber-700">
                        {c.ineligibility_reason}
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

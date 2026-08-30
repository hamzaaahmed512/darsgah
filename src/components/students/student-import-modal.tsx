"use client";

import { useState, useTransition } from "react";
import { X, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";
import { importStudentsAction } from "@/app/(app)/students/actions";
import { Badge } from "@/components/ui/badge";
import { formatFullName } from "@/lib/student-name";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type ParsedRecord = {
  _valid: boolean;
  _errors: string[];
  admission_number: string;
  name_en: string;
  name_ur: string;
  father_name_en: string;
  father_phone: string;
  class_name: string;
  gender: string;
  date_of_birth: string;
  status: string;
};

export function StudentImportModal({ isOpen, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [records, setRecords] = useState<ParsedRecord[] | null>(null);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setError("");
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as any[];

      if (json.length === 0) {
        throw new Error("The uploaded file is empty.");
      }

      const parsed: ParsedRecord[] = json.map((row) => {
        // Standardize keys by lowercasing them to handle case variations
        const lowerRow: any = {};
        Object.keys(row).forEach(k => { lowerRow[k.trim().toLowerCase()] = row[k]; });

        const admNo = String(lowerRow["admission number"] || lowerRow["admission no"] || lowerRow["admission_number"] || "");
        const firstName = String(lowerRow["first name"] || lowerRow["name"] || lowerRow["name (en)"] || "");
        const lastName = String(lowerRow["last name"] || "");
        const nameEn = String(lowerRow["name (en)"] || formatFullName(firstName, lastName)).trim();
        const grade = String(lowerRow["grade"] || lowerRow["class"] || "");

        const record: ParsedRecord = {
          _valid: true,
          _errors: [],
          admission_number: admNo,
          name_en: nameEn,
          name_ur: String(lowerRow["name (ur)"] || ""),
          father_name_en: String(lowerRow["father name"] || lowerRow["guardian name"] || ""),
          father_phone: String(lowerRow["contact number"] || lowerRow["father phone"] || lowerRow["phone"] || ""),
          class_name: grade,
          gender: String(lowerRow["gender"] || ""),
          date_of_birth: String(lowerRow["date of birth"] || lowerRow["dob"] || ""),
          status: String(lowerRow["status"] || "active")
        };

        if (!record.admission_number) {
          record._valid = false;
          record._errors.push("Missing Admission No.");
        }
        if (!record.name_en) {
          record._valid = false;
          record._errors.push("Missing Name");
        }
        if (!record.class_name) {
          record._valid = false;
          record._errors.push("Missing Grade/Class");
        }

        return record;
      });

      setRecords(parsed);
    } catch (err: any) {
      setError(err.message || "Failed to parse file.");
    }
  };

  const handleConfirm = () => {
    if (!records) return;
    const validRecords = records.filter(r => r._valid);
    if (validRecords.length === 0) {
      setError("No valid records to import.");
      return;
    }

    startTransition(async () => {
      setError("");
      const res = await importStudentsAction(validRecords);
      if (res?.error) {
        setError(res.error);
      } else {
        alert(`Successfully imported ${res?.count} students.`);
        handleReset();
      }
    });
  };

  const handleReset = () => {
    setRecords(null);
    setError("");
    onClose();
  };

  const validCount = records?.filter(r => r._valid).length || 0;
  const invalidCount = (records?.length || 0) - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-outline/30 px-6 py-4">
          <h2 className="text-xl font-bold text-ink">Import Students</h2>
          <button onClick={handleReset} className="rounded-full p-1 text-muted hover:bg-surface-low hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" /> {error}
            </div>
          )}

          {!records ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline/50 bg-surface-low py-12">
              <FileSpreadsheet className="mb-4 h-12 w-12 text-muted" />
              <h3 className="mb-1 font-semibold text-ink">Upload Spreadsheet</h3>
              <p className="mb-6 text-sm text-muted">Supports .xlsx, .xls, and .csv files.</p>
              <label className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-ink">
                Browse Files
                <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-surface-low p-4">
                <div>
                  <h3 className="font-semibold text-ink">Preview Records</h3>
                  <p className="text-sm text-muted">Found {records.length} total rows.</p>
                </div>
                <div className="flex gap-3">
                  <Badge tone="green">{validCount} Valid</Badge>
                  {invalidCount > 0 && <Badge tone="red">{invalidCount} Invalid</Badge>}
                </div>
              </div>

              <div className="max-h-[60vh] overflow-auto rounded-xl border border-outline/30">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 bg-surface-low font-label text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Adm No.</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3">Father Name</th>
                      <th className="px-4 py-3">Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={i} className={`border-t border-outline/30 ${!r._valid ? "bg-red-50/50" : "hover:bg-surface-low/50"}`}>
                        <td className="px-4 py-3">
                          {r._valid ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <div className="flex items-center gap-1 text-red-600" title={r._errors.join(", ")}>
                              <AlertCircle className="h-5 w-5" />
                              <span className="text-xs font-semibold">Error</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium">{r.admission_number || "-"}</td>
                        <td className="px-4 py-3">{r.name_en || "-"}</td>
                        <td className="px-4 py-3">{r.class_name || "-"}</td>
                        <td className="px-4 py-3">{r.father_name_en || "-"}</td>
                        <td className="px-4 py-3">{r.father_phone || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-outline/30 bg-surface-low px-6 py-4">
          <button onClick={handleReset} className="rounded-lg px-4 py-2 text-sm font-semibold text-muted hover:bg-outline/20">
            Cancel
          </button>
          {records && (
            <button
              onClick={handleConfirm}
              disabled={isPending || validCount === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-ink disabled:opacity-50"
            >
              {isPending ? "Saving..." : `Confirm & Save (${validCount})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

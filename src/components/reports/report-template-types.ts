import type { ReportSchool } from "./profile-report-types";

export interface ReportSection {
  title: string;
  subtitle?: string;
  status?: string;
  metrics?: Array<{ label: string; value: string; note?: string }>;
  details?: Array<[string, string]>;
  headers?: string[];
  rows?: Array<Array<string | number>>;
  note?: string;
  signatures?: string[];
}

export interface ReportTemplateData {
  title: string;
  school?: ReportSchool;
  sections: ReportSection[];
}

/** Continue unusually long cells on additional rows instead of clipping a page. */
export function expandReportRows(rows: Array<Array<string | number>>) {
  return rows.flatMap((row) => {
    const chunkSize = Math.max(40, Math.min(240, Math.floor(1200 / Math.max(1, row.length))));
    const cells = row.map((cell) => {
      const chars = Array.from(String(cell ?? ""));
      const chunks: string[] = [];
      for (let start = 0; start < chars.length; start += chunkSize) chunks.push(chars.slice(start, start + chunkSize).join(""));
      return chunks;
    });
    return Array.from({ length: Math.max(1, ...cells.map((cell) => cell.length)) }, (_, index) => cells.map((cell) => cell[index] ?? ""));
  });
}

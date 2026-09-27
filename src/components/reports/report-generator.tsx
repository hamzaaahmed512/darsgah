"use client";

import { ReportExport } from "./ReportExport";

interface ReportGeneratorProps {
  data: (string | number)[][];
  headers: string[];
  title: string;
  filters?: Record<string, string | undefined>;
  schoolName?: string;
  autoOpen?: boolean;
}

/** All existing table exports use the shared vector PDF template. */
export function ReportGenerator({ data, headers, title, filters, schoolName, autoOpen }: ReportGeneratorProps) {
  const activeFilters = Object.entries(filters ?? {}).filter(([, value]) => value && value !== "all");
  return <ReportExport autoOpen={autoOpen} data={{
    title,
    school: schoolName ? { name: schoolName } : undefined,
    sections: [{
      title,
      subtitle: activeFilters.map(([label, value]) => `${label}: ${value}`).join(" / "),
      metrics: [
        { label: "Records", value: String(data.length) },
        { label: "Columns", value: String(headers.length) },
        { label: "Active filters", value: String(activeFilters.length) }
      ],
      headers,
      rows: data
    }]
  }} />;
}

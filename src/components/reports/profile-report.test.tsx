// @vitest-environment node
import React from "react";
import { mkdir, writeFile } from "node:fs/promises";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { StaffReportPDF } from "./StaffReportPDF";
import { StudentReportPDF } from "./StudentReportPDF";
import { ReportTemplatePDF } from "./ReportTemplatePDF";
import { expandReportRows } from "./report-template-types";
import { reportDate, reportFilename, reportMoney, reportRate } from "./profile-report-format";
import type { StaffReportData, StudentReportData } from "./profile-report-types";

const generatedAt = "2026-09-24T07:00:00.000Z";
const staff: StaffReportData = {
  fullName: "Ayesha Ahmed", status: "active", staffId: "STF-0042", role: "Senior Science Teacher",
  email: "ayesha.ahmed@example.com", phone: "+92 300 1234567", department: "Science",
  joiningDate: "2021-08-16", monthlyPay: 68000, attendanceRate: 96.4, daysPresent: 135,
  attendanceNote: "Current year • Present + late / recorded days"
};
const student: StudentReportData = {
  fullName: "Muhammad Ali Khan", status: "active", admissionId: "NGSS-2026-0184", rollNumber: "24",
  classSection: "Grade 9 • Section A", guardianName: "Ahmed Khan", phone: "+92 321 7654321",
  address: "House 18, Street 7, Satellite Town, Rawalpindi", feeStatus: "Paid", attendanceRate: 94,
  school: { address: "Satellite Town, Rawalpindi • Pakistan" }
};

beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());

describe("profile PDF output", () => {
  it.each(["staff", "student", "long-student", "empty-staff"] as const)("renders %s as one vector A4 page", async (kind) => {
    const document = kind === "staff" ? <StaffReportPDF data={staff} generatedAt={generatedAt} />
      : kind === "empty-staff" ? <StaffReportPDF data={{ fullName: "Inactive Staff", status: "inactive", staffId: "42", role: "Staff", payRestricted: true }} generatedAt={generatedAt} />
      : <StudentReportPDF generatedAt={generatedAt} data={kind === "student" ? student : {
        ...student, fullName: "A very long student profile name ".repeat(8), address: "A very long street address ".repeat(40),
        classSection: "An unusually long grade and section name ".repeat(8), guardianName: "A long guardian name ".repeat(12),
        status: "pending_approval", feesRestricted: true
      }} />;
    const buffer = await renderToBuffer(document);
    const pdf = buffer.toString("latin1");
    expect(pdf.startsWith("%PDF-")).toBe(true);
    expect(pdf.match(/\/Type \/Page\b/g)).toHaveLength(1);
    const pageSize = pdf.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);
    expect(Number(pageSize?.[1])).toBeCloseTo(595.28, 1);
    expect(Number(pageSize?.[2])).toBeCloseTo(841.89, 1);
    // Text is embedded as font-backed PDF content, not a full-page screenshot.
    expect(pdf).toContain("/BaseFont /Helvetica");
    if (process.env.PDF_QA_OUTPUT === "1") {
      await mkdir("tmp/pdfs", { recursive: true });
      await writeFile(`tmp/pdfs/${kind}.pdf`, buffer);
    }
  });
});

describe("report formatting", () => {
  it("preserves every character when continuing long table cells", () => {
    const original = "Detailed teacher comment ".repeat(100);
    const rows = expandReportRows([["Ali", original, "A"]]);
    expect(rows.length).toBeGreaterThan(1);
    expect(rows.map((row) => row[1]).join("")).toBe(original);
  });
  it("distinguishes zero from missing values", () => {
    expect(reportMoney(0)).toBe("PKR 0");
    expect(reportMoney(null)).toBe("Not recorded");
    expect(reportRate(0)).toBe("0%");
    expect(reportRate(null)).toBe("No records");
    expect(reportRate(NaN)).toBe("No records");
  });
  it("uses Pakistan time and handles invalid dates", () => {
    expect(reportDate("invalid")).toBe("Not recorded");
    expect(reportDate(generatedAt, true)).toContain("12:00 PKT");
  });
  it("sanitizes filenames", () => {
    expect(reportFilename("student", "Ali / Khan:?", generatedAt)).toBe("student-Ali-Khan-2026-09-24.pdf");
  });
});

describe("shared app-wide PDF template", () => {
  it("paginates long tables on A4 without dropping rows", async () => {
    const buffer = await renderToBuffer(<ReportTemplatePDF generatedAt={generatedAt} data={{ title: "Attendance Report", sections: [{
      title: "Daily Attendance", subtitle: "Grade 9 / Section A • 24 Sep 2026",
      metrics: [{ label: "Students", value: "100" }, { label: "Present", value: "95" }, { label: "Absent", value: "5" }],
      headers: ["Student", "Admission ID", "Status"],
      rows: Array.from({ length: 100 }, (_, i) => [`Student ${String(i + 1).padStart(3, "0")}`, `ADM-${i + 1}`, i < 95 ? "Present" : "Absent"])
    }] }} />);
    const pdf = buffer.toString("latin1");
    expect(pdf.match(/\/Type \/Page\b/g)?.length).toBeGreaterThan(1);
    for (const size of pdf.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)) {
      expect(Number(size[1])).toBeCloseTo(595.28, 1);
      expect(Number(size[2])).toBeCloseTo(841.89, 1);
    }
    if (process.env.PDF_QA_OUTPUT === "1") await writeFile("tmp/pdfs/attendance.pdf", buffer);
  });
  it("starts separate result cards on new pages and renders receipt metadata", async () => {
    const buffer = await renderToBuffer(<ReportTemplatePDF generatedAt={generatedAt} data={{ title: "Results and receipt QA", sections: [
      { title: "Ali Khan", subtitle: "Result Card / Grade 9 A / Monthly examination", status: "Partial results - Mathematics pending",
        metrics: [{ label: "Total marks", value: "85 / 100" }, { label: "Percentage", value: "85%" }, { label: "Grade", value: "A" }],
        details: [["Admission ID", "ADM-123"]], headers: ["Subject", "Marks", "Grade", "Teacher comment"],
        rows: [["Science", "85 / 100", "A", "Excellent work"]], signatures: ["Class Teacher", "Principal"] },
      { title: "Payment Receipt", subtitle: "REC-000123", metrics: [{ label: "Amount paid", value: "PKR 5,000" }, { label: "Method", value: "Cash" }, { label: "Payment date", value: "24 Sep 2026" }],
        details: [["Student", "Ali Khan"], ["Admission ID", "ADM-123"], ["Class & section", "Grade 9 A"], ["Session", "2026-27"], ["Reference", "TX-100"], ["Received by", "Cashier"]], note: "September fee payment." }
    ] }} />);
    expect(buffer.toString("latin1").match(/\/Type \/Page\b/g)).toHaveLength(2);
    if (process.env.PDF_QA_OUTPUT === "1") await writeFile("tmp/pdfs/results-receipt.pdf", buffer);
  });
});

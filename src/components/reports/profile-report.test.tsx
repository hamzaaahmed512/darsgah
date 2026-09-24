// @vitest-environment node
import React from "react";
import { mkdir, writeFile } from "node:fs/promises";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { StaffReportPDF } from "./StaffReportPDF";
import { StudentReportPDF } from "./StudentReportPDF";
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

import { describe, expect, it } from "vitest";
import { isSpreadsheetFile, readSpreadsheetPreview, rowsToCsv } from "./spreadsheet-preview";

describe("spreadsheet preview helpers", () => {
  it("recognizes supported spreadsheet exports", () => {
    expect(isSpreadsheetFile("students.csv")).toBe(true);
    expect(isSpreadsheetFile("students.xlsx")).toBe(true);
    expect(isSpreadsheetFile("report.pdf")).toBe(false);
  });

  it("parses quoted CSV cells into rows and columns", async () => {
    const sheets = await readSpreadsheetPreview(new Blob(['Name,Note\nAli,"Present, on time"'], { type: "text/csv" }));
    expect(sheets[0]?.rows).toEqual([
      ["Name", "Note"],
      ["Ali", "Present, on time"]
    ]);
  });

  it("escapes spreadsheet values when downloading again", () => {
    expect(rowsToCsv([["Name", "Note"], ["Ali", 'Said "hello"']]))
      .toBe('"Name","Note"\n"Ali","Said ""hello"""');
  });
});

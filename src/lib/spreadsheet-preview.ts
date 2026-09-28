export const SPREADSHEET_PREVIEW_MESSAGE = "darsgah:spreadsheet-preview";
export const SPREADSHEET_PREVIEW_READY_MESSAGE = "darsgah:spreadsheet-preview-ready";

export type SpreadsheetPreviewSheet = {
  name: string;
  rows: string[][];
};

export type SpreadsheetPreviewPayload = {
  previewId: string;
  title: string;
  filename: string;
  createdAt: number;
  sheets: SpreadsheetPreviewSheet[];
};

export function isSpreadsheetFile(filename: string, type = "") {
  return /\.(csv|xls|xlsx)$/i.test(filename) || type.includes("csv") || type.includes("spreadsheet") || type.includes("excel");
}

function blobToArrayBuffer(blob: Blob) {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read this spreadsheet."));
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(blob);
  });
}

export async function readSpreadsheetPreview(blob: Blob): Promise<SpreadsheetPreviewSheet[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await blobToArrayBuffer(blob), { type: "array", cellDates: true });

  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Array<string | number | boolean | Date | null>>(sheet, {
      header: 1,
      defval: "",
      raw: false,
      dateNF: "dd mmm yyyy"
    });

    return {
      name,
      rows: rows.map((row) => row.map((cell) => cell instanceof Date ? cell.toISOString() : String(cell ?? "")))
    };
  }).filter((sheet) => sheet.rows.length > 0);
}

export function rowsToCsv(rows: string[][]) {
  return rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

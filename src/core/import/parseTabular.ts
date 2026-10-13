export type TabularSheet = {
  headers: string[];
  rows: string[][];
  sourceName: string;
};

function detectDelimiter(sample: string): string {
  const first = sample.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const candidates = [
    { delim: "\t", count: (first.match(/\t/g) ?? []).length },
    { delim: ";", count: (first.match(/;/g) ?? []).length },
    { delim: ",", count: (first.match(/,/g) ?? []).length },
  ];
  candidates.sort((a, b) => b.count - a.count);
  return candidates[0].count > 0 ? candidates[0].delim : ";";
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

export function parseDelimitedText(text: string, sourceName = "wklejony tekst"): TabularSheet {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return { headers: [], rows: [], sourceName };
  }
  const delimiter = detectDelimiter(normalized);
  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
  const headers = splitCsvLine(lines[0] ?? "", delimiter).filter(
    (cell, index, all) => cell.length > 0 || index < all.length - 1,
  );
  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line, delimiter);
    while (cells.length < headers.length) cells.push("");
    return cells.slice(0, headers.length);
  });
  return { headers, rows, sourceName };
}

async function parseXlsxBuffer(
  buffer: ArrayBuffer,
  sourceName: string,
): Promise<TabularSheet> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [], sourceName };
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });
  const nonempty = matrix.filter((row) =>
    row.some((cell) => String(cell ?? "").trim() !== ""),
  );
  const headers = (nonempty[0] ?? []).map((cell) => String(cell).trim());
  const rows = nonempty.slice(1).map((row) =>
    headers.map((_, index) => String(row[index] ?? "").trim()),
  );
  return { headers, rows, sourceName };
}

async function extractPdfText(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/parse-pdf", { method: "POST", body });
  if (!response.ok) {
    throw new Error("Nie udało się odczytać PDF");
  }
  const payload = (await response.json()) as { text?: string };
  return payload.text ?? "";
}

export async function parseSpreadsheetFile(file: File): Promise<TabularSheet> {
  const name = file.name || "plik";
  const lower = name.toLowerCase();
  const isExcel = lower.endsWith(".xlsx") || lower.endsWith(".xls");
  const isPdf = lower.endsWith(".pdf") || file.type === "application/pdf";

  if (isPdf) {
    const { pdfTextToSheet } = await import("@/core/import/parsePdfOffer");
    const text = await extractPdfText(file);
    return pdfTextToSheet(text, name);
  }

  if (isExcel) {
    try {
      const buffer = await file.arrayBuffer();
      return await parseXlsxBuffer(buffer, name);
    } catch {
      const text = await file.text();
      return parseDelimitedText(text, name);
    }
  }

  const text = await file.text();
  return parseDelimitedText(text, name);
}

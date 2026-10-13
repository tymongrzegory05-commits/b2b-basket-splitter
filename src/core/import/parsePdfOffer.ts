import { parseLooseNumber } from "@/core/import/columnMapper";
import type { TabularSheet } from "@/core/import/parseTabular";

export const PDF_SCAN_MESSAGE =
  "Wykryto skan – wklej tabelę tekstowo ze schowka lub użyj formatu Excel/CSV";

export class PdfScanError extends Error {
  constructor() {
    super(PDF_SCAN_MESSAGE);
    this.name = "PdfScanError";
  }
}

export function isPdfScanError(error: unknown): error is PdfScanError {
  return (
    error instanceof PdfScanError ||
    (error instanceof Error && error.message === PDF_SCAN_MESSAGE)
  );
}

export type ExtractedOfferRow = {
  nazwa: string;
  kod: string;
  cena: number;
  ilosc: number;
};

const JUNK_LINE = [
  /\bnip\b[:\s]/i,
  /\bnip\b/i,
  /\bregon\b/i,
  /\bkrs\b/i,
  /\bcomarch\b/i,
  /\boptima\b/i,
  /\bsubiekt\b/i,
  /\bnexo\b/i,
  /\bsymfonia\b/i,
  /\binsert\b/i,
  /strona\s+\d+/i,
  /data\s+wystaw/i,
  /sprzedawca/i,
  /nabywca/i,
  /odbiorca/i,
  /^razem\b/i,
  /^do zapłaty/i,
  /^do zaplaty/i,
  /^suma\b/i,
  /^wartość vat/i,
  /^wartosc vat/i,
  /^vat\b/i,
  /\bpodatek\b/i,
  /stopka/i,
  /\bwww\./i,
  /@/,
  /^tel[.:\s]/i,
  /^fax[.:\s]/i,
  /oferta\s+nr/i,
  /faktu[ra]\s+nr/i,
  /pieczęć/i,
  /podpis/i,
];

const HEADER_HINT = /\b(nazwa|towar|indeks|sku|ilo[sś][cć]|cena)\b/i;
const PRICE_RE =
  /(\d{1,3}(?:[.\s\u00A0]\d{3})+|\d+)[.,]\d{2}(?:\s*(?:zł|pln))?/gi;
const CODE_RE =
  /\b([A-Z]{1,8}(?:[-_/][A-Z0-9]{1,12}){1,6}|[A-Z]{2,}\d{2,}[A-Z0-9-]*)\b/i;
const QTY_RE =
  /(\d+(?:[.,]\d+)?)\s*(?:szt\.?|sztuk|mb|m\.?b\.?|kpl|op\.?|m)\b/i;

function fold(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

export function isJunkOfferLine(line: string): boolean {
  const text = fold(line);
  if (!text) return true;
  if (text.length < 4) return true;
  return JUNK_LINE.some((pattern) => pattern.test(text));
}

export function isLikelyScan(text: string): boolean {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 40) return true;
  const prices = compact.match(/(\d+[.,]\d{2})/g) ?? [];
  return prices.length < 1;
}

function parseOfferLine(line: string): ExtractedOfferRow | null {
  const text = fold(line);
  if (!text || isJunkOfferLine(text) || HEADER_HINT.test(text) && !CODE_RE.test(text)) {
    if (HEADER_HINT.test(text) && !/(\d+[.,]\d{2})/.test(text)) return null;
  }
  if (isJunkOfferLine(text)) return null;

  const prices = [...text.matchAll(PRICE_RE)];
  if (prices.length === 0) return null;

  const unitRaw =
    prices.length >= 2 ? prices[prices.length - 2][0] : prices[0][0];
  const cena = parseLooseNumber(unitRaw);
  if (cena == null || cena <= 0) return null;

  let rest = text;
  for (const match of prices) {
    rest = rest.replace(match[0], " ");
  }
  rest = rest.replace(/^\d{1,3}[.)]\s*/, "").replace(/\s+/g, " ").trim();

  const qtyMatch = rest.match(QTY_RE);
  let ilosc = 1;
  if (qtyMatch) {
    const parsed = parseLooseNumber(qtyMatch[1]);
    if (parsed != null && parsed > 0) ilosc = Math.round(parsed);
    rest = rest.replace(qtyMatch[0], " ");
  }

  const codeMatch = rest.match(CODE_RE);
  const kod = codeMatch?.[1] ?? "";
  if (codeMatch) rest = rest.replace(codeMatch[0], " ");

  const nazwa = rest
    .replace(/\b(szt\.?|sztuk|mb|kpl|op\.?|jm|j\.m\.)\b/gi, " ")
    .replace(/^\d{1,3}\s+/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!nazwa || nazwa.length < 3) return null;
  if (/^(vat|razem|suma|netto|brutto|do zap|strona)\b/i.test(nazwa)) return null;
  return { nazwa, kod, cena, ilosc };
}

export function extractOfferRowsFromPdfText(text: string): ExtractedOfferRow[] {
  const rows: ExtractedOfferRow[] = [];
  const seen = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    const row = parseOfferLine(raw);
    if (!row) continue;
    const key = `${row.kod}|${row.nazwa}|${row.cena}|${row.ilosc}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
  }
  return rows;
}

export function pdfTextToSheet(text: string, sourceName: string): TabularSheet {
  if (isLikelyScan(text)) {
    throw new PdfScanError();
  }
  const extracted = extractOfferRowsFromPdfText(text);
  if (extracted.length === 0) {
    throw new PdfScanError();
  }
  return {
    headers: ["Nazwa", "Kod", "Cena netto", "Ilość"],
    rows: extracted.map((row) => [
      row.nazwa,
      row.kod,
      String(row.cena).replace(".", ","),
      String(row.ilosc),
    ]),
    sourceName,
  };
}

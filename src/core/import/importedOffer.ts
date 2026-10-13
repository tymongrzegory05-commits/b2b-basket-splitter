import {
  detectColumns,
  parseLooseNumber,
  type ColumnMapping,
  type MappedField,
} from "@/core/import/columnMapper";
import type { TabularSheet } from "@/core/import/parseTabular";

export type ImportedOffer = {
  nazwa: string;
  kodProducenta: string;
  cenaPoRabacieNetto: number;
  ilosc: number;
  packSize: number;
  stockAvailable?: number;
  leadTimeDays?: number;
};

export function rowsToOffers(
  sheet: TabularSheet,
  mapping: ColumnMapping,
): ImportedOffer[] {
  const nazwaIndex = mapping.nazwa;
  const cenaIndex = mapping.cenaNetto;
  if (nazwaIndex == null || cenaIndex == null) {
    throw new Error("Brak mapowania nazwy lub ceny netto");
  }

  const offers: ImportedOffer[] = [];
  for (const row of sheet.rows) {
    const nazwa = (row[nazwaIndex] ?? "").trim();
    const cena = parseLooseNumber(row[cenaIndex] ?? "");
    if (!nazwa || cena == null || cena < 0) continue;
    const kod =
      mapping.kod != null ? (row[mapping.kod] ?? "").trim() : "";
    const iloscRaw =
      mapping.ilosc != null ? parseLooseNumber(row[mapping.ilosc] ?? "") : null;
    offers.push({
      nazwa,
      kodProducenta: kod,
      cenaPoRabacieNetto: Math.round(cena * 100) / 100,
      ilosc: iloscRaw != null && iloscRaw > 0 ? Math.round(iloscRaw) : 1,
      packSize: 1,
    });
  }
  return offers;
}

export function autoMapSheet(sheet: TabularSheet): {
  mapping: ColumnMapping;
  uncertain: MappedField[];
  offers: ImportedOffer[] | null;
} {
  const detection = detectColumns(sheet.headers);
  if (detection.uncertain.length > 0) {
    return {
      mapping: detection.mapping,
      uncertain: detection.uncertain,
      offers: null,
    };
  }
  return {
    mapping: detection.mapping,
    uncertain: [],
    offers: rowsToOffers(sheet, detection.mapping),
  };
}

export const MAPPING_FIELDS: Array<{ id: MappedField; label: string }> = [
  { id: "nazwa", label: "Nazwa" },
  { id: "kod", label: "Kod / SKU" },
  { id: "cenaNetto", label: "Cena Netto" },
  { id: "ilosc", label: "Ilość / zapotrzebowanie" },
];

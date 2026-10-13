import { describe, expect, it } from "vitest";
import {
  extractOfferRowsFromPdfText,
  isLikelyScan,
  pdfTextToSheet,
  PDF_SCAN_MESSAGE,
} from "@/core/import/parsePdfOffer";

const optimaOffer = `
Comarch ERP Optima
Hurtownia Alfa Sp. z o.o.
NIP: 525-22-11-111
REGON 123456789
Oferta nr OF/2026/09/01
Data wystawienia: 2026-09-03
Sprzedawca: Hurtownia Alfa
Nabywca: Instal-Tech

Lp Indeks Nazwa Ilość j.m. Cena netto Wartość
1 ALF-PEX-16-20 Rura PEX 16x2.0 50 szt 5,19 259,50
2 ALF-ZK-15-SR Zawór kulowy 1/2 12 szt 15,50 186,00

Razem netto: 445,50 zł
VAT 23%: 102,47 zł
Do zapłaty: 547,97 zł
Strona 1 z 1
`;

const subiektOffer = `
Insert Subiekt Nexo
NIP 777-00-11-222
1 BET-RPEX-16020 Rura PEX-a 16×2,0 mm 80 szt. 3,80 304,00
2 BET-HP-08 Pompa ciepła A+++ 8 kW 1 szt. 17650,00 17650,00
Suma: 17954,00
`;

describe("parsePdfOffer", () => {
  it("wyciąga pozycje z oferty w stylu Comarch Optima i pomija NIP/stopkę", () => {
    const rows = extractOfferRowsFromPdfText(optimaOffer);
    expect(rows).toHaveLength(2);
    expect(rows[0].kod).toBe("ALF-PEX-16-20");
    expect(rows[0].nazwa).toMatch(/Rura PEX/i);
    expect(rows[0].cena).toBe(5.19);
    expect(rows[0].ilosc).toBe(50);
    expect(rows.some((row) => /NIP|REGON|Razem/i.test(row.nazwa))).toBe(false);
  });

  it("czyta wiersze Subiekt / Nexo", () => {
    const rows = extractOfferRowsFromPdfText(subiektOffer);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows[0].kod).toMatch(/BET-RPEX/);
    expect(rows[1].cena).toBe(17650);
  });

  it("odrzuca skan bez cen i buduje arkusz z nagłówkami", () => {
    expect(isLikelyScan("Skan oferty bez treści")).toBe(true);
    expect(() => pdfTextToSheet("Skan oferty bez treści", "skan.pdf")).toThrow(
      PDF_SCAN_MESSAGE,
    );
    const sheet = pdfTextToSheet(optimaOffer, "optima.pdf");
    expect(sheet.headers).toEqual(["Nazwa", "Kod", "Cena netto", "Ilość"]);
    expect(sheet.rows).toHaveLength(2);
  });
});

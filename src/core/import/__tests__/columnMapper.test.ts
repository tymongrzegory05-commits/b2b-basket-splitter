import { describe, expect, it } from "vitest";
import { detectColumns, parseLooseNumber } from "@/core/import/columnMapper";
import { parseDelimitedText } from "@/core/import/parseTabular";
import { autoMapSheet, rowsToOffers } from "@/core/import/importedOffer";

describe("detectColumns", () => {
  it("mapuje polskie nagłówki hurtowe", () => {
    const detection = detectColumns([
      "Nazwa towaru",
      "Kod / indeks",
      "Cena netto",
      "Ilość szt.",
    ]);
    expect(detection.mapping.nazwa).toBe(0);
    expect(detection.mapping.kod).toBe(1);
    expect(detection.mapping.cenaNetto).toBe(2);
    expect(detection.mapping.ilosc).toBe(3);
    expect(detection.uncertain).toEqual([]);
  });

  it("oznacza cenę jako niepewną, gdy brakuje słów kluczowych", () => {
    const detection = detectColumns(["Foo", "Bar", "Baz"]);
    expect(detection.uncertain).toContain("cenaNetto");
    expect(detection.uncertain).toContain("nazwa");
  });
});

describe("parseLooseNumber", () => {
  it("czyta polski format 1 234,56", () => {
    expect(parseLooseNumber("1 234,56 zł")).toBe(1234.56);
    expect(parseLooseNumber("5,19")).toBe(5.19);
  });
});

describe("parseDelimitedText + rowsToOffers", () => {
  it("parsuje CSV ze średnikiem i buduje oferty", () => {
    const sheet = parseDelimitedText(
      "Nazwa;SKU;Cena netto;Zapotrzebowanie\nRura PEX 16x2.0;PEX-16;5,19;50\n",
    );
    expect(sheet.headers[0]).toBe("Nazwa");
    const detection = detectColumns(sheet.headers);
    const offers = rowsToOffers(sheet, detection.mapping);
    expect(offers).toHaveLength(1);
    expect(offers[0].nazwa).toBe("Rura PEX 16x2.0");
    expect(offers[0].kodProducenta).toBe("PEX-16");
    expect(offers[0].cenaPoRabacieNetto).toBe(5.19);
    expect(offers[0].ilosc).toBe(50);
  });

  it("parsuje TSV i zatrzymuje auto-map przy niepewnej cenie", () => {
    const sheet = parseDelimitedText(
      "Kolumna1\tRef\tKwota\tSztuki\nRura PEX 16x2.0\tPEX-16\t5,19\t50\n",
    );
    expect(sheet.headers).toEqual(["Kolumna1", "Ref", "Kwota", "Sztuki"]);
    const mapped = autoMapSheet(sheet);
    expect(mapped.offers).toBeNull();
    expect(mapped.uncertain).toContain("cenaNetto");
    expect(mapped.uncertain).toContain("nazwa");

    const offers = rowsToOffers(sheet, {
      nazwa: 0,
      kod: 1,
      cenaNetto: 2,
      ilosc: 3,
    });
    expect(offers).toHaveLength(1);
    expect(offers[0].cenaPoRabacieNetto).toBe(5.19);
  });
});

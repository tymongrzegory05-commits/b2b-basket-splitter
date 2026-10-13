import { describe, expect, it } from "vitest";
import {
  applyMarkup,
  applyVat,
  buildInvestorQuote,
} from "@/core/pricing/clientPricing";
import type { LineDecision } from "@/core/optimizer/basketEngine";
import { MISSING_PRICE_GROSZE } from "@/core/import/buildSession";

function line(
  id: string,
  koszt: number,
  zapotrzebowanie: number,
): LineDecision {
  const offer = {
    id,
    nazwaKatalogowa: id,
    kodProducenta: "A",
    cenaPoRabacieNettoGrosze: koszt,
    packSize: 1,
    dostepnoscSztuk: 100,
  };
  return {
    id,
    nazwaKanoniczna: id,
    zapotrzebowanie,
    oferty: {
      alfa: {
        offer,
        ilosc: zapotrzebowanie,
        kosztTowaruGrosze: koszt,
        brak: false,
        selectable: true,
        leadTimeDays: 0,
        availability: "in-stock",
      },
    },
    iloscZakup: zapotrzebowanie,
    status: "ASSIGNED",
    wybor: "alfa",
    wyborAlgorytmu: "alfa",
    wyborTowarowy: "alfa",
    nadpisaneRecznie: false,
    skonsolidowanoDlaDarmowejDostawy: false,
    kosztTowaruWybranyGrosze: koszt,
    oszczednoscTowarowaGrosze: 0,
    odrzuconoDlaPlynnosci: false,
    leadTimeDays: 0,
  };
}

describe("clientPricing", () => {
  it("liczy narzut 20% i VAT 23% w groszach", () => {
    expect(applyMarkup(3_240_000, 20)).toBe(3_888_000);
    expect(applyVat(3_888_000, 23)).toBe(894_240);
    const quote = buildInvestorQuote([line("rura", 3_240_000, 1)], 20, 23);
    expect(quote.kosztZakupuGrosze).toBe(3_240_000);
    expect(quote.marzaGrosze).toBe(648_000);
    expect(quote.cenaInwestorNettoGrosze).toBe(3_888_000);
    expect(quote.cenaInwestorBruttoGrosze).toBe(4_782_240);
  });

  it("pomija pozycje bez ceny po stronie hurtowni", () => {
    const quote = buildInvestorQuote(
      [line("ok", 1000, 2), line("brak", MISSING_PRICE_GROSZE, 1)],
      20,
      8,
    );
    expect(quote.lines).toHaveLength(1);
    expect(quote.lines[0].nazwa).toBe("ok");
    expect(quote.vatRate).toBe(8);
  });
});

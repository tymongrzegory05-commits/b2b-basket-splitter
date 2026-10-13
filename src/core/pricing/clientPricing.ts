import { MISSING_PRICE_GROSZE } from "@/core/import/buildSession";
import type { LineDecision } from "@/core/optimizer/basketEngine";

export type VatRate = 8 | 23;
export type ViewMode = "zakupowy" | "inwestorski";

export type InvestorLine = {
  lp: number;
  id: string;
  nazwa: string;
  ilosc: number;
  jednostka: string;
  cenaJednostkowaGrosze: number;
  wartoscNettoGrosze: number;
};

export type InvestorQuote = {
  lines: InvestorLine[];
  kosztZakupuGrosze: number;
  marzaGrosze: number;
  cenaInwestorNettoGrosze: number;
  vatRate: VatRate;
  vatGrosze: number;
  cenaInwestorBruttoGrosze: number;
};

export function clampMarkupPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function applyMarkup(grosze: number, markupPercent: number): number {
  const markup = clampMarkupPercent(markupPercent);
  return Math.round((grosze * (100 + markup)) / 100);
}

export function applyVat(nettoGrosze: number, vatRate: VatRate): number {
  return Math.round((nettoGrosze * vatRate) / 100);
}

export function isPricedLine(line: LineDecision): boolean {
  return (
    line.status !== "UNFULFILLED" &&
    line.kosztTowaruWybranyGrosze > 0 &&
    line.kosztTowaruWybranyGrosze < MISSING_PRICE_GROSZE / 2
  );
}

export function buildInvestorQuote(
  lines: LineDecision[],
  markupPercent: number,
  vatRate: VatRate,
): InvestorQuote {
  const usable = lines.filter(isPricedLine);
  const investorLines: InvestorLine[] = usable.map((line, index) => {
    const ilosc =
      line.zapotrzebowanie > 0 ? line.zapotrzebowanie : line.iloscZakup;
    const wartoscNettoGrosze = applyMarkup(
      line.kosztTowaruWybranyGrosze,
      markupPercent,
    );
    const cenaJednostkowaGrosze =
      ilosc > 0 ? Math.round(wartoscNettoGrosze / ilosc) : wartoscNettoGrosze;
    return {
      lp: index + 1,
      id: line.id,
      nazwa: line.nazwaKanoniczna,
      ilosc,
      jednostka: "szt.",
      cenaJednostkowaGrosze,
      wartoscNettoGrosze,
    };
  });

  const kosztZakupuGrosze = usable.reduce(
    (sum, line) => sum + line.kosztTowaruWybranyGrosze,
    0,
  );
  const cenaInwestorNettoGrosze = investorLines.reduce(
    (sum, line) => sum + line.wartoscNettoGrosze,
    0,
  );
  const vatGrosze = applyVat(cenaInwestorNettoGrosze, vatRate);

  return {
    lines: investorLines,
    kosztZakupuGrosze,
    marzaGrosze: cenaInwestorNettoGrosze - kosztZakupuGrosze,
    cenaInwestorNettoGrosze,
    vatRate,
    vatGrosze,
    cenaInwestorBruttoGrosze: cenaInwestorNettoGrosze + vatGrosze,
  };
}

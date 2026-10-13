import { parseProduct, type TechnicalProfile } from "@/core/matching/productMatcher";
import {
  isOfferUnavailable,
  isMissingPrice,
  type BasketEngineResult,
  type LineDecision,
  type SupplierPolicy,
  type WarehouseId,
} from "@/core/optimizer/basketEngine";
import { ratioToTenthsPercent } from "@/core/optimizer/money";

export type SubstitutionRule = {
  id: string;
  label: string;
  brands: string[];
  match: (profile: TechnicalProfile) => boolean;
};

export type SubstitutionSuggestion = {
  lineId: string;
  groupId: string;
  groupLabel: string;
  brand: string;
  warehouseId: WarehouseId;
  warehouseName: string;
  nazwaKatalogowa: string;
  kodProducenta: string;
  cenaPoRabacieNettoGrosze: number;
  currentCenaGrosze: number;
  savingsGrosze: number;
  savingsPromile: number;
};

export type AppliedSubstitution = {
  lineId: string;
  warehouseId: WarehouseId;
  brand: string;
  nazwaKatalogowa: string;
  kodProducenta: string;
};

export const SUBSTITUTION_RULES: SubstitutionRule[] = [
  {
    id: "pex-al-pex-16x20",
    label: "Rura PEX/Al/PEX 16x2.0",
    brands: ["Wavin Tigris", "Kan-Therm", "Kisan"],
    match: (profile) =>
      profile.productClass === "rura" &&
      profile.material === "PEX" &&
      profile.dimensions.diameterMm === 16 &&
      (profile.dimensions.wallTenthsMm == null ||
        profile.dimensions.wallTenthsMm === 20),
  },
  {
    id: "zawor-kulowy-15-pn25",
    label: 'Zawór kulowy 1/2" PN25 z dławikiem',
    brands: ["Danfoss", "Valvex", "Arco"],
    match: (profile) =>
      profile.productClass === "zawor" &&
      (profile.dimensions.threadInch === "1/2" || profile.dimensions.dn === 15) &&
      !/term/i.test(profile.sourceName),
  },
];

function ruleFor(name: string): SubstitutionRule | null {
  const profile = parseProduct({ nazwa: name });
  return SUBSTITUTION_RULES.find((rule) => rule.match(profile)) ?? null;
}

function brandOf(name: string, rule: SubstitutionRule): string {
  const folded = name.toLowerCase();
  const hit = rule.brands.find((brand) => folded.includes(brand.toLowerCase()));
  if (hit) return hit;
  const profile = parseProduct({ nazwa: name });
  if (profile.brand === "wavin") return "Wavin Tigris";
  if (profile.brand === "kan") return "Kan-Therm";
  if (profile.brand === "kisan") return "Kisan";
  if (profile.brand === "danfoss") return "Danfoss";
  if (profile.brand === "valvex") return "Valvex";
  if (profile.brand === "arco") return "Arco";
  return profile.brand ?? "odpowiednik";
}

function currentUnitGrosze(line: LineDecision): number {
  if (!line.wybor) return 0;
  return line.oferty[line.wybor]?.offer.cenaPoRabacieNettoGrosze ?? 0;
}

export function findLineSubstitutions(
  line: LineDecision,
  suppliers: SupplierPolicy[],
  inStockOnly = false,
): SubstitutionSuggestion[] {
  if (line.status === "UNFULFILLED") return [];
  const rule = ruleFor(line.nazwaKanoniczna);
  if (!rule) return [];
  const current = currentUnitGrosze(line);
  if (current <= 0 || isMissingPrice(current)) return [];

  const suggestions: SubstitutionSuggestion[] = [];
  for (const supplier of suppliers) {
    if (supplier.warehouseId === line.wybor) continue;
    const view = line.oferty[supplier.warehouseId];
    if (!view || isOfferUnavailable(view.offer, inStockOnly)) continue;
    const unit = view.offer.cenaPoRabacieNettoGrosze;
    if (unit >= current) continue;
    const offerRule = ruleFor(view.offer.nazwaKatalogowa) ?? rule;
    if (offerRule.id !== rule.id) continue;
    const savingsGrosze = (current - unit) * line.iloscZakup;
    suggestions.push({
      lineId: line.id,
      groupId: rule.id,
      groupLabel: rule.label,
      brand: brandOf(view.offer.nazwaKatalogowa, rule),
      warehouseId: supplier.warehouseId,
      warehouseName: supplier.name,
      nazwaKatalogowa: view.offer.nazwaKatalogowa,
      kodProducenta: view.offer.kodProducenta,
      cenaPoRabacieNettoGrosze: unit,
      currentCenaGrosze: current,
      savingsGrosze,
      savingsPromile: ratioToTenthsPercent(current - unit, current),
    });
  }
  suggestions.sort((a, b) => b.savingsGrosze - a.savingsGrosze);
  return suggestions;
}

export function findAllSubstitutions(
  result: BasketEngineResult,
  inStockOnly = false,
): Record<string, SubstitutionSuggestion[]> {
  const byLine: Record<string, SubstitutionSuggestion[]> = {};
  for (const line of result.lines) {
    const list = findLineSubstitutions(line, result.suppliers, inStockOnly);
    if (list.length > 0) byLine[line.id] = list;
  }
  return byLine;
}

export function pickAggressiveSubstitutions(
  result: BasketEngineResult,
  inStockOnly = false,
): Record<string, AppliedSubstitution> {
  const applied: Record<string, AppliedSubstitution> = {};
  const byLine = findAllSubstitutions(result, inStockOnly);
  for (const [lineId, list] of Object.entries(byLine)) {
    const best = list[0];
    if (!best) continue;
    applied[lineId] = {
      lineId,
      warehouseId: best.warehouseId,
      brand: best.brand,
      nazwaKatalogowa: best.nazwaKatalogowa,
      kodProducenta: best.kodProducenta,
    };
  }
  return applied;
}

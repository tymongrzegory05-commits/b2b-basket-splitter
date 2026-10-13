import type { OfferLine } from "@/data/mockOffers";
import {
  ceilToPack,
  ratioToTenthsPercent,
  shippingCostGrosze,
  toGrosze,
} from "@/core/optimizer/money";

export type WarehouseId = string;

export type PaymentTerm = "prepaid" | 7 | 14 | 30 | 60;

export type SupplierPolicy = {
  warehouseId: WarehouseId;
  name: string;
  presetId?: string;
  freeShippingThresholdGrosze: number;
  shippingCostGrosze: number;
  paymentTerm?: PaymentTerm;
  creditLimitGrosze?: number;
  minOrderGrosze?: number;
};

export type LiquidityWarning = {
  warehouseId: WarehouseId;
  supplierName: string;
  rejectedSavingsGrosze: number;
  reason: "prepaid" | "credit-limit";
};

export type EngineOffer = {
  id: string;
  nazwaKatalogowa: string;
  kodProducenta: string;
  cenaPoRabacieNettoGrosze: number;
  packSize: number;
  dostepnoscSztuk: number;
  stockAvailable?: number;
  leadTimeDays?: number;
};

export type BasketEngineInput = {
  catalog: { id: string; nazwaKanoniczna: string }[];
  suppliers: SupplierPolicy[];
  offers: Record<WarehouseId, EngineOffer[]>;
  demand?: number | Record<string, number>;
  liquidityPriority?: boolean;
  inStockOnly?: boolean;
};

export type ScenarioBreakdown = {
  towarGrosze: number;
  dostawaGrosze: number;
  sumaGrosze: number;
  darmowaDostawa: boolean;
  liczbaPozycji: number;
};

export type SplitBreakdown = ScenarioBreakdown & {
  bySupplier: Record<WarehouseId, ScenarioBreakdown>;
};

export type AvailabilityLevel = "in-stock" | "on-order" | "missing";

export type FulfillmentStatus = "ASSIGNED" | "UNFULFILLED";

export type LineOfferView = {
  offer: EngineOffer;
  ilosc: number;
  kosztTowaruGrosze: number;
  brak: boolean;
  selectable: boolean;
  leadTimeDays: number;
  availability: AvailabilityLevel;
};

export type LineDecision = {
  id: string;
  nazwaKanoniczna: string;
  zapotrzebowanie: number;
  oferty: Record<WarehouseId, LineOfferView>;
  iloscZakup: number;
  status: FulfillmentStatus;
  wybor: WarehouseId | null;
  wyborAlgorytmu: WarehouseId | null;
  wyborTowarowy: WarehouseId | null;
  nadpisaneRecznie: boolean;
  skonsolidowanoDlaDarmowejDostawy: boolean;
  kosztTowaruWybranyGrosze: number;
  oszczednoscTowarowaGrosze: number;
  odrzuconoDlaPlynnosci: boolean;
  leadTimeDays: number;
};

export type BasketEngineResult = {
  lines: LineDecision[];
  suppliers: SupplierPolicy[];
  singles: Record<WarehouseId, ScenarioBreakdown>;
  current: Record<WarehouseId, ScenarioBreakdown>;
  split: SplitBreakdown;
  cheaperSingle: WarehouseId;
  zyskZPodzialuGrosze: number;
  zyskZPodzialuPromile: number;
  liquidityPriority: boolean;
  liquidityWarnings: LiquidityWarning[];
  unfulfilledCount: number;
};

export const MIN_SUPPLIERS = 2;
export const MAX_SUPPLIERS = 5;
export const IN_STOCK_MAX_LEAD_DAYS = 2;
export const DEFAULT_MIN_ORDER_GROSZE = 30_000;
const MAX_BRUTE_COMBINATIONS = 32_768;
const MISSING_PRICE_GROSZE = 50_000_000;
const DEFAULT_CREDIT_LIMIT_GROSZE = 5_000_000;

export function normalizePolicy(policy: SupplierPolicy): Required<SupplierPolicy> {
  return {
    warehouseId: policy.warehouseId,
    name: policy.name,
    presetId: policy.presetId ?? "custom",
    freeShippingThresholdGrosze: policy.freeShippingThresholdGrosze,
    shippingCostGrosze: policy.shippingCostGrosze,
    paymentTerm: policy.paymentTerm ?? 14,
    creditLimitGrosze: policy.creditLimitGrosze ?? DEFAULT_CREDIT_LIMIT_GROSZE,
    minOrderGrosze: policy.minOrderGrosze ?? DEFAULT_MIN_ORDER_GROSZE,
  };
}

export function stockAvailableOf(offer: EngineOffer): number {
  return offer.stockAvailable ?? offer.dostepnoscSztuk;
}

export function leadTimeDaysOf(offer: EngineOffer): number {
  return Math.max(0, offer.leadTimeDays ?? 0);
}

export function isOfferUnavailable(
  offer: EngineOffer,
  inStockOnly = false,
): boolean {
  if (isMissingPrice(offer.cenaPoRabacieNettoGrosze)) return true;
  if (stockAvailableOf(offer) <= 0) return true;
  if (inStockOnly && leadTimeDaysOf(offer) > IN_STOCK_MAX_LEAD_DAYS) return true;
  return false;
}

export function availabilityOf(
  offer: EngineOffer,
  inStockOnly = false,
): AvailabilityLevel {
  if (isOfferUnavailable(offer, false) && stockAvailableOf(offer) <= 0) {
    return "missing";
  }
  if (isMissingPrice(offer.cenaPoRabacieNettoGrosze)) return "missing";
  if (isOfferUnavailable(offer, inStockOnly)) {
    return leadTimeDaysOf(offer) > IN_STOCK_MAX_LEAD_DAYS ? "on-order" : "missing";
  }
  if (leadTimeDaysOf(offer) > IN_STOCK_MAX_LEAD_DAYS) return "on-order";
  return "in-stock";
}

function missingOffer(id: string): EngineOffer {
  return {
    id,
    nazwaKatalogowa: "Brak w ofercie",
    kodProducenta: "—",
    cenaPoRabacieNettoGrosze: MISSING_PRICE_GROSZE,
    packSize: 1,
    dostepnoscSztuk: 0,
    stockAvailable: 0,
    leadTimeDays: 0,
  };
}

export function isPrepaidTerm(policy: SupplierPolicy): boolean {
  return normalizePolicy(policy).paymentTerm === "prepaid";
}

export function isMissingPrice(grosze: number): boolean {
  return grosze <= 0 || grosze >= MISSING_PRICE_GROSZE;
}

export function warehouseLabel(
  id: WarehouseId,
  suppliers: SupplierPolicy[] = [],
): string {
  return suppliers.find((item) => item.warehouseId === id)?.name ?? id;
}

function indexOffers(offers: EngineOffer[]): Map<string, EngineOffer> {
  return new Map(offers.map((offer) => [offer.id, offer]));
}

function demandFor(
  productId: string,
  demand: number | Record<string, number> | undefined,
): number {
  const raw =
    demand == null
      ? 50
      : typeof demand === "number"
        ? demand
        : (demand[productId] ?? 50);
  if (Number.isInteger(raw) && raw >= 0) return raw;
  const rounded = Math.round(Number(raw));
  return Number.isFinite(rounded) && rounded >= 0 ? rounded : 50;
}

function deliveryGrosze(towarGrosze: number, policy: SupplierPolicy): number {
  return shippingCostGrosze(
    towarGrosze,
    policy.freeShippingThresholdGrosze,
    policy.shippingCostGrosze,
  );
}

function scenarioOf(
  towarGrosze: number,
  dostawaGrosze: number,
  liczbaPozycji: number,
): ScenarioBreakdown {
  return {
    towarGrosze,
    dostawaGrosze,
    sumaGrosze: towarGrosze + dostawaGrosze,
    darmowaDostawa: dostawaGrosze === 0,
    liczbaPozycji,
  };
}

function emptyScenario(): ScenarioBreakdown {
  return scenarioOf(0, 0, 0);
}

function policyById(
  suppliers: SupplierPolicy[],
  id: WarehouseId,
): SupplierPolicy {
  const found = suppliers.find((item) => item.warehouseId === id);
  if (!found) throw new Error(`Nieznany dostawca ${id}`);
  return found;
}

type PreparedLine = {
  id: string;
  nazwaKanoniczna: string;
  zapotrzebowanie: number;
  oferty: Record<WarehouseId, EngineOffer>;
  ilosci: Record<WarehouseId, number>;
  koszty: Record<WarehouseId, number>;
  eligible: WarehouseId[];
  unfulfilled: boolean;
  wyborTowarowy: WarehouseId;
};

function supplierIds(input: BasketEngineInput): WarehouseId[] {
  return input.suppliers.map((item) => item.warehouseId);
}

function evaluateAssignment(
  lines: PreparedLine[],
  assignment: WarehouseId[],
  input: BasketEngineInput,
): SplitBreakdown {
  const ids = supplierIds(input);
  const towar: Record<WarehouseId, number> = {};
  const counts: Record<WarehouseId, number> = {};
  for (const id of ids) {
    towar[id] = 0;
    counts[id] = 0;
  }

  for (let i = 0; i < lines.length; i += 1) {
    const chosen = assignment[i];
    towar[chosen] += lines[i].koszty[chosen];
    counts[chosen] += 1;
  }

  const bySupplier: Record<WarehouseId, ScenarioBreakdown> = {};
  let towarGrosze = 0;
  let dostawaGrosze = 0;
  for (const id of ids) {
    const dostawa = deliveryGrosze(towar[id], policyById(input.suppliers, id));
    bySupplier[id] = scenarioOf(towar[id], dostawa, counts[id]);
    towarGrosze += towar[id];
    dostawaGrosze += dostawa;
  }

  return {
    towarGrosze,
    dostawaGrosze,
    sumaGrosze: towarGrosze + dostawaGrosze,
    darmowaDostawa: dostawaGrosze === 0,
    liczbaPozycji: lines.length,
    bySupplier,
  };
}

function assignmentKey(assignment: WarehouseId[]): string {
  return assignment.join(",");
}

function warehouseCount(assignment: WarehouseId[]): number {
  return new Set(assignment).size;
}

function isBetterAssignment(
  next: { suma: number; warehouses: number; key: string },
  current: { suma: number; warehouses: number; key: string } | null,
): boolean {
  if (!current) return true;
  if (next.suma !== current.suma) return next.suma < current.suma;
  if (next.warehouses !== current.warehouses) {
    return next.warehouses < current.warehouses;
  }
  return next.key < current.key;
}

function allSame(n: number, warehouse: WarehouseId): WarehouseId[] {
  return Array.from({ length: n }, () => warehouse);
}

function lineHasPrice(line: PreparedLine, warehouse: WarehouseId): boolean {
  return line.eligible.includes(warehouse);
}

function warehouseOpenForLine(
  line: PreparedLine,
  warehouse: WarehouseId,
  input: BasketEngineInput,
): boolean {
  if (!lineHasPrice(line, warehouse)) return false;
  if (!input.liquidityPriority) return true;
  return !isPrepaidTerm(policyById(input.suppliers, warehouse));
}

function assignmentRespectsPrepaid(
  lines: PreparedLine[],
  assignment: WarehouseId[],
  input: BasketEngineInput,
): boolean {
  if (!input.liquidityPriority) return true;
  const ids = supplierIds(input);
  for (let i = 0; i < lines.length; i += 1) {
    const chosen = assignment[i];
    if (warehouseOpenForLine(lines[i], chosen, input)) continue;
    const alternative = ids.some(
      (id) => id !== chosen && warehouseOpenForLine(lines[i], id, input),
    );
    if (alternative) return false;
  }
  return true;
}

function assignmentRespectsCredit(
  lines: PreparedLine[],
  assignment: WarehouseId[],
  input: BasketEngineInput,
): boolean {
  if (!input.liquidityPriority) return true;
  const evaluated = evaluateAssignment(lines, assignment, input);
  for (const supplier of input.suppliers) {
    const limit = normalizePolicy(supplier).creditLimitGrosze;
    const goods = evaluated.bySupplier[supplier.warehouseId]?.towarGrosze ?? 0;
    if (limit > 0 && goods > limit) return false;
  }
  return true;
}

function pickBestAssignment(
  lines: PreparedLine[],
  input: BasketEngineInput,
  candidates: WarehouseId[][],
): WarehouseId[] | null {
  let best: WarehouseId[] | null = null;
  let bestMeta: { suma: number; warehouses: number; key: string } | null = null;
  for (const assignment of candidates) {
    const evaluated = evaluateAssignment(lines, assignment, input);
    const meta = {
      suma: evaluated.sumaGrosze,
      warehouses: warehouseCount(assignment),
      key: assignmentKey(assignment),
    };
    if (isBetterAssignment(meta, bestMeta)) {
      best = assignment;
      bestMeta = meta;
    }
  }
  return best;
}

function filterViable(
  lines: PreparedLine[],
  input: BasketEngineInput,
  candidates: WarehouseId[][],
): WarehouseId[][] {
  const prepaidOk = candidates.filter((assignment) =>
    assignmentRespectsPrepaid(lines, assignment, input),
  );
  const creditOk = prepaidOk.filter((assignment) =>
    assignmentRespectsCredit(lines, assignment, input),
  );
  if (creditOk.length > 0) return creditOk;
  if (prepaidOk.length > 0) return prepaidOk;
  return candidates;
}

function bruteForceBest(
  lines: PreparedLine[],
  input: BasketEngineInput,
): WarehouseId[] | null {
  const ids = supplierIds(input);
  const n = lines.length;
  const k = ids.length;
  if (n === 0 || k === 0) return [];
  const total = k ** n;
  const working: WarehouseId[] = Array.from({ length: n }, () => ids[0]);
  let bestCredit: WarehouseId[] | null = null;
  let bestCreditMeta: { suma: number; warehouses: number; key: string } | null =
    null;
  let bestPrepaid: WarehouseId[] | null = null;
  let bestPrepaidMeta: { suma: number; warehouses: number; key: string } | null =
    null;
  let bestAny: WarehouseId[] | null = null;
  let bestAnyMeta: { suma: number; warehouses: number; key: string } | null =
    null;

  for (let mask = 0; mask < total; mask += 1) {
    let rest = mask;
    for (let i = 0; i < n; i += 1) {
      working[i] = ids[rest % k];
      rest = Math.floor(rest / k);
    }
    const prepaidOk = assignmentRespectsPrepaid(lines, working, input);
    const creditOk =
      prepaidOk && assignmentRespectsCredit(lines, working, input);
    const evaluated = evaluateAssignment(lines, working, input);
    const meta = {
      suma: evaluated.sumaGrosze,
      warehouses: warehouseCount(working),
      key: assignmentKey(working),
    };
    if (isBetterAssignment(meta, bestAnyMeta)) {
      bestAny = working.slice();
      bestAnyMeta = meta;
    }
    if (prepaidOk && isBetterAssignment(meta, bestPrepaidMeta)) {
      bestPrepaid = working.slice();
      bestPrepaidMeta = meta;
    }
    if (creditOk && isBetterAssignment(meta, bestCreditMeta)) {
      bestCredit = working.slice();
      bestCreditMeta = meta;
    }
  }

  return bestCredit ?? bestPrepaid ?? bestAny;
}

function naiveAssignment(lines: PreparedLine[]): WarehouseId[] {
  return lines.map((line) => line.wyborTowarowy);
}

function moveBasket(
  assignment: WarehouseId[],
  from: WarehouseId,
  to: WarehouseId,
): WarehouseId[] {
  return assignment.map((id) => (id === from ? to : id));
}

function hillClimb(
  lines: PreparedLine[],
  input: BasketEngineInput,
  start: WarehouseId[],
): WarehouseId[] {
  const ids = supplierIds(input);
  let current = start.slice();
  let currentSum = evaluateAssignment(lines, current, input).sumaGrosze;
  let improved = true;
  let passes = 0;
  while (improved && passes < 4) {
    improved = false;
    passes += 1;
    for (let i = 0; i < lines.length; i += 1) {
      for (const id of ids) {
        if (id === current[i] || !lineHasPrice(lines[i], id)) continue;
        const next = current.slice();
        next[i] = id;
        if (!assignmentRespectsPrepaid(lines, next, input)) continue;
        if (!assignmentRespectsCredit(lines, next, input)) continue;
        const suma = evaluateAssignment(lines, next, input).sumaGrosze;
        if (suma < currentSum) {
          current = next;
          currentSum = suma;
          improved = true;
        }
      }
    }
  }
  return current;
}

/**
 * Dla 2^n / k^n w budżecie — pełna enumeracja.
 * Powyżej: najtańszy towarowo + konsolidacja nieopłacalnych koszyków + hill-climb.
 */
function findOptimalAssignment(
  lines: PreparedLine[],
  input: BasketEngineInput,
): WarehouseId[] {
  const n = lines.length;
  const ids = supplierIds(input);
  if (n === 0) return [];
  const fallback = ids[0];

  const combinations = ids.length ** n;
  if (
    n > 0 &&
    Number.isFinite(combinations) &&
    combinations <= MAX_BRUTE_COMBINATIONS
  ) {
    return bruteForceBest(lines, input) ?? allSame(n, fallback);
  }

  const candidates: WarehouseId[][] = [];
  const naive = naiveAssignment(lines);
  candidates.push(naive);
  for (const id of ids) candidates.push(allSame(n, id));
  for (const from of ids) {
    for (const to of ids) {
      if (from === to) continue;
      candidates.push(moveBasket(naive, from, to));
    }
  }
  candidates.push(hillClimb(lines, input, naive));

  const pool = filterViable(lines, input, candidates);
  return pickBestAssignment(lines, input, pool) ?? allSame(n, fallback);
}

function prepareLines(input: BasketEngineInput): PreparedLine[] {
  if (input.suppliers.length < MIN_SUPPLIERS) {
    throw new Error(`Wymagane minimum ${MIN_SUPPLIERS} dostawców`);
  }
  const indexes = Object.fromEntries(
    input.suppliers.map((supplier) => [
      supplier.warehouseId,
      indexOffers(input.offers[supplier.warehouseId] ?? []),
    ]),
  ) as Record<WarehouseId, Map<string, EngineOffer>>;

  return input.catalog.map((product) => {
    const oferty: Record<WarehouseId, EngineOffer> = {};
    const ilosci: Record<WarehouseId, number> = {};
    const koszty: Record<WarehouseId, number> = {};

    for (const supplier of input.suppliers) {
      const raw =
        indexes[supplier.warehouseId].get(product.id) ?? missingOffer(product.id);
      const price = Number.isInteger(raw.cenaPoRabacieNettoGrosze)
        ? raw.cenaPoRabacieNettoGrosze
        : Number.isFinite(raw.cenaPoRabacieNettoGrosze)
          ? Math.round(raw.cenaPoRabacieNettoGrosze)
          : MISSING_PRICE_GROSZE;
      const packSize =
        Number.isInteger(raw.packSize) && raw.packSize > 0 ? raw.packSize : 1;
      const offer: EngineOffer = {
        ...raw,
        cenaPoRabacieNettoGrosze: price,
        packSize,
      };
      const zapotrzebowanie = demandFor(product.id, input.demand);
      const ilosc = ceilToPack(zapotrzebowanie, offer.packSize);
      oferty[supplier.warehouseId] = offer;
      ilosci[supplier.warehouseId] = ilosc;
      koszty[supplier.warehouseId] = isOfferUnavailable(offer, input.inStockOnly)
        ? MISSING_PRICE_GROSZE
        : ilosc * offer.cenaPoRabacieNettoGrosze;
    }

    const zapotrzebowanie = demandFor(product.id, input.demand);
    const eligible = input.suppliers
      .map((supplier) => supplier.warehouseId)
      .filter((id) => !isOfferUnavailable(oferty[id], input.inStockOnly));
    const ranked = (
      eligible.length > 0 ? eligible : [input.suppliers[0].warehouseId]
    )
      .slice()
      .sort((a, b) => {
        if (koszty[a] !== koszty[b]) return koszty[a] - koszty[b];
        return a.localeCompare(b);
      });

    return {
      id: product.id,
      nazwaKanoniczna: product.nazwaKanoniczna,
      zapotrzebowanie,
      oferty,
      ilosci,
      koszty,
      eligible,
      unfulfilled: eligible.length === 0,
      wyborTowarowy: ranked[0],
    };
  });
}

export function offerToEngine(offer: OfferLine): EngineOffer {
  return {
    id: offer.id,
    nazwaKatalogowa: offer.nazwaKatalogowa,
    kodProducenta: offer.kodProducenta,
    cenaPoRabacieNettoGrosze: toGrosze(offer.cenaPoRabacieNetto),
    packSize: offer.packSize,
    dostepnoscSztuk: offer.dostepnoscSztuk,
    stockAvailable: offer.dostepnoscSztuk,
    leadTimeDays: 0,
  };
}

function savingsVsSecond(line: PreparedLine): number {
  const priced = Object.values(line.koszty)
    .filter((value) => !isMissingPrice(value))
    .sort((a, b) => a - b);
  if (priced.length < 2) return 0;
  return priced[1] - priced[0];
}

function buildLiquidityWarnings(
  lines: PreparedLine[],
  unconstrained: WarehouseId[],
  constrained: WarehouseId[],
  suppliers: SupplierPolicy[],
): LiquidityWarning[] {
  const rejected: Record<WarehouseId, number> = {};
  for (let i = 0; i < lines.length; i += 1) {
    if (unconstrained[i] === constrained[i]) continue;
    const line = lines[i];
    if (unconstrained[i] !== line.wyborTowarowy) continue;
    rejected[line.wyborTowarowy] =
      (rejected[line.wyborTowarowy] ?? 0) + savingsVsSecond(line);
  }
  return Object.entries(rejected)
    .filter(([, amount]) => amount > 0)
    .map(([warehouseId, rejectedSavingsGrosze]) => ({
      warehouseId,
      supplierName: warehouseLabel(warehouseId, suppliers),
      rejectedSavingsGrosze,
      reason: "prepaid" as const,
    }));
}

function buildOfferViews(
  line: PreparedLine,
  ids: WarehouseId[],
  inStockOnly: boolean,
): Record<WarehouseId, LineOfferView> {
  const oferty: Record<WarehouseId, LineOfferView> = {};
  for (const id of ids) {
    const offer = line.oferty[id];
    oferty[id] = {
      offer,
      ilosc: line.ilosci[id],
      kosztTowaruGrosze: line.koszty[id],
      brak: stockAvailableOf(offer) > 0 && stockAvailableOf(offer) < line.ilosci[id],
      selectable: line.eligible.includes(id),
      leadTimeDays: leadTimeDaysOf(offer),
      availability: availabilityOf(offer, inStockOnly),
    };
  }
  return oferty;
}

export function optimizeBasket(
  input: BasketEngineInput,
  assignmentById: Record<string, WarehouseId> = {},
): BasketEngineResult {
  const linesPrepared = prepareLines(input);
  const ids = supplierIds(input);
  const fulfillable = linesPrepared.filter((line) => !line.unfulfilled);
  const unconstrainedAssignment = findOptimalAssignment(fulfillable, {
    ...input,
    liquidityPriority: false,
  });
  const algorithmAssignment = findOptimalAssignment(fulfillable, input);
  const fallback = ids[0];
  const assignment = fulfillable.map((line, index) => {
    const override = assignmentById[line.id];
    if (override && line.eligible.includes(override)) return override;
    return algorithmAssignment[index] ?? line.wyborTowarowy ?? fallback;
  });
  const split = evaluateAssignment(fulfillable, assignment, input);

  const singles: Record<WarehouseId, ScenarioBreakdown> = {};
  for (const id of ids) {
    const allOne = evaluateAssignment(
      fulfillable,
      allSame(fulfillable.length, id),
      input,
    );
    singles[id] = allOne.bySupplier[id];
  }

  const cheaperSingle = ids.slice().sort((a, b) => {
    const diff = singles[a].sumaGrosze - singles[b].sumaGrosze;
    return diff !== 0 ? diff : a.localeCompare(b);
  })[0];
  const cheaperSingleTotal = singles[cheaperSingle]?.sumaGrosze ?? 0;
  const zyskZPodzialuGrosze = cheaperSingleTotal - split.sumaGrosze;

  const assignedById = new Map(
    fulfillable.map((line, index) => [line.id, assignment[index]]),
  );
  const algorithmById = new Map(
    fulfillable.map((line, index) => [line.id, algorithmAssignment[index]]),
  );
  const unconstrainedById = new Map(
    fulfillable.map((line, index) => [line.id, unconstrainedAssignment[index]]),
  );

  const lines: LineDecision[] = linesPrepared.map((line) => {
    const oferty = buildOfferViews(line, ids, Boolean(input.inStockOnly));
    if (line.unfulfilled) {
      return {
        id: line.id,
        nazwaKanoniczna: line.nazwaKanoniczna,
        zapotrzebowanie: line.zapotrzebowanie,
        oferty,
        iloscZakup: line.zapotrzebowanie,
        status: "UNFULFILLED",
        wybor: null,
        wyborAlgorytmu: null,
        wyborTowarowy: null,
        nadpisaneRecznie: false,
        odrzuconoDlaPlynnosci: false,
        skonsolidowanoDlaDarmowejDostawy: false,
        kosztTowaruWybranyGrosze: 0,
        oszczednoscTowarowaGrosze: 0,
        leadTimeDays: 0,
      };
    }

    const wyborAlgorytmu =
      algorithmById.get(line.id) ?? line.wyborTowarowy ?? fallback;
    const wybor = assignedById.get(line.id) ?? wyborAlgorytmu;
    const nadpisaneRecznie =
      assignmentById[line.id] != null &&
      line.eligible.includes(assignmentById[line.id]);

    return {
      id: line.id,
      nazwaKanoniczna: line.nazwaKanoniczna,
      zapotrzebowanie: line.zapotrzebowanie,
      oferty,
      iloscZakup: line.ilosci[wybor],
      status: "ASSIGNED",
      wybor,
      wyborAlgorytmu,
      wyborTowarowy: line.wyborTowarowy,
      nadpisaneRecznie,
      odrzuconoDlaPlynnosci:
        !nadpisaneRecznie &&
        (algorithmById.get(line.id) ?? fallback) !==
          (unconstrainedById.get(line.id) ?? fallback),
      skonsolidowanoDlaDarmowejDostawy:
        !nadpisaneRecznie &&
        wybor !== line.wyborTowarowy &&
        (algorithmById.get(line.id) ?? fallback) ===
          (unconstrainedById.get(line.id) ?? fallback),
      kosztTowaruWybranyGrosze: line.koszty[wybor],
      oszczednoscTowarowaGrosze: savingsVsSecond(line),
      leadTimeDays: leadTimeDaysOf(line.oferty[wybor]),
    };
  });

  const current: Record<WarehouseId, ScenarioBreakdown> = {};
  for (const id of ids) {
    current[id] = split.bySupplier[id] ?? emptyScenario();
  }

  return {
    lines,
    suppliers: input.suppliers,
    singles,
    current,
    split,
    cheaperSingle,
    zyskZPodzialuGrosze,
    zyskZPodzialuPromile: ratioToTenthsPercent(
      zyskZPodzialuGrosze,
      cheaperSingleTotal,
    ),
    liquidityPriority: Boolean(input.liquidityPriority),
    liquidityWarnings: input.liquidityPriority
      ? buildLiquidityWarnings(
          fulfillable,
          unconstrainedAssignment,
          algorithmAssignment,
          input.suppliers,
        )
      : [],
    unfulfilledCount: lines.filter((line) => line.status === "UNFULFILLED").length,
  };
}

export function bestPairSplitGrosze(input: BasketEngineInput): number {
  const ids = supplierIds(input);
  if (ids.length <= 2) {
    return optimizeBasket(input).split.sumaGrosze;
  }
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const pairIds = [ids[i], ids[j]];
      const subset: BasketEngineInput = {
        ...input,
        suppliers: input.suppliers.filter((item) =>
          pairIds.includes(item.warehouseId),
        ),
        offers: Object.fromEntries(
          pairIds.map((id) => [id, input.offers[id] ?? []]),
        ),
      };
      const suma = optimizeBasket(subset).split.sumaGrosze;
      if (suma < best) best = suma;
    }
  }
  return best;
}

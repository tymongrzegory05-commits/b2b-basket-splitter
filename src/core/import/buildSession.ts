import type { ImportedOffer } from "@/core/import/importedOffer";
import { matchProductLists } from "@/core/matching/productMatcher";
import { toGrosze } from "@/core/optimizer/money";
import type {
  BasketEngineInput,
  EngineOffer,
  SupplierPolicy,
  WarehouseId,
} from "@/core/optimizer/basketEngine";

export const MISSING_PRICE_GROSZE = 99_999_999;

export type OfferSession = {
  catalog: { id: string; nazwaKanoniczna: string }[];
  offers: Record<WarehouseId, EngineOffer[]>;
  demand: Record<string, number>;
  confidenceById: Record<string, number>;
  unmatchedBySupplier: Record<WarehouseId, number>;
};

function toEngine(
  id: string,
  offer: ImportedOffer | null,
  fallbackName: string,
): EngineOffer {
  if (!offer) {
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
  const stock =
    offer.stockAvailable != null ? offer.stockAvailable : 10_000;
  return {
    id,
    nazwaKatalogowa: offer.nazwa || fallbackName,
    kodProducenta: offer.kodProducenta,
    cenaPoRabacieNettoGrosze: toGrosze(offer.cenaPoRabacieNetto),
    packSize:
      Number.isInteger(offer.packSize) && offer.packSize > 0
        ? offer.packSize
        : 1,
    dostepnoscSztuk: stock,
    stockAvailable: stock,
    leadTimeDays: Math.max(0, offer.leadTimeDays ?? 0),
  };
}

type CatalogRow = {
  id: string;
  nazwaKanoniczna: string;
  demand: number;
  confidence: number;
  attached: Record<WarehouseId, ImportedOffer | null>;
};

function matchable(offers: ImportedOffer[]) {
  return offers.map((offer) => ({
    nazwa: offer.nazwa,
    kodProducenta: offer.kodProducenta,
  }));
}

export function buildOfferSession(
  slots: Array<{ id: WarehouseId; offers: ImportedOffer[] }>,
): OfferSession {
  const ids = slots.map((slot) => slot.id);
  const offersById = Object.fromEntries(
    slots.map((slot) => [slot.id, slot.offers]),
  ) as Record<WarehouseId, ImportedOffer[]>;

  const rows: CatalogRow[] = [];
  const used: Record<WarehouseId, Set<number>> = {};
  for (const id of ids) used[id] = new Set();

  const seed = slots[0];
  if (seed) {
    seed.offers.forEach((offer, index) => {
      const attached: Record<WarehouseId, ImportedOffer | null> = {};
      for (const id of ids) attached[id] = id === seed.id ? offer : null;
      rows.push({
        id: `${seed.id}-${index + 1}`,
        nazwaKanoniczna: offer.nazwa,
        demand: Math.max(Math.round(Number(offer.ilosc)) || 1, 1),
        confidence: 0,
        attached,
      });
      used[seed.id].add(index);
    });
  }

  for (const slot of slots.slice(1)) {
    const catalogProducts = rows.map((row) => ({
      nazwa: row.nazwaKanoniczna,
      kodProducenta:
        Object.values(row.attached).find((item) => item)?.kodProducenta ?? "",
    }));
    const matched = matchProductLists(catalogProducts, matchable(slot.offers));
    matched.pairIndexes.forEach((pair, pairIndex) => {
      const row = rows[pair.left];
      row.attached[slot.id] = slot.offers[pair.right];
      row.demand = Math.max(
        row.demand,
        Math.round(Number(slot.offers[pair.right].ilosc)) || 1,
        1,
      );
      const score = matched.pairs[pairIndex]?.confidenceScore ?? 0;
      row.confidence = row.confidence > 0 ? Math.min(row.confidence, score) : score;
      used[slot.id].add(pair.right);
    });

    slot.offers.forEach((offer, index) => {
      if (used[slot.id].has(index)) return;
      const attached: Record<WarehouseId, ImportedOffer | null> = {};
      for (const id of ids) attached[id] = id === slot.id ? offer : null;
      rows.push({
        id: `${slot.id}-only-${index + 1}`,
        nazwaKanoniczna: offer.nazwa,
        demand: Math.max(Math.round(Number(offer.ilosc)) || 1, 1),
        confidence: 0,
        attached,
      });
      used[slot.id].add(index);
    });
  }

  const catalog: OfferSession["catalog"] = [];
  const offers: Record<WarehouseId, EngineOffer[]> = {};
  for (const id of ids) offers[id] = [];
  const demand: Record<string, number> = {};
  const confidenceById: Record<string, number> = {};

  rows.forEach((row, index) => {
    const id = `line-${index + 1}`;
    catalog.push({ id, nazwaKanoniczna: row.nazwaKanoniczna });
    demand[id] = row.demand;
    const attachedCount = Object.values(row.attached).filter(Boolean).length;
    confidenceById[id] = attachedCount <= 1 ? 0 : row.confidence;
    for (const supplierId of ids) {
      offers[supplierId].push(
        toEngine(id, row.attached[supplierId], row.nazwaKanoniczna),
      );
    }
  });

  const unmatchedBySupplier: Record<WarehouseId, number> = {};
  for (const id of ids) {
    unmatchedBySupplier[id] = catalog.filter((_, index) => {
      const attached = ids.filter(
        (supplierId) =>
          offers[supplierId][index]?.kodProducenta !== "—",
      );
      return attached.length === 1 && attached[0] === id;
    }).length;
  }

  return {
    catalog,
    offers,
    demand,
    confidenceById,
    unmatchedBySupplier,
  };
}

export function sessionToEngineInput(
  session: OfferSession,
  suppliers: SupplierPolicy[],
  liquidityPriority = false,
  inStockOnly = false,
): BasketEngineInput {
  return {
    catalog: session.catalog,
    suppliers,
    offers: session.offers,
    demand: session.demand,
    liquidityPriority,
    inStockOnly,
  };
}

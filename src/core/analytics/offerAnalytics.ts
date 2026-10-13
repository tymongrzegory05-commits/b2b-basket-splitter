import { parseProduct } from "@/core/matching/productMatcher";
import {
  bestPairSplitGrosze,
  isMissingPrice,
  type BasketEngineInput,
  type BasketEngineResult,
  type WarehouseId,
} from "@/core/optimizer/basketEngine";
import { ratioToTenthsPercent } from "@/core/optimizer/money";

export type SupplierShare = {
  warehouseId: WarehouseId;
  name: string;
  percent: number;
  sumaGrosze: number;
  pozycje: number;
};

export type CategoryInsight = {
  name: string;
  bestSupplierId: WarehouseId;
  bestSupplierName: string;
  vsAveragePromile: number;
  savingsGrosze: number;
};

export type OfferAnalytics = {
  share: SupplierShare[];
  categories: CategoryInsight[];
  extraVsTwoSuppliersGrosze: number;
  supplierCount: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  rura: "Rury i złączki",
  kolano: "Rury i złączki",
  trojnik: "Rury i złączki",
  zlaczka: "Rury i złączki",
  zawor: "Armatura i zawory",
  otulina: "Rury i złączki",
  rozdzielacz: "Kotłownia i rozdział",
  pompa: "Kotłownia i rozdział",
};

function categoryOf(name: string): string {
  const parsed = parseProduct({ nazwa: name });
  return CATEGORY_LABELS[parsed.productClass ?? ""] ?? "Pozostałe materiały";
}

export function buildOfferAnalytics(
  result: BasketEngineResult,
  input: BasketEngineInput,
): OfferAnalytics {
  const totalGoods = result.lines.reduce(
    (sum, line) =>
      line.status === "UNFULFILLED" ? sum : sum + line.kosztTowaruWybranyGrosze,
    0,
  );
  const share: SupplierShare[] = result.suppliers.map((supplier) => {
    const current = result.current[supplier.warehouseId];
    const percent =
      totalGoods > 0
        ? Math.round((current.towarGrosze * 100) / totalGoods)
        : 0;
    return {
      warehouseId: supplier.warehouseId,
      name: supplier.name,
      percent,
      sumaGrosze: current.sumaGrosze,
      pozycje: current.liczbaPozycji,
    };
  });

  const grouped = new Map<
    string,
    Array<{ warehouseId: WarehouseId; cost: number }>
  >();
  for (const line of result.lines) {
    const name = categoryOf(line.nazwaKanoniczna);
    const bucket = grouped.get(name) ?? [];
    for (const supplier of result.suppliers) {
      const view = line.oferty[supplier.warehouseId];
      if (!view || isMissingPrice(view.kosztTowaruGrosze)) continue;
      bucket.push({
        warehouseId: supplier.warehouseId,
        cost: view.kosztTowaruGrosze,
      });
    }
    grouped.set(name, bucket);
  }

  const categories: CategoryInsight[] = [];
  for (const [name, costs] of grouped) {
    const bySupplier = new Map<WarehouseId, { sum: number; count: number }>();
    for (const item of costs) {
      const current = bySupplier.get(item.warehouseId) ?? { sum: 0, count: 0 };
      current.sum += item.cost;
      current.count += 1;
      bySupplier.set(item.warehouseId, current);
    }
    const averages = [...bySupplier.entries()].map(([warehouseId, value]) => ({
      warehouseId,
      avg: Math.round(value.sum / value.count),
    }));
    if (averages.length < 2) continue;
    averages.sort((a, b) => a.avg - b.avg);
    const best = averages[0];
    const mean = Math.round(
      averages.reduce((sum, item) => sum + item.avg, 0) / averages.length,
    );
    const savingsGrosze = mean - best.avg;
    categories.push({
      name,
      bestSupplierId: best.warehouseId,
      bestSupplierName:
        result.suppliers.find((item) => item.warehouseId === best.warehouseId)
          ?.name ?? best.warehouseId,
      vsAveragePromile: -ratioToTenthsPercent(savingsGrosze, mean),
      savingsGrosze,
    });
  }
  categories.sort((a, b) => a.vsAveragePromile - b.vsAveragePromile);

  const extraVsTwoSuppliersGrosze =
    result.suppliers.length <= 2
      ? 0
      : Math.max(0, bestPairSplitGrosze(input) - result.split.sumaGrosze);

  return {
    share,
    categories,
    extraVsTwoSuppliersGrosze,
    supplierCount: result.suppliers.length,
  };
}

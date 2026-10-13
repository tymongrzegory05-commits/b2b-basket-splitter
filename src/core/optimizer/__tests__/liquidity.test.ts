import { describe, expect, it } from "vitest";
import {
  optimizeBasket,
  type EngineOffer,
  type SupplierPolicy,
} from "@/core/optimizer/basketEngine";

function offer(id: string, cena: number): EngineOffer {
  return {
    id,
    nazwaKatalogowa: id,
    kodProducenta: `KOD-${id}`,
    cenaPoRabacieNettoGrosze: cena,
    packSize: 1,
    dostepnoscSztuk: 10_000,
  };
}

const deferred: SupplierPolicy = {
  warehouseId: "beta",
  name: "Hurtownia Beta",
  freeShippingThresholdGrosze: 1,
  shippingCostGrosze: 0,
  paymentTerm: 14,
  creditLimitGrosze: 5_000_000,
};

const prepaid: SupplierPolicy = {
  warehouseId: "alfa",
  name: "Hurtownia Alfa",
  freeShippingThresholdGrosze: 1,
  shippingCostGrosze: 0,
  paymentTerm: "prepaid",
  creditLimitGrosze: 5_000_000,
};

describe("basketEngine — priorytet płynności", () => {
  it("nie przydziela przedpłaty, gdy włączony jest priorytet płynności", () => {
    const input = {
      catalog: [{ id: "rura", nazwaKanoniczna: "Rura" }],
      suppliers: [prepaid, { ...deferred, warehouseId: "beta" }],
      offers: {
        alfa: [offer("rura", 10_000)],
        beta: [offer("rura", 13_500)],
      },
      demand: 1,
    };

    const cheap = optimizeBasket(input);
    expect(cheap.lines[0].wybor).toBe("alfa");
    expect(cheap.liquidityWarnings).toEqual([]);

    const liquid = optimizeBasket({ ...input, liquidityPriority: true });
    expect(liquid.lines[0].wybor).toBe("beta");
    expect(liquid.lines[0].odrzuconoDlaPlynnosci).toBe(true);
    expect(liquid.liquidityWarnings[0]?.warehouseId).toBe("alfa");
    expect(liquid.liquidityWarnings[0]?.rejectedSavingsGrosze).toBe(3_500);
  });
});

import { describe, expect, it } from "vitest";
import { buildOfferAnalytics } from "@/core/analytics/offerAnalytics";
import { optimizeBasket, type EngineOffer, type SupplierPolicy } from "@/core/optimizer/basketEngine";

function offer(id: string, cena: number): EngineOffer {
  return {
    id,
    nazwaKatalogowa: id,
    kodProducenta: id,
    cenaPoRabacieNettoGrosze: cena,
    packSize: 1,
    dostepnoscSztuk: 10_000,
  };
}

function pol(id: string, name: string): SupplierPolicy {
  return {
    warehouseId: id,
    name,
    freeShippingThresholdGrosze: 1,
    shippingCostGrosze: 0,
  };
}

describe("offerAnalytics", () => {
  it("liczy udział i dodatkową korzyść z 3. dostawcy", () => {
    const input = {
      catalog: [
        { id: "rura", nazwaKanoniczna: "Rura PEX 16x2.0" },
        { id: "zawor", nazwaKanoniczna: "Zawór kulowy 1/2" },
      ],
      suppliers: [pol("tim", "TIM.pl"), pol("onninen", "Onninen"), pol("bims", "Bims Plus")],
      offers: {
        tim: [offer("rura", 10_000), offer("zawor", 20_000)],
        onninen: [offer("rura", 12_000), offer("zawor", 8_000)],
        bims: [offer("rura", 11_000), offer("zawor", 9_000)],
      },
      demand: 1,
    };
    const result = optimizeBasket(input);
    const analytics = buildOfferAnalytics(result, input);
    expect(analytics.supplierCount).toBe(3);
    expect(analytics.share).toHaveLength(3);
    expect(analytics.share.reduce((sum, item) => sum + item.pozycje, 0)).toBe(2);
    expect(analytics.categories.length).toBeGreaterThan(0);
    expect(analytics.extraVsTwoSuppliersGrosze).toBeGreaterThanOrEqual(0);
  });
});

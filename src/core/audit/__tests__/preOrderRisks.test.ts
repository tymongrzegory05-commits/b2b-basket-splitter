import { describe, expect, it } from "vitest";
import { optimizeBasket, type EngineOffer, type SupplierPolicy } from "@/core/optimizer/basketEngine";
import { buildPreOrderRisks } from "@/core/audit/preOrderRisks";

function offer(
  id: string,
  cena: number,
  extra: Partial<EngineOffer> = {},
): EngineOffer {
  return {
    id,
    nazwaKatalogowa: id,
    kodProducenta: id,
    cenaPoRabacieNettoGrosze: cena,
    packSize: 1,
    dostepnoscSztuk: extra.stockAvailable ?? 10_000,
    stockAvailable: extra.stockAvailable ?? 10_000,
    leadTimeDays: extra.leadTimeDays ?? 0,
  };
}

const tim: SupplierPolicy = {
  warehouseId: "tim",
  name: "TIM.pl",
  freeShippingThresholdGrosze: 50_000,
  shippingCostGrosze: 2_900,
  minOrderGrosze: 30_000,
};

const onninen: SupplierPolicy = {
  warehouseId: "onninen",
  name: "Onninen",
  freeShippingThresholdGrosze: 1,
  shippingCostGrosze: 0,
};

describe("preOrderRisks", () => {
  it("zbiera braki, lead time, MOQ i próg darmowej dostawy", () => {
    const result = optimizeBasket({
      catalog: [
        { id: "brak", nazwaKanoniczna: "Rozdzielacz hydrauliczny DN32" },
        { id: "ster", nazwaKanoniczna: "Sterownik pogodowy PC" },
        { id: "tasma", nazwaKanoniczna: "Taśma teflonowa" },
      ],
      suppliers: [tim, onninen],
      offers: {
        tim: [
          offer("brak", 8_000, { stockAvailable: 0 }),
          offer("ster", 1_000, { leadTimeDays: 14 }),
          offer("tasma", 2_000),
        ],
        onninen: [
          offer("brak", 8_000, { stockAvailable: 0 }),
          offer("ster", 9_000),
          offer("tasma", 8_000),
        ],
      },
      demand: 1,
    });

    const report = buildPreOrderRisks(result);
    expect(report.count).toBeGreaterThanOrEqual(3);
    expect(report.alerts.some((item) => item.kind === "unfulfilled")).toBe(true);
    expect(report.alerts.some((item) => item.kind === "lead-time")).toBe(true);
    expect(report.alerts.some((item) => item.kind === "min-order")).toBe(true);
    expect(report.alerts.some((item) => item.kind === "free-shipping")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { optimizeBasket, type EngineOffer, type SupplierPolicy } from "@/core/optimizer/basketEngine";
import {
  findLineSubstitutions,
  pickAggressiveSubstitutions,
} from "@/core/matching/substitutions";

function pol(id: string, name: string): SupplierPolicy {
  return {
    warehouseId: id,
    name,
    freeShippingThresholdGrosze: 1,
    shippingCostGrosze: 0,
  };
}

function offer(id: string, name: string, cena: number): EngineOffer {
  return {
    id,
    nazwaKatalogowa: name,
    kodProducenta: id,
    cenaPoRabacieNettoGrosze: cena,
    packSize: 1,
    dostepnoscSztuk: 10_000,
    stockAvailable: 10_000,
    leadTimeDays: 0,
  };
}

describe("substitutions", () => {
  it("wskazuje tańszy PEX Wavin jako zamiennik Kan-Therm", () => {
    const result = optimizeBasket(
      {
        catalog: [{ id: "pex", nazwaKanoniczna: "Rura PEX/Al/PEX 16x2.0 Kan-Therm" }],
        suppliers: [pol("tim", "TIM.pl"), pol("onninen", "Onninen")],
        offers: {
          tim: [offer("pex", "Rura PEX/Al/PEX 16x2.0 Kan-Therm", 519)],
          onninen: [offer("pex", "Rura PEX/Al/PEX 16x2.0 Wavin Tigris", 380)],
        },
        demand: 10,
      },
      { pex: "tim" },
    );

    const suggestions = findLineSubstitutions(result.lines[0], result.suppliers);
    expect(suggestions[0]?.brand).toBe("Wavin Tigris");
    expect(suggestions[0]?.warehouseId).toBe("onninen");
    expect(suggestions[0]?.savingsGrosze).toBe((519 - 380) * 10);

    const aggressive = pickAggressiveSubstitutions(result);
    expect(aggressive.pex?.warehouseId).toBe("onninen");
  });
});

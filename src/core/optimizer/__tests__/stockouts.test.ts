import { describe, expect, it } from "vitest";
import {
  optimizeBasket,
  type EngineOffer,
  type SupplierPolicy,
} from "@/core/optimizer/basketEngine";

function policy(id: string): SupplierPolicy {
  return {
    warehouseId: id,
    name: id,
    freeShippingThresholdGrosze: 1,
    shippingCostGrosze: 0,
  };
}

function offer(
  id: string,
  cena: number,
  extra: Partial<EngineOffer> = {},
): EngineOffer {
  return {
    id,
    nazwaKatalogowa: id,
    kodProducenta: `KOD-${id}`,
    cenaPoRabacieNettoGrosze: cena,
    packSize: 1,
    dostepnoscSztuk: extra.stockAvailable ?? extra.dostepnoscSztuk ?? 10_000,
    stockAvailable: extra.stockAvailable ?? 10_000,
    leadTimeDays: extra.leadTimeDays ?? 0,
    ...extra,
  };
}

describe("basketEngine — braki i lead time", () => {
  it("nie wybiera hurtowni ze stanem 0 i nie rzuca błędu przy braku oferty", () => {
    const result = optimizeBasket({
      catalog: [{ id: "rura", nazwaKanoniczna: "Rura PEX 16x2.0" }],
      suppliers: [policy("tim"), policy("onninen")],
      offers: {
        tim: [offer("rura", 1_000, { stockAvailable: 0 })],
        onninen: [offer("rura", 4_000)],
      },
      demand: 1,
    });

    expect(result.lines[0].status).toBe("ASSIGNED");
    expect(result.lines[0].wybor).toBe("onninen");
    expect(result.lines[0].oferty.tim.selectable).toBe(false);
    expect(result.split.towarGrosze).toBe(4_000);
  });

  it("oznacza UNFULFILLED, gdy nikt nie ma towaru, i wyłącza pozycję z sum", () => {
    const result = optimizeBasket({
      catalog: [
        { id: "kotwica", nazwaKanoniczna: "Kotwica" },
        { id: "brak", nazwaKanoniczna: "Rozdzielacz hydrauliczny DN32" },
      ],
      suppliers: [policy("tim"), policy("onninen")],
      offers: {
        tim: [offer("kotwica", 10_000), offer("brak", 8_000, { stockAvailable: 0 })],
        onninen: [offer("kotwica", 12_000)],
      },
      demand: 1,
    });

    const missing = result.lines.find((line) => line.id === "brak");
    expect(missing?.status).toBe("UNFULFILLED");
    expect(missing?.wybor).toBeNull();
    expect(result.unfulfilledCount).toBe(1);
    expect(result.split.towarGrosze).toBe(10_000);
    expect(result.split.liczbaPozycji).toBe(1);
  });

  it("filtr 24h pomija oferty z leadTime > 2 dni", () => {
    const input = {
      catalog: [{ id: "ster", nazwaKanoniczna: "Sterownik" }],
      suppliers: [policy("tim"), policy("onninen")],
      offers: {
        tim: [offer("ster", 1_000, { leadTimeDays: 14 })],
        onninen: [offer("ster", 4_000, { leadTimeDays: 0 })],
      },
      demand: 1,
    };

    const open = optimizeBasket(input);
    expect(open.lines[0].wybor).toBe("tim");
    expect(open.lines[0].leadTimeDays).toBe(14);

    const filtered = optimizeBasket({ ...input, inStockOnly: true });
    expect(filtered.lines[0].wybor).toBe("onninen");
    expect(filtered.lines[0].oferty.tim.selectable).toBe(false);
  });
});

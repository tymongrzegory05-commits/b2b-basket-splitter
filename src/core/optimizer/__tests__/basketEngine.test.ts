import { describe, expect, it } from "vitest";
import {
  optimizeBasket,
  type BasketEngineInput,
  type EngineOffer,
  type SupplierPolicy,
} from "@/core/optimizer/basketEngine";
import { ceilToPack, toGrosze } from "@/core/optimizer/money";

function policy(id: string, extra: Partial<SupplierPolicy> = {}): SupplierPolicy {
  return {
    warehouseId: id,
    name: id === "alfa" ? "Hurtownia Alfa" : id === "beta" ? "Hurtownia Beta" : id,
    freeShippingThresholdGrosze: 150_000,
    shippingCostGrosze: 15_000,
    ...extra,
  };
}

function offer(
  id: string,
  cenaPoRabacieNettoGrosze: number,
  packSize = 1,
  dostepnoscSztuk = 10_000,
): EngineOffer {
  return {
    id,
    nazwaKatalogowa: id,
    kodProducenta: `KOD-${id}`,
    cenaPoRabacieNettoGrosze,
    packSize,
    dostepnoscSztuk,
  };
}

function two(
  catalog: BasketEngineInput["catalog"],
  alfa: EngineOffer[],
  beta: EngineOffer[],
  extra: Partial<BasketEngineInput> = {},
  policyAlfa = policy("alfa"),
  policyBeta = policy("beta"),
): BasketEngineInput {
  return {
    catalog,
    suppliers: [policyAlfa, policyBeta],
    offers: { alfa, beta },
    demand: 1,
    ...extra,
  };
}

describe("basketEngine — pułapka kosztów dostawy", () => {
  it("konsoliduje pozycję do droższej hurtowni, gdy zysk towarowy < koszt transportu", () => {
    const result = optimizeBasket(
      two(
        [
          { id: "kotwica", nazwaKanoniczna: "Kotwica asortymentu" },
          { id: "tanio-w-b", nazwaKanoniczna: "Pozycja tańsza w B" },
        ],
        [offer("kotwica", 200_000), offer("tanio-w-b", 10_000)],
        [offer("kotwica", 280_000), offer("tanio-w-b", 3_000)],
      ),
    );

    const cheapLine = result.lines.find((line) => line.id === "tanio-w-b");
    expect(cheapLine?.wyborTowarowy).toBe("beta");
    expect(cheapLine?.wybor).toBe("alfa");
    expect(cheapLine?.skonsolidowanoDlaDarmowejDostawy).toBe(true);
    expect(cheapLine?.oszczednoscTowarowaGrosze).toBe(7_000);
    expect(result.split.bySupplier.beta.towarGrosze).toBe(0);
    expect(result.split.bySupplier.beta.dostawaGrosze).toBe(0);
    expect(result.split.bySupplier.alfa.dostawaGrosze).toBe(0);
    expect(result.split.sumaGrosze).toBe(210_000);
    expect(result.singles.alfa.sumaGrosze).toBe(210_000);
    expect(result.singles.beta.sumaGrosze).toBe(283_000);
  });

  it("nie konsoliduje, gdy zysk towarowy pokrywa koszt wysyłki drugiej hurtowni", () => {
    const result = optimizeBasket(
      two(
        [
          { id: "kotwica", nazwaKanoniczna: "Kotwica asortymentu" },
          { id: "tanio-w-b", nazwaKanoniczna: "Pozycja tańsza w B" },
        ],
        [offer("kotwica", 200_000), offer("tanio-w-b", 40_000)],
        [offer("kotwica", 280_000), offer("tanio-w-b", 20_000)],
      ),
    );

    const cheapLine = result.lines.find((line) => line.id === "tanio-w-b");
    expect(cheapLine?.wybor).toBe("beta");
    expect(cheapLine?.skonsolidowanoDlaDarmowejDostawy).toBe(false);
    expect(result.split.bySupplier.beta.dostawaGrosze).toBe(15_000);
    expect(result.split.sumaGrosze).toBe(200_000 + 20_000 + 15_000);
    expect(result.split.sumaGrosze).toBeLessThan(result.singles.alfa.sumaGrosze);
  });
});

describe("basketEngine — N dostawców", () => {
  it("przesuwa drobnicę z 3. hurtowni, gdy dostawa 150 zł > zysk 40 zł", () => {
    const result = optimizeBasket({
      catalog: [
        { id: "kotwica", nazwaKanoniczna: "Kotwica" },
        { id: "drobnica", nazwaKanoniczna: "Drobnica" },
      ],
      suppliers: [
        policy("tim", {
          name: "TIM.pl",
          freeShippingThresholdGrosze: 1,
          shippingCostGrosze: 0,
        }),
        policy("onninen", {
          name: "Onninen",
          freeShippingThresholdGrosze: 1,
          shippingCostGrosze: 0,
        }),
        policy("bims", {
          name: "Bims Plus",
          freeShippingThresholdGrosze: 200_000,
          shippingCostGrosze: 15_000,
        }),
      ],
      offers: {
        tim: [offer("kotwica", 200_000), offer("drobnica", 10_000)],
        onninen: [offer("kotwica", 210_000), offer("drobnica", 11_000)],
        bims: [offer("kotwica", 280_000), offer("drobnica", 6_000)],
      },
      demand: 1,
    });

    const drobnica = result.lines.find((line) => line.id === "drobnica");
    expect(drobnica?.wyborTowarowy).toBe("bims");
    expect(drobnica?.wybor).not.toBe("bims");
    expect(result.current.bims.liczbaPozycji).toBe(0);
    expect(result.split.sumaGrosze).toBeLessThan(200_000 + 6_000 + 15_000);
  });
});

describe("basketEngine — opakowania zbiorcze", () => {
  it("zaokrągla 22 szt. przy packSize 10 do zakupu 30 szt.", () => {
    expect(ceilToPack(22, 10)).toBe(30);

    const result = optimizeBasket(
      two(
        [{ id: "kolano", nazwaKanoniczna: "Kolano zaciskane 20" }],
        [offer("kolano", 100, 10)],
        [offer("kolano", 250, 10)],
        { demand: 22 },
      ),
    );

    const line = result.lines[0];
    expect(line.zapotrzebowanie).toBe(22);
    expect(line.oferty.alfa.ilosc).toBe(30);
    expect(line.oferty.beta.ilosc).toBe(30);
    expect(line.iloscZakup).toBe(30);
    expect(line.oferty.alfa.kosztTowaruGrosze).toBe(3_000);
    expect(result.split.towarGrosze).toBe(3_000);
  });

  it("liczy różne wielokrotności, gdy hurtownie mają inny packSize", () => {
    const result = optimizeBasket(
      two(
        [{ id: "mufa", nazwaKanoniczna: "Mufa" }],
        [offer("mufa", 100, 10)],
        [offer("mufa", 90, 8)],
        { demand: 22 },
      ),
    );

    expect(result.lines[0].oferty.alfa.ilosc).toBe(30);
    expect(result.lines[0].oferty.beta.ilosc).toBe(24);
    expect(result.lines[0].oferty.alfa.kosztTowaruGrosze).toBe(3_000);
    expect(result.lines[0].oferty.beta.kosztTowaruGrosze).toBe(2_160);
  });
});

describe("basketEngine — grosze bez błędów float", () => {
  it("sumuje 0,10 zł i 0,20 zł do dokładnie 0,30 zł (30 gr)", () => {
    expect(0.1 + 0.2).not.toBe(0.3);

    const result = optimizeBasket(
      two(
        [
          { id: "a", nazwaKanoniczna: "A" },
          { id: "b", nazwaKanoniczna: "B" },
        ],
        [offer("a", 10), offer("b", 20)],
        [offer("a", 10), offer("b", 20)],
        {},
        policy("alfa", { freeShippingThresholdGrosze: 1, shippingCostGrosze: 0 }),
        policy("beta", { freeShippingThresholdGrosze: 1, shippingCostGrosze: 0 }),
      ),
    );

    expect(result.singles.alfa.towarGrosze).toBe(30);
    expect(result.split.sumaGrosze).toBe(30);
    expect(Number.isInteger(result.split.sumaGrosze)).toBe(true);
  });

  it("mnoży 19,99 zł × 3 bez dryfu zmiennoprzecinkowego", () => {
    const unitGrosze = toGrosze(19.99);
    expect(unitGrosze).toBe(1_999);
    expect(0.1 * 3).not.toBe(0.3);

    const result = optimizeBasket(
      two(
        [{ id: "zawor", nazwaKanoniczna: "Zawór" }],
        [offer("zawor", unitGrosze, 1)],
        [offer("zawor", unitGrosze + 500, 1)],
        { demand: 3 },
        policy("alfa", { freeShippingThresholdGrosze: 1, shippingCostGrosze: 0 }),
        policy("beta", { freeShippingThresholdGrosze: 1, shippingCostGrosze: 0 }),
      ),
    );

    expect(result.lines[0].oferty.alfa.kosztTowaruGrosze).toBe(5_997);
    expect(result.split.towarGrosze).toBe(5_997);
    expect(result.split.sumaGrosze).toBe(5_997);
  });
});

describe("basketEngine — ręczne nadpisanie", () => {
  it("po przeniesieniu kotwicy do B dolicza dostawę, gdy koszyk A spada poniżej progu", () => {
    const input = two(
      [
        { id: "kotwica", nazwaKanoniczna: "Kotwica" },
        { id: "drobnica", nazwaKanoniczna: "Drobnica" },
      ],
      [offer("kotwica", 200_000), offer("drobnica", 20_000)],
      [offer("kotwica", 200_000), offer("drobnica", 40_000)],
    );

    const automatic = optimizeBasket(input);
    expect(automatic.current.alfa.dostawaGrosze).toBe(0);

    const overridden = optimizeBasket(input, { kotwica: "beta" });
    expect(overridden.lines.find((line) => line.id === "kotwica")?.wybor).toBe(
      "beta",
    );
    expect(overridden.current.alfa.towarGrosze).toBe(20_000);
    expect(overridden.current.alfa.dostawaGrosze).toBe(15_000);
    expect(overridden.current.alfa.sumaGrosze).toBe(35_000);
    expect(
      overridden.lines.find((line) => line.id === "kotwica")?.nadpisaneRecznie,
    ).toBe(true);
  });
});

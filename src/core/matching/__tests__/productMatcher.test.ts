import { describe, expect, it } from "vitest";
import {
  matchProductLists,
  matchProducts,
  parseProduct,
} from "@/core/matching/productMatcher";
import { ofertaAlfa, ofertaBeta } from "@/data/mockOffers";

describe("parseProduct — czyszczenie i wymiary", () => {
  it("normalizuje szum (spacje, myślniki, ukośniki, wielkość liter, ×)", () => {
    const profile = parseProduct("  Rura   PEX-a  16×2,0 mm ");
    expect(profile.normalizedName).toBe("rura pex a 16x2.0 mm");
    expect(profile.material).toBe("PEX");
    expect(profile.productClass).toBe("rura");
    expect(profile.dimensions.diameterMm).toBe(16);
    expect(profile.dimensions.wallTenthsMm).toBe(20);
  });

  it("wyciąga DN, gwint, PN, PP-R i sygnaturę pompy", () => {
    expect(parseProduct("Zawór termostatyczny DN15").dimensions.dn).toBe(15);
    expect(parseProduct('Zawór kulowy GW 1/2"').dimensions.threadInch).toBe(
      "1/2",
    );
    expect(parseProduct("Rura PP-R 20 PN16").dimensions).toMatchObject({
      diameterMm: 20,
      pn: 16,
    });
    expect(parseProduct("Rura PP-R 20 PN16").material).toBe("PPR");
    expect(parseProduct("Pompa obiegowa 25-40/180").dimensions.pumpSignature).toBe(
      "25-40/180",
    );
    expect(parseProduct("Otulina PE 18/6").dimensions).toMatchObject({
      diameterMm: 18,
      insulationMm: 6,
    });
  });
});

describe("matchProducts — twardy priorytet średnic", () => {
  it("nigdy nie łączy produktów o różnych średnicach", () => {
    const match = matchProducts("Rura PEX 16x2.0", "Rura PEX 20x2.8");
    expect(match.hardReject).toBe(true);
    expect(match.status).toBe("REJECTED");
    expect(match.confidenceScore).toBe(0);
    expect(match.reasons.join(" ")).toMatch(/średnicy/i);
  });

  it("odrzuca konflikt średnicy nawet przy identycznym EAN", () => {
    const match = matchProducts(
      { nazwa: "Rura PEX 16x2.0", ean: "5901234567890" },
      { nazwa: "Rura PEX 20x2.0", ean: "5901234567890" },
    );
    expect(match.hardReject).toBe(true);
    expect(match.confidenceScore).toBe(0);
  });

  it("odrzuca PP-R 20 vs PP-R 25", () => {
    const match = matchProducts("Rura PP-R 20 PN16", "Rura PP-R 25 PN16");
    expect(match.status).toBe("REJECTED");
    expect(match.hardReject).toBe(true);
  });

  it("uznaje 1/2\" i DN15 za tę samą średnicę zaworu", () => {
    const match = matchProducts(
      { nazwa: 'Zawór kulowy 1/2"', marka: "Ferro" },
      { nazwa: "Zawór kulowy DN15", marka: "Ferro" },
    );
    expect(match.hardReject).toBe(false);
    expect(match.confidenceScore).toBeGreaterThanOrEqual(90);
    expect(match.confidenceScore).toBeLessThanOrEqual(99);
  });
});

describe("matchProducts — ConfidenceScore", () => {
  it("daje 100% przy zgodnym EAN", () => {
    const match = matchProducts(
      { nazwa: "Rura PEX 16x2.0", ean: "5901234567890" },
      { nazwa: "Rura PEX-a 16×2,0 mm", ean: "5901234567890" },
    );
    expect(match.confidenceScore).toBe(100);
    expect(match.status).toBe("MATCHED");
    expect(match.reasons).toContain("Zgodny kod EAN");
  });

  it("daje 100% przy zgodnym kodzie producenta (po usunięciu szumu)", () => {
    const match = matchProducts(
      { nazwa: "Kolano 20", kodProducenta: "KAN-ELB-20" },
      { nazwa: "Kolano zacisk 20 mm", kodProducenta: "kan/elb_20" },
    );
    expect(match.confidenceScore).toBe(100);
    expect(match.status).toBe("MATCHED");
  });

  it("daje 90-99% przy zgodnej marce i kluczowych parametrach", () => {
    const match = matchProducts(
      { nazwa: "Uponor rura PEX 16x2.0", marka: "Uponor" },
      { nazwa: "Uponor PEX-a 16×2,0 mm PN16", marka: "Uponor" },
    );
    expect(match.confidenceScore).toBeGreaterThanOrEqual(90);
    expect(match.confidenceScore).toBeLessThanOrEqual(99);
    expect(match.status).toBe("MATCHED");
  });

  it("daje poniżej 80% i NEEDS_CONFIRMATION przy niejednoznacznych parametrach", () => {
    const match = matchProducts("Zawór kulowy", "Zawór kątowy");
    expect(match.confidenceScore).toBeLessThan(80);
    expect(match.status).toBe("NEEDS_CONFIRMATION");
  });
});

describe("matchProductLists — oferty hurtowe", () => {
  it("łączy rury PEX 16 z Alfy i Bety, a nie z PEX 20", () => {
    const result = matchProductLists(
      ofertaAlfa.map((offer) => ({
        id: offer.id,
        nazwa: offer.nazwaKatalogowa,
        kodProducenta: offer.kodProducenta,
      })),
      ofertaBeta.map((offer) => ({
        id: offer.id,
        nazwa: offer.nazwaKatalogowa,
        kodProducenta: offer.kodProducenta,
      })),
    );

    const pex16 = result.pairs.find(
      (pair) =>
        pair.left.dimensions.diameterMm === 16 &&
        pair.left.productClass === "rura",
    );
    expect(pex16).toBeDefined();
    expect(pex16?.right.dimensions.diameterMm).toBe(16);
    expect(pex16?.hardReject).toBe(false);

    const crossDiameter = result.pairs.find(
      (pair) =>
        pair.left.productClass === "rura" &&
        pair.right.productClass === "rura" &&
        pair.left.dimensions.diameterMm !== pair.right.dimensions.diameterMm,
    );
    expect(crossDiameter).toBeUndefined();
  });
});

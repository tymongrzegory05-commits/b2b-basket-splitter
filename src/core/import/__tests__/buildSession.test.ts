import { describe, expect, it } from "vitest";
import { buildOfferSession, sessionToEngineInput } from "@/core/import/buildSession";
import { optimizeBasket } from "@/core/optimizer/basketEngine";
import { demoScenarios } from "@/data/demoSets";
import { getPreset, policyFromPreset } from "@/data/supplierPolicies";

describe("buildOfferSession", () => {
  it("łączy zestaw pompy ciepła i nie skleja PEX 16 z PEX 20", () => {
    const scenario = demoScenarios[0];
    const session = buildOfferSession(
      scenario.slots.map((slot, index) => ({
        id: slot.presetId,
        offers: slot.offers,
        key: index,
      })),
    );
    expect(session.catalog.length).toBeGreaterThanOrEqual(12);
    expect(session.offers.tim).toHaveLength(session.catalog.length);
    expect(session.offers.onninen).toHaveLength(session.catalog.length);

    const pexPairs = session.catalog.filter((item) =>
      /pex 16|16x2/i.test(item.nazwaKanoniczna),
    );
    for (const item of pexPairs) {
      const tim = session.offers.tim.find((offer) => offer.id === item.id);
      const onninen = session.offers.onninen.find((offer) => offer.id === item.id);
      expect(tim?.nazwaKatalogowa).not.toMatch(/20x2|20×2/i);
      expect(onninen?.nazwaKatalogowa).not.toMatch(/20x2|20×2/i);
    }
  });

  it("ładuje 30 pozycji do silnika i liczy oszczędność", () => {
    const scenario = demoScenarios[1];
    expect(scenario.slots[0].offers).toHaveLength(30);
    expect(scenario.slots[1].offers).toHaveLength(30);
    const session = buildOfferSession(
      scenario.slots.map((slot) => ({ id: slot.presetId, offers: slot.offers })),
    );
    expect(session.catalog.length).toBeGreaterThanOrEqual(25);
    const suppliers = scenario.slots.map((slot) =>
      policyFromPreset(getPreset(slot.presetId), slot.presetId),
    );
    const result = optimizeBasket(sessionToEngineInput(session, suppliers));
    expect(result.lines).toHaveLength(session.catalog.length);
    expect(result.zyskZPodzialuGrosze).toBeGreaterThan(0);
    const assigned = Object.values(result.current).reduce(
      (sum, item) => sum + item.liczbaPozycji,
      0,
    );
    expect(assigned).toBe(result.lines.length);
  });
});

import type { ImportedOffer } from "@/core/import/importedOffer";
import { ofertaAlfa, ofertaBeta, defaultDemand } from "@/data/mockOffers";

export type DemoSlot = {
  presetId: string;
  offers: ImportedOffer[];
};

export type DemoScenario = {
  id: "heatpump-15" | "boiler-30";
  label: string;
  description: string;
  slots: DemoSlot[];
};

function row(
  nazwa: string,
  kod: string,
  cena: number,
  ilosc: number,
  extra: { stockAvailable?: number; leadTimeDays?: number } = {},
): ImportedOffer {
  return {
    nazwa,
    kodProducenta: kod,
    cenaPoRabacieNetto: cena,
    ilosc,
    packSize: 1,
    ...extra,
  };
}

const heatPumpAlfa: ImportedOffer[] = [
  row("Pompa ciepła powietrze-woda 8 kW", "ALF-PC-8", 18490, 1),
  row("Bufor 200 l, izolowany", "ALF-BUF-200", 1890, 1),
  row("Zasobnik CWU 200 l", "ALF-CWU-200", 2460, 1),
  row("Grupa pompowa DN25", "ALF-GP-25", 780, 1),
  row("Rura PEX/Al/PEX 16x2.0 Kan-Therm", "ALF-PEX-16-20", 5.19, 80),
  row("Rura PEX 20x2.8", "ALF-PEX-20-28", 6.5, 60),
  row("Otulina PE 18/6", "ALF-OTU-1806", 2.4, 40),
  row("Zawór kulowy 1/2 PN25 z dławikiem Valvex", "ALF-ZK-15-SR", 15.5, 12),
  row("Zawór termostatyczny DN15", "ALF-ZT-DN15", 45, 8),
  row("Kolano zaciskane 20", "ALF-KOL-Z20", 9.5, 24),
  row("Trójnik zaciskany 16", "ALF-TRJ-16", 12.4, 16),
  row("Rozdzielacz 8-obwodowy", "ALF-ROZ-08", 268, 2),
  row("Naczynie wzbiorcze 25 l", "ALF-NW-25", 210, 1),
  row("Filtr magnetyczny 1\"", "ALF-FM-25", 390, 1),
  row("Sterownik pogodowy PC", "ALF-ST-PC", 890, 1, { leadTimeDays: 14 }),
];

const heatPumpUnfulfilled: ImportedOffer = row(
  "Rozdzielacz hydrauliczny DN32",
  "ALF-RH-32",
  890,
  1,
  { stockAvailable: 0 },
);

const heatPumpBeta: ImportedOffer[] = [
  row("Pompa ciepła A+++ 8 kW, monoblok", "BET-HP-08", 17650, 1),
  row("Zbiornik buforowy 200 litrów", "BET-BUF-200L", 2040, 1),
  row("Bojler CWU 200 l emaliowany", "BET-DHW-200", 2290, 1),
  row("Moduł pompowy DN25", "BET-PM-25", 845, 1),
  row("Rura PEX/Al/PEX 16x2.0 Wavin Tigris", "BET-RPEX-16020", 3.8, 80),
  row("Rura PEX-a 20×2,8 mm", "BET-RPEX-20028", 8.9, 60),
  row("Izolacja PE 18×6 mm", "BET-INS-1806", 3.6, 40),
  row('Zawór kulowy 1/2" PN25 z dławikiem Danfoss', "BET-VAL-050-S", 21, 12),
  row("Głowica + zawór term. DN15", "BET-THV-15", 32, 8),
  row("Kolano PEX zacisk 20 mm", "BET-ELB-C20", 6.8, 24),
  row("Trójnik zacisk PEX 16 mm", "BET-TEE-16", 8.9, 16),
  row("Rozdzielacz 8 obwodów, belka", "BET-MAN-08", 198, 2),
  row("Naczynie przeponowe 25 l", "BET-EXP-25", 245, 1),
  row("Separator magnetyczny 1 cal", "BET-MAG-1", 360, 1),
  row("Regulator pogodowy pompy ciepła", "BET-CTRL-HP", 940, 1),
];

const boilerAlfa: ImportedOffer[] = [
  ...heatPumpAlfa,
  row("Kocioł gazowy kondensacyjny 24 kW", "ALF-KG-24", 6890, 1),
  row("Pompa obiegowa 25-40/180", "ALF-PO-2540", 310, 2),
  row("Złączka prosta PEX 20", "ALF-ZL-P20", 5.2, 30),
  row("Rozdzielacz 10-obwodowy", "ALF-ROZ-10", 312, 1),
  row("Pętla PEX 16 podłogówka", "ALF-PEX-16-PF", 4.8, 200),
  row("Listwa mieszająca DN25", "ALF-LM-25", 560, 1),
  row("Siłownik termiczny 230V", "ALF-SIL-230", 78, 10),
  row("Czujnik podłogowy NTC", "ALF-NTC-PF", 42, 6),
  row("Zawór mieszający 3-drogowy DN20", "ALF-ZM-20", 186, 1),
  row("Kominek spalinowy 60/100", "ALF-KOM-60100", 240, 1),
  row("Reduktor ciśnienia 1/2", "ALF-RED-15", 95, 1),
  row("Grupa bezpieczeństwa CWU", "ALF-GB-CWU", 128, 1),
  row("Rura spalinowa 80 mm", "ALF-SP-80", 38, 6),
  row("Kolano spalin 80 mm 90°", "ALF-SP-KOL80", 29, 4),
  row("Taśma uszczelniająca 15 m", "ALF-TAS-15", 18.5, 3),
];

const boilerBeta: ImportedOffer[] = [
  ...heatPumpBeta,
  row("Kocioł kondensacyjny 24 kW, wiszący", "BET-BOIL-24", 7120, 1),
  row("Pompa c.o. 25-40 180 mm", "BET-CIR-2540180", 385, 2),
  row("Mufa prosta zaciskana 20", "BET-CPL-20", 7.8, 30),
  row("Rozdzielacz 10 obwodów", "BET-MAN-10", 289, 1),
  row("Rura PEX 16 do ogrzewania płaszczyznowego", "BET-PEX-16-UFH", 4.2, 200),
  row("Moduł mieszający DN25", "BET-MIX-25", 610, 1),
  row("Siłownik NC 230 V", "BET-ACT-230", 69, 10),
  row("Sonda NTC do wylewki", "BET-NTC-FL", 48, 6),
  row("Zawór 3D DN20", "BET-3D-20", 169, 1),
  row("Przyłącze spalin 60/100", "BET-FLU-60100", 255, 1),
  row("Reduktor 1/2\"", "BET-PRV-15", 88, 1),
  row("Grupa bezp. zasobnika", "BET-SG-DHW", 141, 1),
  row("Rura koncentryczna 80", "BET-COAX-80", 41, 6),
  row("Kolano koncentryczne 80/90", "BET-COAX-EL80", 26, 4),
  row("Taśma teflon + uszczelka 15m", "BET-TAPE-15", 16.9, 3),
];

const heatPumpBims: ImportedOffer[] = heatPumpAlfa.map((offer, index) => {
    const kod = offer.kodProducenta.replace("ALF-", "BIM-");
    if (kod.includes("PEX-16")) {
      return {
        ...offer,
        nazwa: "Rura PEX/Al/PEX 16x2.0 Kisan",
        kodProducenta: kod,
        cenaPoRabacieNetto: 2.74,
        stockAvailable: 10_000,
        leadTimeDays: 0,
      };
    }
    if (kod.includes("ZK-15")) {
      return {
        ...offer,
        nazwa: "Zawór kulowy 1/2 PN25 z dławikiem Arco",
        kodProducenta: kod,
        cenaPoRabacieNetto: 11.2,
        stockAvailable: 10_000,
        leadTimeDays: 0,
      };
    }
    return {
      ...offer,
      kodProducenta: kod,
      cenaPoRabacieNetto:
        Math.round(
          offer.cenaPoRabacieNetto * (index % 3 === 0 ? 0.86 : 1.07) * 100,
        ) / 100,
      stockAvailable: 10_000,
      leadTimeDays: offer.kodProducenta.includes("ST-PC") ? 0 : offer.leadTimeDays,
    };
  });

export const demoScenarios: DemoScenario[] = [
  {
    id: "heatpump-15",
    label: "Montaż pompy ciepła – 15 pozycji",
    description: "PC 8 kW, bufor, CWU, rury i armatura. TIM + Onninen + Bims.",
    slots: [
      { presetId: "tim", offers: [...heatPumpAlfa, heatPumpUnfulfilled] },
      { presetId: "onninen", offers: heatPumpBeta },
      { presetId: "bims", offers: heatPumpBims },
    ],
  },
  {
    id: "boiler-30",
    label: "Kotłownia i podłogówka – 30 pozycji",
    description: "Kocioł, rozdzielacze, pętle PEX i komin.",
    slots: [
      { presetId: "tim", offers: boilerAlfa },
      { presetId: "onninen", offers: boilerBeta },
    ],
  },
];

export function mockToImportedAlfa(): ImportedOffer[] {
  return ofertaAlfa.map((offer) => ({
    nazwa: offer.nazwaKatalogowa,
    kodProducenta: offer.kodProducenta,
    cenaPoRabacieNetto: offer.cenaPoRabacieNetto,
    ilosc: defaultDemand[offer.id] ?? 50,
    packSize: offer.packSize,
  }));
}

export function mockToImportedBeta(): ImportedOffer[] {
  return ofertaBeta.map((offer) => ({
    nazwa: offer.nazwaKatalogowa,
    kodProducenta: offer.kodProducenta,
    cenaPoRabacieNetto: offer.cenaPoRabacieNetto,
    ilosc: defaultDemand[offer.id] ?? 50,
    packSize: offer.packSize,
  }));
}

export function mockToImportedBims(): ImportedOffer[] {
  return ofertaAlfa.map((offer, index) => ({
    nazwa: offer.nazwaKatalogowa,
    kodProducenta: offer.kodProducenta.replace("ALF-", "BIM-"),
    cenaPoRabacieNetto:
      Math.round(
        offer.cenaPoRabacieNetto * (index % 3 === 0 ? 0.84 : 1.08) * 100,
      ) / 100,
    ilosc: defaultDemand[offer.id] ?? 50,
    packSize: offer.packSize,
  }));
}

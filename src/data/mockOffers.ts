export type OfferLine = {
  id: string;
  nazwaKatalogowa: string;
  kodProducenta: string;
  cenaKatalogowaNetto: number;
  rabatProcent: number;
  cenaPoRabacieNetto: number;
  dostepnoscSztuk: number;
  packSize: number;
};

export type ProductCatalogItem = {
  id: string;
  nazwaKanoniczna: string;
};

export const DEFAULT_DEMAND_QTY = 50;

/** Część armatury ma zapotrzebowanie 22 szt., żeby było widać zaokrąglenie opakowań. */
export const defaultDemand: Record<string, number> = {
  "pex-16": 50,
  "zawor-kulowy-15": 50,
  "kolano-20": 22,
  "otulina-18-6": 22,
  "trojnik-16": 22,
  "zlaczka-20": 22,
  "rozdzielacz-8": 50,
  "pex-20": 50,
  "zawor-term-dn15": 50,
  "pompa-25-40": 50,
};

export const productCatalog: ProductCatalogItem[] = [
  { id: "pex-16", nazwaKanoniczna: "Rura PEX 16x2.0" },
  { id: "zawor-kulowy-15", nazwaKanoniczna: "Zawór kulowy 1/2 ze śrubunkiem" },
  { id: "kolano-20", nazwaKanoniczna: "Kolano zaciskane 20" },
  { id: "otulina-18-6", nazwaKanoniczna: "Otulina PE 18/6" },
  { id: "trojnik-16", nazwaKanoniczna: "Trójnik zaciskany 16" },
  { id: "zlaczka-20", nazwaKanoniczna: "Złączka prosta PEX 20" },
  { id: "rozdzielacz-8", nazwaKanoniczna: "Rozdzielacz 8-obwodowy" },
  { id: "pex-20", nazwaKanoniczna: "Rura PEX 20x2.8" },
  { id: "zawor-term-dn15", nazwaKanoniczna: "Zawór termostatyczny DN15" },
  { id: "pompa-25-40", nazwaKanoniczna: "Pompa obiegowa 25-40/180" },
];

function offer(
  id: string,
  nazwaKatalogowa: string,
  kodProducenta: string,
  cenaKatalogowaNetto: number,
  rabatProcent: number,
  dostepnoscSztuk: number,
  packSize: number,
): OfferLine {
  const cenaPoRabacieNetto =
    Math.round(cenaKatalogowaNetto * (1 - rabatProcent / 100) * 100) / 100;

  return {
    id,
    nazwaKatalogowa,
    kodProducenta,
    cenaKatalogowaNetto,
    rabatProcent,
    cenaPoRabacieNetto,
    dostepnoscSztuk,
    packSize,
  };
}

/** Hurtownia Alfa — nazwy katalogowe i kody własne. */
export const ofertaAlfa: OfferLine[] = [
  offer("pex-16", "Rura PEX 16x2.0", "ALF-PEX-16-20", 5.9, 12, 480, 10),
  offer(
    "zawor-kulowy-15",
    "Zawór kulowy 1/2 ze śrubunkiem",
    "ALF-ZK-15-SR",
    18.24,
    15,
    210,
    1,
  ),
  offer("kolano-20", "Kolano zaciskane 20", "ALF-KOL-Z20", 10.33, 8, 340, 10),
  offer("otulina-18-6", "Otulina PE 18/6", "ALF-OTU-1806", 3.0, 20, 36, 10),
  offer("trojnik-16", "Trójnik zaciskany 16", "ALF-TRJ-16", 13.78, 10, 190, 10),
  offer("zlaczka-20", "Złączka prosta PEX 20", "ALF-ZL-P20", 6.12, 15, 260, 10),
  offer("rozdzielacz-8", "Rozdzielacz 8-obwodowy", "ALF-ROZ-08", 326.83, 18, 64, 1),
  offer("pex-20", "Rura PEX 20x2.8", "ALF-PEX-20-28", 7.39, 12, 390, 10),
  offer(
    "zawor-term-dn15",
    "Zawór termostatyczny DN15",
    "ALF-ZT-DN15",
    48.91,
    8,
    88,
    1,
  ),
  offer(
    "pompa-25-40",
    "Pompa obiegowa 25-40/180",
    "ALF-PO-2540",
    397.44,
    22,
    52,
    1,
  ),
];

/** Hurtownia Beta — te same SKU, inne nazwy handlowe, kody i siatka rabatowa. */
export const ofertaBeta: OfferLine[] = [
  offer("pex-16", "Rura PEX-a 16×2,0 mm", "BET-RPEX-16020", 4.63, 18, 510, 10),
  offer(
    "zawor-kulowy-15",
    'Zawór kulowy GW 1/2" ze śrubunkami',
    "BET-VAL-050-S",
    23.33,
    10,
    175,
    1,
  ),
  offer("kolano-20", "Kolano PEX zacisk 20 mm", "BET-ELB-C20", 7.16, 5, 410, 5),
  offer("otulina-18-6", "Izolacja PE 18×6 mm", "BET-INS-1806", 4.0, 10, 220, 8),
  offer("trojnik-16", "Trójnik zacisk PEX 16 mm", "BET-TEE-16", 10.11, 12, 155, 10),
  offer("zlaczka-20", "Mufa prosta zaciskana 20", "BET-CPL-20", 8.48, 8, 300, 10),
  offer(
    "rozdzielacz-8",
    "Rozdzielacz 8 obwodów, belka",
    "BET-MAN-08",
    264.0,
    25,
    47,
    1,
  ),
  offer("pex-20", "Rura PEX-a 20×2,8 mm", "BET-RPEX-20028", 9.89, 10, 360, 10),
  offer(
    "zawor-term-dn15",
    "Głowica + zawór term. DN15",
    "BET-THV-15",
    37.65,
    15,
    96,
    1,
  ),
  offer(
    "pompa-25-40",
    "Pompa c.o. 25-40 180 mm",
    "BET-CIR-2540180",
    452.94,
    15,
    28,
    1,
  ),
];

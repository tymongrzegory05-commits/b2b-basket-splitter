export const NEEDS_CONFIRMATION_MAX = 79;

export type MatchStatus = "MATCHED" | "NEEDS_CONFIRMATION" | "REJECTED";

export type MatchableProduct = {
  id?: string;
  nazwa: string;
  kodProducenta?: string | null;
  ean?: string | null;
  marka?: string | null;
};

export type TechnicalDimensions = {
  /** Średnica zewnętrzna w mm (16 z 16x2.0, 20 z „PEX 20”). */
  diameterMm: number | null;
  /** Grubość ścianki w dziesiątych mm (2.0 → 20), żeby uniknąć float. */
  wallTenthsMm: number | null;
  /** Otulina: druga liczba z 18/6. */
  insulationMm: number | null;
  threadInch: string | null;
  dn: number | null;
  pn: number | null;
  /** Sygnatura pompy, np. 25-40/180. */
  pumpSignature: string | null;
  circuits: number | null;
};

export type TechnicalProfile = {
  sourceName: string;
  normalizedName: string;
  tokens: string[];
  ean: string | null;
  manufacturerCode: string | null;
  brand: string | null;
  material: string | null;
  productClass: string | null;
  dimensions: TechnicalDimensions;
};

export type ProductMatch = {
  left: TechnicalProfile;
  right: TechnicalProfile;
  confidenceScore: number;
  status: MatchStatus;
  hardReject: boolean;
  reasons: string[];
};

export type ListMatchResult = {
  pairs: ProductMatch[];
  pairIndexes: Array<{ left: number; right: number }>;
  unmatchedLeft: TechnicalProfile[];
  unmatchedRight: TechnicalProfile[];
};

const THREAD_TO_DN: Record<string, number> = {
  "1/8": 6,
  "1/4": 8,
  "3/8": 10,
  "1/2": 15,
  "3/4": 20,
  "1": 25,
  "5/4": 32,
  "1 1/4": 32,
  "6/4": 40,
  "1 1/2": 40,
  "2": 50,
};

const KNOWN_THREADS = new Set(Object.keys(THREAD_TO_DN));

const BRANDS = [
  "uponor",
  "wavin",
  "kantherm",
  "kan",
  "herz",
  "grundfos",
  "wilo",
  "valvex",
  "ferro",
  "comap",
  "rehau",
  "tece",
  "viega",
  "purmo",
  "heimeier",
  "danfoss",
  "afriso",
  "alpex",
  "kisan",
  "arco",
  "pipelife",
  "itap",
  "fado",
  "perfexim",
  "tiemme",
  "giacomini",
  "honeywell",
] as const;

const CLASS_ALIASES: Record<string, string[]> = {
  rura: ["rura", "rurka", "pipe"],
  kolano: ["kolano", "elbow"],
  trojnik: ["trojnik", "tee"],
  zlaczka: ["zlaczka", "zlacze", "mufa", "coupling"],
  zawor: ["zawor", "valve", "valv", "glowica"],
  otulina: ["otulina", "izolacja", "insulation"],
  rozdzielacz: ["rozdzielacz", "belka", "manifold"],
  pompa: ["pompa", "pump", "obiegowa", "cyrkulacyjna"],
};

const MATERIAL_ALIASES: Record<string, string[]> = {
  PEX: ["pex", "pexa", "pexb", "pexc"],
  PPR: ["ppr", "pprr"],
  PE: ["pe"],
  CU: ["cu", "miedz"],
};

function foldText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "l")
    .toLowerCase();
}

function compactCode(value: string): string {
  return foldText(value).replace(/[\s\-_/\\.,:;]+/g, "");
}

function toInt(raw: string): number {
  return Number.parseInt(raw, 10);
}

function wallTenths(raw: string): number {
  const normalized = raw.replace(",", ".");
  const [whole, frac = ""] = normalized.split(".");
  const wholePart = toInt(whole);
  const tenths = frac.padEnd(1, "0").slice(0, 1);
  return wholePart * 10 + toInt(tenths);
}

function takeMatch(
  source: string,
  pattern: RegExp,
): { rest: string; match: RegExpExecArray } | null {
  const match = pattern.exec(source);
  if (!match) return null;
  const rest =
    source.slice(0, match.index) + " " + source.slice(match.index + match[0].length);
  return { rest, match };
}

function detectBrand(explicit: string | null | undefined, haystack: string): string | null {
  if (explicit && explicit.trim()) return compactCode(explicit);
  for (const brand of BRANDS) {
    const re = new RegExp(`(?:^|[^a-z0-9])${brand}(?:[^a-z0-9]|$)`);
    if (re.test(haystack)) return brand === "kantherm" ? "kan" : brand;
  }
  return null;
}

function detectClass(haystack: string): string | null {
  for (const [canonical, aliases] of Object.entries(CLASS_ALIASES)) {
    if (aliases.some((alias) => haystack.includes(alias))) return canonical;
  }
  return null;
}

function detectMaterial(haystack: string): string | null {
  if (/\bpp\s*-?\s*r\b/.test(haystack) || haystack.includes("ppr")) return "PPR";
  if (/\bpex/.test(haystack)) return "PEX";
  if (/(^|[^a-z])pe([^a-z]|$)/.test(haystack) && !haystack.includes("pex")) {
    return "PE";
  }
  for (const [canonical, aliases] of Object.entries(MATERIAL_ALIASES)) {
    if (aliases.some((alias) => haystack.includes(alias))) return canonical;
  }
  return null;
}

function extractEan(
  explicit: string | null | undefined,
  haystack: string,
): { ean: string | null; rest: string } {
  if (explicit && /^\d{8}(\d{5})?$/.test(explicit.trim())) {
    return { ean: explicit.trim(), rest: haystack };
  }
  const taken = takeMatch(haystack, /\b(\d{13}|\d{8})\b/);
  if (!taken) return { ean: null, rest: haystack };
  return { ean: taken.match[1], rest: taken.rest };
}

function emptyDimensions(): TechnicalDimensions {
  return {
    diameterMm: null,
    wallTenthsMm: null,
    insulationMm: null,
    threadInch: null,
    dn: null,
    pn: null,
    pumpSignature: null,
    circuits: null,
  };
}

function extractDimensions(source: string): {
  rest: string;
  dimensions: TechnicalDimensions;
} {
  const dimensions = emptyDimensions();
  let rest = source;

  const pump = takeMatch(rest, /\b(\d{2})\s*-\s*(\d{2,3})\s*\/\s*(\d{2,3})\b/);
  if (pump) {
    dimensions.pumpSignature = `${pump.match[1]}-${pump.match[2]}/${pump.match[3]}`;
    rest = pump.rest;
  }

  const pair = takeMatch(
    rest,
    /\b(\d{1,3})\s*[x×]\s*(\d{1,3}(?:[.,]\d{1,2})?)\b/,
  );
  if (pair) {
    dimensions.diameterMm = toInt(pair.match[1]);
    dimensions.wallTenthsMm = wallTenths(pair.match[2]);
    rest = pair.rest;
  }

  const dn = takeMatch(rest, /\bdn\s*(\d{1,3})\b/);
  if (dn) {
    dimensions.dn = toInt(dn.match[1]);
    rest = dn.rest;
  }

  const pn = takeMatch(rest, /\bpn\s*(\d{1,3})\b/);
  if (pn) {
    dimensions.pn = toInt(pn.match[1]);
    rest = pn.rest;
  }

  const quotedThread = takeMatch(
    rest,
    /\b(\d{1,2}\s+\d{1,2}\/\d{1,2}|\d{1,2}\/\d{1,2}|\d{1,2})\s*["”″]\b/,
  );
  if (quotedThread) {
    const thread = quotedThread.match[1].replace(/\s+/g, " ").trim();
    dimensions.threadInch = thread;
    rest = quotedThread.rest;
  }

  const bareThread = takeMatch(
    rest,
    /\b(\d{1,2}\s+\d{1,2}\/\d{1,2}|\d{1,2}\/\d{1,2})\b/,
  );
  if (bareThread) {
    const fraction = bareThread.match[1].replace(/\s+/g, " ").trim();
    if (KNOWN_THREADS.has(fraction)) {
      dimensions.threadInch = fraction;
      rest = bareThread.rest;
    } else {
      const [outer, inner] = fraction.split("/").map(toInt);
      if (outer >= 15 && inner >= 4 && inner <= 25) {
        dimensions.diameterMm ??= outer;
        dimensions.insulationMm = inner;
        rest = bareThread.rest;
      }
    }
  }

  const pprSize = takeMatch(rest, /\bpp\s*-?\s*r\s*(\d{1,3})\b/);
  if (pprSize) {
    dimensions.diameterMm ??= toInt(pprSize.match[1]);
    rest = pprSize.rest.replace(/\bpp\s*-?\s*r\b/g, " ppr ");
  }

  const mm = takeMatch(rest, /\b(\d{1,3})\s*mm\b/);
  if (mm) {
    dimensions.diameterMm ??= toInt(mm.match[1]);
    rest = mm.rest;
  }

  const circuits = takeMatch(
    rest,
    /\b(\d{1,2})\s*(?:-?\s*)?(?:obwod(?:ow|owy|owych)?|obw\.?)\b/,
  );
  if (circuits) {
    dimensions.circuits = toInt(circuits.match[1]);
    rest = circuits.rest;
  }

  return { rest, dimensions };
}

function leftoverTokens(rest: string): string[] {
  return foldText(rest)
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !/^\d+$/.test(token));
}

function inferBareDiameter(rest: string, dimensions: TechnicalDimensions): void {
  if (dimensions.diameterMm != null) return;
  const numbers = [...rest.matchAll(/\b(\d{2,3})\b/g)].map((m) => toInt(m[1]));
  if (numbers.length === 1 && numbers[0] >= 10 && numbers[0] <= 110) {
    dimensions.diameterMm = numbers[0];
  }
}

export function parseProduct(
  input: MatchableProduct | string,
): TechnicalProfile {
  const product: MatchableProduct =
    typeof input === "string" ? { nazwa: input } : input;

  const foldedName = foldText(product.nazwa)
    .replace(/[×✕]/g, "x")
    .replace(/,/g, ".")
    .replace(/['`´]/g, '"');

  const eanResult = extractEan(product.ean, foldedName);
  const extracted = extractDimensions(eanResult.rest);
  inferBareDiameter(extracted.rest, extracted.dimensions);

  const tokens = leftoverTokens(extracted.rest);
  const brand = detectBrand(product.marka, [foldedName, ...tokens].join(" "));
  const material = detectMaterial(foldedName);
  const productClass = detectClass(foldedName);

  const normalizedName = foldText(product.nazwa)
    .replace(/[×✕]/g, "x")
    .replace(/,/g, ".")
    .replace(/[\s\-_/\\]+/g, " ")
    .replace(/[^\p{L}\p{N}.x"/ ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    sourceName: product.nazwa,
    normalizedName,
    tokens,
    ean: eanResult.ean,
    manufacturerCode: product.kodProducenta
      ? compactCode(product.kodProducenta)
      : null,
    brand,
    material,
    productClass,
    dimensions: extracted.dimensions,
  };
}

function canonicalDiameter(profile: TechnicalProfile): string | null {
  const { dn, threadInch, diameterMm } = profile.dimensions;
  if (dn != null) return `dn:${dn}`;
  if (threadInch) {
    const mapped = THREAD_TO_DN[threadInch];
    if (mapped) return `dn:${mapped}`;
    return `th:${threadInch}`;
  }
  if (diameterMm != null) return `mm:${diameterMm}`;
  return null;
}

function sameOrMissing(
  left: number | string | null,
  right: number | string | null,
): boolean {
  if (left == null || right == null) return true;
  return left === right;
}

function bothPresent<T>(left: T | null, right: T | null): left is T {
  return left != null && right != null;
}

function dimensionConflict(left: TechnicalProfile, right: TechnicalProfile): string | null {
  const leftDia = canonicalDiameter(left);
  const rightDia = canonicalDiameter(right);
  if (leftDia && rightDia && leftDia !== rightDia) {
    return `Konflikt średnicy (${leftDia} vs ${rightDia})`;
  }

  const ld = left.dimensions;
  const rd = right.dimensions;
  if (!sameOrMissing(ld.wallTenthsMm, rd.wallTenthsMm)) {
    return "Konflikt grubości ścianki";
  }
  if (!sameOrMissing(ld.insulationMm, rd.insulationMm)) {
    return "Konflikt wymiaru otuliny";
  }
  if (!sameOrMissing(ld.pn, rd.pn)) {
    return "Konflikt ciśnienia PN";
  }
  if (!sameOrMissing(ld.pumpSignature, rd.pumpSignature)) {
    return "Konflikt sygnatury pompy";
  }
  if (!sameOrMissing(ld.circuits, rd.circuits)) {
    return "Konflikt liczby obwodów";
  }
  return null;
}

function classConflict(left: TechnicalProfile, right: TechnicalProfile): boolean {
  return Boolean(
    left.productClass &&
      right.productClass &&
      left.productClass !== right.productClass,
  );
}

function tokenOverlap(left: TechnicalProfile, right: TechnicalProfile): number {
  const a = new Set(left.tokens);
  const b = new Set(right.tokens);
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const token of a) {
    if (b.has(token)) inter += 1;
  }
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

function keyParamsPresent(profile: TechnicalProfile): boolean {
  return canonicalDiameter(profile) != null || profile.dimensions.pumpSignature != null;
}

function keyParamsAgree(left: TechnicalProfile, right: TechnicalProfile): boolean {
  return (
    dimensionConflict(left, right) == null &&
    (canonicalDiameter(left) != null &&
      canonicalDiameter(left) === canonicalDiameter(right) ||
      bothPresent(left.dimensions.pumpSignature, right.dimensions.pumpSignature))
  );
}

function rejected(
  left: TechnicalProfile,
  right: TechnicalProfile,
  reasons: string[],
): ProductMatch {
  return {
    left,
    right,
    confidenceScore: 0,
    status: "REJECTED",
    hardReject: true,
    reasons,
  };
}

function scored(
  left: TechnicalProfile,
  right: TechnicalProfile,
  confidenceScore: number,
  reasons: string[],
): ProductMatch {
  const status: MatchStatus =
    confidenceScore >= 80
      ? "MATCHED"
      : confidenceScore > 0
        ? "NEEDS_CONFIRMATION"
        : "REJECTED";
  return {
    left,
    right,
    confidenceScore,
    status,
    hardReject: false,
    reasons,
  };
}

export function matchProducts(
  leftInput: MatchableProduct | string,
  rightInput: MatchableProduct | string,
): ProductMatch {
  const left = parseProduct(leftInput);
  const right = parseProduct(rightInput);

  const dimConflict = dimensionConflict(left, right);
  if (dimConflict) {
    return rejected(left, right, [dimConflict, "Twardy priorytet wymiarów"]);
  }
  if (classConflict(left, right)) {
    return rejected(left, right, ["Konflikt klasy produktu"]);
  }

  if (left.ean && right.ean && left.ean === right.ean) {
    return scored(left, right, 100, ["Zgodny kod EAN"]);
  }
  if (
    left.manufacturerCode &&
    right.manufacturerCode &&
    left.manufacturerCode === right.manufacturerCode
  ) {
    return scored(left, right, 100, ["Zgodny kod producenta"]);
  }

  const reasons: string[] = [];
  const brandMatch = Boolean(left.brand && right.brand && left.brand === right.brand);
  const materialMatch = Boolean(
    left.material && right.material && left.material === right.material,
  );
  const classMatch = Boolean(
    left.productClass &&
      right.productClass &&
      left.productClass === right.productClass,
  );
  const paramsOk = keyParamsAgree(left, right);
  const overlap = tokenOverlap(left, right);

  if (brandMatch) reasons.push("Zgodna marka");
  if (materialMatch) reasons.push("Zgodny materiał");
  if (classMatch) reasons.push("Zgodna klasa produktu");
  if (paramsOk) reasons.push("Zgodne kluczowe wymiary");

  if (brandMatch && paramsOk) {
    let score = 90;
    if (materialMatch) score += 3;
    if (classMatch) score += 3;
    if (
      bothPresent(left.dimensions.wallTenthsMm, right.dimensions.wallTenthsMm) ||
      bothPresent(left.dimensions.pn, right.dimensions.pn) ||
      bothPresent(left.dimensions.pumpSignature, right.dimensions.pumpSignature)
    ) {
      score += 2;
    }
    if (overlap >= 0.5) score += 1;
    return scored(left, right, Math.min(99, score), reasons);
  }

  if (paramsOk && classMatch && materialMatch) {
    return scored(left, right, 88, [
      ...reasons,
      "Brak wspólnej marki — pewność poniżej progu 90%",
    ]);
  }

  if (paramsOk && (classMatch || materialMatch)) {
    return scored(left, right, 74, [
      ...reasons,
      "Parametry niejednoznaczne (brak marki lub niepełna klasa)",
    ]);
  }

  if (!keyParamsPresent(left) || !keyParamsPresent(right)) {
    const weak = Math.min(65, 40 + Math.round(overlap * 25));
    return scored(left, right, weak, [
      ...reasons,
      "Brak twardych wymiarów — wymaga potwierdzenia",
    ]);
  }

  const residual = Math.min(72, 35 + Math.round(overlap * 30));
  return scored(left, right, residual, [
    ...reasons,
    "Słabe dopasowanie opisów",
  ]);
}

export function matchProductLists(
  leftItems: Array<MatchableProduct | string>,
  rightItems: Array<MatchableProduct | string>,
): ListMatchResult {
  const left = leftItems.map(parseProduct);
  const right = rightItems.map(parseProduct);
  const candidates: Array<{ i: number; j: number; match: ProductMatch }> = [];

  for (let i = 0; i < leftItems.length; i += 1) {
    for (let j = 0; j < rightItems.length; j += 1) {
      const match = matchProducts(leftItems[i], rightItems[j]);
      if (!match.hardReject && match.confidenceScore > 0) {
        candidates.push({ i, j, match });
      }
    }
  }

  candidates.sort((a, b) => {
    if (b.match.confidenceScore !== a.match.confidenceScore) {
      return b.match.confidenceScore - a.match.confidenceScore;
    }
    if (a.i !== b.i) return a.i - b.i;
    return a.j - b.j;
  });

  const usedLeft = new Set<number>();
  const usedRight = new Set<number>();
  const pairs: ProductMatch[] = [];
  const pairIndexes: Array<{ left: number; right: number }> = [];

  for (const candidate of candidates) {
    if (usedLeft.has(candidate.i) || usedRight.has(candidate.j)) continue;
    usedLeft.add(candidate.i);
    usedRight.add(candidate.j);
    pairs.push(candidate.match);
    pairIndexes.push({ left: candidate.i, right: candidate.j });
  }

  return {
    pairs,
    pairIndexes,
    unmatchedLeft: left.filter((_, index) => !usedLeft.has(index)),
    unmatchedRight: right.filter((_, index) => !usedRight.has(index)),
  };
}

export function offerToMatchable(offer: {
  id?: string;
  nazwaKatalogowa: string;
  kodProducenta?: string | null;
  ean?: string | null;
  marka?: string | null;
}): MatchableProduct {
  return {
    id: offer.id,
    nazwa: offer.nazwaKatalogowa,
    kodProducenta: offer.kodProducenta,
    ean: offer.ean,
    marka: offer.marka,
  };
}

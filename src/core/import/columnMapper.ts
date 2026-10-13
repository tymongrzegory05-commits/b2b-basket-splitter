export type MappedField = "nazwa" | "kod" | "cenaNetto" | "ilosc";

export type ColumnMapping = Partial<Record<MappedField, number>>;

export type ColumnDetection = {
  mapping: ColumnMapping;
  uncertain: MappedField[];
  scores: Record<MappedField, Array<{ index: number; header: string; score: number }>>;
};

const FIELD_PATTERNS: Record<MappedField, RegExp[]> = {
  nazwa: [
    /\bnazwa\b/,
    /\btowar\b/,
    /\bartyku[lł]\b/,
    /\bopis\b/,
    /\bprodukt\b/,
  ],
  kod: [
    /\bkod\b/,
    /\bindeks\b/,
    /\bsku\b/,
    /\bnr[_\s-]*katalog/,
    /\bsymbol\b/,
    /\bean\b/,
  ],
  cenaNetto: [
    /\bcena[_\s-]*n\b/,
    /\bpo[_\s-]*rabacie\b/,
    /\bcena[_\s-]*netto\b/,
    /\bnetto\b/,
    /\bcena\b/,
    /\bwarto[sś][cć]\b/,
  ],
  ilosc: [
    /\bzapotrzebowanie\b/,
    /\bzamawian/,
    /\bilo[sś][cć]\b/,
    /\bszt\b/,
    /\bqty\b/,
    /\bquantity\b/,
  ],
};

function foldHeader(header: string): string {
  return header
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "l")
    .toLowerCase()
    .replace(/[_./\\]+/g, " ")
    .trim();
}

function scoreHeader(header: string, field: MappedField): number {
  const folded = foldHeader(header);
  if (!folded) return 0;
  const patterns = FIELD_PATTERNS[field];
  for (let i = 0; i < patterns.length; i += 1) {
    if (patterns[i].test(folded)) {
      return 100 - i * 8;
    }
  }
  return 0;
}

export function detectColumns(headers: string[]): ColumnDetection {
  const scores = {
    nazwa: [] as Array<{ index: number; header: string; score: number }>,
    kod: [] as Array<{ index: number; header: string; score: number }>,
    cenaNetto: [] as Array<{ index: number; header: string; score: number }>,
    ilosc: [] as Array<{ index: number; header: string; score: number }>,
  };

  const fields: MappedField[] = ["nazwa", "kod", "cenaNetto", "ilosc"];
  for (const [index, header] of headers.entries()) {
    for (const field of fields) {
      const score = scoreHeader(header, field);
      if (score > 0) scores[field].push({ index, header, score });
    }
  }

  for (const field of fields) {
    scores[field].sort((a, b) => b.score - a.score || a.index - b.index);
  }

  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  const uncertain: MappedField[] = [];
  const required: MappedField[] = ["nazwa", "cenaNetto"];

  for (const field of fields) {
    const ranked = scores[field].filter((item) => !used.has(item.index));
    const best = ranked[0];
    const second = ranked[1];
    if (!best) {
      if (required.includes(field)) uncertain.push(field);
      continue;
    }
    const closeSecond = second && best.score - second.score < 12;
    const weak = best.score < 70;
    if ((closeSecond || weak) && required.includes(field)) {
      uncertain.push(field);
      continue;
    }
    if (weak && !required.includes(field)) continue;
    mapping[field] = best.index;
    used.add(best.index);
  }

  return { mapping, uncertain, scores };
}

export function parseLooseNumber(raw: string): number | null {
  const text = raw.replace(/\s/g, "").replace(/zł/gi, "").replace(/['`]/g, "");
  if (!text) return null;

  let normalized = text;
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(text)) {
    normalized = text.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(,\d{3})+\.\d+$/.test(text)) {
    normalized = text.replace(/,/g, "");
  } else if (text.includes(",") && !text.includes(".")) {
    normalized = text.replace(",", ".");
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return value;
}

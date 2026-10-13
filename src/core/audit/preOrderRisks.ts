import {
  DEFAULT_MIN_ORDER_GROSZE,
  normalizePolicy,
  warehouseLabel,
  type BasketEngineResult,
} from "@/core/optimizer/basketEngine";

export type RiskKind =
  | "unfulfilled"
  | "lead-time"
  | "min-order"
  | "free-shipping";

export type RiskSeverity = "high" | "medium" | "low";

export type RiskAlert = {
  id: string;
  kind: RiskKind;
  severity: RiskSeverity;
  title: string;
  detail: string;
};

export type PreOrderRiskReport = {
  alerts: RiskAlert[];
  count: number;
};

export const LEAD_TIME_RISK_DAYS = 7;
const FREE_SHIPPING_CLOSE_GROSZE = 20_000;

function formatZl(grosze: number): string {
  const negative = grosze < 0;
  const abs = Math.abs(grosze);
  const zloty = Math.trunc(abs / 100);
  const gr = abs % 100;
  const grouped = String(zloty).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return `${negative ? "−" : ""}${grouped},${String(gr).padStart(2, "0")}\u00A0zł`;
}

export function buildPreOrderRisks(
  result: BasketEngineResult,
): PreOrderRiskReport {
  const alerts: RiskAlert[] = [];
  const unfulfilled = result.lines.filter(
    (line) => line.status === "UNFULFILLED",
  );
  if (unfulfilled.length > 0) {
    alerts.push({
      id: "unfulfilled",
      kind: "unfulfilled",
      severity: "high",
      title: `${unfulfilled.length} ${
        unfulfilled.length === 1 ? "pozycja nie ma" : "pozycji nie ma"
      } w żadnej hurtowni – musisz domówić je u producenta`,
      detail: unfulfilled.map((line) => line.nazwaKanoniczna).join(", "),
    });
  }

  for (const line of result.lines) {
    if (line.status !== "ASSIGNED" || line.wybor == null) continue;
    if (line.leadTimeDays < LEAD_TIME_RISK_DAYS) continue;
    const warehouse = warehouseLabel(line.wybor, result.suppliers);
    alerts.push({
      id: `lead-${line.id}`,
      kind: "lead-time",
      severity: "high",
      title: `Pozycja ${line.nazwaKanoniczna} w ${warehouse} ma czas dostawy ${line.leadTimeDays} dni roboczych – ryzyko przestoju ekipy`,
      detail: `Dostawa za ${line.leadTimeDays} dni. Rozważ inny magazyn albo bufor czasu na budowie.`,
    });
  }

  for (const supplier of result.suppliers) {
    const current = result.current[supplier.warehouseId];
    if (!current || current.liczbaPozycji === 0) continue;
    const policy = normalizePolicy(supplier);
    if (current.towarGrosze < policy.minOrderGrosze) {
      alerts.push({
        id: `moq-${supplier.warehouseId}`,
        kind: "min-order",
        severity: "medium",
        title: `Zamówienie w ${supplier.name} (${formatZl(current.towarGrosze)}) nie osiąga minimalnej wartości logistycznej ${formatZl(policy.minOrderGrosze)}`,
        detail: `Hurtownia może odrzucić albo doliczyć dopłatę za zbyt mały koszyk.`,
      });
    }

    if (current.dostawaGrosze > 0 && current.towarGrosze > 0) {
      const gap = policy.freeShippingThresholdGrosze - current.towarGrosze;
      if (gap > 0) {
        alerts.push({
          id: `ship-${supplier.warehouseId}`,
          kind: "free-shipping",
          severity: gap <= FREE_SHIPPING_CLOSE_GROSZE ? "medium" : "low",
          title: `Do darmowej dostawy w ${supplier.name} brakuje Ci tylko ${formatZl(gap)} – dodaj drobnicę (np. taśma teflonowa/kołki), aby zaoszczędzić ${formatZl(policy.shippingCostGrosze)} na kurierze`,
          detail: `Aktualny koszyk ${formatZl(current.towarGrosze)}, próg ${formatZl(policy.freeShippingThresholdGrosze)}.`,
        });
      }
    }
  }

  const rank: Record<RiskSeverity, number> = { high: 0, medium: 1, low: 2 };
  alerts.sort((a, b) => rank[a.severity] - rank[b.severity]);
  return { alerts, count: alerts.length };
}

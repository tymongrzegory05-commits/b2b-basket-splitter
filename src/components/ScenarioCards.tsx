import { GitMerge, Warehouse } from "lucide-react";
import type {
  BasketEngineResult,
  ScenarioBreakdown,
} from "@/core/optimizer/basketEngine";
import { formatGrosze, formatPromile } from "@/utils/format";

function DeliveryNote({
  breakdown,
  thresholdGrosze,
}: {
  breakdown: ScenarioBreakdown;
  thresholdGrosze: number;
}) {
  if (breakdown.liczbaPozycji === 0) {
    return <p className="text-xs text-zinc-500">Brak pozycji w tym koszyku</p>;
  }
  if (breakdown.dostawaGrosze === 0) {
    return (
      <p className="text-xs text-zinc-500">
        Dostawa {formatGrosze(0)} · próg {formatGrosze(thresholdGrosze)}{" "}
        osiągnięty
      </p>
    );
  }

  return (
    <p className="text-xs text-amber-300">
      Dostawa {formatGrosze(breakdown.dostawaGrosze)} · poniżej progu{" "}
      {formatGrosze(thresholdGrosze)}
    </p>
  );
}

export function ScenarioCards({ result }: { result: BasketEngineResult }) {
  const cards = [
    ...result.suppliers.map((supplier) => ({
      id: supplier.warehouseId,
      title: supplier.name,
      subtitle: `${result.current[supplier.warehouseId]?.liczbaPozycji ?? 0} poz. w aktualnym podziale`,
      breakdown: result.current[supplier.warehouseId],
      threshold: supplier.freeShippingThresholdGrosze,
      highlight: false,
    })),
    {
      id: "split",
      title: "Koszyk hybrydowy",
      subtitle: "Towar + dostawa po bieżących wyborach",
      breakdown: result.split,
      threshold: Math.min(
        ...result.suppliers.map((item) => item.freeShippingThresholdGrosze),
      ),
      highlight: true,
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <article
          key={card.id}
          className={
            card.highlight
              ? "rounded-2xl border border-emerald-400/30 bg-emerald-400/8 p-5"
              : "rounded-2xl border border-white/8 bg-[#14181f] p-5"
          }
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-100">{card.title}</p>
              <p className="mt-1 text-xs text-zinc-500">{card.subtitle}</p>
            </div>
            <div
              className={
                card.highlight
                  ? "rounded-lg bg-emerald-400/15 p-2 text-emerald-300"
                  : "rounded-lg bg-white/5 p-2 text-zinc-400"
              }
            >
              {card.highlight ? (
                <GitMerge className="h-4 w-4" />
              ) : (
                <Warehouse className="h-4 w-4" />
              )}
            </div>
          </div>

          <p className="mt-6 font-mono text-2xl font-semibold tracking-tight text-zinc-50">
            {formatGrosze(card.breakdown.sumaGrosze)}
          </p>
          <p className="mt-2 font-mono text-xs leading-5 text-zinc-400">
            {formatGrosze(card.breakdown.towarGrosze)} towarów +{" "}
            {formatGrosze(card.breakdown.dostawaGrosze)} dostawa
          </p>
          <DeliveryNote
            breakdown={card.breakdown}
            thresholdGrosze={card.threshold}
          />

          {card.highlight ? (
            <p
              className={
                result.zyskZPodzialuGrosze >= 0
                  ? "mt-3 text-sm text-emerald-300"
                  : "mt-3 text-sm text-amber-300"
              }
            >
              {result.zyskZPodzialuGrosze >= 0
                ? `Zysk vs tańsza hurtownia w całości ${formatGrosze(result.zyskZPodzialuGrosze)} (${formatPromile(result.zyskZPodzialuPromile)}%)`
                : `Drożej vs tańsza hurtownia w całości ${formatGrosze(Math.abs(result.zyskZPodzialuGrosze))}`}
            </p>
          ) : null}
        </article>
      ))}
    </section>
  );
}

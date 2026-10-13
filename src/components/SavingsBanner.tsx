import { TrendingDown } from "lucide-react";
import type { BasketEngineResult } from "@/core/optimizer/basketEngine";
import { formatGrosze, formatPromile } from "@/utils/format";

export function SavingsBanner({ result }: { result: BasketEngineResult }) {
  const positive = result.zyskZPodzialuGrosze >= 0;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-500/15 via-[#14181f] to-[#101318] p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-sky-300">
            <TrendingDown className="h-3.5 w-3.5" />
            Zysk z podziału koszyka
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
            {positive
              ? `Zaoszczędzono ${formatGrosze(result.zyskZPodzialuGrosze)} netto dzięki podziałowi koszyka`
              : `Aktualny podział jest droższy o ${formatGrosze(Math.abs(result.zyskZPodzialuGrosze))} netto`}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Względem tańszej hurtowni zakupionej w całości, po doliczeniu
            transportu i opakowań. Ręczna zmiana dostawcy przelicza progi
            darmowej dostawy natychmiast.
          </p>
          {result.unfulfilledCount > 0 ? (
            <p className="mt-3 rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
              {result.unfulfilledCount}{" "}
              {result.unfulfilledCount === 1
                ? "pozycja bez pokrycia"
                : "pozycji bez pokrycia"}{" "}
              — wyłączone z sum koszyków. Domów u producenta albo zmień filtr 24h.
            </p>
          ) : null}
        </div>
        <div className="shrink-0 rounded-xl border border-white/8 bg-black/20 px-5 py-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Oszczędność
          </p>
          <p
            className={
              positive
                ? "mt-1 font-mono text-3xl font-semibold text-sky-300"
                : "mt-1 font-mono text-3xl font-semibold text-amber-300"
            }
          >
            {formatPromile(result.zyskZPodzialuPromile)}%
          </p>
        </div>
      </div>
    </section>
  );
}

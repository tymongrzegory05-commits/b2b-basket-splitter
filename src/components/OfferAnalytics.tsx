"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { OfferAnalytics } from "@/core/analytics/offerAnalytics";
import { formatGrosze, formatPromile } from "@/utils/format";

const BAR_COLORS = [
  "bg-sky-400",
  "bg-violet-400",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-rose-400",
];

export function OfferAnalyticsPanel({ analytics }: { analytics: OfferAnalytics }) {
  const [open, setOpen] = useState(true);

  return (
    <section className="rounded-2xl border border-white/8 bg-[#14181f]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <p className="text-sm font-medium text-zinc-100">Analityka ofert</p>
          <p className="mt-1 text-xs text-zinc-500">
            Gdzie uciekają marże — udział hurtowni i grupy towarowe.
          </p>
        </div>
        <ChevronDown
          className={
            open
              ? "h-4 w-4 rotate-180 text-zinc-400 transition"
              : "h-4 w-4 text-zinc-400 transition"
          }
        />
      </button>
      {open ? (
        <div className="space-y-5 border-t border-white/8 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Udział w optymalnym koszyku
            </p>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-white/5">
              {analytics.share.map((item, index) =>
                item.percent > 0 ? (
                  <div
                    key={item.warehouseId}
                    className={BAR_COLORS[index % BAR_COLORS.length]}
                    style={{ width: `${item.percent}%` }}
                  />
                ) : null,
              )}
            </div>
            <ul className="mt-3 space-y-1.5">
              {analytics.share.map((item, index) => (
                <li
                  key={item.warehouseId}
                  className="flex items-center justify-between text-sm text-zinc-300"
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${BAR_COLORS[index % BAR_COLORS.length]}`}
                    />
                    {item.name}
                  </span>
                  <span className="font-mono text-zinc-400">
                    {item.percent}% · {item.pozycje} poz. ·{" "}
                    {formatGrosze(item.sumaGrosze)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Zysk per grupa towarowa
            </p>
            {analytics.categories.length === 0 ? (
              <p className="mt-2 text-xs text-zinc-500">
                Za mało porównywalnych pozycji, żeby policzyć grupy.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {analytics.categories.map((item) => (
                  <li
                    key={item.name}
                    className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                  >
                    <span className="text-zinc-200">{item.name}</span>
                    <span className="font-mono text-emerald-300">
                      {formatPromile(item.vsAveragePromile)}% w {item.bestSupplierName}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {analytics.supplierCount > 2 ? (
            <p className="rounded-xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
              Dzięki podziałowi na {analytics.supplierCount} dostawców zyskujesz
              dodatkowe {formatGrosze(analytics.extraVsTwoSuppliersGrosze)} względem
              wyboru tylko 2 dostawców.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

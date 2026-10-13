"use client";

import { AlertTriangle, Check, Package } from "lucide-react";
import {
  isMissingPrice,
  type AvailabilityLevel,
  type LineDecision,
  type SupplierPolicy,
  type WarehouseId,
} from "@/core/optimizer/basketEngine";
import type { SubstitutionSuggestion } from "@/core/matching/substitutions";
import { formatGrosze, formatPromile, formatQty } from "@/utils/format";

export type TableFilter = "all" | "verify" | "unfulfilled" | WarehouseId;

function AvailabilityDot({ level }: { level: AvailabilityLevel }) {
  const color =
    level === "in-stock"
      ? "bg-emerald-400"
      : level === "on-order"
        ? "bg-amber-300"
        : "bg-zinc-600";
  const label =
    level === "in-stock"
      ? "Na stanie / 24h"
      : level === "on-order"
        ? "Na zamówienie"
        : "Brak w ofercie";
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function PriceCell({
  unitGrosze,
  totalGrosze,
  qty,
  packSize,
  cheapest,
  missing,
  shortage,
  availability,
  leadTimeDays,
}: {
  unitGrosze: number;
  totalGrosze: number;
  qty: number;
  packSize: number;
  cheapest: boolean;
  missing: boolean;
  shortage: boolean;
  availability: AvailabilityLevel;
  leadTimeDays: number;
}) {
  if (missing) {
    return (
      <div className="flex flex-col gap-1.5">
        <AvailabilityDot level="missing" />
        <p className="text-xs text-zinc-600">Brak w ofercie</p>
      </div>
    );
  }
  return (
    <div
      className={
        cheapest
          ? "rounded-lg bg-emerald-400/10 px-2 py-1.5"
          : "flex flex-col gap-1"
      }
    >
      <AvailabilityDot level={availability} />
      <span className={cheapest ? "font-medium text-emerald-200" : "text-zinc-400"}>
        {formatGrosze(unitGrosze)}
        <span className="ml-1 text-xs text-zinc-500">/ szt.</span>
      </span>
      <span className="text-xs text-zinc-500">
        {formatQty(qty)} szt. · opak. {formatQty(packSize)}
      </span>
      <span className="text-xs text-zinc-500">
        {formatGrosze(totalGrosze)} łącznie
      </span>
      {leadTimeDays > 2 ? (
        <span className="text-xs text-amber-300">{leadTimeDays} dni</span>
      ) : null}
      {shortage ? (
        <span className="inline-flex items-center gap-1 text-xs text-amber-300">
          <AlertTriangle className="h-3 w-3" />
          niski stan
        </span>
      ) : null}
    </div>
  );
}

function SubstitutionCell({
  suggestions,
  appliedBrand,
  onApply,
}: {
  suggestions: SubstitutionSuggestion[];
  appliedBrand?: string;
  onApply: (suggestion: SubstitutionSuggestion) => void;
}) {
  if (suggestions.length === 0 && !appliedBrand) {
    return <p className="text-xs text-zinc-600">—</p>;
  }
  const best = suggestions[0];
  return (
    <div className="flex min-w-[12rem] flex-col items-start gap-2">
      {best ? (
        <button
          type="button"
          onClick={() => onApply(best)}
          className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1.5 text-left text-xs text-emerald-100 hover:bg-emerald-400/15"
        >
          Dostępny zamiennik {best.brand} (−{formatPromile(best.savingsPromile)}%
          / oszczędność {formatGrosze(best.savingsGrosze)})
        </button>
      ) : null}
      {appliedBrand ? (
        <span className="rounded-full bg-sky-400/15 px-2.5 py-1 text-xs text-sky-200">
          Zastosowano: {appliedBrand}
        </span>
      ) : null}
      {suggestions.length > 0 ? (
        <details className="w-full">
          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300">
            Podgląd zamienników ({suggestions.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {suggestions.map((item) => (
              <li key={`${item.warehouseId}-${item.kodProducenta}`}>
                <button
                  type="button"
                  onClick={() => onApply(item)}
                  className="w-full rounded-md px-1.5 py-1 text-left text-xs text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                >
                  {item.brand} · {item.warehouseName} ·{" "}
                  {formatGrosze(item.cenaPoRabacieNettoGrosze)}
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

export function ComparisonTable({
  lines,
  suppliers: suppliersProp,
  filter,
  confidenceById,
  confirmedIds,
  substitutionsByLine = {},
  appliedBrandByLine = {},
  aggressiveSubstitutions,
  onFilterChange,
  onOverride,
  onConfirmMatch,
  onApplySubstitution,
  onAggressiveChange,
}: {
  lines: LineDecision[];
  suppliers: SupplierPolicy[];
  filter: TableFilter;
  confidenceById: Record<string, number>;
  confirmedIds: Set<string>;
  substitutionsByLine: Record<string, SubstitutionSuggestion[]>;
  appliedBrandByLine: Record<string, string>;
  aggressiveSubstitutions: boolean;
  onFilterChange: (filter: TableFilter) => void;
  onOverride: (id: string, warehouse: WarehouseId) => void;
  onConfirmMatch: (id: string) => void;
  onApplySubstitution: (suggestion: SubstitutionSuggestion) => void;
  onAggressiveChange: (next: boolean) => void;
}) {
  const suppliers = suppliersProp ?? [];
  const verifyCount = lines.filter(
    (line) =>
      (confidenceById[line.id] ?? 0) < 90 && !confirmedIds.has(line.id),
  ).length;
  const unfulfilledCount = lines.filter(
    (line) => line.status === "UNFULFILLED",
  ).length;

  const visible = lines.filter((line) => {
    if (filter === "verify") {
      return (confidenceById[line.id] ?? 0) < 90 && !confirmedIds.has(line.id);
    }
    if (filter === "unfulfilled") return line.status === "UNFULFILLED";
    if (filter === "all") return true;
    return line.wybor === filter;
  });

  const filters: Array<{ id: TableFilter; label: string }> = [
    { id: "all", label: `Wszystkie pozycje (${lines.length})` },
    { id: "verify", label: `Wymagają weryfikacji (${verifyCount})` },
    { id: "unfulfilled", label: `Brak pokrycia (${unfulfilledCount})` },
    ...suppliers.map((supplier) => ({
      id: supplier.warehouseId,
      label: `${supplier.name} (${lines.filter((line) => line.wybor === supplier.warehouseId).length})`,
    })),
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#14181f]">
      <div className="border-b border-white/8 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-zinc-100">Tabela zbiorcza</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Wybierz dostawcę z listy, żeby nadpisać algorytm. Najniższa cena w
              wierszu jest zaznaczona na zielono.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-3 py-2">
            <input
              type="checkbox"
              checked={aggressiveSubstitutions}
              onChange={(event) => onAggressiveChange(event.target.checked)}
              className="h-3.5 w-3.5 accent-emerald-400"
            />
            <span className="text-xs text-zinc-200">
              Tryb Agresywnej Marży (Automatycznie uwzględniaj zamienniki)
            </span>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onFilterChange(item.id)}
              className={
                filter === item.id
                  ? "rounded-full bg-sky-400/15 px-3 py-1 text-xs font-medium text-sky-200"
                  : "rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200"
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/3 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-medium">Produkt</th>
              <th className="px-5 py-3 font-medium">Zapotrzebowanie</th>
              {suppliers.map((supplier) => (
                <th key={supplier.warehouseId} className="px-5 py-3 font-medium">
                  {supplier.name}
                </th>
              ))}
              <th className="px-5 py-3 font-medium">Zamiennik</th>
              <th className="px-5 py-3 font-medium">Wybór / rekomendacja</th>
              <th className="px-5 py-3 font-medium text-right">
                Łączna oszczędność na pozycji
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {visible.map((line) => {
              const confidence = confidenceById[line.id] ?? 0;
              const needsReview = confidence < 90 && !confirmedIds.has(line.id);
              const unfulfilled = line.status === "UNFULFILLED";
              const codes = suppliers
                .map((supplier) => {
                  const code = line.oferty[supplier.warehouseId]?.offer.kodProducenta;
                  return code && code !== "—" ? `${supplier.name}: ${code}` : null;
                })
                .filter(Boolean)
                .join(" · ");

              return (
                <tr
                  key={line.id}
                  className={
                    unfulfilled
                      ? "align-top bg-rose-400/8 hover:bg-rose-400/12"
                      : needsReview
                        ? "align-top bg-amber-400/5 hover:bg-amber-400/8"
                        : "align-top hover:bg-white/3"
                  }
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-zinc-100">
                      {line.nazwaKanoniczna}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{codes}</p>
                    {unfulfilled ? (
                      <p className="mt-2 inline-flex rounded-full bg-rose-400/15 px-2.5 py-1 text-xs font-medium text-rose-100">
                        Brak pokrycia
                      </p>
                    ) : needsReview ? (
                      <div className="mt-2 max-w-xs rounded-lg border border-amber-400/20 bg-amber-400/10 px-2.5 py-2">
                        <p className="text-xs leading-4 text-amber-200">
                          Różnica w kodzie producenta – potwierdź zgodność
                          parametrów
                        </p>
                        <button
                          type="button"
                          onClick={() => onConfirmMatch(line.id)}
                          className="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-300/15 px-2 py-1 text-xs font-medium text-amber-100 hover:bg-amber-300/25"
                        >
                          <Check className="h-3 w-3" />
                          Zatwierdź dopasowanie
                        </button>
                      </div>
                    ) : confirmedIds.has(line.id) ? (
                      <p className="mt-2 text-xs text-emerald-300">
                        Dopasowanie zatwierdzone ({confidence}%)
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-zinc-600">
                        Pewność {confidence}%
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-zinc-300">
                    <p>{formatQty(line.zapotrzebowanie)} szt.</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-zinc-500">
                      <Package className="h-3 w-3" />
                      zakup {formatQty(line.iloscZakup)} szt.
                    </p>
                  </td>
                  {suppliers.map((supplier) => {
                    const view = line.oferty[supplier.warehouseId];
                    const missing =
                      !view ||
                      isMissingPrice(view.kosztTowaruGrosze) ||
                      view.availability === "missing";
                    return (
                      <td key={supplier.warehouseId} className="px-5 py-4">
                        <PriceCell
                          unitGrosze={view?.offer.cenaPoRabacieNettoGrosze ?? 0}
                          totalGrosze={view?.kosztTowaruGrosze ?? 0}
                          qty={view?.ilosc ?? 0}
                          packSize={view?.offer.packSize ?? 1}
                          cheapest={line.wyborTowarowy === supplier.warehouseId}
                          missing={missing}
                          shortage={view?.brak ?? false}
                          availability={view?.availability ?? "missing"}
                          leadTimeDays={view?.leadTimeDays ?? 0}
                        />
                      </td>
                    );
                  })}
                  <td className="px-5 py-4">
                    <SubstitutionCell
                      suggestions={substitutionsByLine[line.id] ?? []}
                      appliedBrand={appliedBrandByLine[line.id]}
                      onApply={onApplySubstitution}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col items-start gap-2">
                      {unfulfilled ? (
                        <span className="rounded-lg border border-rose-400/20 px-2.5 py-1.5 text-xs text-rose-100">
                          UNFULFILLED
                        </span>
                      ) : (
                        <select
                          value={
                            line.wybor &&
                            suppliers.some(
                              (supplier) => supplier.warehouseId === line.wybor,
                            )
                              ? line.wybor
                              : (suppliers[0]?.warehouseId ?? "")
                          }
                          onChange={(event) =>
                            onOverride(line.id, event.target.value)
                          }
                          className="rounded-lg border border-white/10 bg-[#0c0e12] px-2.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-sky-400/50"
                        >
                          {suppliers.map((supplier) => {
                            const selectable =
                              line.oferty[supplier.warehouseId]?.selectable ??
                              false;
                            return (
                              <option
                                key={supplier.warehouseId}
                                value={supplier.warehouseId}
                                disabled={!selectable}
                              >
                                {supplier.name}
                                {selectable ? "" : " (brak)"}
                              </option>
                            );
                          })}
                        </select>
                      )}
                      {line.nadpisaneRecznie ? (
                        <span className="inline-flex rounded-full bg-white/8 px-2.5 py-1 text-xs font-medium text-zinc-300">
                          Nadpisane ręcznie
                        </span>
                      ) : null}
                      {line.skonsolidowanoDlaDarmowejDostawy ? (
                        <span className="inline-flex rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-medium text-amber-200">
                          Skonsolidowano dla darmowej dostawy
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-emerald-300">
                    {unfulfilled ? "—" : formatGrosze(line.oszczednoscTowarowaGrosze)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

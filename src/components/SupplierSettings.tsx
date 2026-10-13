"use client";

import { X } from "lucide-react";
import type { PaymentTerm, SupplierPolicy } from "@/core/optimizer/basketEngine";
import { toGrosze } from "@/core/optimizer/money";
import { PAYMENT_TERM_OPTIONS } from "@/data/supplierPolicies";

function groszeToInput(grosze: number): string {
  const zloty = Math.trunc(grosze / 100);
  const gr = Math.abs(grosze % 100);
  if (gr === 0) return String(zloty);
  return `${zloty}.${String(gr).padStart(2, "0")}`;
}

function PolicyFields({
  policy,
  onChange,
}: {
  policy: SupplierPolicy;
  onChange: (next: SupplierPolicy) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-white/8 bg-black/20 p-4">
      <p className="text-sm font-medium text-zinc-100">{policy.name}</p>
      <label className="block space-y-1.5">
        <span className="text-xs text-zinc-500">Próg darmowej dostawy (zł)</span>
        <input
          type="number"
          min={0}
          step={1}
          value={groszeToInput(policy.freeShippingThresholdGrosze)}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (!Number.isFinite(value) || value < 0) return;
            onChange({
              ...policy,
              freeShippingThresholdGrosze: toGrosze(value),
            });
          }}
          className="w-full rounded-lg border border-white/10 bg-[#0c0e12] px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-sky-400/50"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs text-zinc-500">
          Koszt dostawy poniżej progu (zł)
        </span>
        <input
          type="number"
          min={0}
          step={1}
          value={groszeToInput(policy.shippingCostGrosze)}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (!Number.isFinite(value) || value < 0) return;
            onChange({
              ...policy,
              shippingCostGrosze: toGrosze(value),
            });
          }}
          className="w-full rounded-lg border border-white/10 bg-[#0c0e12] px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-sky-400/50"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs text-zinc-500">Termin płatności</span>
        <select
          value={String(policy.paymentTerm ?? 14)}
          onChange={(event) => {
            const raw = event.target.value;
            const paymentTerm: PaymentTerm =
              raw === "prepaid" ? "prepaid" : (Number(raw) as PaymentTerm);
            onChange({ ...policy, paymentTerm });
          }}
          className="w-full rounded-lg border border-white/10 bg-[#0c0e12] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-400/50"
        >
          {PAYMENT_TERM_OPTIONS.map((option) => (
            <option key={String(option.id)} value={String(option.id)}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs text-zinc-500">
          Minimalna wartość zamówienia / MOQ (zł)
        </span>
        <input
          type="number"
          min={0}
          step={10}
          value={groszeToInput(policy.minOrderGrosze ?? 30_000)}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (!Number.isFinite(value) || value < 0) return;
            onChange({
              ...policy,
              minOrderGrosze: toGrosze(value),
            });
          }}
          className="w-full rounded-lg border border-white/10 bg-[#0c0e12] px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-sky-400/50"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs text-zinc-500">
          Limit kredytu kupieckiego (zł)
        </span>
        <input
          type="number"
          min={0}
          step={100}
          value={groszeToInput(policy.creditLimitGrosze ?? 5_000_000)}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (!Number.isFinite(value) || value < 0) return;
            onChange({
              ...policy,
              creditLimitGrosze: toGrosze(value),
            });
          }}
          className="w-full rounded-lg border border-white/10 bg-[#0c0e12] px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-sky-400/50"
        />
      </label>
    </div>
  );
}

export function SupplierSettings({
  open,
  policies,
  inStockOnly,
  onClose,
  onChange,
  onInStockOnlyChange,
}: {
  open: boolean;
  policies: SupplierPolicy[];
  inStockOnly: boolean;
  onClose: () => void;
  onChange: (warehouseId: string, next: SupplierPolicy) => void;
  onInStockOnlyChange: (next: boolean) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Zamknij zasady dostawców"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <aside className="relative z-50 flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-white/10 bg-[#14181f] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-100">Zasady dostawców</p>
            <p className="mt-1 text-xs text-zinc-500">
              Zmiana natychmiast przelicza silnik (grosze, progi, split).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-white/8 bg-black/20 p-4">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(event) => onInStockOnlyChange(event.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 accent-sky-400"
          />
          <span>
            <span className="block text-sm text-zinc-100">
              Tylko towary dostępne od ręki (magazyn centralny / 24h)
            </span>
            <span className="mt-1 block text-xs text-zinc-500">
              Silnik pomija oferty z czasem oczekiwania powyżej 2 dni.
            </span>
          </span>
        </label>
        {policies.map((policy) => (
          <PolicyFields
            key={policy.warehouseId}
            policy={policy}
            onChange={(next) => onChange(policy.warehouseId, next)}
          />
        ))}
      </aside>
    </div>
  );
}

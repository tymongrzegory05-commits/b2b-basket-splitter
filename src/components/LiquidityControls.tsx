import type { LiquidityWarning } from "@/core/optimizer/basketEngine";
import { formatGrosze } from "@/utils/format";

export function LiquidityToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-[#14181f] px-3 py-2">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3.5 w-3.5 accent-amber-400"
      />
      <span className="text-xs text-zinc-200">
        Priorytet płynności finansowej (tylko odroczone terminy)
      </span>
    </label>
  );
}

export function InStockOnlyToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-[#14181f] px-3 py-2">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3.5 w-3.5 accent-sky-400"
      />
      <span className="text-xs text-zinc-200">
        Tylko towary dostępne od ręki (magazyn centralny / 24h)
      </span>
    </label>
  );
}

export function LiquidityWarnings({
  warnings,
}: {
  warnings: LiquidityWarning[];
}) {
  if (warnings.length === 0) return null;
  return (
    <div className="space-y-2">
      {warnings.map((warning) => (
        <p
          key={warning.warehouseId}
          className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"
        >
          Odrzucono oszczędność {formatGrosze(warning.rejectedSavingsGrosze)} w{" "}
          {warning.supplierName} ze względu na brak kredytu kupieckiego
        </p>
      ))}
    </div>
  );
}

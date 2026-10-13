import { Eye, EyeOff } from "lucide-react";
import type { ViewMode } from "@/core/pricing/clientPricing";

export function ViewSwitcher({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-white/10 bg-[#14181f] p-1">
      <button
        type="button"
        onClick={() => onChange("zakupowy")}
        className={
          value === "zakupowy"
            ? "inline-flex items-center gap-1.5 rounded-lg bg-sky-400/15 px-3 py-1.5 text-xs font-medium text-sky-200"
            : "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
        }
      >
        <EyeOff className="h-3.5 w-3.5" />
        Widok zakupowy
      </button>
      <button
        type="button"
        onClick={() => onChange("inwestorski")}
        className={
          value === "inwestorski"
            ? "inline-flex items-center gap-1.5 rounded-lg bg-emerald-400/15 px-3 py-1.5 text-xs font-medium text-emerald-200"
            : "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
        }
      >
        <Eye className="h-3.5 w-3.5" />
        Widok inwestorski
      </button>
    </div>
  );
}

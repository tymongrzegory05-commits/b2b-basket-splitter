"use client";

import { ShieldAlert, X } from "lucide-react";
import type { PreOrderRiskReport, RiskAlert } from "@/core/audit/preOrderRisks";

const KIND_LABEL: Record<RiskAlert["kind"], string> = {
  unfulfilled: "Braki",
  "lead-time": "Czas dostawy",
  "min-order": "Minimalna wartość",
  "free-shipping": "Próg darmowej dostawy",
};

const SEVERITY_CLASS: Record<RiskAlert["severity"], string> = {
  high: "border-rose-400/25 bg-rose-400/10 text-rose-100",
  medium: "border-amber-400/25 bg-amber-400/10 text-amber-100",
  low: "border-sky-400/25 bg-sky-400/10 text-sky-100",
};

export function RiskAuditButton({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        count > 0
          ? "inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-100 hover:bg-amber-400/15"
          : "inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5"
      }
    >
      <ShieldAlert className="h-3.5 w-3.5" />
      Audyt zamówienia
      <span className="rounded-full bg-black/30 px-1.5 py-0.5 font-mono">
        {count} {count === 1 ? "alert" : "alerty"}
      </span>
    </button>
  );
}

export function RiskAuditDrawer({
  open,
  report,
  onClose,
}: {
  open: boolean;
  report: PreOrderRiskReport;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Zamknij audyt zamówienia"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <aside className="relative z-50 flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-white/10 bg-[#14181f] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-100">
              Audyt ryzyk przed zamówieniem
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Twarda weryfikacja braków, lead time, MOQ i progów darmowej
              dostawy.
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
        {report.alerts.length === 0 ? (
          <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            Brak alertów. Koszyki można wysyłać.
          </p>
        ) : (
          <ul className="space-y-3">
            {report.alerts.map((alert) => (
              <li
                key={alert.id}
                className={`rounded-xl border px-4 py-3 ${SEVERITY_CLASS[alert.severity]}`}
              >
                <p className="text-[10px] uppercase tracking-wider opacity-70">
                  {KIND_LABEL[alert.kind]}
                </p>
                <p className="mt-1 text-sm leading-5">{alert.title}</p>
                {alert.detail ? (
                  <p className="mt-2 text-xs opacity-80">{alert.detail}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

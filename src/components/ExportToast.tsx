"use client";

import { CheckCircle2, X } from "lucide-react";

export function ExportToast({
  title = "Zamówienia wygenerowane",
  message,
  onClose,
}: {
  title?: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-6 sm:items-center">
      <button
        type="button"
        aria-label="Zamknij powiadomienie"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-[#14181f] p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-emerald-400/15 p-2 text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-100">{title}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

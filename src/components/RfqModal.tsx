"use client";

import { useState } from "react";
import { Copy, FileSpreadsheet, Plus, Trash2, X } from "lucide-react";
import { buildRfqEmail, downloadRfqExcel, type RfqLine } from "@/core/rfq/rfqExport";

function emptyLine(): RfqLine {
  return {
    id: `rfq-${Math.random().toString(36).slice(2, 8)}`,
    nazwa: "",
    kod: "",
    ilosc: 1,
    jednostka: "szt.",
  };
}

export function RfqModal({
  open,
  projectName,
  contractorName,
  projectLines,
  onClose,
  onCopied,
}: {
  open: boolean;
  projectName: string;
  contractorName: string;
  projectLines: RfqLine[];
  onClose: () => void;
  onCopied: (message: string) => void;
}) {
  const [lines, setLines] = useState<RfqLine[]>(
    projectLines.length > 0 ? projectLines : [emptyLine()],
  );
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  function updateLine(id: string, patch: Partial<RfqLine>) {
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }

  async function handleCopy() {
    const text = buildRfqEmail(lines, contractorName);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopied("Treść maila do handlowca skopiowana do schowka.");
    } catch {
      setCopied(false);
      onCopied("Nie udało się skopiować. Zaznacz tekst ręcznie.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button
        type="button"
        aria-label="Zamknij zapytanie ofertowe"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl border border-white/10 bg-[#14181f] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-100">
              Stwórz zapytanie ofertowe
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Czysta lista zapotrzebowania dla opiekuna handlowego — bez cen i
              podziału na hurtownie.
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

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setLines(projectLines.length > 0 ? projectLines : [emptyLine()])
            }
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5"
          >
            Wczytaj z projektu
          </button>
          <button
            type="button"
            onClick={() => setLines((current) => [...current, emptyLine()])}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5"
          >
            <Plus className="h-3.5 w-3.5" />
            Dodaj pozycję
          </button>
        </div>

        <div className="mt-4 overflow-auto rounded-xl border border-white/8">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/3 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Nazwa</th>
                <th className="px-3 py-2 font-medium">Kod</th>
                <th className="px-3 py-2 font-medium">Ilość</th>
                <th className="px-3 py-2 font-medium">Jdn.</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-3 py-2">
                    <input
                      value={line.nazwa}
                      onChange={(event) =>
                        updateLine(line.id, { nazwa: event.target.value })
                      }
                      className="w-full rounded-md border border-white/10 bg-[#0c0e12] px-2 py-1 text-sm text-zinc-100 outline-none focus:border-sky-400/50"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={line.kod}
                      onChange={(event) =>
                        updateLine(line.id, { kod: event.target.value })
                      }
                      className="w-full rounded-md border border-white/10 bg-[#0c0e12] px-2 py-1 font-mono text-sm text-zinc-100 outline-none focus:border-sky-400/50"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      value={line.ilosc}
                      onChange={(event) =>
                        updateLine(line.id, {
                          ilosc: Math.max(1, Math.round(Number(event.target.value) || 1)),
                        })
                      }
                      className="w-20 rounded-md border border-white/10 bg-[#0c0e12] px-2 py-1 font-mono text-sm text-zinc-100 outline-none focus:border-sky-400/50"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={line.jednostka}
                      onChange={(event) =>
                        updateLine(line.id, { jednostka: event.target.value })
                      }
                      className="w-16 rounded-md border border-white/10 bg-[#0c0e12] px-2 py-1 text-sm text-zinc-100 outline-none focus:border-sky-400/50"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        setLines((current) =>
                          current.filter((item) => item.id !== line.id),
                        )
                      }
                      className="rounded-md p-1.5 text-zinc-500 hover:bg-white/5 hover:text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-100 hover:bg-white/5"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Skopiowano treść maila" : "Kopiuj treść maila do handlowca"}
          </button>
          <button
            type="button"
            onClick={() => void downloadRfqExcel(lines, projectName)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-sky-400"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Pobierz czyste zapytanie (Excel)
          </button>
        </div>
      </div>
    </div>
  );
}

import { FileText, Percent } from "lucide-react";
import type { InvestorQuote, VatRate } from "@/core/pricing/clientPricing";
import { formatGrosze } from "@/utils/format";

export function InvestorPricing({
  quote,
  markupPercent,
  vatRate,
  contractorName,
  contractorDetails,
  onMarkupChange,
  onVatChange,
  onContractorNameChange,
  onContractorDetailsChange,
  onGenerateQuote,
}: {
  quote: InvestorQuote;
  markupPercent: number;
  vatRate: VatRate;
  contractorName: string;
  contractorDetails: string;
  onMarkupChange: (value: number) => void;
  onVatChange: (value: VatRate) => void;
  onContractorNameChange: (value: string) => void;
  onContractorDetailsChange: (value: string) => void;
  onGenerateQuote: () => void;
}) {
  return (
    <section className="rounded-2xl border border-white/8 bg-[#14181f] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-100">
            Wycena dla Inwestora
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Narzut na koszt zakupu po optymalizacji koszyka. Kwoty w groszach,
            wyświetlane jako złote.
          </p>
        </div>
        <div className="rounded-lg bg-emerald-400/10 p-2 text-emerald-300">
          <Percent className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-xs text-zinc-500">
              Narzut na materiały ({markupPercent}%)
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={markupPercent}
              onChange={(event) => onMarkupChange(Number(event.target.value))}
              className="w-full accent-emerald-400"
            />
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={markupPercent}
              onChange={(event) => onMarkupChange(Number(event.target.value))}
              className="w-24 rounded-lg border border-white/10 bg-[#0c0e12] px-3 py-1.5 font-mono text-sm text-zinc-100 outline-none focus:border-emerald-400/50"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {([8, 23] as VatRate[]).map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => onVatChange(rate)}
                className={
                  vatRate === rate
                    ? "rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-zinc-100"
                    : "rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                }
              >
                VAT {rate}%
                {rate === 8 ? " · montaż z usługą" : " · materiały"}
              </button>
            ))}
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs text-zinc-500">Dane wykonawcy</span>
            <input
              value={contractorName}
              onChange={(event) => onContractorNameChange(event.target.value)}
              placeholder="np. Instal-Tech Sp. z o.o."
              className="w-full rounded-lg border border-white/10 bg-[#0c0e12] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400/50"
            />
            <textarea
              value={contractorDetails}
              onChange={(event) => onContractorDetailsChange(event.target.value)}
              rows={2}
              placeholder="Adres, NIP, telefon"
              className="w-full rounded-lg border border-white/10 bg-[#0c0e12] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400/50"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <PriceStat
            label="Koszt zakupu wykonawcy"
            hint="Po optymalizacji, netto"
            value={formatGrosze(quote.kosztZakupuGrosze)}
          />
          <PriceStat
            label="Twoja marża na materiałach"
            hint={`+${markupPercent}% netto`}
            value={`+${formatGrosze(quote.marzaGrosze)}`}
            accent
          />
          <PriceStat
            label="Cena materiałów dla Inwestora"
            hint={`${formatGrosze(quote.cenaInwestorBruttoGrosze)} brutto (VAT ${vatRate}%)`}
            value={formatGrosze(quote.cenaInwestorNettoGrosze)}
            strong
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onGenerateQuote}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-emerald-300"
      >
        <FileText className="h-3.5 w-3.5" />
        Generuj ofertę dla Inwestora (PDF)
      </button>
    </section>
  );
}

function PriceStat({
  label,
  hint,
  value,
  accent,
  strong,
}: {
  label: string;
  hint: string;
  value: string;
  accent?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p
        className={
          strong
            ? "mt-1 font-mono text-xl font-semibold text-zinc-50"
            : accent
              ? "mt-1 font-mono text-xl font-semibold text-emerald-300"
              : "mt-1 font-mono text-xl font-semibold text-zinc-100"
        }
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

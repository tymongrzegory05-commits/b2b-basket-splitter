import type { ProjectRecord } from "@/core/projects/types";
import type { InvestorQuote } from "@/core/pricing/clientPricing";
import { addDaysIso, formatDatePl, formatGrosze, formatQty } from "@/utils/format";

export function QuoteDocument({
  project,
  quote,
  issuedAt,
}: {
  project: ProjectRecord;
  quote: InvestorQuote;
  issuedAt: string;
}) {
  const validUntil = addDaysIso(issuedAt, project.offerValidDays);
  const contractor = project.contractorName.trim() || "Wykonawca instalacyjny";

  return (
    <article
      id="investor-quote"
      className="hidden bg-white text-neutral-900 print:block"
    >
      <header className="border-b border-neutral-300 pb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          Oferta materiałowa
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {project.name}
        </h1>
        <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <p className="font-medium">{contractor}</p>
            {project.contractorDetails ? (
              <p className="mt-1 whitespace-pre-line text-neutral-600">
                {project.contractorDetails}
              </p>
            ) : null}
          </div>
          <div className="sm:text-right">
            <p>Data oferty: {formatDatePl(issuedAt)}</p>
            <p>Ważność: {project.offerValidDays} dni (do {formatDatePl(validUntil)})</p>
            <p>Pozycji: {quote.lines.length}</p>
          </div>
        </div>
      </header>

      <table className="mt-5 w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-neutral-400 text-left text-[10px] uppercase tracking-wider text-neutral-500">
            <th className="py-2 pr-2 font-medium">Lp.</th>
            <th className="py-2 pr-2 font-medium">Nazwa materiału</th>
            <th className="py-2 pr-2 font-medium">Ilość</th>
            <th className="py-2 pr-2 font-medium">Jdn.</th>
            <th className="py-2 pr-2 text-right font-medium">Cena jedn. netto</th>
            <th className="py-2 text-right font-medium">Wartość netto</th>
          </tr>
        </thead>
        <tbody>
          {quote.lines.map((line) => (
            <tr key={line.id} className="border-b border-neutral-200">
              <td className="py-1.5 pr-2 text-neutral-500">{line.lp}</td>
              <td className="py-1.5 pr-2">{line.nazwa}</td>
              <td className="py-1.5 pr-2">{formatQty(line.ilosc)}</td>
              <td className="py-1.5 pr-2">{line.jednostka}</td>
              <td className="py-1.5 pr-2 text-right font-mono">
                {formatGrosze(line.cenaJednostkowaGrosze)}
              </td>
              <td className="py-1.5 text-right font-mono">
                {formatGrosze(line.wartoscNettoGrosze)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-6 ml-auto w-full max-w-sm text-xs">
        <Row label="Materiały netto" value={formatGrosze(quote.cenaInwestorNettoGrosze)} />
        <Row
          label={`VAT ${quote.vatRate}%${quote.vatRate === 8 ? " (montaż z usługą)" : ""}`}
          value={formatGrosze(quote.vatGrosze)}
        />
        <Row
          label="Kwota brutto"
          value={formatGrosze(quote.cenaInwestorBruttoGrosze)}
          strong
        />
      </section>

      <footer className="mt-10 border-t border-neutral-300 pt-6">
        <p className="text-xs font-medium">Akceptacja wyceny materiałowej</p>
        <p className="mt-1 text-[11px] text-neutral-600">
          Potwierdzam przyjęcie powyższego zestawienia materiałów i wartości
          oferty. Oferta nie ujawnia źródeł zakupu ani rabatów hurtowych.
        </p>
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <SignatureBox label="Podpis inwestora" />
          <SignatureBox label="Podpis wykonawcy" />
        </div>
      </footer>
    </article>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={
        strong
          ? "flex justify-between border-t border-neutral-400 py-2 text-sm font-semibold"
          : "flex justify-between py-1 text-neutral-700"
      }
    >
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function SignatureBox({ label }: { label: string }) {
  return (
    <div>
      <div className="h-12 border-b border-neutral-400" />
      <p className="mt-2 text-[11px] text-neutral-500">{label}</p>
    </div>
  );
}

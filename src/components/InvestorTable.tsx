import type { InvestorQuote } from "@/core/pricing/clientPricing";
import { formatGrosze, formatQty } from "@/utils/format";

export function InvestorTable({ quote }: { quote: InvestorQuote }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#14181f]">
      <div className="border-b border-white/8 px-5 py-4">
        <h3 className="text-sm font-medium text-zinc-100">
          Zestawienie materiałowe dla inwestora
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          Bez nazw hurtowni, rabatów i kosztów dostawy. Ceny jednostkowe zawierają
          narzut wykonawcy.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/3 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-medium">Lp.</th>
              <th className="px-5 py-3 font-medium">Nazwa materiału</th>
              <th className="px-5 py-3 font-medium">Ilość</th>
              <th className="px-5 py-3 font-medium">Jednostka</th>
              <th className="px-5 py-3 font-medium text-right">
                Cena jedn. netto
              </th>
              <th className="px-5 py-3 font-medium text-right">Wartość netto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {quote.lines.map((line) => (
              <tr key={line.id} className="hover:bg-white/3">
                <td className="px-5 py-3 text-zinc-500">{line.lp}</td>
                <td className="px-5 py-3 text-zinc-100">{line.nazwa}</td>
                <td className="px-5 py-3 text-zinc-300">{formatQty(line.ilosc)}</td>
                <td className="px-5 py-3 text-zinc-500">{line.jednostka}</td>
                <td className="px-5 py-3 text-right font-mono text-zinc-200">
                  {formatGrosze(line.cenaJednostkowaGrosze)}
                </td>
                <td className="px-5 py-3 text-right font-mono text-zinc-100">
                  {formatGrosze(line.wartoscNettoGrosze)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/10">
              <td colSpan={5} className="px-5 py-3 text-right text-xs text-zinc-500">
                Razem netto
              </td>
              <td className="px-5 py-3 text-right font-mono text-sm text-zinc-50">
                {formatGrosze(quote.cenaInwestorNettoGrosze)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

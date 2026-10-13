export type RfqLine = {
  id: string;
  nazwa: string;
  kod: string;
  ilosc: number;
  jednostka: string;
};

export function buildRfqEmail(lines: RfqLine[], contractorName = ""): string {
  const rows = lines
    .filter((line) => line.nazwa.trim().length > 0 && line.ilosc > 0)
    .map(
      (line, index) =>
        `${index + 1}. ${line.nazwa}${line.kod ? ` [${line.kod}]` : ""} — ${line.ilosc} ${line.jednostka || "szt."}`,
    );

  const table =
    rows.length > 0 ? rows.join("\n") : "(brak pozycji na liście zapotrzebowania)";

  const signOff = contractorName.trim()
    ? `\n\nPozdrawiam,\n${contractorName.trim()}`
    : "\n\nPozdrawiam";

  return [
    "Dzień dobry,",
    "",
    "proszę o przygotowanie wyceny na poniższe zestawienie materiałowe z uwzględnieniem naszych rabatów stałych i dostępności magazynowej:",
    "",
    table,
    "",
    "Proszę o podanie ceny netto po rabacie, stanu magazynowego oraz terminu realizacji.",
    signOff,
  ].join("\n");
}

export async function downloadRfqExcel(lines: RfqLine[], projectName: string) {
  const XLSX = await import("xlsx");
  const rows = lines
    .filter((line) => line.nazwa.trim().length > 0 && line.ilosc > 0)
    .map((line, index) => ({
      Lp: index + 1,
      Nazwa: line.nazwa,
      "Kod / indeks": line.kod,
      Ilość: line.ilosc,
      Jednostka: line.jednostka || "szt.",
      Uwagi: "",
    }));

  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: ["Lp", "Nazwa", "Kod / indeks", "Ilość", "Jednostka", "Uwagi"],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Zapytanie");
  const safeName = projectName.replace(/[^\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ-]+/g, "_") || "RFQ";
  XLSX.writeFile(workbook, `Zapytanie_ofertowe_${safeName}.xlsx`);
}

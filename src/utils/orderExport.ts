import type { BasketEngineResult, WarehouseId } from "@/core/optimizer/basketEngine";
import { formatGrosze } from "@/utils/format";

function csvEscape(value: string | number): string {
  const text = String(value);
  if (/[;"\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function groszeCsv(grosze: number): string {
  const negative = grosze < 0;
  const abs = Math.abs(grosze);
  const zloty = Math.trunc(abs / 100);
  const gr = abs % 100;
  return `${negative ? "-" : ""}${zloty},${String(gr).padStart(2, "0")}`;
}

function stampDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function warehouseCsv(result: BasketEngineResult, warehouse: WarehouseId): string {
  const header = [
    "Kod towaru",
    "Nazwa z katalogu",
    "Ilość sztuk",
    "Opakowanie zbiorcze",
    "Cena uzgodniona",
    "Wartość netto",
  ];

  const rows = result.lines
    .filter((line) => line.status === "ASSIGNED" && line.wybor === warehouse)
    .map((line) => {
      const view = line.oferty[warehouse];
      return [
        view.offer.kodProducenta,
        view.offer.nazwaKatalogowa,
        line.iloscZakup,
        view.offer.packSize,
        groszeCsv(view.offer.cenaPoRabacieNettoGrosze),
        groszeCsv(line.kosztTowaruWybranyGrosze),
      ];
    });

  return [
    header.map(csvEscape).join(";"),
    ...rows.map((row) => row.map(csvEscape).join(";")),
  ].join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function safeFilePart(name: string): string {
  return name.replace(/[^\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ.-]+/g, "_") || "dostawca";
}

export type OrderExportSummary = {
  files: number;
  message: string;
};

export function exportSplitOrders(result: BasketEngineResult): OrderExportSummary {
  const date = stampDate();
  const active = result.suppliers.filter(
    (supplier) => (result.current[supplier.warehouseId]?.liczbaPozycji ?? 0) > 0,
  );

  for (const supplier of active) {
    downloadCsv(
      `Zamowienie_${safeFilePart(supplier.name)}_${date}.csv`,
      warehouseCsv(result, supplier.warehouseId),
    );
  }

  const parts = active.map((supplier) => {
    const current = result.current[supplier.warehouseId];
    const note =
      current.dostawaGrosze === 0
        ? "darmowa dostawa"
        : `dostawa ${formatGrosze(current.dostawaGrosze)}`;
    return `${supplier.name}: ${formatGrosze(current.sumaGrosze)} (${note})`;
  });

  return {
    files: active.length,
    message:
      active.length === 0
        ? "Brak pozycji do eksportu."
        : `Wygenerowano ${active.length} ${active.length === 1 ? "plik" : "pliki"} CSV. ${parts.join(". ")}.`,
  };
}

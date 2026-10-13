"use client";

import { useRef, useState } from "react";
import { ClipboardPaste, FileSpreadsheet, Plus, Trash2, Upload } from "lucide-react";
import { MAX_SUPPLIERS, MIN_SUPPLIERS, type WarehouseId } from "@/core/optimizer/basketEngine";
import type { SupplierSlot } from "@/core/projects/types";
import { SUPPLIER_PRESETS } from "@/data/supplierPolicies";
import {
  detectColumns,
  type ColumnMapping,
  type MappedField,
} from "@/core/import/columnMapper";
import { parseDelimitedText, parseSpreadsheetFile, type TabularSheet } from "@/core/import/parseTabular";
import { isPdfScanError, PDF_SCAN_MESSAGE } from "@/core/import/parsePdfOffer";
import {
  MAPPING_FIELDS,
  rowsToOffers,
  type ImportedOffer,
} from "@/core/import/importedOffer";
import { demoScenarios, type DemoScenario } from "@/data/demoSets";
import { formatGrosze } from "@/utils/format";

type PendingSheet = {
  warehouse: WarehouseId;
  sheet: TabularSheet;
  mapping: ColumnMapping;
  uncertain: MappedField[];
};

function DropzoneCard({
  title,
  subtitle,
  count,
  source,
  canRemove,
  onFile,
  onPaste,
  onRemove,
}: {
  title: string;
  subtitle: string;
  count: number;
  source: string | null;
  canRemove: boolean;
  onFile: (file: File) => void;
  onPaste: () => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        const file = event.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={
        dragOver
          ? "rounded-2xl border border-sky-400/40 bg-sky-400/8 p-5"
          : "rounded-2xl border border-dashed border-white/15 bg-[#14181f] p-5"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-100">{title}</p>
          <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1">
          {canRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-rose-300"
              aria-label={`Usuń ${title}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
          <div className="rounded-lg bg-white/5 p-2 text-zinc-400">
            <Upload className="h-4 w-4" />
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs text-zinc-400">
        {count > 0
          ? `${count} pozycji${source ? ` · ${source}` : ""}`
          : "Brak wczytanej oferty"}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Wybierz CSV / XLSX / PDF
        </button>
        <button
          type="button"
          onClick={onPaste}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5"
        >
          <ClipboardPaste className="h-3.5 w-3.5" />
          Wklej ze schowka
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,.txt,.xlsx,.xls,.pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}

function MappingModal({
  pending,
  onCancel,
  onConfirm,
}: {
  pending: PendingSheet;
  onCancel: () => void;
  onConfirm: (mapping: ColumnMapping) => void;
}) {
  const [mapping, setMapping] = useState<ColumnMapping>(pending.mapping);
  const preview = pending.sheet.rows.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button
        type="button"
        aria-label="Zamknij mapowanie kolumn"
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-xl rounded-2xl border border-white/10 bg-[#14181f] p-5">
        <p className="text-sm font-medium text-zinc-100">
          {pending.uncertain.includes("cenaNetto")
            ? "Wskaż kolumnę z Ceną Netto"
            : "Wskaż kolumny oferty"}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Automatyczne wykrycie nie było pewne. Potwierdź mapowanie na
          podglądzie pierwszych wierszy.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {MAPPING_FIELDS.map((field) => (
            <label key={field.id} className="block space-y-1.5">
              <span className="text-xs text-zinc-500">
                {field.label}
                {pending.uncertain.includes(field.id) ? " · do potwierdzenia" : ""}
              </span>
              <select
                value={mapping[field.id] ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setMapping((current) => {
                    const next = { ...current };
                    if (value === "") delete next[field.id];
                    else next[field.id] = Number(value);
                    return next;
                  });
                }}
                className="w-full rounded-lg border border-white/10 bg-[#0c0e12] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-400/50"
              >
                <option value="">— pomiń —</option>
                {pending.sheet.headers.map((header, index) => (
                  <option key={`${header}-${index}`} value={index}>
                    {header || `Kolumna ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        {preview.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-lg border border-white/8">
            <table className="min-w-full text-left text-xs text-zinc-400">
              <thead>
                <tr>
                  {pending.sheet.headers.map((header) => (
                    <th key={header} className="px-2 py-1.5 font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, index) => (
                  <tr key={index}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-2 py-1">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={() => onConfirm(mapping)}
            disabled={mapping.nazwa == null || mapping.cenaNetto == null}
            className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-40"
          >
            Zastosuj mapowanie
          </button>
        </div>
      </div>
    </div>
  );
}

function PasteModal({
  warehouse,
  onCancel,
  onSubmit,
}: {
  warehouse: string;
  onCancel: () => void;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button
        type="button"
        aria-label="Zamknij wklejanie"
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-xl rounded-2xl border border-white/10 bg-[#14181f] p-5">
        <p className="text-sm font-medium text-zinc-100">
          Wklej ofertę {warehouse}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          CSV, TSV albo tabela ze średnikiem z Excela. Pierwszy wiersz to
          nagłówki.
        </p>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={8}
          className="mt-4 w-full rounded-lg border border-white/10 bg-[#0c0e12] px-3 py-2 font-mono text-xs text-zinc-100 outline-none focus:border-sky-400/50"
          placeholder={'Nazwa;Kod;Cena netto;Ilość\nRura PEX 16x2.0;PEX-16;5,19;50'}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={() => onSubmit(text)}
            disabled={!text.trim()}
            className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-40"
          >
            Wczytaj wklejone dane
          </button>
        </div>
      </div>
    </div>
  );
}

export function OfferImporter({
  suppliers,
  unmatchedBySupplier,
  onOffersLoaded,
  onLoadDemo,
  onAddSupplier,
  onRemoveSupplier,
}: {
  suppliers: SupplierSlot[];
  unmatchedBySupplier: Record<WarehouseId, number>;
  onOffersLoaded: (
    warehouse: WarehouseId,
    offers: ImportedOffer[],
    source: string,
  ) => void;
  onLoadDemo: (scenario: DemoScenario) => void;
  onAddSupplier: (presetId: string) => void;
  onRemoveSupplier: (id: WarehouseId) => void;
}) {
  const [pending, setPending] = useState<PendingSheet | null>(null);
  const [pasteFor, setPasteFor] = useState<WarehouseId | null>(null);
  const [presetOpen, setPresetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unmatchedTotal = Object.values(unmatchedBySupplier).reduce(
    (sum, count) => sum + count,
    0,
  );

  function ingestSheet(warehouse: WarehouseId, sheet: TabularSheet) {
    setError(null);
    if (sheet.headers.length === 0) {
      setError("Nie znaleziono nagłówków w pliku.");
      return;
    }
    const detection = detectColumns(sheet.headers);
    if (detection.uncertain.length > 0) {
      setPending({
        warehouse,
        sheet,
        mapping: detection.mapping,
        uncertain: detection.uncertain,
      });
      return;
    }
    try {
      const offers = rowsToOffers(sheet, detection.mapping);
      if (offers.length === 0) {
        setError("Nie udało się odczytać żadnej pozycji.");
        return;
      }
      onOffersLoaded(warehouse, offers, sheet.sourceName);
    } catch (ingestError) {
      setError(
        ingestError instanceof Error
          ? ingestError.message
          : "Błąd mapowania kolumn",
      );
    }
  }

  async function handleFile(warehouse: WarehouseId, file: File) {
    try {
      const sheet = await parseSpreadsheetFile(file);
      ingestSheet(warehouse, sheet);
    } catch (error) {
      setError(
        isPdfScanError(error)
          ? PDF_SCAN_MESSAGE
          : "Nie udało się odczytać pliku. Spróbuj CSV, Excel albo wklejenia.",
      );
    }
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {suppliers.map((slot) => (
          <DropzoneCard
            key={slot.id}
            title={slot.name}
            subtitle={`Darmowa dostawa od ${formatGrosze(slot.policy.freeShippingThresholdGrosze)} · wysyłka ${formatGrosze(slot.policy.shippingCostGrosze)}`}
            count={slot.offers.length}
            source={slot.source}
            canRemove={suppliers.length > MIN_SUPPLIERS}
            onFile={(file) => void handleFile(slot.id, file)}
            onPaste={() => setPasteFor(slot.id)}
            onRemove={() => onRemoveSupplier(slot.id)}
          />
        ))}
      </div>
      {suppliers.length < MAX_SUPPLIERS ? (
        <button
          type="button"
          onClick={() => setPresetOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-white/15 px-3 py-2 text-xs text-zinc-200 hover:bg-white/5"
        >
          <Plus className="h-3.5 w-3.5" />
          + Dodaj kolejną hurtownię
        </button>
      ) : null}

      <div className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-[#14181f] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-100">
            Załaduj gotowy zestaw demo
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Reset do scenariusza testowego bez szukania plików.
            {unmatchedTotal > 0
              ? ` Niedopasowane pozycje: ${unmatchedTotal}.`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {demoScenarios.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              onClick={() => onLoadDemo(scenario)}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-200 hover:bg-white/5"
            >
              {scenario.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      ) : null}

      {pending ? (
        <MappingModal
          pending={pending}
          onCancel={() => setPending(null)}
          onConfirm={(mapping) => {
            try {
              const offers = rowsToOffers(pending.sheet, mapping);
              onOffersLoaded(pending.warehouse, offers, pending.sheet.sourceName);
              setPending(null);
            } catch (ingestError) {
              setError(
                ingestError instanceof Error
                  ? ingestError.message
                  : "Błąd mapowania kolumn",
              );
            }
          }}
        />
      ) : null}

      {pasteFor ? (
        <PasteModal
          warehouse={
            suppliers.find((slot) => slot.id === pasteFor)?.name ?? pasteFor
          }
          onCancel={() => setPasteFor(null)}
          onSubmit={(text) => {
            const sheet = parseDelimitedText(
              text,
              `schowek-${pasteFor}`,
            );
            ingestSheet(pasteFor, sheet);
            setPasteFor(null);
          }}
        />
      ) : null}

      {presetOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <button
            type="button"
            aria-label="Zamknij wybór hurtowni"
            className="absolute inset-0 bg-black/50"
            onClick={() => setPresetOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#14181f] p-5">
            <p className="text-sm font-medium text-zinc-100">
              Wybierz profil hurtowni
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Preset wstawia próg darmowej dostawy i koszt wysyłki. Możesz je
              potem zmienić w zasadach dostawców.
            </p>
            <div className="mt-4 space-y-2">
              {SUPPLIER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onAddSupplier(preset.id);
                    setPresetOpen(false);
                  }}
                  className="flex w-full flex-col rounded-xl border border-white/10 px-3 py-2 text-left hover:bg-white/5"
                >
                  <span className="text-sm text-zinc-100">{preset.name}</span>
                  <span className="text-xs text-zinc-500">
                    Darmowa dostawa od {(preset.freeShippingThresholdGrosze / 100).toLocaleString("pl-PL")} zł
                    {" · "}
                    wysyłka {(preset.shippingCostGrosze / 100).toLocaleString("pl-PL")} zł
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

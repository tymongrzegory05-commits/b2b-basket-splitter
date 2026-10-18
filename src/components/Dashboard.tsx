"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Download, FileText, RotateCcw, Settings2, Split } from "lucide-react";
import type { DemoScenario } from "@/data/demoSets";
import {
  MAX_SUPPLIERS,
  MIN_SUPPLIERS,
  optimizeBasket,
  type WarehouseId,
} from "@/core/optimizer/basketEngine";
import {
  buildOfferSession,
  sessionToEngineInput,
} from "@/core/import/buildSession";
import { buildOfferAnalytics } from "@/core/analytics/offerAnalytics";
import type { ImportedOffer } from "@/core/import/importedOffer";
import {
  buildInvestorQuote,
  clampMarkupPercent,
  type VatRate,
  type ViewMode,
} from "@/core/pricing/clientPricing";
import {
  activeProject,
  createDefaultWorkspace,
  createEmptyProject,
  createSupplierSlot,
  deriveProjectStatus,
  duplicateProject,
  listProjectSummaries,
  loadWorkspace,
  nowIso,
  replaceActiveProject,
  saveWorkspace,
} from "@/core/projects/storage";
import type { ProjectRecord, Workspace } from "@/core/projects/types";
import { exportSplitOrders } from "@/utils/orderExport";
import { SavingsBanner } from "@/components/SavingsBanner";
import { ScenarioCards } from "@/components/ScenarioCards";
import {
  ComparisonTable,
  type TableFilter,
} from "@/components/ComparisonTable";
import { SupplierSettings } from "@/components/SupplierSettings";
import { ExportToast } from "@/components/ExportToast";
import { OfferImporter } from "@/components/OfferImporter";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { InvestorPricing } from "@/components/InvestorPricing";
import { InvestorTable } from "@/components/InvestorTable";
import { QuoteDocument } from "@/components/QuoteDocument";
import { RfqModal } from "@/components/RfqModal";
import {
  InStockOnlyToggle,
  LiquidityToggle,
  LiquidityWarnings,
} from "@/components/LiquidityControls";
import { OfferAnalyticsPanel } from "@/components/OfferAnalytics";
import { RiskAuditButton, RiskAuditDrawer } from "@/components/RiskAuditDrawer";
import { buildPreOrderRisks } from "@/core/audit/preOrderRisks";
import {
  findAllSubstitutions,
  pickAggressiveSubstitutions,
  type AppliedSubstitution,
  type SubstitutionSuggestion,
} from "@/core/matching/substitutions";
import type { RfqLine } from "@/core/rfq/rfqExport";

export function Dashboard() {
  const [workspace, setWorkspace] = useState<Workspace>(createDefaultWorkspace);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<TableFilter>("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [rfqOpen, setRfqOpen] = useState(false);
  const [toast, setToast] = useState<{ title: string; message: string } | null>(
    null,
  );
  const [issuedAt, setIssuedAt] = useState("2026-09-03T00:00:00.000Z");

  const project = activeProject(workspace);

  const session = useMemo(
    () =>
      buildOfferSession(
        project.suppliers.map((slot) => ({ id: slot.id, offers: slot.offers })),
      ),
    [project.suppliers],
  );

  const engineInput = useMemo(
    () =>
      sessionToEngineInput(
        session,
        project.suppliers.map((slot) => slot.policy),
        project.liquidityPriority,
        project.inStockOnly,
      ),
    [project.inStockOnly, project.liquidityPriority, project.suppliers, session],
  );

  const basePreview = useMemo(
    () => optimizeBasket(engineInput, {}),
    [engineInput],
  );

  const aggressiveMap = useMemo(
    () =>
      project.aggressiveSubstitutions
        ? pickAggressiveSubstitutions(basePreview, project.inStockOnly)
        : {},
    [basePreview, project.aggressiveSubstitutions, project.inStockOnly],
  );

  const mergedOverrides = useMemo(() => {
    const next: Record<string, WarehouseId> = {};
    for (const [id, sub] of Object.entries(aggressiveMap)) {
      next[id] = sub.warehouseId;
    }
    for (const [id, sub] of Object.entries(
      project.appliedSubstitutions ?? {},
    )) {
      next[id] = sub.warehouseId;
    }
    for (const [id, warehouseId] of Object.entries(project.overrides ?? {})) {
      next[id] = warehouseId;
    }
    return next;
  }, [
    aggressiveMap,
    project.appliedSubstitutions,
    project.overrides,
  ]);

  const result = useMemo(
    () => optimizeBasket(engineInput, mergedOverrides),
    [engineInput, mergedOverrides],
  );

  const substitutionsByLine = useMemo(
    () => findAllSubstitutions(result, project.inStockOnly),
    [project.inStockOnly, result],
  );

  const appliedBrandByLine = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [id, sub] of Object.entries(aggressiveMap)) {
      if (!project.overrides?.[id] || project.overrides[id] === sub.warehouseId) {
        map[id] = sub.brand;
      }
    }
    for (const [id, sub] of Object.entries(
      project.appliedSubstitutions ?? {},
    )) {
      map[id] = sub.brand;
    }
    return map;
  }, [
    aggressiveMap,
    project.appliedSubstitutions,
    project.overrides,
  ]);

  const riskReport = useMemo(() => buildPreOrderRisks(result), [result]);

  const analytics = useMemo(
    () => buildOfferAnalytics(result, engineInput),
    [engineInput, result],
  );

  const quote = useMemo(
    () => buildInvestorQuote(result.lines, project.markupPercent, project.vatRate),
    [project.markupPercent, project.vatRate, result.lines],
  );

  const unverified = result.lines.filter(
    (line) =>
      (session.confidenceById[line.id] ?? 0) < 90 &&
      !project.confirmedIds.includes(line.id),
  ).length;

  const unmatchedTotal = Object.values(session.unmatchedBySupplier).reduce(
    (sum, count) => sum + count,
    0,
  );

  const status = deriveProjectStatus({
    offerCounts: project.suppliers.map((slot) => slot.offers.length),
    unmatched: unmatchedTotal,
    unverified,
  });

  useEffect(() => {
    const loaded = loadWorkspace();
    if (loaded) setWorkspace(loaded);
    else saveWorkspace(createDefaultWorkspace());
    setIssuedAt(new Date().toISOString());
    setHydrated(true);
  }, []);

  const estimatedValueGrosze = result.lines.reduce((sum, line) => {
    const chosenOffer = line.wybor ? line.oferty[line.wybor] : undefined;
    return sum + (chosenOffer?.kosztTowaruGrosze ?? 0);
  }, 0);

  useEffect(() => {
    if (!hydrated) return;
    if (
      project.status !== status ||
      project.estimatedValueGrosze !== estimatedValueGrosze
    ) {
      setWorkspace((current) => {
        const active = activeProject(current);
        if (
          active.status === status &&
          active.estimatedValueGrosze === estimatedValueGrosze
        ) {
          return current;
        }
        return replaceActiveProject(current, {
          ...active,
          status,
          estimatedValueGrosze,
        });
      });
    }
  }, [
    estimatedValueGrosze,
    hydrated,
    project.estimatedValueGrosze,
    project.status,
    status,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      saveWorkspace(workspace);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [hydrated, workspace]);

  const confirmedIds = useMemo(
    () => new Set(project.confirmedIds),
    [project.confirmedIds],
  );
  const hasOverrides =
    Object.keys(project.overrides ?? {}).length > 0 ||
    Object.keys(project.appliedSubstitutions ?? {}).length > 0 ||
    Boolean(project.aggressiveSubstitutions);
  const investorView = project.viewMode === "inwestorski";

  function patchActive(patch: Partial<ProjectRecord>, touch = true) {
    setWorkspace((current) => {
      const active = activeProject(current);
      return replaceActiveProject(current, {
        ...active,
        ...patch,
        updatedAt: touch ? nowIso() : active.updatedAt,
      });
    });
  }

  function handleOffersLoaded(
    warehouse: WarehouseId,
    offers: ImportedOffer[],
    source: string,
  ) {
    patchActive({
      suppliers: project.suppliers.map((slot) =>
        slot.id === warehouse ? { ...slot, offers, source } : slot,
      ),
      overrides: {},
      confirmedIds: [],
      appliedSubstitutions: {},
    });
    setFilter("all");
  }

  function handleLoadDemo(scenario: DemoScenario) {
    const newSuppliers = scenario.slots.map((item) =>
      createSupplierSlot(item.presetId, item.offers, scenario.label),
    );
    const offerCounts = newSuppliers.map((slot) => slot.offers.length);
    const totalOffers = offerCounts.reduce((sum, count) => sum + count, 0);
    const newStatus = deriveProjectStatus({
      offerCounts,
      unmatched: 0,
      unverified: totalOffers,
    });
    patchActive({
      suppliers: newSuppliers,
      overrides: {},
      confirmedIds: [],
      appliedSubstitutions: {},
      aggressiveSubstitutions: false,
      status: newStatus,
      estimatedValueGrosze: 0,
    });
    setFilter("all");
  }

  function handleAddSupplier(presetId: string) {
    if (project.suppliers.length >= MAX_SUPPLIERS) return;
    patchActive({
      suppliers: [...project.suppliers, createSupplierSlot(presetId)],
      overrides: {},
      confirmedIds: [],
    });
  }

  function handleRemoveSupplier(id: WarehouseId) {
    if (project.suppliers.length <= MIN_SUPPLIERS) return;
    const overrides = { ...project.overrides };
    for (const [lineId, warehouse] of Object.entries(overrides)) {
      if (warehouse === id) delete overrides[lineId];
    }
    const appliedSubstitutions = { ...project.appliedSubstitutions };
    for (const [lineId, sub] of Object.entries(appliedSubstitutions)) {
      if (sub.warehouseId === id) delete appliedSubstitutions[lineId];
    }
    patchActive({
      suppliers: project.suppliers.filter((slot) => slot.id !== id),
      overrides,
      appliedSubstitutions,
      confirmedIds: [],
    });
    setFilter("all");
  }

  function handleOverride(id: string, warehouse: WarehouseId) {
    const line = result.lines.find((item) => item.id === id);
    if (!line) return;

    const nextOverrides = { ...project.overrides };
    const nextSubstitutions = { ...(project.appliedSubstitutions ?? {}) };

    delete nextSubstitutions[id];

    if (warehouse === line.wyborAlgorytmu && !project.aggressiveSubstitutions) {
      delete nextOverrides[id];
    } else {
      nextOverrides[id] = warehouse;
    }

    patchActive({
      overrides: nextOverrides,
      appliedSubstitutions: nextSubstitutions,
    });
  }

  function handleApplySubstitution(suggestion: SubstitutionSuggestion) {
    const applied: AppliedSubstitution = {
      lineId: suggestion.lineId,
      warehouseId: suggestion.warehouseId,
      brand: suggestion.brand,
      nazwaKatalogowa: suggestion.nazwaKatalogowa,
      kodProducenta: suggestion.kodProducenta,
    };
    patchActive({
      appliedSubstitutions: {
        ...project.appliedSubstitutions,
        [suggestion.lineId]: applied,
      },
      overrides: {
        ...project.overrides,
        [suggestion.lineId]: suggestion.warehouseId,
      },
    });
  }

  function handleConfirm(id: string) {
    if (project.confirmedIds.includes(id)) return;
    patchActive({ confirmedIds: [...project.confirmedIds, id] });
  }

  function handleExport() {
    const summary = exportSplitOrders(result);
    setToast({ title: "Zamówienia wygenerowane", message: summary.message });
  }

  function handlePrint() {
    window.print();
    setToast({
      title: "Oferta gotowa do zapisu",
      message: "W oknie drukowania wybierz „Zapisz jako PDF”, żeby pobrać ofertę A4.",
    });
  }

  function handleCreate(name: string) {
    const created = createEmptyProject(name);
    setWorkspace((current) => ({
      ...current,
      activeProjectId: created.id,
      projects: [...current.projects, created],
    }));
    setFilter("all");
  }

  function handleDuplicate(id: string) {
    setWorkspace((current) => {
      const source = current.projects.find((item) => item.id === id);
      if (!source) return current;
      const copy = duplicateProject(source);
      return {
        ...current,
        activeProjectId: copy.id,
        projects: [...current.projects, copy],
      };
    });
    setFilter("all");
  }

  function handleDelete(id: string): string | null {
    if (workspace.projects.length <= 1) {
      return "Nie można usunąć ostatniego projektu.";
    }
    setWorkspace((current) => {
      const projects = current.projects.filter((item) => item.id !== id);
      return {
        ...current,
        projects,
        activeProjectId:
          current.activeProjectId === id ? projects[0].id : current.activeProjectId,
      };
    });
    setFilter("all");
    return null;
  }

  return (
    <>
      <div className="min-h-full bg-[#0c0e12] text-zinc-100 print:hidden">
        <header className="border-b border-white/8">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
                <Split className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight">
                  B2B Basket Splitter
                </p>
                <p className="text-xs text-zinc-500">
                  Optymalizacja koszyków hurtowych
                </p>
              </div>
              <ProjectSwitcher
                activeName={project.name}
                activeId={project.id}
                summaries={listProjectSummaries(workspace)}
                onSelect={(id) => {
                  setWorkspace((current) => ({ ...current, activeProjectId: id }));
                  setFilter("all");
                }}
                onCreate={handleCreate}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onRename={(name) =>
                  patchActive({ name: name.trim() || "Bez nazwy" })
                }
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasOverrides && !investorView ? (
                <button
                  type="button"
                  onClick={() =>
                    patchActive({
                      overrides: {},
                      appliedSubstitutions: {},
                      aggressiveSubstitutions: false,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Przywróć optymalne ustawienia algorytmu
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setRfqOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Stwórz zapytanie ofertowe
              </button>
              {!investorView ? (
                <RiskAuditButton
                  count={riskReport.count}
                  onClick={() => setAuditOpen(true)}
                />
              ) : null}
              {!investorView ? (
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Zasady dostawców
                </button>
              ) : null}
              {!investorView ? (
                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-sky-400"
                >
                  <Download className="h-3.5 w-3.5" />
                  Pobierz gotowe zamówienia
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-emerald-300"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Generuj ofertę dla Inwestora (PDF)
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ViewSwitcher
              value={project.viewMode}
              onChange={(mode: ViewMode) => patchActive({ viewMode: mode })}
            />
            <p className="text-xs text-zinc-500">
              {investorView
                ? "Widok dla klienta: bez hurtowni, rabatów i logistyki."
                : "Widok wewnętrzny: split koszyka, hurtownie i dopasowania."}
            </p>
          </div>

          {!hydrated ? (
            <div className="rounded-2xl border border-white/8 bg-[#14181f] px-5 py-8 text-sm text-zinc-500">
              Wczytywanie projektów…
            </div>
          ) : investorView ? (
            <>
              <InvestorPricing
                quote={quote}
                markupPercent={project.markupPercent}
                vatRate={project.vatRate}
                contractorName={project.contractorName}
                contractorDetails={project.contractorDetails}
                onMarkupChange={(value) =>
                  patchActive({ markupPercent: clampMarkupPercent(value) })
                }
                onVatChange={(value: VatRate) => patchActive({ vatRate: value })}
                onContractorNameChange={(value) =>
                  patchActive({ contractorName: value })
                }
                onContractorDetailsChange={(value) =>
                  patchActive({ contractorDetails: value })
                }
                onGenerateQuote={handlePrint}
              />
              <InvestorTable quote={quote} />
            </>
          ) : (
            <>
              <OfferImporter
                suppliers={project.suppliers}
                unmatchedBySupplier={session.unmatchedBySupplier}
                onOffersLoaded={handleOffersLoaded}
                onLoadDemo={handleLoadDemo}
                onAddSupplier={handleAddSupplier}
                onRemoveSupplier={handleRemoveSupplier}
              />
              <SavingsBanner result={result} />
              <ScenarioCards result={result} />
              <OfferAnalyticsPanel analytics={analytics} />
              <InvestorPricing
                quote={quote}
                markupPercent={project.markupPercent}
                vatRate={project.vatRate}
                contractorName={project.contractorName}
                contractorDetails={project.contractorDetails}
                onMarkupChange={(value) =>
                  patchActive({ markupPercent: clampMarkupPercent(value) })
                }
                onVatChange={(value: VatRate) => patchActive({ vatRate: value })}
                onContractorNameChange={(value) =>
                  patchActive({ contractorName: value })
                }
                onContractorDetailsChange={(value) =>
                  patchActive({ contractorDetails: value })
                }
                onGenerateQuote={handlePrint}
              />
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  <LiquidityToggle
                    enabled={project.liquidityPriority}
                    onChange={(enabled) =>
                      patchActive({ liquidityPriority: enabled })
                    }
                  />
                  <InStockOnlyToggle
                    enabled={project.inStockOnly}
                    onChange={(enabled) => patchActive({ inStockOnly: enabled })}
                  />
                </div>
                <LiquidityWarnings warnings={result.liquidityWarnings} />
              </div>
              <ComparisonTable
                lines={result.lines}
                suppliers={result.suppliers}
                filter={filter}
                confidenceById={session.confidenceById}
                confirmedIds={confirmedIds}
                substitutionsByLine={substitutionsByLine}
                appliedBrandByLine={appliedBrandByLine}
                aggressiveSubstitutions={project.aggressiveSubstitutions}
                onFilterChange={setFilter}
                onOverride={handleOverride}
                onConfirmMatch={handleConfirm}
                onApplySubstitution={handleApplySubstitution}
                onAggressiveChange={(enabled) =>
                  patchActive({
                    aggressiveSubstitutions: enabled,
                    appliedSubstitutions: enabled
                      ? project.appliedSubstitutions
                      : {},
                  })
                }
              />
            </>
          )}
        </main>

        <SupplierSettings
          open={settingsOpen}
          policies={project.suppliers.map((slot) => slot.policy)}
          inStockOnly={project.inStockOnly}
          onClose={() => setSettingsOpen(false)}
          onChange={(warehouseId, policy) =>
            patchActive({
              suppliers: project.suppliers.map((slot) =>
                slot.id === warehouseId
                  ? { ...slot, policy: { ...policy, warehouseId: slot.id, name: slot.name } }
                  : slot,
              ),
            })
          }
          onInStockOnlyChange={(enabled) => patchActive({ inStockOnly: enabled })}
        />
        <RiskAuditDrawer
          open={auditOpen}
          report={riskReport}
          onClose={() => setAuditOpen(false)}
        />
        {rfqOpen ? (
          <RfqModal
            open
            projectName={project.name}
            contractorName={project.contractorName}
            projectLines={result.lines.map(
              (line): RfqLine => ({
                id: line.id,
                nazwa: line.nazwaKanoniczna,
                kod:
                  Object.values(line.oferty).find(
                    (view) => view.offer.kodProducenta !== "—",
                  )?.offer.kodProducenta ?? "",
                ilosc: line.zapotrzebowanie,
                jednostka: "szt.",
              }),
            )}
            onClose={() => setRfqOpen(false)}
            onCopied={(message) =>
              setToast({ title: "Zapytanie ofertowe", message })
            }
          />
        ) : null}
        {toast ? (
          <ExportToast
            title={toast.title}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        ) : null}
      </div>
      {hydrated ? (
        <QuoteDocument project={project} quote={quote} issuedAt={issuedAt} />
      ) : null}
    </>
  );
}
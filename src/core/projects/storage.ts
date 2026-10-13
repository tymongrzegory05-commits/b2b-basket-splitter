import {
  mockToImportedAlfa,
  mockToImportedBeta,
  mockToImportedBims,
} from "@/data/demoSets";
import {
  getPreset,
  policyFromPreset,
} from "@/data/supplierPolicies";
import type { ImportedOffer } from "@/core/import/importedOffer";
import {
  MAX_SUPPLIERS,
  MIN_SUPPLIERS,
  type PaymentTerm,
} from "@/core/optimizer/basketEngine";
import type {
  ProjectRecord,
  ProjectStatus,
  ProjectSummary,
  SupplierSlot,
  Workspace,
} from "@/core/projects/types";

export const PROJECTS_STORAGE_KEY = "b2b-basket-projects-v1";
export const STARTER_PROJECT_ID = "proj-starter";

export type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const memoryStore = new Map<string, string>();

const fallbackStore: KeyValueStore = {
  getItem: (key) => memoryStore.get(key) ?? null,
  setItem: (key, value) => {
    memoryStore.set(key, value);
  },
  removeItem: (key) => {
    memoryStore.delete(key);
  },
};

export function defaultStorage(): KeyValueStore {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return fallbackStore;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createProjectId(prefix = "proj"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createSupplierId(presetId = "custom"): string {
  return `${presetId}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createSupplierSlot(
  presetId: string,
  offers: ImportedOffer[] = [],
  source: string | null = null,
  id = createSupplierId(presetId),
): SupplierSlot {
  const preset = getPreset(presetId);
  const policy = policyFromPreset(preset, id);
  return {
    id,
    name: preset.name,
    presetId: preset.id,
    policy,
    offers: offers.map((offer) => ({ ...offer })),
    source,
  };
}

function defaultSupplierSlots(): SupplierSlot[] {
  return [
    createSupplierSlot("tim", [], null, "tim"),
    createSupplierSlot("onninen", [], null, "onninen"),
  ];
}

function baseProject(
  id: string,
  name: string,
  timestamps: { createdAt: string; updatedAt: string },
): ProjectRecord {
  return {
    id,
    name,
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
    status: "szkic",
    estimatedValueGrosze: 0,
    contractorName: "",
    contractorDetails: "",
    markupPercent: 20,
    vatRate: 23,
    viewMode: "zakupowy",
    offerValidDays: 14,
    suppliers: defaultSupplierSlots(),
    overrides: {},
    confirmedIds: [],
    liquidityPriority: false,
    inStockOnly: false,
    aggressiveSubstitutions: false,
    appliedSubstitutions: {},
  };
}

export function createEmptyProject(name: string, at = nowIso()): ProjectRecord {
  return baseProject(createProjectId(), name.trim() || "Nowy projekt", {
    createdAt: at,
    updatedAt: at,
  });
}

export function createStarterProject(): ProjectRecord {
  const at = "2026-09-03T00:00:00.000Z";
  return {
    ...baseProject(STARTER_PROJECT_ID, "Zestaw startowy", {
      createdAt: at,
      updatedAt: at,
    }),
    status: "do weryfikacji",
    suppliers: [
      createSupplierSlot("tim", mockToImportedAlfa(), "zestaw startowy", "tim"),
      createSupplierSlot(
        "onninen",
        mockToImportedBeta(),
        "zestaw startowy",
        "onninen",
      ),
      createSupplierSlot("bims", mockToImportedBims(), "zestaw startowy", "bims"),
    ],
  };
}

export function createDefaultWorkspace(): Workspace {
  const starter = createStarterProject();
  return {
    version: 2,
    activeProjectId: starter.id,
    projects: [starter],
  };
}

export function duplicateProject(project: ProjectRecord, at = nowIso()): ProjectRecord {
  return {
    ...project,
    id: createProjectId("kopia"),
    name: `${project.name} (kopia)`,
    createdAt: at,
    updatedAt: at,
    overrides: { ...project.overrides },
    confirmedIds: [...project.confirmedIds],
    suppliers: project.suppliers.map((slot) => ({
      ...slot,
      policy: { ...slot.policy },
      offers: slot.offers.map((offer) => ({ ...offer })),
    })),
  };
}

export function deriveProjectStatus(input: {
  offerCounts: number[];
  unmatched: number;
  unverified: number;
}): ProjectStatus {
  const loaded = input.offerCounts.filter((count) => count > 0).length;
  if (loaded === 0) return "szkic";
  if (input.unverified > 0 || input.unmatched > 0) return "do weryfikacji";
  if (loaded >= MIN_SUPPLIERS) return "gotowy";
  return "w trakcie";
}

export function summarizeProject(project: ProjectRecord): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    updatedAt: project.updatedAt,
    status: project.status,
    estimatedValueGrosze: project.estimatedValueGrosze,
    lineCount: Math.max(0, ...project.suppliers.map((slot) => slot.offers.length)),
  };
}

export function listProjectSummaries(workspace: Workspace): ProjectSummary[] {
  return [...workspace.projects]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .map(summarizeProject);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function migrateSlot(raw: unknown, fallbackPreset: string): SupplierSlot | null {
  if (!isRecord(raw) || typeof raw.id !== "string") return null;
  const presetId =
    typeof raw.presetId === "string" ? raw.presetId : fallbackPreset;
  const policyRaw = isRecord(raw.policy) ? raw.policy : {};
  const preset = getPreset(presetId);
  const policy = {
    ...policyFromPreset(preset, raw.id),
    ...policyRaw,
    warehouseId: raw.id,
    name: typeof raw.name === "string" ? raw.name : preset.name,
    paymentTerm: ((): PaymentTerm => {
      const term = policyRaw.paymentTerm;
      if (term === "prepaid" || term === 7 || term === 14 || term === 30 || term === 60) {
        return term;
      }
      return 14;
    })(),
    creditLimitGrosze:
      typeof policyRaw.creditLimitGrosze === "number"
        ? policyRaw.creditLimitGrosze
        : 5_000_000,
  };
  return {
    id: raw.id,
    name: typeof raw.name === "string" ? raw.name : preset.name,
    presetId,
    policy,
    offers: Array.isArray(raw.offers) ? (raw.offers as ImportedOffer[]) : [],
    source: typeof raw.source === "string" ? raw.source : null,
  };
}

function migrateLegacyAlfaBeta(raw: Record<string, unknown>): SupplierSlot[] {
  const policyAlfa = isRecord(raw.policyAlfa) ? raw.policyAlfa : {};
  const policyBeta = isRecord(raw.policyBeta) ? raw.policyBeta : {};
  const alfa = createSupplierSlot(
    "custom",
    Array.isArray(raw.alfaOffers) ? (raw.alfaOffers as ImportedOffer[]) : [],
    typeof raw.alfaSource === "string" ? raw.alfaSource : null,
    "alfa",
  );
  const beta = createSupplierSlot(
    "custom",
    Array.isArray(raw.betaOffers) ? (raw.betaOffers as ImportedOffer[]) : [],
    typeof raw.betaSource === "string" ? raw.betaSource : null,
    "beta",
  );
  alfa.name = "Hurtownia Alfa";
  beta.name = "Hurtownia Beta";
  alfa.policy = {
    ...alfa.policy,
    ...policyAlfa,
    warehouseId: "alfa",
    name: "Hurtownia Alfa",
  };
  beta.policy = {
    ...beta.policy,
    ...policyBeta,
    warehouseId: "beta",
    name: "Hurtownia Beta",
  };
  return [alfa, beta];
}

function migrateProject(raw: unknown): ProjectRecord | null {
  if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.name !== "string") {
    return null;
  }
  const base = baseProject(raw.id, raw.name, {
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : nowIso(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : nowIso(),
  });
  const fromSlots = Array.isArray(raw.suppliers)
    ? raw.suppliers
        .map((item, index) => migrateSlot(item, index === 0 ? "tim" : "onninen"))
        .filter((item): item is SupplierSlot => item != null)
    : [];
  const suppliers =
    fromSlots.length >= MIN_SUPPLIERS
      ? fromSlots.slice(0, MAX_SUPPLIERS)
      : migrateLegacyAlfaBeta(raw);

  return {
    ...base,
    status:
      raw.status === "szkic" ||
      raw.status === "w trakcie" ||
      raw.status === "do weryfikacji" ||
      raw.status === "gotowy"
        ? raw.status
        : base.status,
    estimatedValueGrosze:
      typeof raw.estimatedValueGrosze === "number"
        ? raw.estimatedValueGrosze
        : 0,
    contractorName: typeof raw.contractorName === "string" ? raw.contractorName : "",
    contractorDetails:
      typeof raw.contractorDetails === "string" ? raw.contractorDetails : "",
    markupPercent: typeof raw.markupPercent === "number" ? raw.markupPercent : 20,
    vatRate: raw.vatRate === 8 || raw.vatRate === 23 ? raw.vatRate : 23,
    viewMode: raw.viewMode === "inwestorski" ? "inwestorski" : "zakupowy",
    offerValidDays: typeof raw.offerValidDays === "number" ? raw.offerValidDays : 14,
    suppliers,
    overrides:
      raw.overrides && typeof raw.overrides === "object"
        ? (raw.overrides as ProjectRecord["overrides"])
        : {},
    confirmedIds: Array.isArray(raw.confirmedIds)
      ? (raw.confirmedIds as string[])
      : [],
    liquidityPriority: raw.liquidityPriority === true,
    inStockOnly: raw.inStockOnly === true,
    aggressiveSubstitutions: raw.aggressiveSubstitutions === true,
    appliedSubstitutions:
      raw.appliedSubstitutions && typeof raw.appliedSubstitutions === "object"
        ? (raw.appliedSubstitutions as ProjectRecord["appliedSubstitutions"])
        : {},
  };
}

function isWorkspace(value: unknown): value is { activeProjectId: string; projects: unknown[] } {
  if (!isRecord(value)) return false;
  return (
    typeof value.activeProjectId === "string" && Array.isArray(value.projects)
  );
}

export function loadWorkspace(storage: KeyValueStore = defaultStorage()): Workspace | null {
  try {
    const raw = storage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isWorkspace(parsed) || parsed.projects.length === 0) return null;
    const projects = parsed.projects
      .map(migrateProject)
      .filter((item): item is ProjectRecord => item != null);
    if (projects.length === 0) return null;
    const activeProjectId = projects.some((item) => item.id === parsed.activeProjectId)
      ? parsed.activeProjectId
      : projects[0].id;
    return { version: 2, activeProjectId, projects };
  } catch {
    return null;
  }
}

export function saveWorkspace(
  workspace: Workspace,
  storage: KeyValueStore = defaultStorage(),
): void {
  storage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify({ ...workspace, version: 2 }));
}

export function ensureProjectSuppliers(project: ProjectRecord): ProjectRecord {
  if (Array.isArray(project.suppliers) && project.suppliers.length >= MIN_SUPPLIERS) {
    return project;
  }
  return {
    ...project,
    suppliers: defaultSupplierSlots(),
  };
}

export function activeProject(workspace: Workspace): ProjectRecord {
  const found =
    workspace.projects.find((project) => project.id === workspace.activeProjectId) ??
    workspace.projects[0];
  if (!found) return createStarterProject();
  return ensureProjectSuppliers(found);
}

export function replaceActiveProject(
  workspace: Workspace,
  next: ProjectRecord,
): Workspace {
  return {
    ...workspace,
    projects: workspace.projects.map((project) =>
      project.id === workspace.activeProjectId ? next : project,
    ),
  };
}

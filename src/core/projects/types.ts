import type { ImportedOffer } from "@/core/import/importedOffer";
import type { AppliedSubstitution } from "@/core/matching/substitutions";
import type { SupplierPolicy, WarehouseId } from "@/core/optimizer/basketEngine";
import type { VatRate, ViewMode } from "@/core/pricing/clientPricing";

export type ProjectStatus = "szkic" | "w trakcie" | "do weryfikacji" | "gotowy";

export type SupplierSlot = {
  id: WarehouseId;
  name: string;
  presetId: string;
  policy: SupplierPolicy;
  offers: ImportedOffer[];
  source: string | null;
};

export type ProjectRecord = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  estimatedValueGrosze: number;
  contractorName: string;
  contractorDetails: string;
  markupPercent: number;
  vatRate: VatRate;
  viewMode: ViewMode;
  offerValidDays: number;
  suppliers: SupplierSlot[];
  overrides: Record<string, WarehouseId>;
  confirmedIds: string[];
  liquidityPriority: boolean;
  inStockOnly: boolean;
  aggressiveSubstitutions: boolean;
  appliedSubstitutions: Record<string, AppliedSubstitution>;
};

export type Workspace = {
  version: 2;
  activeProjectId: string;
  projects: ProjectRecord[];
};

export type ProjectSummary = {
  id: string;
  name: string;
  updatedAt: string;
  status: ProjectStatus;
  estimatedValueGrosze: number;
  lineCount: number;
};

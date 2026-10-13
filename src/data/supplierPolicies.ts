import {
  DEFAULT_MIN_ORDER_GROSZE,
  type PaymentTerm,
  type SupplierPolicy,
} from "@/core/optimizer/basketEngine";

export type SupplierPresetId =
  | "tim"
  | "onninen"
  | "bims"
  | "tadmar"
  | "custom";

export type SupplierPreset = {
  id: SupplierPresetId;
  name: string;
  freeShippingThresholdGrosze: number;
  shippingCostGrosze: number;
  paymentTerm: PaymentTerm;
  creditLimitGrosze: number;
};

export const SUPPLIER_PRESETS: SupplierPreset[] = [
  {
    id: "tim",
    name: "TIM.pl",
    freeShippingThresholdGrosze: 50_000,
    shippingCostGrosze: 2_900,
    paymentTerm: 14,
    creditLimitGrosze: 5_000_000,
  },
  {
    id: "onninen",
    name: "Onninen",
    freeShippingThresholdGrosze: 150_000,
    shippingCostGrosze: 14_000,
    paymentTerm: 14,
    creditLimitGrosze: 5_000_000,
  },
  {
    id: "bims",
    name: "Bims Plus",
    freeShippingThresholdGrosze: 200_000,
    shippingCostGrosze: 18_000,
    paymentTerm: 14,
    creditLimitGrosze: 5_000_000,
  },
  {
    id: "tadmar",
    name: "Tadmar",
    freeShippingThresholdGrosze: 100_000,
    shippingCostGrosze: 9_900,
    paymentTerm: 14,
    creditLimitGrosze: 5_000_000,
  },
  {
    id: "custom",
    name: "Hurtownia własna / inna",
    freeShippingThresholdGrosze: 150_000,
    shippingCostGrosze: 15_000,
    paymentTerm: 14,
    creditLimitGrosze: 5_000_000,
  },
];

export function getPreset(id: string): SupplierPreset {
  return (
    SUPPLIER_PRESETS.find((preset) => preset.id === id) ??
    SUPPLIER_PRESETS[SUPPLIER_PRESETS.length - 1]
  );
}

export function policyFromPreset(
  preset: SupplierPreset,
  warehouseId: string,
): SupplierPolicy {
  return {
    warehouseId,
    name: preset.name,
    presetId: preset.id,
    freeShippingThresholdGrosze: preset.freeShippingThresholdGrosze,
    shippingCostGrosze: preset.shippingCostGrosze,
    paymentTerm: preset.paymentTerm,
    creditLimitGrosze: preset.creditLimitGrosze,
    minOrderGrosze: DEFAULT_MIN_ORDER_GROSZE,
  };
}

export const PAYMENT_TERM_OPTIONS: Array<{
  id: NonNullable<SupplierPolicy["paymentTerm"]>;
  label: string;
}> = [
  { id: "prepaid", label: "Przedpłata / Gotówka" },
  { id: 7, label: "7 dni" },
  { id: 14, label: "14 dni" },
  { id: 30, label: "30 dni" },
  { id: 60, label: "60 dni" },
];

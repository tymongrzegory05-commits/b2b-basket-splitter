/** Jedyna dozwolona konwersja float → grosze, na granicy wejścia. */
export function toGrosze(zloty: number): number {
  return Math.round(zloty * 100);
}

export function ceilToPack(demand: number, packSize: number): number {
  if (!Number.isInteger(demand) || demand < 0) {
    throw new Error("Zapotrzebowanie musi być nieujemną liczbą całkowitą");
  }
  if (!Number.isInteger(packSize) || packSize <= 0) {
    throw new Error("packSize musi być dodatnią liczbą całkowitą");
  }
  if (demand === 0) return 0;
  return Math.ceil(demand / packSize) * packSize;
}

export function shippingCostGrosze(
  towarGrosze: number,
  freeShippingThresholdGrosze: number,
  shippingCostGroszeValue: number,
): number {
  if (towarGrosze <= 0) return 0;
  if (towarGrosze >= freeShippingThresholdGrosze) return 0;
  return shippingCostGroszeValue;
}

/** Ułamek jako dziesiąte części procenta (128 = 12,8%). */
export function ratioToTenthsPercent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part * 1000) / whole);
}

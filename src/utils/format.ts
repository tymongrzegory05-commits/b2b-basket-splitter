export function formatGrosze(grosze: number): string {
  const negative = grosze < 0;
  const abs = Math.abs(grosze);
  const zloty = Math.trunc(abs / 100);
  const gr = abs % 100;
  const grouped = String(zloty).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return `${negative ? "−" : ""}${grouped},${String(gr).padStart(2, "0")}\u00A0zł`;
}

/** 128 → "12,8" (dziesiąte części procenta z arytmetyki całkowitej). */
export function formatPromile(tenthsPercent: number): string {
  const negative = tenthsPercent < 0;
  const abs = Math.abs(tenthsPercent);
  const whole = Math.trunc(abs / 10);
  const frac = abs % 10;
  return `${negative ? "−" : ""}${whole},${frac}`;
}

export function formatQty(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
}

export function formatDatePl(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${date.getFullYear()}`;
}

export function addDaysIso(iso: string, days: number): string {
  const date = new Date(iso);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

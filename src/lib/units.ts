/** Unit conversion helpers for the pharmacology engine. */
export type TimeUnit = "minutos" | "horas" | "dias" | "semanas";

export function unitToMinutes(value: number | null | undefined, unit?: string | null): number {
  if (value == null || isNaN(Number(value))) return 0;
  const u = (unit ?? "minutos").toLowerCase();
  const v = Number(value);
  if (u.startsWith("min")) return v;
  if (u.startsWith("h")) return v * 60;
  if (u.startsWith("d")) return v * 60 * 24;
  if (u.startsWith("sem")) return v * 60 * 24 * 7;
  return v;
}

export function rangeMinutes(min?: number | null, max?: number | null, unit?: string | null) {
  const a = unitToMinutes(min ?? max ?? 0, unit);
  const b = unitToMinutes(max ?? min ?? 0, unit);
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const mid = (lo + hi) / 2;
  return { lo, hi, mid, hasRange: lo !== hi };
}

export function formatRange(min?: number | null, max?: number | null, unit?: string | null) {
  if (min == null && max == null) return "—";
  const u = unit ?? "";
  if (min != null && max != null && min !== max) return `${min}–${max} ${u}`;
  return `${min ?? max} ${u}`;
}

export const TIME_UNITS: TimeUnit[] = ["minutos", "horas", "dias", "semanas"];
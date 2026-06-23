export type CurvePhase = "pre-onset" | "subida" | "pico" | "platô" | "descida" | "residual" | "washout" | "steady-state";

export interface AdvancedDoseInput {
  id?: string;
  substance_name?: string | null;
  substanceName?: string | null;
  actual_time?: string | null;
  actualTime?: string | Date | null;
  dose_amount?: number | string | null;
  doseAmount?: number | string | null;
  dose_unit?: string | null;
  formulation_id?: string | null;
  formulation_name?: string | null;
  route?: string | null;
  log_type?: string | null;
  stomach?: string | null;
  stomach_fullness_0_10?: number | string | null;
  meal_fat_level_0_10?: number | string | null;
  caffeine_near_dose_mg?: number | string | null;
  sleep_deprivation_at_dose_0_10?: number | string | null;
  substances?: any;
  substance_formulations?: any;
  formulation?: any;
  pk?: any;
  releaseType?: string | null;
}

export interface AdvancedCurveSeries {
  key: string;
  canonicalKey: string;
  label: string;
  color: string;
  doseCount: number;
  totalDose?: number | null;
  unit?: string | null;
  nowValue: number;
  nowPhase: CurvePhase;
  notes: string[];
}

export interface AdvancedCurveResult {
  points: Record<string, any>[];
  series: AdvancedCurveSeries[];
  now: { total: number; phase: CurvePhase };
  notes: string[];
  generatedAt: string;
}

const PALETTE = [
  "#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#be123c", "#4f46e5", "#65a30d", "#7c2d12",
];

function num(v: any): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function strip(s: string) {
  return String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export function canonicalSubstanceKey(name?: string | null): string {
  const n0 = strip(name ?? "");
  const n = n0.includes("→") ? strip(n0.split("→").pop() ?? n0) : n0;
  if (/lyberdia|venvanse|juneve|vyvanse|elvanse|lisdex|dimesilato de lisdexanfetamina/.test(n)) return "lisdexanfetamina";
  if (/ritalina|concerta|foq|metilfen|methylphenidate/.test(n)) return "metilfenidato";
  if (/rivotril|klonopin|clonaz/.test(n)) return "clonazepam";
  if (/atensina|catapres|kapvay|clonidin/.test(n)) return "clonidina";
  if (/atentah|strattera|atomox/.test(n)) return "atomoxetina";
  if (/vurtuoso|brintellix|trintellix|vortiox/.test(n)) return "vortioxetina";
  if (/depak|depakene|torval|valpakine|dival|valpro|acido valproico/.test(n)) return "valproato";
  if (/bup|wellbutrin|zetron/.test(n)) return "bupropiona";
  if (/cafeina|caffeine/.test(n)) return "cafeína";
  if (/alcool|alcohol|etanol/.test(n)) return "álcool";
  if (/cocaina|cocaine/.test(n)) return "cocaína";
  if (/codeina|morfina|oxicodona|fentanil|metadona|buprenorfina|tramadol/.test(n)) return n;
  return n || "substância";
}

function displayNameForKey(key: string, raw?: string | null) {
  const clean = String(raw ?? "").trim();
  if (clean && !strip(clean).includes(key)) return `${clean} → ${key}`;
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function slug(key: string, index: number) {
  return `s${index}_${strip(key).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
}

function unitToMinutes(value: number | null | undefined, unit?: string | null) {
  if (value == null || !Number.isFinite(value)) return null;
  const u = strip(unit ?? "minutos");
  if (u.startsWith("dia")) return value * 24 * 60;
  if (u.startsWith("hora") || u === "h") return value * 60;
  return value;
}

function avgField(obj: any, minName: string, maxName: string, unitName?: string, fallback?: number) {
  const min = num(obj?.[minName]);
  const max = num(obj?.[maxName]);
  const unit = unitName ? obj?.[unitName] : null;
  if (min != null && max != null) return unitToMinutes((min + max) / 2, unit) ?? fallback ?? 0;
  if (min != null) return unitToMinutes(min, unit) ?? fallback ?? 0;
  if (max != null) return unitToMinutes(max, unit) ?? fallback ?? 0;
  return fallback ?? 0;
}

interface ResolvedCurveParams {
  onsetMin: number;
  peakMin: number;
  plateauEndMin: number;
  durationMin: number;
  halfLifeMin: number;
  tailEndMin: number;
  hasSteadyState: boolean;
  model: string;
  notes: string[];
}

function fallbackParams(key: string): ResolvedCurveParams {
  const base: Record<string, Partial<ResolvedCurveParams>> = {
    lisdexanfetamina: { onsetMin: 75, peakMin: 255, plateauEndMin: 480, durationMin: 840, halfLifeMin: 630, tailEndMin: 1440, model: "pró-fármaco oral com bioativação hematológica" },
    metilfenidato: { onsetMin: 25, peakMin: 90, plateauEndMin: 180, durationMin: 300, halfLifeMin: 180, tailEndMin: 480, model: "estimulante IR/LA/OROS variável" },
    atomoxetina: { onsetMin: 60, peakMin: 120, plateauEndMin: 720, durationMin: 1440, halfLifeMin: 320, tailEndMin: 4320, hasSteadyState: true, model: "NRI uso contínuo" },
    vortioxetina: { onsetMin: 240, peakMin: 540, plateauEndMin: 1440, durationMin: 1440, halfLifeMin: 3960, tailEndMin: 20160, hasSteadyState: true, model: "antidepressivo de meia-vida longa" },
    clonazepam: { onsetMin: 45, peakMin: 150, plateauEndMin: 480, durationMin: 720, halfLifeMin: 2400, tailEndMin: 4320, hasSteadyState: true, model: "benzodiazepínico sedativo longo" },
    clonidina: { onsetMin: 45, peakMin: 90, plateauEndMin: 360, durationMin: 720, halfLifeMin: 720, tailEndMin: 1440, hasSteadyState: true, model: "antiadrenérgico intermediário" },
    valproato: { onsetMin: 240, peakMin: 720, plateauEndMin: 1440, durationMin: 1440, halfLifeMin: 720, tailEndMin: 4320, hasSteadyState: true, model: "estabilizador ER/steady-state" },
    cafeína: { onsetMin: 15, peakMin: 60, plateauEndMin: 150, durationMin: 360, halfLifeMin: 300, tailEndMin: 720, model: "metilxantina" },
    álcool: { onsetMin: 10, peakMin: 60, plateauEndMin: 180, durationMin: 360, halfLifeMin: 90, tailEndMin: 600, model: "depressor SNC" },
    cocaína: { onsetMin: 2, peakMin: 20, plateauEndMin: 45, durationMin: 90, halfLifeMin: 60, tailEndMin: 240, model: "estimulante rápido" },
  };
  const v = base[key] ?? { onsetMin: 30, peakMin: 120, plateauEndMin: 240, durationMin: 480, halfLifeMin: 360, tailEndMin: 720, model: "conservador" };
  return {
    onsetMin: v.onsetMin ?? 30,
    peakMin: v.peakMin ?? 120,
    plateauEndMin: v.plateauEndMin ?? 240,
    durationMin: v.durationMin ?? 480,
    halfLifeMin: v.halfLifeMin ?? 360,
    tailEndMin: v.tailEndMin ?? 720,
    hasSteadyState: !!v.hasSteadyState,
    model: v.model ?? "conservador",
    notes: [],
  };
}

function resolveParams(dose: AdvancedDoseInput): ResolvedCurveParams {
  const rawName = dose.substance_name ?? dose.substanceName ?? dose.substances?.name;
  const key = canonicalSubstanceKey(rawName);
  const p = fallbackParams(key);
  const fm = dose.substance_formulations ?? dose.formulation ?? null;
  const pk = dose.pk ?? dose.substances?.pk ?? null;
  const source = fm ?? pk ?? dose.substances ?? null;
  if (source) {
    p.onsetMin = avgField(source, "onset_min", "onset_max", "onset_unit", p.onsetMin);
    p.peakMin = avgField(source, "peak_min", "peak_max", "peak_unit", p.peakMin);
    p.plateauEndMin = avgField(source, "plateau_min", "plateau_max", "plateau_unit", p.plateauEndMin);
    p.durationMin = avgField(source, "duration_min", "duration_max", "duration_unit", p.durationMin);
    p.halfLifeMin = avgField(source, "half_life_min", "half_life_max", "half_life_unit", p.halfLifeMin);
    p.tailEndMin = avgField(source, "tail_min", "tail_max", "tail_unit", p.tailEndMin);
    p.hasSteadyState = Boolean(source.has_steady_state ?? p.hasSteadyState);
    p.model = source.curve_model ?? source.default_curve_model ?? source.release_curve_type ?? p.model;
  }
  if (p.peakMin <= p.onsetMin) p.peakMin = p.onsetMin + 30;
  if (p.plateauEndMin < p.peakMin) p.plateauEndMin = p.peakMin;
  if (p.durationMin < p.plateauEndMin) p.durationMin = p.plateauEndMin + Math.max(120, p.halfLifeMin * 0.5);
  if (p.tailEndMin < p.durationMin) p.tailEndMin = p.durationMin + Math.max(240, p.halfLifeMin * 0.5);

  const stomach = strip(dose.stomach ?? "");
  const fullness = num(dose.stomach_fullness_0_10) ?? 0;
  const fat = num(dose.meal_fat_level_0_10) ?? 0;
  if (stomach.includes("cheio") || stomach.includes("gordurosa") || fullness >= 7 || fat >= 7) {
    const delay = key === "lisdexanfetamina" ? 60 : 30;
    p.onsetMin += delay;
    p.peakMin += delay;
    p.plateauEndMin += Math.round(delay * 0.7);
    p.durationMin += Math.round(delay * 0.4);
    p.notes.push(`Alimento/estômago cheio deslocou onset/pico em ~${delay} min.`);
  }
  if (key === "lisdexanfetamina") p.notes.push("Pró-fármaco: curva depende de absorção intestinal + bioativação hematológica, não de matriz XR clássica.");
  if (p.hasSteadyState) p.notes.push("Fármaco com componente de steady-state: pico plasmático não equivale necessariamente ao pico clínico longitudinal.");
  return p;
}

function smoothstep(x: number) {
  const z = Math.max(0, Math.min(1, x));
  return z * z * (3 - 2 * z);
}

function singleDoseValue(dtMin: number, p: ResolvedCurveParams): { value: number; phase: CurvePhase } {
  if (dtMin < 0) return { value: 0, phase: "pre-onset" };
  if (dtMin < p.onsetMin) {
    const v = 5 * smoothstep(dtMin / Math.max(1, p.onsetMin));
    return { value: v, phase: "pre-onset" };
  }
  if (dtMin < p.peakMin) {
    const v = 5 + 95 * smoothstep((dtMin - p.onsetMin) / Math.max(1, p.peakMin - p.onsetMin));
    return { value: v, phase: "subida" };
  }
  if (dtMin <= p.plateauEndMin) return { value: 100, phase: "pico" };
  if (dtMin <= p.durationMin) {
    const decay = Math.pow(0.5, (dtMin - p.plateauEndMin) / Math.max(1, p.halfLifeMin));
    const v = Math.max(12, 100 * decay);
    return { value: v, phase: v > 55 ? "descida" : "residual" };
  }
  if (dtMin <= p.tailEndMin) {
    const start = Math.max(8, 100 * Math.pow(0.5, (p.durationMin - p.plateauEndMin) / Math.max(1, p.halfLifeMin)));
    const v = start * (1 - (dtMin - p.durationMin) / Math.max(1, p.tailEndMin - p.durationMin));
    return { value: Math.max(0, v), phase: v > 10 ? "residual" : "washout" };
  }
  return { value: 0, phase: "washout" };
}

function phaseForTotal(value: number, previous: number): CurvePhase {
  if (value < 3) return "pre-onset";
  if (value > previous + 2) return "subida";
  if (value >= 85) return "pico";
  if (Math.abs(value - previous) <= 2 && value >= 30) return "platô";
  if (value > 10) return "descida";
  return "residual";
}

export function buildAdvancedCurve(doses: AdvancedDoseInput[], options: { windowHours?: number; stepMin?: number; now?: Date } = {}): AdvancedCurveResult {
  const clean = doses
    .map((d) => ({ ...d, _time: new Date((d.actual_time ?? d.actualTime ?? "") as any).getTime() }))
    .filter((d) => Number.isFinite(d._time));
  const windowHours = options.windowHours ?? 48;
  const stepMin = options.stepMin ?? 15;
  const now = options.now ?? new Date();
  const end = now.getTime() + 4 * 3600_000;
  const start = end - windowHours * 3600_000;
  const groups = new Map<string, AdvancedDoseInput[]>();
  for (const d of clean) {
    const key = canonicalSubstanceKey(d.substance_name ?? d.substanceName ?? d.substances?.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }
  const series: AdvancedCurveSeries[] = Array.from(groups.entries()).map(([key, ds], idx) => ({
    key: slug(key, idx),
    canonicalKey: key,
    label: displayNameForKey(key, ds[0]?.substance_name ?? ds[0]?.substanceName ?? ds[0]?.substances?.name),
    color: PALETTE[idx % PALETTE.length],
    doseCount: ds.length,
    totalDose: ds.reduce((a, d) => a + (num(d.dose_amount ?? d.doseAmount) ?? 0), 0),
    unit: ds.find((d) => d.dose_unit)?.dose_unit ?? null,
    nowValue: 0,
    nowPhase: "pre-onset",
    notes: Array.from(new Set(ds.flatMap((d) => resolveParams(d).notes))),
  }));
  const points: Record<string, any>[] = [];
  let prevTotal = 0;
  for (let t = start; t <= end; t += stepMin * 60_000) {
    const row: Record<string, any> = {
      timestamp: t,
      iso: new Date(t).toISOString(),
      label: new Date(t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
    };
    let total = 0;
    for (const s of series) {
      const ds = groups.get(s.canonicalKey) ?? [];
      let sum = 0;
      let dominantPhase: CurvePhase = "pre-onset";
      let maxRaw = 0;
      for (const d of ds) {
        const p = resolveParams(d);
        const dt = (t - new Date((d.actual_time ?? d.actualTime ?? "") as any).getTime()) / 60_000;
        const r = singleDoseValue(dt, p);
        sum += r.value;
        if (r.value > maxRaw) {
          maxRaw = r.value;
          dominantPhase = r.phase;
        }
      }
      const v = Math.min(100, sum);
      row[s.key] = Math.round(v * 10) / 10;
      row[`${s.key}__phase`] = dominantPhase;
      row[`${s.key}__activeDoses`] = ds.length;
      total += v;
    }
    row.total = Math.round(Math.min(100, total) * 10) / 10;
    row.total__phase = phaseForTotal(row.total, prevTotal);
    prevTotal = row.total;
    points.push(row);
  }
  const closest = points.reduce((a, b) => Math.abs(Number(b.timestamp) - now.getTime()) < Math.abs(Number(a.timestamp) - now.getTime()) ? b : a, points[0] ?? { total: 0, total__phase: "pre-onset" });
  for (const s of series) {
    s.nowValue = Number(closest?.[s.key] ?? 0);
    s.nowPhase = closest?.[`${s.key}__phase`] ?? "pre-onset";
  }
  const notes: string[] = [];
  if (clean.some((d) => String(d.log_type ?? "").toLowerCase().includes("redose"))) notes.push("Há dose marcada como redose/uso problemático — interpretar motivação e fase da curva.");
  if (clean.some((d) => (num(d.caffeine_near_dose_mg) ?? 0) >= 150)) notes.push("Cafeína ≥150 mg próxima de dose — possível ruído autonômico.");
  if (clean.some((d) => (num(d.sleep_deprivation_at_dose_0_10) ?? 0) >= 6)) notes.push("Privação de sono elevada registrada — curva subjetiva pode divergir da curva teórica.");
  for (const [key, ds] of groups.entries()) {
    const sorted = [...ds].sort((a, b) => new Date((a.actual_time ?? a.actualTime ?? "") as any).getTime() - new Date((b.actual_time ?? b.actualTime ?? "") as any).getTime());
    for (let i = 1; i < sorted.length; i++) {
      const h = (new Date((sorted[i].actual_time ?? sorted[i].actualTime ?? "") as any).getTime() - new Date((sorted[i - 1].actual_time ?? sorted[i - 1].actualTime ?? "") as any).getTime()) / 36e5;
      const activeH = key === "lisdexanfetamina" ? 14 : key === "clonazepam" ? 12 : key === "valproato" ? 24 : 8;
      if (h > 0 && h <= activeH) notes.push(`${displayNameForKey(key)}: duas doses em ${h.toFixed(1)} h — sobreposição dentro da janela funcional.`);
    }
  }
  return { points, series, now: { total: Number(closest.total ?? 0), phase: closest.total__phase ?? "pre-onset" }, notes: Array.from(new Set(notes)), generatedAt: new Date().toISOString() };
}

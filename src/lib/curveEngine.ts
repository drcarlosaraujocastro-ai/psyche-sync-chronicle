/**
 * Engine de curvas PK/PD relativas (0–100), não é concentração sérica.
 * Usa os campos avançados de `substances` (min/max/unidade) quando disponíveis.
 */
import { rangeMinutes } from "./units";

export type CurveModel =
  | "immediate_release" | "delayed_release" | "extended_release" | "sustained_release" | "controlled_release"
  | "xr_er_xl" | "la" | "oros" | "prodrug"
  | "sedative_short" | "sedative_intermediate" | "sedative_long"
  | "steady_state_daily" | "steady_state_prolonged" | "progressive_accumulation" | "long_half_life"
  | "transdermal" | "depot" | "sublingual" | "intranasal" | "inhaled" | "liquid_oral"
  | "prn_acute" | "continuous_use" | "intermittent_use"
  | "biphasic" | "multiphasic" | "food_dependent" | "active_metabolite_dominant"
  | "unknown_conservative";

export type Phase = "pre-onset" | "subida" | "pico" | "platô" | "descida" | "residual" | "washout" | "steady-state";

export interface AdvDoseLog {
  id?: string;
  substance_id?: string | null;
  substance_name: string;
  actual_time: string | Date;
  dose_amount?: number | null;
  dose_unit?: string | null;
  formulation?: string | null;
  stomach?: string | null;
  stomach_fullness_0_10?: number | null;
  meal_fat_level_0_10?: number | null;
  minutes_since_last_meal?: number | null;
  caffeine_near_dose_mg?: number | null;
  sleep_deprivation_at_dose_0_10?: number | null;
}

export interface AdvSubstance {
  id?: string;
  name: string;
  default_curve_model?: string | null;
  onset_min_value?: number | null; onset_max_value?: number | null; onset_unit?: string | null;
  peak_min_value?: number | null; peak_max_value?: number | null; peak_unit?: string | null;
  plateau_min_value?: number | null; plateau_max_value?: number | null; plateau_unit?: string | null;
  offset_min_value?: number | null; offset_max_value?: number | null; offset_unit?: string | null;
  total_duration_min_value?: number | null; total_duration_max_value?: number | null; total_duration_unit?: string | null;
  half_life_min_value?: number | null; half_life_max_value?: number | null; half_life_unit?: string | null;
  has_steady_state?: boolean | null;
  steady_state_min_value?: number | null; steady_state_max_value?: number | null; steady_state_unit?: string | null;
  has_tail?: boolean | null;
  tail_min_value?: number | null; tail_max_value?: number | null; tail_unit?: string | null;
  food_delay_onset_minutes_min?: number | null; food_delay_onset_minutes_max?: number | null;
  clinical_effect_profile?: Record<string, number> | null;
  adverse_effect_profile?: Record<string, number> | null;
}

export interface SessionContext {
  sleepHours?: number | null;
  sleepDeprivation0_10?: number | null;
  caffeineMg?: number | null;
  alcoholToday?: boolean | null;
  substanceUseToday?: boolean | null;
}

export interface CurvePoint { t: number; v: number; phase: Phase; band?: { lo: number; hi: number } }
export interface DoseCurve {
  points: CurvePoint[];
  now: { value: number; phase: Phase };
  confidence: "baixa" | "moderada" | "alta";
  notes: string[];
  overlapDetected: boolean;
  model: CurveModel;
}

export function resolveCurveModel(sub?: AdvSubstance | null, formulation?: string | null): CurveModel {
  const m = (sub?.default_curve_model ?? "").toLowerCase() as CurveModel;
  if (m) return m;
  const f = (formulation ?? "").toLowerCase();
  if (!f) return "unknown_conservative";
  if (f.includes("oros")) return "oros";
  if (f.includes("xl") || f.includes("xr") || f.includes("er")) return "xr_er_xl";
  if (f.includes("la")) return "la";
  if (f.includes("pró-fármaco") || f.includes("prodrug")) return "prodrug";
  if (f.includes("sublingual")) return "sublingual";
  if (f.includes("intranasal")) return "intranasal";
  if (f.includes("inalat")) return "inhaled";
  if (f.includes("transderm")) return "transdermal";
  if (f.includes("depot")) return "depot";
  if (f.includes("steady")) return "steady_state_daily";
  if (f.includes("sedativo longo")) return "sedative_long";
  if (f.includes("sedativo curto")) return "sedative_short";
  return "immediate_release";
}

function modelDefaults(model: CurveModel) {
  // tempos default em minutos, usados se substância não tiver dados
  switch (model) {
    case "prodrug": return { onset: 75, peak: 240, plateau: 180, duration: 720, halfLife: 660 };
    case "oros": return { onset: 90, peak: 420, plateau: 300, duration: 720, halfLife: 240 };
    case "xr_er_xl": return { onset: 90, peak: 300, plateau: 240, duration: 600, halfLife: 480 };
    case "la": return { onset: 60, peak: 240, plateau: 180, duration: 480, halfLife: 360 };
    case "immediate_release": return { onset: 30, peak: 90, plateau: 60, duration: 240, halfLife: 180 };
    case "sedative_short": return { onset: 30, peak: 60, plateau: 60, duration: 240, halfLife: 240 };
    case "sedative_intermediate": return { onset: 30, peak: 90, plateau: 120, duration: 480, halfLife: 480 };
    case "sedative_long": return { onset: 45, peak: 120, plateau: 180, duration: 720, halfLife: 1800 };
    case "long_half_life": return { onset: 60, peak: 240, plateau: 120, duration: 1440, halfLife: 4200 };
    case "steady_state_daily": return { onset: 120, peak: 360, plateau: 720, duration: 1440, halfLife: 1440 };
    case "transdermal": return { onset: 360, peak: 720, plateau: 720, duration: 1440, halfLife: 1440 };
    case "depot": return { onset: 1440, peak: 4320, plateau: 10080, duration: 20160, halfLife: 10080 };
    case "sublingual": return { onset: 15, peak: 60, plateau: 90, duration: 360, halfLife: 360 };
    case "intranasal": return { onset: 5, peak: 20, plateau: 30, duration: 90, halfLife: 60 };
    case "inhaled": return { onset: 1, peak: 5, plateau: 10, duration: 60, halfLife: 60 };
    case "biphasic": return { onset: 30, peak: 90, plateau: 60, duration: 480, halfLife: 360 };
    default: return { onset: 45, peak: 120, plateau: 60, duration: 360, halfLife: 240 };
  }
}

function resolveTimes(sub: AdvSubstance | null | undefined, model: CurveModel) {
  const def = modelDefaults(model);
  const onset = sub ? rangeMinutes(sub.onset_min_value, sub.onset_max_value, sub.onset_unit) : null;
  const peak = sub ? rangeMinutes(sub.peak_min_value, sub.peak_max_value, sub.peak_unit) : null;
  const plateau = sub ? rangeMinutes(sub.plateau_min_value, sub.plateau_max_value, sub.plateau_unit) : null;
  const dur = sub ? rangeMinutes(sub.total_duration_min_value, sub.total_duration_max_value, sub.total_duration_unit) : null;
  const hl = sub ? rangeMinutes(sub.half_life_min_value, sub.half_life_max_value, sub.half_life_unit) : null;
  return {
    onset: onset?.mid || def.onset,
    peak: peak?.mid || def.peak,
    plateau: plateau?.mid || def.plateau,
    duration: dur?.mid || def.duration,
    halfLife: hl?.mid || def.halfLife,
    band: { onset, peak, plateau, dur, hl },
  };
}

export function estimateFoodDelay(dose: AdvDoseLog, sub?: AdvSubstance | null): number {
  const fullness = dose.stomach_fullness_0_10 ?? 0;
  const fat = dose.meal_fat_level_0_10 ?? 0;
  let delay = 0;
  const stomach = (dose.stomach ?? "").toLowerCase();
  if (stomach.includes("cheio")) delay += 20;
  if (stomach.includes("gordurosa")) delay += 30;
  delay += fullness * 3;
  delay += fat * 4;
  const subRange = sub ? [sub.food_delay_onset_minutes_min ?? 0, sub.food_delay_onset_minutes_max ?? 0] : [0, 0];
  const subMid = (subRange[0] + subRange[1]) / 2;
  if (subMid > 0 && delay > 0) delay = Math.max(delay, subMid);
  return Math.min(delay, 90);
}

export function estimateCaffeineModifier(dose: AdvDoseLog): number {
  const c = dose.caffeine_near_dose_mg ?? 0;
  if (c <= 0) return 0;
  // 0–0.15 boost extra-autonômico
  return Math.min(0.15, c / 800);
}

function singleDose(dose: AdvDoseLog, sub: AdvSubstance | null | undefined, t0: number, t1: number, step: number): { t: number; v: number; bandLo: number; bandHi: number }[] {
  const model = resolveCurveModel(sub, dose.formulation);
  const times = resolveTimes(sub, model);
  const foodDelay = estimateFoodDelay(dose, sub);
  const cafBoost = estimateCaffeineModifier(dose);
  const start = new Date(dose.actual_time).getTime() + foodDelay * 60_000;
  const onsetMs = times.onset * 60_000;
  const peakMs = times.peak * 60_000;
  const plateauMs = times.plateau * 60_000;
  const halfLifeMs = times.halfLife * 60_000;
  // amplitude relativa
  let amp = 100 * (1 + cafBoost);
  amp = Math.min(100, amp);
  const pts: { t: number; v: number; bandLo: number; bandHi: number }[] = [];
  for (let t = t0; t <= t1; t += step * 60_000) {
    const dt = t - start;
    let v = 0;
    if (dt < 0) v = 0;
    else if (dt < onsetMs) v = amp * (dt / onsetMs) * 0.15;
    else if (dt < peakMs) {
      const x = (dt - onsetMs) / Math.max(peakMs - onsetMs, 1);
      v = amp * (0.15 + 0.85 / (1 + Math.exp(-7 * (x - 0.5))));
    } else if (dt < peakMs + plateauMs) {
      v = amp;
    } else {
      const decay = dt - (peakMs + plateauMs);
      v = amp * Math.pow(0.5, decay / halfLifeMs);
    }
    const band = v * 0.18;
    pts.push({ t, v, bandLo: Math.max(0, v - band), bandHi: Math.min(100, v + band) });
  }
  return pts;
}

function phaseAt(value: number, prev: number, hasSS: boolean): Phase {
  if (value < 3) return "pre-onset";
  if (value >= 80) return "pico";
  if (Math.abs(value - prev) < 1 && value > 25) return hasSS ? "steady-state" : "platô";
  if (value > prev) return "subida";
  if (value > 15) return "descida";
  return "residual";
}

export function buildDoseCurve(
  dose: AdvDoseLog,
  sub: AdvSubstance | null | undefined,
  ctx: SessionContext = {},
  options: { windowHours?: number; stepMin?: number; now?: Date } = {},
): DoseCurve {
  const windowHours = options.windowHours ?? 24;
  const stepMin = options.stepMin ?? 10;
  const now = options.now ?? new Date();
  const t1 = now.getTime() + 2 * 3_600_000;
  const t0 = t1 - windowHours * 3_600_000;
  const raw = singleDose(dose, sub, t0, t1, stepMin);
  const model = resolveCurveModel(sub, dose.formulation);
  const points: CurvePoint[] = [];
  let prev = 0;
  for (const p of raw) {
    const ph = phaseAt(p.v, prev, !!sub?.has_steady_state);
    points.push({ t: p.t, v: Number(p.v.toFixed(2)), phase: ph, band: { lo: p.bandLo, hi: p.bandHi } });
    prev = p.v;
  }
  const cur = points.reduce((acc, p) => Math.abs(p.t - now.getTime()) < Math.abs(acc.t - now.getTime()) ? p : acc, points[0]);
  const notes: string[] = ["Curva relativa, não é concentração sérica."];
  if (estimateFoodDelay(dose, sub) > 0) notes.push("Alimento atrasou onset estimado.");
  if ((dose.caffeine_near_dose_mg ?? 0) > 100) notes.push("Cafeína próxima da dose pode amplificar eixo autonômico.");
  if ((ctx.sleepHours ?? 99) < 5 || (dose.sleep_deprivation_at_dose_0_10 ?? 0) >= 6) {
    notes.push("Privação de sono altera interpretação da resposta.");
  }
  const confidence: DoseCurve["confidence"] =
    sub && sub.peak_min_value != null && sub.half_life_min_value != null ? "moderada" : "baixa";
  return { points, now: { value: cur?.v ?? 0, phase: cur?.phase ?? "pre-onset" }, confidence, notes, overlapDetected: false, model };
}

export function buildSubstanceCurve(
  doses: AdvDoseLog[],
  sub: AdvSubstance | null | undefined,
  ctx: SessionContext = {},
  options: { windowHours?: number; stepMin?: number; now?: Date } = {},
): DoseCurve {
  if (!doses.length) {
    return { points: [], now: { value: 0, phase: "pre-onset" }, confidence: "baixa", notes: [], overlapDetected: false, model: "unknown_conservative" };
  }
  const indiv = doses.map((d) => buildDoseCurve(d, sub, ctx, options));
  const len = indiv[0].points.length;
  const merged: CurvePoint[] = [];
  let prev = 0;
  let overlap = false;
  for (let i = 0; i < len; i++) {
    let sum = 0; let active = 0;
    let lo = 0; let hi = 0;
    for (const c of indiv) {
      const p = c.points[i];
      if (!p) continue;
      sum += p.v; if (p.v > 20) active++;
      lo += p.band?.lo ?? p.v; hi += p.band?.hi ?? p.v;
    }
    if (active > 1) overlap = true;
    const v = Math.min(100, sum);
    const ph = phaseAt(v, prev, !!sub?.has_steady_state);
    merged.push({ t: indiv[0].points[i].t, v: Number(v.toFixed(2)), phase: ph, band: { lo: Math.min(100, lo), hi: Math.min(100, hi) } });
    prev = v;
  }
  const now = options.now ?? new Date();
  const cur = merged.reduce((acc, p) => Math.abs(p.t - now.getTime()) < Math.abs(acc.t - now.getTime()) ? p : acc, merged[0]);
  const notes = [...indiv[0].notes];
  if (overlap) notes.push("Redose ou sobreposição durante fase ativa detectada — efeito funcional prolongado.");
  return {
    points: merged, now: { value: cur.v, phase: cur.phase },
    confidence: indiv[0].confidence, notes, overlapDetected: overlap, model: indiv[0].model,
  };
}

export function detectRedoseDuringActivePhase(doses: AdvDoseLog[], sub: AdvSubstance | null | undefined): boolean {
  if (doses.length < 2) return false;
  const sorted = [...doses].sort((a, b) => new Date(a.actual_time).getTime() - new Date(b.actual_time).getTime());
  const def = modelDefaults(resolveCurveModel(sub));
  const activeMs = (def.peak + def.plateau) * 60_000;
  for (let i = 1; i < sorted.length; i++) {
    const gap = new Date(sorted[i].actual_time).getTime() - new Date(sorted[i - 1].actual_time).getTime();
    if (gap < activeMs * 0.7) return true;
  }
  return false;
}
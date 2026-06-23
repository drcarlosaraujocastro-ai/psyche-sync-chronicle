import type { CurvePoint, DoseEvent, Phase, SubstancePK } from "./types";

/**
 * Curva relativa 0–100 (NÃO é concentração sérica).
 * Modelo: subida sigmoidal até pico, platô curto, decaimento exponencial
 * controlado por meia-vida. Alimento atrasa onset. Cafeína marca ruído
 * autonômico. Múltiplas doses são sobrepostas com cap em 100.
 */

const DEFAULT_PK: Required<SubstancePK> = {
  onset_min: 30,
  peak_min: 90,
  onset_days: 0,
  half_life_h: 6,
  duration_h: 8,
  onset_h: 0,
  peak_h: 0,
};

function resolvePK(dose: DoseEvent): Required<SubstancePK> {
  const pk = { ...DEFAULT_PK, ...(dose.pk ?? {}) };
  // formulações que dilatam onset/duração
  const rt = (dose.releaseType ?? "").toLowerCase();
  if (rt.includes("xl") || rt.includes("er") || rt.includes("longa") || rt.includes("sr")) {
    pk.onset_min = Math.max(pk.onset_min, 40);
    pk.peak_min = Math.max(pk.peak_min, 180);
    pk.duration_h = Math.max(pk.duration_h, 10);
  }
  if (rt.includes("transderm") || rt.includes("depot")) {
    pk.onset_min = pk.onset_h ? pk.onset_h * 60 : Math.max(pk.onset_min, 6 * 60);
    pk.peak_min = pk.peak_h ? pk.peak_h * 60 : Math.max(pk.peak_min, 12 * 60);
    pk.duration_h = Math.max(pk.duration_h, 24);
  }
  if (rt.includes("steady")) {
    pk.duration_h = Math.max(pk.duration_h, 24);
  }
  // estômago cheio atrasa onset/pico para orais
  const st = (dose.stomach ?? "").toLowerCase();
  if (st.includes("cheio") || st.includes("gordurosa")) {
    pk.onset_min += 20;
    pk.peak_min += 30;
  }
  return pk;
}

function singleDoseCurve(
  dose: DoseEvent,
  windowStartMs: number,
  windowEndMs: number,
  stepMin: number,
): { t: number; v: number }[] {
  const pk = resolvePK(dose);
  const startMs = new Date(dose.actualTime).getTime();
  const onsetMs = pk.onset_min * 60_000;
  const peakMs = pk.peak_min * 60_000;
  const halfLifeMs = pk.half_life_h * 3_600_000;
  // amplitude base modulada por dose relativa, sensibilidade, tolerância
  let amp = 100;
  const tol = (dose.individual?.tolerance ?? "").toLowerCase();
  if (tol.includes("alta")) amp *= 0.7;
  if (tol.includes("baixa")) amp *= 1.1;
  const sens = (dose.individual?.sensitivity ?? "").toLowerCase();
  if (sens.includes("alta")) amp *= 1.1;
  if (sens.includes("baixa")) amp *= 0.8;
  amp = Math.min(100, amp);

  const points: { t: number; v: number }[] = [];
  for (let t = windowStartMs; t <= windowEndMs; t += stepMin * 60_000) {
    const dt = t - startMs;
    let v = 0;
    if (dt < 0) {
      v = 0;
    } else if (dt <= peakMs) {
      // sigmoide de subida
      const x = dt / Math.max(peakMs, 1);
      v = amp * (1 / (1 + Math.exp(-8 * (x - 0.55))));
      if (dt < onsetMs) v *= dt / Math.max(onsetMs, 1);
    } else {
      // decaimento exponencial: meia-vida governa
      const decayDt = dt - peakMs;
      v = amp * Math.pow(0.5, decayDt / halfLifeMs);
    }
    points.push({ t, v: Math.max(0, v) });
  }
  return points;
}

function phaseFor(value: number, prev: number): Phase {
  if (value < 5) return "pre-onset";
  if (value < 30 && value > prev) return "subida";
  if (value >= 70) return "pico";
  if (Math.abs(value - prev) < 1.5 && value > 30) return "platô";
  if (value < prev) return value > 20 ? "descida" : "residual";
  return "subida";
}

export interface ComputedCurve {
  points: CurvePoint[];
  /** valor "agora" e fase atual */
  now: { value: number; phase: Phase };
  overlapped: boolean;
  notes: string[];
}

export function computeCurve(
  doses: DoseEvent[],
  options: { windowHours?: number; stepMin?: number; now?: Date } = {},
): ComputedCurve {
  const windowHours = options.windowHours ?? 24;
  const stepMin = options.stepMin ?? 10;
  const now = options.now ?? new Date();
  const windowEndMs = now.getTime() + 2 * 3_600_000;
  const windowStartMs = windowEndMs - windowHours * 3_600_000;

  const perDose = doses.map((d) =>
    singleDoseCurve(d, windowStartMs, windowEndMs, stepMin),
  );

  const points: CurvePoint[] = [];
  let prev = 0;
  let overlapped = false;
  const overlapCount = new Map<number, number>();

  for (let i = 0; i < (perDose[0]?.length ?? 0); i++) {
    const t = perDose[0][i].t;
    let active = 0;
    let sum = 0;
    for (const p of perDose) {
      const v = p[i]?.v ?? 0;
      sum += v;
      if (v > 20) active++;
    }
    if (active > 1) {
      overlapped = true;
      overlapCount.set(t, active);
    }
    const value = Math.min(100, sum);
    const ph = phaseFor(value, prev);
    points.push({ t, value, phase: ph });
    prev = value;
  }

  // ponto "agora"
  const closest = points.reduce((acc, p) =>
    Math.abs(p.t - now.getTime()) < Math.abs(acc.t - now.getTime()) ? p : acc,
  points[0] ?? { t: now.getTime(), value: 0, phase: "pre-onset" as Phase });

  const notes: string[] = [];
  if (overlapped) notes.push("Sobreposição de doses detectada — efeito clínico saturado em 100 (relativo).");
  if (doses.some((d) => (d.caffeineAmount ?? 0) > 100))
    notes.push("Cafeína > 100 mg registrada — possível ruído autonômico adicional.");

  return {
    points,
    now: { value: closest.value, phase: closest.phase },
    overlapped,
    notes,
  };
}
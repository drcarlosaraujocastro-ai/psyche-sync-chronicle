export type CurvePoint = { t: number; value: number; phase: Phase };
export type Phase =
  | "pre-onset"
  | "subida"
  | "pico"
  | "platô"
  | "descida"
  | "residual"
  | "washout"
  | "steady-state";

export interface DoseEvent {
  id?: string;
  substanceName: string;
  actualTime: string | Date;
  doseAmount?: number | null;
  formulation?: string | null;
  stomach?: string | null;
  caffeineAmount?: number | null;
  /** PK params from substance.pk (jsonb) */
  pk?: SubstancePK | null;
  /** Release type from substance.release_curve_type */
  releaseType?: string | null;
  /** Individual parameters from patient_medication */
  individual?: IndividualParams | null;
}

export interface SubstancePK {
  onset_min?: number;
  peak_min?: number;
  onset_days?: number;
  half_life_h?: number;
  duration_h?: number;
  onset_h?: number;
  peak_h?: number;
}

export interface IndividualParams {
  benefit?: number | null;       // 0–100
  cost?: number | null;          // 0–100
  sensitivity?: string | null;
  tolerance?: string | null;
  carryOver?: number | null;     // 0–1
}
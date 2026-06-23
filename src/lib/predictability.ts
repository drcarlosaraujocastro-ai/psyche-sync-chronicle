/**
 * Constrói a "previsibilidade clínica" combinando substâncias ativas,
 * fase de cada uma, sessão contextual e interações detectadas.
 */
import { buildSubstanceCurve, type AdvDoseLog, type AdvSubstance, type DoseCurve } from "./curveEngine";
import { runInteractionEngine, type ClinicalInteraction, type ActiveSubstance } from "./interactionEngine";

export interface PredictabilityInput {
  doses: AdvDoseLog[];                 // doses recentes (últimas 24–48h)
  substances: AdvSubstance[];          // catálogo necessário
  session?: Parameters<typeof runInteractionEngine>[0]["session"];
  recentSubstanceUse?: { substanceName: string; usedAt: string | Date }[];
}

export interface PredictabilityOutput {
  actives: ActiveSubstance[];
  interactions: ClinicalInteraction[];
  topBenefit?: { axis: string; score: number; from: string };
  topRisk?: { axis: string; score: number; from: string };
  missingData: string[];
  confidence: "baixa" | "moderada" | "alta";
}

function groupBySubstance(doses: AdvDoseLog[]) {
  const map = new Map<string, AdvDoseLog[]>();
  for (const d of doses) {
    const key = (d.substance_name ?? "").trim().toLowerCase();
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  }
  return map;
}

export function buildPredictability(input: PredictabilityInput): PredictabilityOutput {
  const groups = groupBySubstance(input.doses);
  const actives: ActiveSubstance[] = [];
  for (const [name, doses] of groups) {
    const sub = input.substances.find((s) =>
      s.name?.toLowerCase() === name ||
      (s as any).generic_name?.toLowerCase() === name,
    ) ?? null;
    const curve: DoseCurve = buildSubstanceCurve(doses, sub, {
      sleepHours: input.session?.sleepHours ?? null,
      sleepDeprivation0_10: input.session?.sleepDeprivation0_10 ?? null,
      caffeineMg: input.session?.caffeineTotalMg ?? null,
      alcoholToday: input.session?.alcoholUseToday ?? null,
    }, { windowHours: 12 });
    actives.push({ name: doses[0].substance_name, substance: sub, doses, curve, phase: curve.now.phase });
  }

  const interactions = runInteractionEngine({
    active: actives, session: input.session, recentSubstanceUse: input.recentSubstanceUse,
  });

  // top benefit/risk a partir dos perfis 0–100, ponderado pela intensidade atual
  let topBenefit: PredictabilityOutput["topBenefit"];
  let topRisk: PredictabilityOutput["topRisk"];
  for (const a of actives) {
    const weight = (a.curve?.now.value ?? 0) / 100;
    const bp = a.substance?.clinical_effect_profile ?? {};
    const ap = a.substance?.adverse_effect_profile ?? {};
    for (const [k, v] of Object.entries(bp)) {
      const score = Number(v) * weight;
      if (!topBenefit || score > topBenefit.score) topBenefit = { axis: k, score, from: a.name };
    }
    for (const [k, v] of Object.entries(ap)) {
      const score = Number(v) * weight;
      if (!topRisk || score > topRisk.score) topRisk = { axis: k, score, from: a.name };
    }
  }

  const missingData: string[] = [];
  if (!input.session?.sleepHours) missingData.push("horas de sono");
  if (input.session?.caffeineTotalMg == null) missingData.push("cafeína do dia");
  for (const a of actives) {
    if (!a.substance) missingData.push(`base farmacológica de ${a.name}`);
    else if (a.substance.peak_min_value == null) missingData.push(`pico de ${a.name}`);
  }

  const confidence: PredictabilityOutput["confidence"] =
    actives.every((a) => a.substance && a.substance.peak_min_value != null) ? "moderada" : "baixa";

  return { actives, interactions, topBenefit, topRisk, missingData, confidence };
}
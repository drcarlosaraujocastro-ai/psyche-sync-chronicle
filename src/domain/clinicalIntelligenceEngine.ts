import { buildAdvancedCurve, canonicalSubstanceKey, type AdvancedDoseInput } from "@/domain/advancedCurveEngine";
import { runInteractionEngine, type InteractionFinding } from "@/domain/interactionEngine";
import { buildPhenomenologyInsights } from "@/lib/clinical/phenomenologyEngine";

export type ClinicalSeverity = "info" | "monitorar" | "cautela" | "relevante" | "urgente";

export interface ClinicalActionCard {
  id: string;
  title: string;
  severity: ClinicalSeverity;
  rationale: string;
  action: string;
  missing?: string[];
  confidence: "baixa" | "moderada" | "alta";
}

export interface SubstanceLoadSummary {
  key: string;
  label: string;
  doseCount: number;
  redoseCount: number;
  currentIntensity: number;
  phase: string;
  meanBenefit: number | null;
  meanAdverse: number | null;
  meanFocus: number | null;
  meanAnxiety: number | null;
  caffeineMg: number;
  maxSleepDeprivation: number | null;
  missing: string[];
}

export interface ClinicalIntelligenceSummary {
  adherenceEstimate: number | null;
  redoseCount: number;
  riskScore: number;
  riskLabel: ClinicalSeverity;
  dataQualityScore: number;
  missingCore: string[];
  substanceLoads: SubstanceLoadSummary[];
  actionCards: ClinicalActionCard[];
  interactions: InteractionFinding[];
}

function n(v: any): number | null {
  if (v === "" || v == null) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function avg(values: any[]) {
  const xs = values.map(n).filter((x): x is number => x != null);
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function clamp(x: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, x));
}

function isRedose(d: any) {
  return /redose|extra|uso.?problem|problem|abuso|misuse|recreativo/i.test(String(d?.log_type ?? d?.logType ?? ""));
}

function actualTime(d: any) {
  return d?.actual_time ?? d?.actualTime ?? d?.used_at ?? d?.created_at;
}

function byCanonical(doses: any[]) {
  const m = new Map<string, any[]>();
  for (const d of doses) {
    const key = canonicalSubstanceKey(d.substance_name ?? d.substanceName ?? d.substances?.name ?? d.free_text_name ?? "");
    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push(d);
  }
  return m;
}

function expectedDailyCount(medications: any[], days: number) {
  const daily = medications.filter((m) => {
    const f = String(m.frequency ?? m.usual_frequency ?? "").toLowerCase();
    return m.status !== "suspenso" && (f.match(/di[aá]r|1x|2x|3x|manh|noite|daily|todo dia/) || !f);
  });
  return Math.max(1, daily.length * days);
}

function classifyRisk(score: number): ClinicalSeverity {
  if (score >= 82) return "urgente";
  if (score >= 62) return "relevante";
  if (score >= 42) return "cautela";
  if (score >= 20) return "monitorar";
  return "info";
}

function overlapCount(doses: any[]) {
  let c = 0;
  const groups = byCanonical(doses);
  for (const [key, ds] of groups.entries()) {
    const sorted = [...ds].sort((a, b) => new Date(actualTime(a)).getTime() - new Date(actualTime(b)).getTime());
    const windowH = key === "lisdexanfetamina" ? 14 : key === "clonazepam" ? 24 : key === "valproato" ? 24 : key === "atomoxetina" ? 24 : 8;
    for (let i = 1; i < sorted.length; i++) {
      const gap = (new Date(actualTime(sorted[i])).getTime() - new Date(actualTime(sorted[i - 1])).getTime()) / 36e5;
      if (gap > 0 && gap <= windowH) c++;
    }
  }
  return c;
}

export function buildClinicalIntelligenceSummary(input: {
  patient?: any;
  medications?: any[];
  doses?: any[];
  checkins?: any[];
  sessions?: any[];
  substanceUse?: any[];
  inventory?: any[];
  periodDays?: number;
}): ClinicalIntelligenceSummary {
  const periodDays = input.periodDays ?? 30;
  const meds = input.medications ?? [];
  const doses = input.doses ?? [];
  const sessions = input.sessions ?? [];
  const subUse = input.substanceUse ?? [];
  const checkins = input.checkins ?? [];

  const curve = buildAdvancedCurve(doses as AdvancedDoseInput[], { windowHours: Math.min(168, periodDays * 24) });
  const interactions = runInteractionEngine({
    activeMedications: meds.map((m) => ({ name: m.substances?.name ?? m.free_text_name ?? m.brand_name ?? "" })),
    recentDoses: doses.map((d) => ({
      substanceName: d.substance_name ?? d.substances?.name ?? "",
      actualTime: d.actual_time,
      logType: d.log_type,
      doseAmount: d.dose_amount,
      caffeineMg: d.caffeine_near_dose_mg,
      sleepDeprivation: d.sleep_deprivation_at_dose_0_10,
    })),
    recentSubstanceUse: subUse.map((s) => ({ substanceName: s.substance_name, usedAt: s.used_at })),
    sessionContext: { sleepHours: sessions[0]?.sleep_hours, caffeine: sessions[0]?.caffeine, suicideRisk: input.patient?.suicide_risk },
  });
  const phenomenology = buildPhenomenologyInsights({ patient: input.patient, medications: meds, doses, checkins, sessions, substanceUse: subUse, periodDays });

  const expected = expectedDailyCount(meds, periodDays);
  const nonSkipped = doses.filter((d) => !/esquec/i.test(String(d.log_type ?? ""))).length;
  const adherenceEstimate = meds.length ? clamp((nonSkipped / expected) * 100) : null;
  const redoseCount = doses.filter(isRedose).length;
  const overlaps = overlapCount(doses);
  const sedativeLoad = doses.filter((d) => /clonazepam|rivotril|diazepam|alprazolam|zolpidem|quetiapina|mirtazapina|prometazina/i.test(String(d.substance_name ?? ""))).length;
  const opioidUse = subUse.filter((s) => /code[ií]na|morfina|oxicodona|fentanil|metadona|tramadol|opio/i.test(String(s.substance_name ?? ""))).length;
  const stimulantUse = doses.filter((d) => /lisdex|lyberdia|venvanse|metilfen|ritalina|concerta|anfetamina/i.test(String(d.substance_name ?? ""))).length;
  const highCaffeine = doses.filter((d) => (n(d.caffeine_near_dose_mg) ?? 0) >= 200).length;
  const sleepRisk = doses.filter((d) => (n(d.sleep_deprivation_at_dose_0_10) ?? 0) >= 6).length + sessions.filter((s) => (n(s.sleep_hours) ?? 8) < 5).length;
  const severeInteraction = interactions.filter((i) => ["urgente", "relevante"].includes(i.relevance)).length;

  const missingCore = [
    doses.length ? null : "sem doses registradas no período",
    doses.some((d) => d.formulation_id || d.formulation_name) ? null : "doses sem formulação estruturada",
    doses.some((d) => d.caffeine_near_dose_mg != null) ? null : "cafeína não registrada nas doses",
    doses.some((d) => d.sleep_deprivation_at_dose_0_10 != null) || sessions.some((s) => s.sleep_hours != null) ? null : "sono/privação não registrado",
    checkins.length ? null : "sem check-ins fenomenológicos",
    meds.length ? null : "sem medicamentos do paciente cadastrados",
  ].filter(Boolean) as string[];
  const dataQualityScore = clamp(100 - missingCore.length * 13 - doses.filter((d) => !d.formulation_id && !d.formulation_name).length * 2);
  const riskScore = clamp(redoseCount * 14 + overlaps * 12 + opioidUse * 18 + severeInteraction * 16 + highCaffeine * 6 + sleepRisk * 8 + Math.max(0, sedativeLoad - 2) * 5 + (stimulantUse && sleepRisk ? 12 : 0));

  const substanceLoads: SubstanceLoadSummary[] = Array.from(byCanonical(doses).entries()).map(([key, ds]) => {
    const s = curve.series.find((x) => x.canonicalKey === key);
    return {
      key,
      label: s?.label ?? key,
      doseCount: ds.length,
      redoseCount: ds.filter(isRedose).length,
      currentIntensity: Math.round(s?.nowValue ?? 0),
      phase: s?.nowPhase ?? "—",
      meanBenefit: avg(ds.map((d) => d.benefit_0_100)),
      meanAdverse: avg(ds.map((d) => d.adverse_0_100)),
      meanFocus: avg(ds.map((d) => d.focus_0_100)),
      meanAnxiety: avg(ds.map((d) => d.anxiety_0_100)),
      caffeineMg: ds.reduce((acc, d) => acc + (n(d.caffeine_near_dose_mg) ?? 0), 0),
      maxSleepDeprivation: (() => { const xs = ds.map((d) => n(d.sleep_deprivation_at_dose_0_10)).filter((x): x is number => x != null); return xs.length ? Math.max(...xs) : null; })(),
      missing: [
        ds.some((d) => d.formulation_id || d.formulation_name) ? null : "sem formulação",
        ds.some((d) => d.benefit_0_100 != null || d.focus_0_100 != null || d.anxiety_0_100 != null) ? null : "sem efeito percebido",
      ].filter(Boolean) as string[],
    };
  }).sort((a, b) => b.currentIntensity - a.currentIntensity || b.doseCount - a.doseCount);

  const actionCards: ClinicalActionCard[] = [];
  if (redoseCount || overlaps) {
    actionCards.push({
      id: "redose-overlap",
      title: "Redose/sobreposição precisa virar eixo clínico",
      severity: "relevante",
      rationale: `${redoseCount} redose(s) marcada(s) e ${overlaps} sobreposição(ões) detectadas. Isso é interação da substância consigo mesma, não simples soma de dose.`,
      action: "Registrar motivo da segunda dose, fase da curva, sono, cafeína e check-in 1–3h depois. Separar busca de produtividade, reforço negativo e uso hedônico.",
      confidence: "alta",
    });
  }
  if (stimulantUse && sleepRisk) {
    actionCards.push({
      id: "stim-sleep",
      title: "Estimulante sob privação de sono distorce a leitura clínica",
      severity: "relevante",
      rationale: "Há estimulante registrado junto de privação/sono curto. A mesma curva pode virar irritabilidade, hiperfoco estéril, ansiedade autonômica ou fenômeno psicotomimético.",
      action: "Não concluir falha primária da medicação antes de corrigir sono/cafeína e comparar dias equivalentes.",
      confidence: "alta",
    });
  }
  if (highCaffeine) {
    actionCards.push({
      id: "caffeine-noise",
      title: "Cafeína está virando confundidor farmacológico",
      severity: "cautela",
      rationale: `${highCaffeine} dose(s) com cafeína alta. Isso aumenta ruído autonômico e pode ser confundido com efeito terapêutico ou colateral do estimulante.`,
      action: "Registrar mg, horário e separar curva de cafeína da curva do fármaco; comparar dias com e sem cafeína.",
      confidence: "moderada",
    });
  }
  if (opioidUse && sedativeLoad) {
    actionCards.push({
      id: "opioid-sedative",
      title: "Risco máximo: opioide/substância + carga sedativa",
      severity: "urgente",
      rationale: "Há uso/risco opioide junto de benzodiazepínico/sedativo no período. A interação é depressão SNC/respiratória, não apenas sedação subjetiva.",
      action: "Marcar como alerta clínico prioritário, documentar orientação de redução de danos e monitorar álcool/opioides/sedativos.",
      confidence: "alta",
    });
  }
  if (missingCore.length) {
    actionCards.push({
      id: "data-quality",
      title: "Previsão está limitada por lacunas de dados",
      severity: "monitorar",
      rationale: `Faltam: ${missingCore.join("; ")}. Sem isso, o app vira registro e não inteligência clínica.`,
      action: "Priorizar campos mínimos: formulação, cafeína, sono, benefício/adverso 0–100 e check-in pós-dose.",
      missing: missingCore,
      confidence: "alta",
    });
  }
  for (const p of phenomenology.slice(0, 3)) {
    actionCards.push({
      id: `phen-${p.id ?? p.title}`,
      title: p.title ?? "Hipótese fenomenológica",
      severity: p.severity ?? "monitorar",
      rationale: p.rationale ?? p.description ?? "Padrão inferido pela correlação dose-contexto-sintoma.",
      action: p.management ?? p.action ?? "Validar em sessão com dados adicionais.",
      confidence: p.confidence ?? "moderada",
    });
  }

  return {
    adherenceEstimate,
    redoseCount,
    riskScore,
    riskLabel: classifyRisk(riskScore),
    dataQualityScore,
    missingCore,
    substanceLoads,
    actionCards,
    interactions,
  };
}

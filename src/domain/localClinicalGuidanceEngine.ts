import { canonicalSubstanceKey } from "@/domain/advancedCurveEngine";
import { runInteractionEngine } from "@/domain/interactionEngine";
import { buildClinicalIntelligenceSummary, type ClinicalSeverity } from "@/domain/clinicalIntelligenceEngine";

export type GuidanceConfidence = "baixa" | "moderada" | "alta";
export type GuidanceAxis = "farmacologia" | "fenomenologia" | "adesao" | "seguranca" | "dados" | "manejo";

export interface LocalGuidanceItem {
  id: string;
  axis: GuidanceAxis;
  title: string;
  severity: ClinicalSeverity;
  confidence: GuidanceConfidence;
  rationale: string;
  action: string;
  validation: string[];
}

export interface MedicationSignal {
  key: string;
  label: string;
  role: string;
  benefit: string;
  risk: string;
  nextData: string;
}

export interface LocalGuidanceResult {
  executiveSummary: string;
  riskLevel: ClinicalSeverity;
  dataQuality: number;
  primaryActions: LocalGuidanceItem[];
  medicationSignals: MedicationSignal[];
  missingData: string[];
  sessionQuestions: string[];
  monitoringPlan: string[];
  conservativePlan: string[];
  intermediatePlan: string[];
  boldPlan: string[];
}

function n(v: any): number | null {
  if (v === "" || v == null) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function textIncludes(value: any, pattern: RegExp) {
  return pattern.test(String(value ?? ""));
}

function doseName(d: any) {
  return d?.substance_name ?? d?.substances?.name ?? d?.free_text_name ?? d?.brand_name ?? "";
}

function isRedose(d: any) {
  return textIncludes(d?.log_type, /redose|extra|uso.?problem|problem|abuso|misuse/i);
}

function unique(xs: string[]) {
  return Array.from(new Set(xs.filter(Boolean)));
}

function classifyAxis(key: string): MedicationSignal["role"] {
  if (/lisdex|metilfen|atomox|buprop|modafin|anfet/.test(key)) return "catecolaminérgico / função executiva";
  if (/clonazepam|diazepam|alprazolam|zolpidem|quetiapina|mirtazapina|pregabalina/.test(key)) return "sedativo / sono / contenção";
  if (/vortiox|sertralina|escitalopram|venlafaxina|duloxetina|fluoxetina|paroxetina|vilazodona/.test(key)) return "antidepressivo / ruminação / afeto";
  if (/valpro|divalpro|lamotrigina|l[ií]tio|topiramato|carbamazepina/.test(key)) return "estabilização / impulsividade / labilidade";
  if (/clonidina|guanfacina|propranolol/.test(key)) return "antiadrenérgico / hiperalerta";
  return "farmacológico geral";
}

export function buildLocalClinicalGuidance(input: {
  patient?: any;
  medications?: any[];
  doses?: any[];
  checkins?: any[];
  sessions?: any[];
  substanceUse?: any[];
  inventory?: any[];
  periodDays?: number;
}): LocalGuidanceResult {
  const medications = input.medications ?? [];
  const doses = input.doses ?? [];
  const sessions = input.sessions ?? [];
  const substanceUse = input.substanceUse ?? [];
  const checkins = input.checkins ?? [];
  const summary = buildClinicalIntelligenceSummary(input);
  const interactions = runInteractionEngine({
    activeMedications: medications.map((m) => ({ name: m.substances?.name ?? m.free_text_name ?? m.brand_name ?? "" })),
    recentDoses: doses.map((d) => ({
      substanceName: doseName(d),
      actualTime: d.actual_time,
      logType: d.log_type,
      doseAmount: d.dose_amount,
      caffeineMg: d.caffeine_near_dose_mg,
      sleepDeprivation: d.sleep_deprivation_at_dose_0_10,
    })),
    recentSubstanceUse: substanceUse.map((s) => ({ substanceName: s.substance_name, usedAt: s.used_at })),
    sessionContext: { sleepHours: sessions[0]?.sleep_hours, caffeine: sessions[0]?.caffeine, suicideRisk: input.patient?.suicide_risk },
  });

  const items: LocalGuidanceItem[] = [];
  const redoses = doses.filter(isRedose);
  const stimulantDoses = doses.filter((d) => textIncludes(doseName(d), /lisdex|lyberdia|venvanse|juneve|metilfen|ritalina|concerta|atomox|atentah|anfet/i));
  const sedativeDoses = doses.filter((d) => textIncludes(doseName(d), /clonazepam|rivotril|diazepam|alprazolam|zolpidem|quetiapina|mirtazapina|pregabalina|prometazina/i));
  const opioidUse = substanceUse.filter((s) => textIncludes(s.substance_name, /opio|code[ií]na|morfina|oxicodona|fentanil|metadona|tramadol/i));
  const alcoholUse = substanceUse.filter((s) => textIncludes(s.substance_name, /alcool|álcool|alcohol|etanol/i));
  const highCaffeine = doses.filter((d) => (n(d.caffeine_near_dose_mg) ?? 0) >= 200);
  const sleepRisk = doses.filter((d) => (n(d.sleep_deprivation_at_dose_0_10) ?? 0) >= 6).length + sessions.filter((s) => (n(s.sleep_hours) ?? 8) < 5).length;
  const missingFormulation = doses.filter((d) => !d.formulation_id && !d.formulation_name);
  const missingEffect = doses.filter((d) => d.benefit_0_100 == null && d.focus_0_100 == null && d.anxiety_0_100 == null && d.adverse_0_100 == null);

  if (redoses.length) {
    items.push({
      id: "redose",
      axis: "fenomenologia",
      title: "Redose registrada: transformar em fenômeno clínico, não em culpa",
      severity: "relevante",
      confidence: "alta",
      rationale: `${redoses.length} dose(s) marcadas como redose/uso problemático. O sistema deve separar reforço negativo, queda executiva, tolerância subjetiva, busca hedônica e automedicação.`,
      action: "Para cada redose: registrar fase da curva, motivo, sono, cafeína, afeto, craving e efeito 1–3h depois.",
      validation: ["Motivo da redose", "fase PK/PD", "efeito percebido", "craving antes/depois"],
    });
  }
  if (stimulantDoses.length && sleepRisk) {
    items.push({
      id: "stim-sleep",
      axis: "seguranca",
      title: "Estimulante + sono ruim: alto confundidor de resposta",
      severity: "relevante",
      confidence: "alta",
      rationale: "Privação de sono altera curva subjetiva: aumenta irritabilidade, ruído autonômico, hiperfoco improdutivo, impulsividade e risco psicotomimético.",
      action: "Comparar resposta do estimulante apenas entre dias com sono minimamente equivalente; marcar dias com sono ruim como baixa confiabilidade terapêutica.",
      validation: ["horas de sono", "qualidade do sono", "paranoia/ideias de referência", "irritabilidade"],
    });
  }
  if (highCaffeine.length) {
    items.push({
      id: "caffeine",
      axis: "farmacologia",
      title: "Cafeína alta está contaminando a leitura da curva",
      severity: "cautela",
      confidence: "alta",
      rationale: `${highCaffeine.length} registro(s) com cafeína >=200 mg. Isso pode simular ansiedade, taquicardia, tremor, insônia e falsa impressão de estimulante “ruim”.`,
      action: "Registrar cafeína em mg e horário; comparar dias com e sem cafeína antes de alterar dose do estimulante.",
      validation: ["mg de cafeína", "horário", "PA/FC se possível", "ansiedade autonômica"],
    });
  }
  if ((opioidUse.length || alcoholUse.length) && sedativeDoses.length) {
    items.push({
      id: "bzd-opioid-alcohol",
      axis: "seguranca",
      title: "Sedativo + opioide/álcool: alerta máximo",
      severity: "urgente",
      confidence: "alta",
      rationale: "Benzodiazepínico/sedativos com opioide ou álcool aumentam risco de depressão SNC/respiratória, amnésia, desinibição e queda.",
      action: "Marcar como evento crítico, registrar substância, dose, horário, sedação e sinais respiratórios; evitar interpretação como simples 'sono'.",
      validation: ["opioide/álcool nas últimas 24h", "sedação", "fala pastosa", "FR/saturação se disponível"],
    });
  }
  if (missingFormulation.length) {
    items.push({
      id: "missing-formulation",
      axis: "dados",
      title: "Doses sem formulação reduzem a confiabilidade da curva",
      severity: "cautela",
      confidence: "alta",
      rationale: `${missingFormulation.length} dose(s) sem formulação estruturada. Sem formulação, onset/pico/cauda ficam estimativas grosseiras.`,
      action: "Vincular cada dose à formulação correta: IR, XR/ER, OROS, pró-fármaco, steady-state diário, sedativo longo etc.",
      validation: ["formulação", "via", "modelo de curva", "meia-vida/cauda"],
    });
  }
  if (missingEffect.length && doses.length) {
    items.push({
      id: "missing-effect",
      axis: "dados",
      title: "Sem check-in pós-dose, o app vira contador de dose",
      severity: "monitorar",
      confidence: "alta",
      rationale: `${missingEffect.length} dose(s) sem efeito percebido. A inteligência local depende da correlação dose → fase → fenômeno.`,
      action: "Criar check-in rápido 60–180 min após dose e no offset: foco, ansiedade, sedação, irritabilidade, craving, benefício e adverso.",
      validation: ["check-in no pico", "check-in no offset", "benefício/adverso 0–100"],
    });
  }

  interactions.filter((i) => ["urgente", "relevante"].includes(i.relevance)).slice(0, 4).forEach((i, idx) => {
    items.push({
      id: `interaction-${idx}`,
      axis: "farmacologia",
      title: i.summary,
      severity: i.relevance as ClinicalSeverity,
      confidence: "moderada",
      rationale: i.mechanism || "Interação contextual detectada pelo motor local.",
      action: i.recommendation || "Monitorar fase da curva, dose, contexto e efeito percebido.",
      validation: i.monitor || ["fase da curva", "sinais clínicos", "dose/horário"],
    });
  });

  const groups = new Map<string, any[]>();
  for (const d of doses) {
    const key = canonicalSubstanceKey(doseName(d));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }

  const medicationSignals: MedicationSignal[] = Array.from(groups.entries()).map(([key, ds]) => {
    const label = ds[0]?.substances?.name ?? ds[0]?.substance_name ?? key;
    const meanBenefit = ds.map((d) => n(d.benefit_0_100)).filter((x): x is number => x != null);
    const meanAdverse = ds.map((d) => n(d.adverse_0_100)).filter((x): x is number => x != null);
    const b = meanBenefit.length ? Math.round(meanBenefit.reduce((a, x) => a + x, 0) / meanBenefit.length) : null;
    const a = meanAdverse.length ? Math.round(meanAdverse.reduce((acc, x) => acc + x, 0) / meanAdverse.length) : null;
    return {
      key,
      label,
      role: classifyAxis(key),
      benefit: b == null ? "benefício ainda não mensurado" : `benefício médio registrado ${b}/100`,
      risk: a == null ? "risco/adverso ainda não mensurado" : `adverso médio registrado ${a}/100`,
      nextData: ds.some((d) => d.formulation_id || d.formulation_name) ? "registrar check-in em pico e offset" : "vincular formulação para curva confiável",
    };
  });

  const missingData = unique([...summary.missingCore, ...items.flatMap((i) => i.validation).filter((x) => /falt|formula|sono|cafe|check|efeito|motivo/i.test(x))]);
  const riskLevel = summary.riskLabel;
  const dataQuality = summary.dataQualityScore;
  const executiveSummary = [
    `Risco composto local: ${summary.riskScore}/100 (${riskLevel}).`,
    `Qualidade dos dados: ${dataQuality}/100.`,
    doses.length ? `${doses.length} dose(s) no período, ${redoses.length} redose(s).` : "Sem doses registradas no período.",
    interactions.length ? `${interactions.length} interação(ões)/contexto(s) detectado(s).` : "Sem interação relevante detectada pelo motor local.",
  ].join(" ");

  return {
    executiveSummary,
    riskLevel,
    dataQuality,
    primaryActions: items.sort((a, b) => {
      const rank: Record<ClinicalSeverity, number> = { urgente: 5, relevante: 4, cautela: 3, monitorar: 2, info: 1 };
      return rank[b.severity] - rank[a.severity];
    }),
    medicationSignals,
    missingData,
    sessionQuestions: unique([
      redoses.length ? "Qual foi o motivo subjetivo da redose: produtividade, alívio de incapacidade, euforia, fissura ou medo de queda?" : "Houve vontade de redosar ou antecipar dose?",
      stimulantDoses.length ? "Em que fase da curva ocorreu ansiedade/irritabilidade: come-up, pico, offset ou cauda?" : "Houve flutuação clara entre horários do dia?",
      sedativeDoses.length ? "Há sedação residual matinal ou compensação com cafeína/estimulante?" : "Sono teve latência, despertares ou pesadelos?",
      "Qual dado faltante mais atrapalhou a interpretação desta semana?",
    ]),
    monitoringPlan: unique([
      "Registrar dose com formulação, horário real, alimento, cafeína e privação de sono.",
      "Check-in rápido no pico e no offset da substância principal.",
      "Registrar redose como evento próprio, com motivo e craving antes/depois.",
      stimulantDoses.length ? "Monitorar sono, PA/FC se possível, irritabilidade, paranoia/ideias de referência e cafeína." : "Monitorar benefício/adverso 0–100 por medicação ativa.",
      sedativeDoses.length ? "Monitorar sedação residual, memória, coordenação, queda e compensação com estimulante/cafeína." : "Monitorar sedação e qualidade do sono quando houver sedativos.",
    ]),
    conservativePlan: [
      "Não mudar várias variáveis simultaneamente; melhorar qualidade dos registros por 7 dias.",
      "Corrigir formulações e horários reais das doses antes de concluir falha terapêutica.",
      "Separar dias com sono ruim/cafeína alta dos dias interpretáveis.",
    ],
    intermediatePlan: [
      "Usar a curva expandida para mapear pico, offset, cauda e redose da substância principal.",
      "Transformar redose em alvo de intervenção: regra de espera, check-in obrigatório e registro de motivo.",
      "Revisar carga sedativa/catecolaminérgica por fase, não apenas por lista de medicações.",
    ],
    boldPlan: [
      "Criar protocolo individual no app: dias de alta confiabilidade versus dias contaminados por sono/cafeína/substância.",
      "Usar relatórios semanais PK/PD + fenomenologia para decidir ajuste farmacológico, não impressão isolada do paciente.",
      "Quando houver TUS ou redose repetida, combinar contrato de monitoramento, estoque controlado, check-ins e auditoria de risco.",
    ],
  };
}

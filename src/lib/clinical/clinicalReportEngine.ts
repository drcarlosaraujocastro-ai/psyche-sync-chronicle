import { buildClinicalHypotheses, type ClinicalHypothesis, type MedicationSignal } from "@/lib/clinical/hypothesisEngine";
import { buildMedicationEffectForecast, type AxisForecastPoint, type ForecastItem, type StockAlert } from "@/lib/clinical/effectProjection";
import { bestAlias } from "@/lib/pharmacology/aliasResolver";
import { KNOWLEDGE_BASE, type KBTemplate } from "@/lib/pharmacologyKnowledgeBase";
import { buildPhenomenologyInsights, type PhenomenologyInsight } from "@/lib/clinical/phenomenologyEngine";

export type ReportSeverity = "info" | "warn" | "high";

export type ClinicalReportSection = {
  id: string;
  title: string;
  severity?: ReportSeverity;
  bullets: string[];
  details?: string[];
};

export type MedicationEffectSummary = {
  medication: string;
  doseCount: number;
  benefitAvg: number | null;
  adverseAvg: number | null;
  focusAvg: number | null;
  anxietyAvg: number | null;
  sedationAvg: number | null;
  stimulationAvg: number | null;
  cravingAvg: number | null;
  redoseCount: number;
  missedCount: number;
  lateCount: number;
  likelyDirection: "benefício" | "prejuízo" | "misto" | "insuficiente";
  interpretation: string;
};

export type AdherenceSummary = {
  loggedDoses: number;
  expectedDoses: number | null;
  adherencePct: number | null;
  redoses: number;
  missed: number;
  late: number;
  medianTimingDeviationMinutes: number | null;
  interpretation: string;
};

export type ClinicalReportOutput = {
  title: string;
  generatedAt: string;
  patientName: string;
  reportType: string;
  executiveSummary: string[];
  sections: ClinicalReportSection[];
  medicationEffects: MedicationEffectSummary[];
  hypotheses: ClinicalHypothesis[];
  medicationSignals: MedicationSignal[];
  forecastAxes: AxisForecastPoint[];
  warnings: ForecastItem[];
  stockAlerts: StockAlert[];
  adherence: AdherenceSummary;
  missingData: string[];
  labRecommendations: string[];
  phenomenologyInsights: PhenomenologyInsight[];
  disclaimers: string[];
  markdown: string;
  structuredData: Record<string, any>;
};

export type BuildClinicalReportInput = {
  reportType?: string;
  patient?: any;
  sessions?: any[];
  selectedSession?: any;
  medications?: any[];
  doses?: any[];
  substanceUse?: any[];
  checkins?: any[];
  individualProfiles?: any[];
  targetSymptoms?: any[];
  substances?: any[];
  formulations?: any[];
  inventory?: any[];
  audit?: any;
  interactions?: any[];
  periodDays?: number;
};

function norm(v: any) {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function n(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function avg(values: Array<number | null | undefined>) {
  const xs = values.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function medName(m: any) {
  const brand = m?.brand_name || m?.free_text_name;
  const canonical = m?.substances?.name || m?.substance_name;
  if (brand && canonical && norm(brand) !== norm(canonical)) return `${brand} → ${canonical}`;
  return canonical || brand || m?.medication_name || "medicação";
}

function doseName(d: any) {
  return d?.substance_name || d?.substances?.name || d?.free_text_name || "substância";
}

function dateTime(v: any) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString("pt-BR"); } catch { return "—"; }
}

function rounded(v: number | null | undefined) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return String(Math.round(v));
}

function frequencyToExpectedPerDay(freq: any) {
  const f = norm(freq);
  if (!f) return 1;
  if (f.includes("4x") || f.includes("4 x")) return 4;
  if (f.includes("3x") || f.includes("3 x")) return 3;
  if (f.includes("2x") || f.includes("2 x")) return 2;
  if (f.includes("seman")) return 1 / 7;
  if (f.includes("quinzen")) return 1 / 14;
  if (f.includes("mens")) return 1 / 30;
  if (f.includes("prn") || f.includes("se necessario") || f.includes("se necessário")) return 0;
  return 1;
}

function closestMedicationForDose(dose: any, medications: any[]) {
  if (dose.patient_medication_id) {
    const byId = medications.find((m) => m.id === dose.patient_medication_id);
    if (byId) return byId;
  }
  const dn = norm(doseName(dose));
  return medications.find((m) => {
    const names = [m.substances?.name, m.free_text_name, m.brand_name].filter(Boolean).map(norm);
    return names.some((name) => name && (dn.includes(name) || name.includes(dn)));
  });
}

function knowledgeForName(name: string): KBTemplate | null {
  const match = bestAlias(name, 0.72);
  if (match?.template) return match.template;
  const nn = norm(name);
  return KNOWLEDGE_BASE.find((t) => norm(t.name) === nn || norm(t.generic_name) === nn || (t.match ?? []).map(norm).includes(nn)) ?? null;
}

function formulationForMedication(med: any): any | null {
  if (med?.substance_formulations) return med.substance_formulations;
  if (med?.formulations) return Array.isArray(med.formulations) ? med.formulations[0] : med.formulations;
  const t = knowledgeForName(medName(med));
  return t?.formulations?.[0] ?? null;
}

function classifyDosePhase(dose: any, medications: any[]) {
  const med = closestMedicationForDose(dose, medications);
  const fm = dose.formulation || formulationForMedication(med) || knowledgeForName(doseName(dose))?.formulations?.[0];
  const actual = dose.actual_time ? new Date(dose.actual_time).getTime() : null;
  if (!actual || Number.isNaN(actual)) return { phase: "sem horário", hours: null, note: "Horário da dose ausente." };
  const h = (Date.now() - actual) / 36e5;
  const onsetRaw = Number(fm?.onset_min ?? fm?.onset_min_value ?? 0);
  const onsetUnit = String(fm?.onset_unit ?? "minutos");
  const onset = onsetRaw / (onsetUnit.startsWith("hora") ? 1 : 60);
  const peakMin = Number(fm?.peak_min ?? fm?.peak_min_value ?? fm?.tmax_min ?? 2);
  const peakMax = Number(fm?.peak_max ?? fm?.peak_max_value ?? fm?.tmax_max ?? peakMin + 2);
  const duration = Number(fm?.duration_max ?? fm?.duration_max_value ?? fm?.duration_total_max ?? 8);
  const tail = Number(fm?.tail_max ?? fm?.tail_max_value ?? fm?.residual_max ?? duration + 12);
  if (h < Math.max(onset, 0.25)) return { phase: "pré-onset", hours: h, note: "Antes do início esperado." };
  if (h < peakMin) return { phase: "come-up", hours: h, note: "Fase de subida; colaterais autonômicos podem aparecer antes do benefício pleno." };
  if (h <= peakMax) return { phase: "pico", hours: h, note: "Fase próxima ao Tmax/pico funcional esperado." };
  if (h <= duration) return { phase: "platô/offset", hours: h, note: "Fase funcional com queda gradual ou plateau tardio." };
  if (h <= tail) return { phase: "cauda residual", hours: h, note: "Efeito residual possível; atenção a sono, sedação ou rebote." };
  return { phase: "fora da janela", hours: h, note: "Dose provavelmente fora da janela funcional principal." };
}

export function buildAdherenceSummary(input: BuildClinicalReportInput): AdherenceSummary {
  const days = input.periodDays ?? 30;
  const meds = input.medications ?? [];
  const doses = input.doses ?? [];
  const expected = meds
    .filter((m) => norm(m.status).includes("ativo") || !m.status)
    .reduce((sum, m) => sum + frequencyToExpectedPerDay(m.frequency) * days, 0);
  const expectedRounded = expected > 0 ? Math.round(expected) : null;
  const logged = doses.filter((d) => !norm(d.log_type).includes("esquec")).length;
  const redoses = doses.filter((d) => /redose|problem|extra|abuso|misuse/.test(norm(d.log_type))).length;
  const missed = doses.filter((d) => /esquec|miss|omit/.test(norm(d.log_type))).length;
  const late = doses.filter((d) => /atras/.test(norm(d.log_type))).length;
  const deviations = doses
    .map((d) => {
      if (!d.actual_time || !d.planned_time) return null;
      const diff = Math.abs(new Date(d.actual_time).getTime() - new Date(d.planned_time).getTime()) / 60000;
      return Number.isFinite(diff) ? diff : null;
    })
    .filter((x): x is number => x !== null)
    .sort((a, b) => a - b);
  const medDev = deviations.length ? deviations[Math.floor(deviations.length / 2)] : null;
  const adherencePct = expectedRounded ? Math.min(100, Math.round((logged / expectedRounded) * 100)) : null;
  let interpretation = "Adesão não estimável com precisão: faltam dose planejada/frequência/doses registradas.";
  if (adherencePct != null) {
    interpretation = `Adesão estimada ${adherencePct}% (${logged}/${expectedRounded} doses esperadas no período).`;
    if (redoses) interpretation += ` Há ${redoses} redose(s)/uso problemático(s), que devem ser analisados separadamente da adesão.`;
    if (missed) interpretation += ` Há ${missed} esquecimento(s) registrado(s).`;
  }
  return { loggedDoses: logged, expectedDoses: expectedRounded, adherencePct, redoses, missed, late, medianTimingDeviationMinutes: medDev, interpretation };
}

export function summarizeMedicationEffects(input: BuildClinicalReportInput): MedicationEffectSummary[] {
  const meds = input.medications ?? [];
  const doses = input.doses ?? [];
  const namesFromDoses = Array.from(new Set(doses.map((d) => doseName(d)).filter(Boolean)));
  const entities = meds.length ? meds : namesFromDoses.map((name) => ({ free_text_name: name }));
  return entities.map((m) => {
    const name = medName(m);
    const related = doses.filter((d) => closestMedicationForDose(d, meds)?.id === m.id || norm(doseName(d)).includes(norm(name).slice(0, 5)) || norm(name).includes(norm(doseName(d)).slice(0, 5)));
    const benefitAvg = avg(related.map((d) => n(d.benefit_0_100)));
    const adverseAvg = avg(related.map((d) => n(d.adverse_0_100)));
    const focusAvg = avg(related.map((d) => n(d.focus_0_100)));
    const anxietyAvg = avg(related.map((d) => n(d.anxiety_0_100)));
    const sedationAvg = avg(related.map((d) => n(d.sedation_0_100)));
    const stimulationAvg = avg(related.map((d) => n(d.stimulation_0_100)));
    const cravingAvg = avg(related.map((d) => n(d.craving_0_100)));
    const redoseCount = related.filter((d) => /redose|extra|problem|abuso|misuse/.test(norm(d.log_type))).length;
    const missedCount = related.filter((d) => /esquec|miss|omit/.test(norm(d.log_type))).length;
    const lateCount = related.filter((d) => /atras/.test(norm(d.log_type))).length;
    let likelyDirection: MedicationEffectSummary["likelyDirection"] = "insuficiente";
    let interpretation = "Sem registros suficientes de dose + efeito para inferência individual.";
    if (related.length) {
      if ((benefitAvg ?? 0) >= 60 && (adverseAvg ?? 0) < 45) {
        likelyDirection = "benefício";
        interpretation = `Sinal de benefício predominante: benefício médio ${rounded(benefitAvg)}/100 com adverso ${rounded(adverseAvg)}/100.`;
      } else if ((adverseAvg ?? 0) >= 60 && (benefitAvg ?? 0) < 55) {
        likelyDirection = "prejuízo";
        interpretation = `Sinal de custo maior que benefício: adverso médio ${rounded(adverseAvg)}/100 para benefício ${rounded(benefitAvg)}/100.`;
      } else {
        likelyDirection = "misto";
        interpretation = `Resposta mista: benefício ${rounded(benefitAvg)}/100 e adverso ${rounded(adverseAvg)}/100. Correlacionar com fase da curva, sono, cafeína e alimento.`;
      }
      if (redoseCount) interpretation += ` Redose(s): ${redoseCount}.`;
    }
    return { medication: name, doseCount: related.length, benefitAvg, adverseAvg, focusAvg, anxietyAvg, sedationAvg, stimulationAvg, cravingAvg, redoseCount, missedCount, lateCount, likelyDirection, interpretation };
  }).slice(0, 20);
}

function buildLabRecommendations(input: BuildClinicalReportInput) {
  const medsText = norm((input.medications ?? []).map(medName).join(" "));
  const history = norm([input.patient?.substance_use_history, input.patient?.clinical_history, input.patient?.current_complaint].join(" "));
  const subUse = norm((input.substanceUse ?? []).map((s) => s.substance_name).join(" "));
  const recs = new Set<string>();
  const addCore = () => {
    recs.add("Hemograma completo com plaquetas.");
    recs.add("TGO, TGP, GGT, FA, bilirrubinas e albumina.");
    recs.add("Ureia, creatinina, eTFG, sódio, potássio, magnésio e cálcio.");
    recs.add("Glicemia de jejum, HbA1c e perfil lipídico.");
    recs.add("TSH, T4 livre, B12, folato, ferritina/ferro/IST e 25-OH vitamina D.");
  };
  addCore();
  if (/valpro|dival|depak|torval|valpakine/.test(medsText)) {
    recs.add("Divalproato/valproato: hemograma + plaquetas, hepatograma, TP/INR/TTPa antes e no seguimento; valproatemia se sedação, tremor, resposta insuficiente, toxicidade ou ajuste de dose.");
    recs.add("Valproato: amônia se sonolência/confusão/vômitos; lipase/amilase se dor abdominal importante.");
  }
  if (/litio|lithium/.test(medsText)) {
    recs.add("Lítio: litemia de vale, creatinina/eTFG, TSH/T4L, cálcio, eletrólitos; ECG conforme idade/risco cardiovascular.");
  }
  if (/clozap|olanzap|quetiap|risper|aripip|lurasid|zipras|haloper/.test(medsText)) {
    recs.add("Antipsicótico: peso/IMC/cintura, PA, glicemia/HbA1c, lipídios; ECG/QTc conforme fármaco e risco; prolactina se risperidona/sintomas.");
  }
  if (/lisdex|venvanse|lyberdia|metilfen|atomox|anfet|buprop|modafin/.test(medsText)) {
    recs.add("Estimulante/atomoxetina/bupropiona: PA, FC, peso/apetite e sono; ECG se história cardiovascular, síncope, palpitação, redose ou combinação catecolaminérgica.");
  }
  if (/opio|code|morf|oxic|fentan|iv|intraven|cocain|crack/.test(history + " " + subUse)) {
    recs.add("TUS/uso IV: HIV 1/2 Ag/Ac, HBsAg, anti-HBs, anti-HBc total, anti-HCV com RNA reflexo, VDRL/RPR + teste treponêmico.");
    recs.add("Toxicologia urinária conforme contrato clínico: opioides, oxicodona, fentanil, cocaína/benzoilecgonina, anfetaminas, benzodiazepínicos e cannabis.");
  }
  if (/clonaz|alpraz|diazep|loraz/.test(medsText) && /opio|code|morf|oxic|fentan|alcool|álcool/.test(history + " " + subUse)) {
    recs.add("Benzodiazepínico + histórico opioide/álcool: monitorar sedação, risco respiratório, recaída e uso concomitante; considerar naloxona se risco opioide atual.");
  }
  return [...recs];
}

function buildSections(input: BuildClinicalReportInput, medicationEffects: MedicationEffectSummary[], adherence: AdherenceSummary, hypotheses: ClinicalHypothesis[], forecast: ReturnType<typeof buildMedicationForecast>, phenomenologyInsights: PhenomenologyInsight[]) {
  const p = input.patient ?? {};
  const meds = input.medications ?? [];
  const doses = input.doses ?? [];
  const sessions = input.sessions ?? [];
  const checkins = input.checkins ?? [];
  const interactions = input.interactions ?? [];
  const audit = input.audit;
  const sections: ClinicalReportSection[] = [];

  sections.push({
    id: "observed_data",
    title: "1. Dados observados",
    bullets: [
      `Paciente: ${p.full_name ?? "—"}. Status: ${p.status ?? "—"}.`,
      `Medicações cadastradas: ${meds.length}. Doses registradas: ${doses.length}. Sessões analisadas: ${sessions.length}. Check-ins: ${checkins.length}.`,
      `Queixa atual: ${p.current_complaint || "não preenchida"}`,
      `Histórico de substâncias: ${p.substance_use_history ? "preenchido" : "não preenchido"}.`,
    ],
  });

  sections.push({
    id: "medications",
    title: "2. Medicações, formulações e alvos",
    bullets: meds.length ? meds.map((m: any) => {
      const fm = formulationForMedication(m);
      const targets = [m.indication, m.diagnostic_target, ...(m.target_symptoms ?? [])].filter(Boolean).join("; ");
      return `${medName(m)} — ${m.current_dose ?? "—"} ${m.dose_unit ?? ""} ${m.frequency ? `(${m.frequency})` : ""}. Formulação: ${m.formulation_name ?? fm?.formulation_name ?? fm?.name ?? "não estruturada"}. Alvo: ${targets || "não definido"}.`;
    }) : ["Sem medicações cadastradas."],
    severity: meds.some((m: any) => !m.formulation_id && !formulationForMedication(m)) ? "warn" : "info",
  });

  sections.push({
    id: "phenomenology",
    title: "3. Fenomenologia PK/PD — interpretação clínica",
    severity: phenomenologyInsights.some((x) => x.severity === "high") ? "high" : phenomenologyInsights.some((x) => x.severity === "warn") ? "warn" : "info",
    bullets: phenomenologyInsights.length ? phenomenologyInsights.slice(0, 10).map((x) => `${x.title}: ${x.summary}${x.management ? ` Manejo: ${x.management}` : ""}`) : ["Sem achados fenomenológicos suficientes. É necessário parear dose, horário, sono, cafeína/alimento e check-in pós-dose."],
    details: phenomenologyInsights.slice(0, 6).flatMap((x) => x.rationale.slice(0, 2).map((r) => `${x.domain} · ${x.confidence}: ${r}`)),
  });

  sections.push({
    id: "pkpd",
    title: "4. Linha temporal PK/PD — doses e fases",
    severity: doses.some((d: any) => /redose|problem|extra/.test(norm(d.log_type))) ? "high" : "info",
    bullets: doses.length ? doses.slice(0, 12).map((d: any) => {
      const phase = classifyDosePhase(d, meds);
      return `${dateTime(d.actual_time)} — ${doseName(d)} ${d.dose_text ?? `${d.dose_amount ?? "?"} ${d.dose_unit ?? ""}`} · fase atual estimada: ${phase.phase}. ${phase.note}${d.caffeine_near_dose_mg ? ` Cafeína: ${d.caffeine_near_dose_mg} mg.` : ""}${d.sleep_deprivation_at_dose_0_10 != null ? ` Privação sono: ${d.sleep_deprivation_at_dose_0_10}/10.` : ""}`;
    }) : ["Sem doses recentes para correlação PK/fenomenologia."],
    details: ["Curva relativa 0–100. A fase inferida usa formulação quando disponível; se a formulação estiver ausente, a confiança cai."],
  });

  sections.push({
    id: "effects",
    title: "4. Resposta por medicação",
    bullets: medicationEffects.length ? medicationEffects.map((m) => `${m.medication}: ${m.interpretation} Foco ${rounded(m.focusAvg)}/100 · ansiedade ${rounded(m.anxietyAvg)}/100 · sedação ${rounded(m.sedationAvg)}/100 · craving ${rounded(m.cravingAvg)}/100.`) : ["Sem dados suficientes."],
  });

  sections.push({
    id: "adherence",
    title: "5. Adesão, redose e estoque",
    severity: adherence.redoses ? "high" : forecast.stockAlerts.some((s) => s.severity === "high") ? "high" : adherence.missed || forecast.stockAlerts.length ? "warn" : "info",
    bullets: [
      adherence.interpretation,
      adherence.medianTimingDeviationMinutes != null ? `Desvio mediano do horário planejado: ${Math.round(adherence.medianTimingDeviationMinutes)} min.` : "Horário planejado insuficiente para calcular desvio.",
      ...(forecast.stockAlerts.length ? forecast.stockAlerts.map((s) => s.message) : ["Sem alerta de estoque baixo."]),
    ],
  });

  sections.push({
    id: "hypotheses",
    title: "6. Hipóteses clínicas geradas pelos registros",
    severity: hypotheses.some((h) => h.severity === "high") ? "high" : hypotheses.some((h) => h.severity === "warn") ? "warn" : "info",
    bullets: hypotheses.map((h) => `${h.probability.toUpperCase()} — ${h.title}: ${h.rationale} Manejo: ${h.management}`),
  });

  sections.push({
    id: "interactions",
    title: "7. Interações contextuais e cargas farmacológicas",
    severity: (interactions ?? []).some((i: any) => String(i.relevance ?? "").includes("alta") || String(i.severity ?? "").includes("high")) ? "high" : "info",
    bullets: interactions?.length ? interactions.map((it: any) => `${it.relevance ?? it.severity ?? "relevância"}: ${it.summary ?? it.title ?? "interação"}${it.mechanism ? ` — ${it.mechanism}` : ""}`) : ["Nenhuma interação contextual forte foi detectada com os dados atuais."],
  });

  sections.push({
    id: "forecast",
    title: "8. Previsão clínica das próximas horas",
    severity: forecast.warnings.some((w) => w.severity === "high") ? "high" : forecast.warnings.length ? "warn" : "info",
    bullets: [
      `Confiança da previsão: ${forecast.confidence}.`,
      ...(forecast.axes.length ? forecast.axes.map((a) => `${a.axis}: agora ${a.now}/100; próximas 6h ${a.next6h}/100; tendência ${a.direction}.`) : ["Sem eixos previstos suficientes."]),
      ...(forecast.warnings.length ? forecast.warnings.map((w) => `${w.title}: ${w.message}${w.action ? ` Ação: ${w.action}` : ""}`) : ["Sem alertas fortes nas próximas horas."]),
    ],
  });

  sections.push({
    id: "audit",
    title: "9. Dados faltantes que reduzem confiança",
    severity: (audit?.score ?? 100) < 60 || forecast.missingData.length >= 3 ? "warn" : "info",
    bullets: [
      audit ? `Score de auditoria: ${audit.score}/100.` : "Auditoria não calculada.",
      ...(audit?.findings?.slice(0, 8).map((f: any) => `${f.domain}: ${f.message}`) ?? []),
      ...(forecast.missingData.length ? forecast.missingData.map((m) => `Previsão: ${m}`) : ["Sem lacunas críticas de previsão."]),
    ],
  });

  const labs = buildLabRecommendations(input);
  sections.push({ id: "monitoring", title: "10. Monitorização e exames sugeridos", bullets: labs, severity: "info" });

  sections.push({
    id: "plan",
    title: "11. Pontos objetivos para próxima sessão",
    bullets: [
      "Confirmar medicações ativas, formulação e horário planejado antes de interpretar a curva.",
      "Exigir registro conjunto: dose + sono + cafeína + alimento + check-in pós-dose.",
      "Investigar qualquer redose como evento clínico: gatilho, fase da curva, afeto, craving, sono e acesso ao medicamento.",
      "Diferenciar benefício executivo real de ruído autonômico, sedação residual e busca de euforia/drive.",
    ],
  });

  return sections;
}

function makeMarkdown(output: Omit<ClinicalReportOutput, "markdown">) {
  const lines: string[] = [];
  lines.push(`# ${output.title}`);
  lines.push(`Gerado em: ${new Date(output.generatedAt).toLocaleString("pt-BR")}`);
  lines.push("");
  lines.push("## Síntese executiva");
  output.executiveSummary.forEach((b) => lines.push(`- ${b}`));
  lines.push("");
  output.sections.forEach((s) => {
    lines.push(`## ${s.title}`);
    s.bullets.forEach((b) => lines.push(`- ${b}`));
    if (s.details?.length) s.details.forEach((d) => lines.push(`  - ${d}`));
    lines.push("");
  });
  lines.push("## Observações de segurança");
  output.disclaimers.forEach((d) => lines.push(`- ${d}`));
  return lines.join("\n");
}

export function buildClinicalPharmacologyReport(input: BuildClinicalReportInput): ClinicalReportOutput {
  const patient = input.patient ?? {};
  const reportType = input.reportType ?? "farmaco_fenomenologico";
  const selectedSession = input.selectedSession ?? input.sessions?.[0];
  const hypothesesOutput = buildClinicalHypotheses({ patient, session: selectedSession, medications: input.medications, doses: input.doses, checkins: input.checkins, substanceUse: input.substanceUse });
  const forecast = buildMedicationEffectForecast({ patient, session: selectedSession, medications: input.medications, doses: input.doses as any, substances: input.substances as any, formulations: input.formulations, checkins: input.checkins, responseProfiles: input.individualProfiles, inventory: input.inventory });
  const adherence = buildAdherenceSummary(input);
  const medicationEffects = summarizeMedicationEffects(input);
  const phenomenologyInsights = buildPhenomenologyInsights({ patient, medications: input.medications, doses: input.doses, checkins: input.checkins, sessions: input.sessions, substanceUse: input.substanceUse, periodDays: input.periodDays });
  const sections = buildSections(input, medicationEffects, adherence, hypothesesOutput.hypotheses, forecast, phenomenologyInsights);
  const labRecommendations = buildLabRecommendations(input);
  const highHyp = hypothesesOutput.hypotheses.filter((h) => h.severity === "high").length;
  const redoseSignals = medicationEffects.reduce((sum, m) => sum + m.redoseCount, 0);
  const executiveSummary = [
    `${patient.full_name ?? "Paciente"}: relatório ${reportType.replace(/_/g, " ")} com ${input.doses?.length ?? 0} dose(s), ${input.checkins?.length ?? 0} check-in(s), ${input.medications?.length ?? 0} medicação(ões) e ${input.substanceUse?.length ?? 0} registro(s) de substâncias.`,
    adherence.interpretation,
    forecast.confidence ? `Confiança global da previsão: ${forecast.confidence}.` : "Confiança global não estimável.",
    highHyp ? `${highHyp} hipótese(s) de alta gravidade exigem revisão clínica.` : "Sem hipótese de alta gravidade detectada com os dados atuais.",
    redoseSignals ? `${redoseSignals} redose(s)/uso problemático(s) em dose logs: tratar como evento clínico, não como ajuste espontâneo.` : "Sem redose registrada no período analisado.",
  ];
  const base: Omit<ClinicalReportOutput, "markdown"> = {
    title: `Relatório clínico-farmacológico — ${patient.full_name ?? "paciente"}`,
    generatedAt: new Date().toISOString(),
    patientName: patient.full_name ?? "—",
    reportType,
    executiveSummary,
    sections,
    medicationEffects,
    hypotheses: hypothesesOutput.hypotheses,
    medicationSignals: hypothesesOutput.medicationSignals,
    forecastAxes: forecast.axes,
    warnings: forecast.warnings,
    stockAlerts: forecast.stockAlerts,
    adherence,
    missingData: [...(forecast.missingData ?? []), ...(input.audit?.findings?.map((f: any) => f.message) ?? [])].slice(0, 20),
    labRecommendations,
    phenomenologyInsights,
    disclaimers: [
      "Curvas relativas 0–100, não concentração sérica.",
      "Relatório de apoio clínico. Revisão médica obrigatória.",
      "Não gera prescrição automática e não substitui julgamento clínico.",
      "Associações temporais dose-sintoma não provam causalidade sem revisão longitudinal.",
    ],
    structuredData: { inputMeta: { reportType, counts: { medications: input.medications?.length ?? 0, doses: input.doses?.length ?? 0, sessions: input.sessions?.length ?? 0, checkins: input.checkins?.length ?? 0 } }, adherence, medicationEffects, hypotheses: hypothesesOutput.hypotheses, phenomenologyInsights, forecast, labRecommendations },
  };
  return { ...base, markdown: makeMarkdown(base) };
}

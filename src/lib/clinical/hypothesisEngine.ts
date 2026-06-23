function norm(s: any) { return String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function asNum(v: any) { const n = Number(v); return Number.isFinite(n) ? n : null; }
function hoursSince(t?: string) { if (!t) return null; return (Date.now() - new Date(t).getTime()) / 36e5; }

export type ClinicalHypothesis = {
  title: string;
  probability: "baixa" | "moderada" | "alta";
  severity: "info" | "warn" | "high";
  rationale: string;
  management: string;
  dataNeeded?: string[];
};

export type MedicationSignal = {
  medication: string;
  direction: "melhorando" | "piorando" | "misto" | "incerto";
  signal: string;
  confidence: "baixa" | "moderada" | "alta";
};

export function buildClinicalHypotheses(input: { patient?: any; session?: any; medications?: any[]; doses?: any[]; checkins?: any[]; substanceUse?: any[] }) {
  const p = input.patient ?? {};
  const session = input.session ?? {};
  const meds = input.medications ?? [];
  const doses = input.doses ?? [];
  const checkins = input.checkins ?? [];
  const subUse = input.substanceUse ?? [];
  const text = norm([p.current_complaint, p.clinical_history, p.substance_use_history, session.complaint, session.patient_narrative, session.physician_observation].filter(Boolean).join(" \n "));
  const sleepHours = asNum(session.sleep_hours);
  const recentStimulantDoses = doses.filter((d) => /lisdex|venvanse|lyberdia|metilfen|anfet|atomox/.test(norm(d.substance_name)) && (hoursSince(d.actual_time) ?? 999) <= 24);
  const recentBzd = doses.filter((d) => /clonaz|rivotril|alpraz|diazep|loraz/.test(norm(d.substance_name)) && (hoursSince(d.actual_time) ?? 999) <= 36);
  const recentOpioid = [...doses, ...subUse].filter((d: any) => /opio|code|morf|oxic|fentan|metadona|tramadol/.test(norm(d.substance_name ?? d.name)) && (hoursSince(d.actual_time ?? d.used_at) ?? 999) <= 72);
  const latest = checkins[0] ?? {};
  const paranoia = Math.max(asNum(latest.paranoia_0_10) ?? 0, asNum(latest.psychosis_0_10) ?? 0) * 10;
  const anxiety = Math.max(asNum(latest.anxiety_0_10) ?? 0, asNum(latest.autonomic_anxiety_0_10) ?? 0) * 10;
  const sedation = asNum(latest.sedation_0_10) != null ? asNum(latest.sedation_0_10)! * 10 : Math.max(...doses.map((d) => asNum(d.sedation_0_100) ?? 0), 0);
  const focus = asNum(latest.focus_0_10) != null ? asNum(latest.focus_0_10)! * 10 : Math.max(...doses.map((d) => asNum(d.focus_0_100) ?? 0), 0);
  const craving = asNum(latest.craving_0_10) != null ? asNum(latest.craving_0_10)! * 10 : Math.max(...doses.map((d) => asNum(d.craving_0_100) ?? 0), 0);
  const hyps: ClinicalHypothesis[] = [];

  if (recentStimulantDoses.length && sleepHours != null && sleepHours < 5) hyps.push({ title: "Ativação catecolaminérgica vulnerável por sono curto", probability: "alta", severity: "high", rationale: "Há estimulante/atomoxetina recente e sono <5h. Esse padrão aumenta ruído autonômico, irritabilidade, queda de crítica, redose e risco psicotomimético em vulneráveis.", management: "Priorizar sono, reduzir cafeína, registrar paranoia/ideias de referência e tratar redose como evento de risco, não como ajuste de dose.", dataNeeded: ["horário exato da dose", "cafeína", "check-in 1–4h pós-dose"] });
  if (recentStimulantDoses.some((d) => norm(d.log_type).includes("redose") || norm(d.log_type).includes("problem"))) hyps.push({ title: "Redose por reforço negativo / frustração executiva", probability: "alta", severity: "high", rationale: "Há registro de redose/uso problemático. Em TDAH grave, isso frequentemente representa tentativa de aliviar travamento, anedonia ou sensação de incapacidade, não apenas busca hedônica.", management: "Mapear gatilho anterior à redose, fase da curva, alimentação, sono e expectativa subjetiva de 'bater'. Criar regra de dose única e barreiras comportamentais.", dataNeeded: ["gatilho", "fase da curva", "humor/foco antes da redose"] });
  if (recentBzd.length && recentOpioid.length) hyps.push({ title: "Carga depressora SNC de alto risco", probability: "alta", severity: "high", rationale: "Benzodiazepínico e opioide/uso opioide recente aparecem próximos no histórico de registros.", management: "Alerta máximo: avaliar sedação, respiração, álcool e risco de recaída. Registrar como evento de segurança.", dataNeeded: ["dose/via", "álcool", "nível de sedação", "sinais respiratórios"] });
  if (sedation >= 65 && meds.some((m) => /clonaz|clonidina|valpro|dival|quetiap|pregabal/.test(norm(m.substances?.name ?? m.free_text_name)))) hyps.push({ title: "Carga sedativa atrapalhando função executiva", probability: "moderada", severity: "warn", rationale: "Sedação alta com medicações sedativas ativas. Pode produzir ressaca cognitiva e levar a compensação com estimulante.", management: "Diferenciar sedação terapêutica de ressaca. Cruzar sedação matinal com redose/queda executiva e estoque/adesão.", dataNeeded: ["sedação ao acordar", "horário da dose noturna", "foco antes do estimulante"] });
  if (text.includes("opio") || text.includes("fentan") || text.includes("morf") || text.includes("code")) hyps.push({ title: "Neuroadaptação pós-opioide contribuindo para anedonia/drive baixo", probability: "moderada", severity: "info", rationale: "História textual sugere TUS opioide. Em registros com anedonia, baixa energia e busca de estimulação, considerar componente de adaptação do sistema de recompensa.", management: "Monitorar anedonia, fissura, sono, dor, humor e resposta ao estimulante sem confundir ausência de euforia com ausência de efeito terapêutico.", dataNeeded: ["escala de anedonia", "craving opioide", "tempo desde recaída", "toxicológico se indicado"] });
  if (anxiety >= 60 && recentStimulantDoses.length) hyps.push({ title: "Efeito terapêutico misturado com ruído autonômico", probability: "moderada", severity: "warn", rationale: "Ansiedade autonômica alta com estimulante/atomoxetina recente pode contaminar a leitura do efeito: paciente sente 'algo', mas isso pode ser colateral, não foco útil.", management: "Separar foco útil de taquicardia, sudorese, tremor e irritabilidade. Cruzar com cafeína e fase de come-up/pico.", dataNeeded: ["PA/FC", "cafeína mg", "fase da curva"] });
  if (paranoia >= 30 && recentStimulantDoses.length) hyps.push({ title: "Sinal psicotomimético contextual", probability: paranoia >= 60 ? "alta" : "moderada", severity: paranoia >= 60 ? "high" : "warn", rationale: "Paranoia/ideias de referência surgem junto de estímulo catecolaminérgico, especialmente se houver sono curto/redose.", management: "Elevar gravidade do alerta, registrar sono/cafeína/redose e considerar contenção do eixo estimulante se persistente.", dataNeeded: ["conteúdo persecutório", "crítica", "privação de sono", "redose"] });

  const medicationSignals: MedicationSignal[] = meds.map((m) => {
    const name = m.substances?.name ?? m.free_text_name ?? "medicação";
    const related = doses.filter((d) => d.patient_medication_id === m.id || norm(d.substance_name).includes(norm(name).slice(0, 6))).slice(0, 8);
    if (!related.length) return { medication: name, direction: "incerto", confidence: "baixa", signal: "Sem doses/check-ins vinculados suficientes." };
    const avgBenefit = related.reduce((a, d) => a + (asNum(d.benefit_0_100) ?? 0), 0) / related.length;
    const avgAdverse = related.reduce((a, d) => a + (asNum(d.adverse_0_100) ?? 0), 0) / related.length;
    if (avgBenefit >= 60 && avgAdverse < 45) return { medication: name, direction: "melhorando", confidence: related.length >= 3 ? "moderada" : "baixa", signal: `Benefício médio ${Math.round(avgBenefit)}/100 com adverso ${Math.round(avgAdverse)}/100.` };
    if (avgAdverse >= 60 && avgBenefit < 50) return { medication: name, direction: "piorando", confidence: related.length >= 3 ? "moderada" : "baixa", signal: `Adverso médio ${Math.round(avgAdverse)}/100 maior que benefício ${Math.round(avgBenefit)}/100.` };
    return { medication: name, direction: "misto", confidence: related.length >= 3 ? "moderada" : "baixa", signal: `Benefício ${Math.round(avgBenefit)}/100 e adverso ${Math.round(avgAdverse)}/100; exige correlação com fase da curva.` };
  });

  if (!hyps.length) hyps.push({ title: "Dados insuficientes para hipótese forte", probability: "baixa", severity: "info", rationale: "Faltam registros correlacionáveis de dose, sono, cafeína e check-ins.", management: "Priorizar diário simples: tomada, sono, cafeína, foco, ansiedade, sedação, craving e redose.", dataNeeded: ["dose + formulação", "sono", "check-in pós-dose"] });
  return { hypotheses: hyps.slice(0, 6), medicationSignals };
}

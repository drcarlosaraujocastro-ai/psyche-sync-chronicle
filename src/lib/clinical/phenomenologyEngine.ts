import { bestAlias } from "@/lib/pharmacology/aliasResolver";
import type { KBTemplate } from "@/lib/pharmacologyKnowledgeBase";
import { getRuntimeKnowledgeBase } from "@/lib/pharmacology/runtimeKnowledge";

export type PhenomenologySeverity = "info" | "warn" | "high";
export type PhenomenologyDomain =
  | "pkpd"
  | "redose"
  | "wearoff"
  | "tolerancia"
  | "sono"
  | "cafeina"
  | "sedacao"
  | "tus"
  | "hipotese";

export interface PhenomenologyInsight {
  id: string;
  domain: PhenomenologyDomain;
  title: string;
  severity: PhenomenologySeverity;
  confidence: "baixa" | "moderada" | "alta";
  summary: string;
  rationale: string[];
  management?: string;
  missingData?: string[];
  involved?: string[];
}

export interface PhenomenologyInput {
  patient?: any;
  medications?: any[];
  doses?: any[];
  checkins?: any[];
  sessions?: any[];
  substanceUse?: any[];
  periodDays?: number;
  now?: Date;
}

const accentless = (s: any) => String(s ?? "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim();

function normalDrugText(v: any) {
  return accentless(v)
    .replace(/→/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function n(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function avg(xs: Array<number | null | undefined>) {
  const vals = xs.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function canonicalName(raw: any): string {
  const s = String(raw ?? "").split("→").pop()?.trim() || String(raw ?? "").trim();
  const m = bestAlias(s, 0.72) || bestAlias(String(raw ?? ""), 0.72);
  return m?.template?.name ?? s;
}

function templateForName(raw: any): KBTemplate | null {
  const m = bestAlias(String(raw ?? ""), 0.72);
  if (m?.template) return m.template;
  const name = accentless(canonicalName(raw));
  return getRuntimeKnowledgeBase().find((t) => accentless(t.name) === name || accentless(t.generic_name) === name) ?? null;
}

function doseName(d: any) {
  return d?.substance_name || d?.substances?.name || d?.free_text_name || d?.brand_name || "substância";
}

function medName(m: any) {
  const brand = m?.brand_name || m?.free_text_name;
  const canonical = m?.substances?.name;
  if (brand && canonical && normalDrugText(brand) !== normalDrugText(canonical)) return `${brand} → ${canonical}`;
  return canonical || brand || m?.medication_name || "medicação";
}

function getWindowHours(t?: KBTemplate | null) {
  const fm = t?.formulations?.[0];
  const duration = Number(fm?.duration_max_value ?? t?.total_duration_max_value ?? 8);
  const durationUnit = String(fm?.duration_unit ?? t?.total_duration_unit ?? "horas");
  const tail = Number(fm?.tail_max_value ?? t?.tail_max_value ?? t?.residual_max_value ?? duration);
  const tailUnit = String(fm?.tail_unit ?? t?.tail_unit ?? t?.residual_unit ?? durationUnit);
  const durH = durationUnit.startsWith("min") ? duration / 60 : durationUnit.startsWith("dia") ? duration * 24 : duration;
  const tailH = tailUnit.startsWith("min") ? tail / 60 : tailUnit.startsWith("dia") ? tail * 24 : tail;
  return {
    durationH: Number.isFinite(durH) && durH > 0 ? durH : 8,
    tailH: Number.isFinite(tailH) && tailH > 0 ? tailH : Math.max(12, durH || 8),
  };
}

function hoursBetween(a: any, b: any) {
  const A = new Date(a).getTime();
  const B = new Date(b).getTime();
  if (!Number.isFinite(A) || !Number.isFinite(B)) return null;
  return Math.abs(B - A) / 36e5;
}

function isStimulantName(x: any) {
  const s = normalDrugText(x);
  return /lisdex|venvanse|lyberdia|juneve|vyvanse|elvanse|metilfen|ritalina|concerta|anfet|dextroanf|cocaina|cocain/.test(s);
}

function isSedativeName(x: any) {
  const s = normalDrugText(x);
  return /clonaz|rivotril|alpraz|diazep|loraz|quetiap|mirtaz|trazod|zolpid|pregabal|gabap/.test(s);
}

function isOpioidName(x: any) {
  const s = normalDrugText(x);
  return /opio|codein|codeina|morf|oxicod|fentan|metadon|buprenor|tramadol/.test(s);
}

function latestCheckin(checkins: any[] = []) {
  return [...checkins].sort((a, b) => new Date(b.checkin_at ?? b.created_at ?? 0).getTime() - new Date(a.checkin_at ?? a.created_at ?? 0).getTime())[0] ?? null;
}

function scoreFromCheckin(c: any, keys: string[]) {
  for (const k of keys) {
    const val = n(c?.[k]);
    if (val != null) return val > 10 ? val : val * 10;
  }
  return null;
}

function pushUnique(arr: PhenomenologyInsight[], insight: PhenomenologyInsight) {
  if (!arr.some((x) => x.id === insight.id)) arr.push(insight);
}

export function buildPhenomenologyInsights(input: PhenomenologyInput): PhenomenologyInsight[] {
  const doses = [...(input.doses ?? [])].sort((a, b) => new Date(a.actual_time ?? 0).getTime() - new Date(b.actual_time ?? 0).getTime());
  const meds = input.medications ?? [];
  const checkins = input.checkins ?? [];
  const sessions = input.sessions ?? [];
  const subUse = input.substanceUse ?? [];
  const patient = input.patient ?? {};
  const out: PhenomenologyInsight[] = [];

  const grouped = new Map<string, any[]>();
  for (const d of doses) {
    const key = canonicalName(doseName(d));
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(d);
  }

  for (const [name, ds] of grouped.entries()) {
    const t = templateForName(name);
    const win = getWindowHours(t);
    const sorted = [...ds].sort((a, b) => new Date(a.actual_time).getTime() - new Date(b.actual_time).getTime());
    for (let i = 1; i < sorted.length; i++) {
      const gap = hoursBetween(sorted[i - 1].actual_time, sorted[i].actual_time);
      if (gap == null) continue;
      const previous = sorted[i - 1];
      const current = sorted[i];
      const isRedoseLog = /redose|extra|problem|abuso|misuse/.test(normalDrugText(current.log_type));
      if (gap <= win.durationH || isRedoseLog) {
        pushUnique(out, {
          id: `redose-active-${name}-${i}`,
          domain: "redose",
          title: `${name}: redose/sobreposição durante janela funcional`,
          severity: isStimulantName(name) ? "high" : "warn",
          confidence: "alta",
          involved: [name],
          summary: `Duas doses de ${name} apareceram separadas por ${gap.toFixed(1)} h; isso fica dentro da duração funcional estimada (${Math.round(win.durationH)} h) ou foi marcado como redose.`,
          rationale: [
            "O efeito não soma linearmente; tende a prolongar área sob curva funcional e aumentar ruído adverso.",
            "Em estimulantes, esse padrão eleva risco de insônia, irritabilidade, PA/FC, hiperfoco estéril e sintomas psicotomiméticos em vulneráveis.",
            current.caffeine_near_dose_mg ? `Cafeína próxima na dose atual: ${current.caffeine_near_dose_mg} mg.` : "Cafeína próxima não informada ou ausente.",
            current.sleep_deprivation_at_dose_0_10 != null ? `Privação de sono na dose atual: ${current.sleep_deprivation_at_dose_0_10}/10.` : "Privação de sono da dose não informada.",
          ],
          management: "Tratar como evento clínico: registrar gatilho, expectativa de produtividade, fase da curva, sono, cafeína, ansiedade, paranoia e craving. Não interpretar automaticamente como dose insuficiente.",
          missingData: [previous.perceived_effect_text || current.perceived_effect_text ? "" : "motivo subjetivo da redose"].filter(Boolean),
        });
      } else if (gap <= win.tailH) {
        pushUnique(out, {
          id: `redose-tail-${name}-${i}`,
          domain: "redose",
          title: `${name}: nova dose em cauda residual`,
          severity: isStimulantName(name) ? "warn" : "info",
          confidence: "moderada",
          involved: [name],
          summary: `Nova dose de ${name} ocorreu ${gap.toFixed(1)} h após a anterior; fora da janela funcional principal, mas dentro de cauda residual estimada (${Math.round(win.tailH)} h).`,
          rationale: ["Pode não gerar pico sobreposto clássico, mas pode prolongar insônia, sedação residual, tolerância subjetiva ou ruído autonômico, conforme a classe."],
          management: "No relatório, separar efeito terapêutico da cauda residual e avaliar sono no dia seguinte.",
        });
      }
    }

    const redoses = sorted.filter((d) => /redose|extra|problem|abuso|misuse/.test(normalDrugText(d.log_type))).length;
    if (redoses >= 2 || (isStimulantName(name) && sorted.length >= 4)) {
      pushUnique(out, {
        id: `tolerance-context-${name}`,
        domain: "tolerancia",
        title: `${name}: diferenciar tolerância real de contexto ruim`,
        severity: "warn",
        confidence: "moderada",
        involved: [name],
        summary: `${name} tem múltiplos registros/redoses no período. Antes de assumir tolerância farmacológica, separar tolerância subjetiva, sono ruim, cafeína, alimentação, anedonia e expectativa de “bater”.`,
        rationale: [
          "Tolerância ao componente eufórico/ativador pode surgir antes de perda do benefício executivo real.",
          "Períodos sem uso, sono restaurado e redução de cafeína podem recuperar parte da percepção terapêutica sem mudança de dose.",
        ],
        management: "Criar marcador de resposta por contexto: dose + sono + cafeína + alimento + check-in 2–4h pós-dose.",
      });
    }
  }

  const stimulantDoses = doses.filter((d) => isStimulantName(doseName(d)));
  const highCaf = stimulantDoses.filter((d) => n(d.caffeine_near_dose_mg) != null && Number(d.caffeine_near_dose_mg) >= 250);
  if (highCaf.length) {
    pushUnique(out, {
      id: "stimulant-caffeine-phenomenology",
      domain: "cafeina",
      title: "Cafeína está confundindo a leitura fenomenológica do estimulante",
      severity: "warn",
      confidence: "alta",
      involved: Array.from(new Set(highCaf.map((d) => canonicalName(doseName(d))))),
      summary: `${highCaf.length} dose(s) de estimulante tiveram cafeína ≥250 mg próxima. Isso pode parecer “efeito forte”, mas frequentemente é ruído autonômico, não melhora executiva limpa.`,
      rationale: ["Cafeína aumenta ansiedade autonômica, tremor, taquicardia, sudorese e insônia.", "Em TDAH/TUS, desconforto autonômico pode induzir compensação, redose ou uso de sedativos."],
      management: "No diário, registrar cafeína por dose e comparar dias com baixa cafeína vs alta cafeína antes de concluir falha de estimulante.",
    });
  }

  const poorSleepDoses = stimulantDoses.filter((d) => n(d.sleep_deprivation_at_dose_0_10) != null && Number(d.sleep_deprivation_at_dose_0_10) >= 6);
  const shortSleepSessions = sessions.filter((s) => n(s.sleep_hours) != null && Number(s.sleep_hours) < 5);
  if (poorSleepDoses.length || shortSleepSessions.length) {
    pushUnique(out, {
      id: "sleep-stimulant-phenomenology",
      domain: "sono",
      title: "Sono ruim muda a farmacodinâmica percebida do estimulante",
      severity: "high",
      confidence: "alta",
      involved: Array.from(new Set(poorSleepDoses.map((d) => canonicalName(doseName(d))))),
      summary: "Há registro de estimulante em contexto de privação de sono ou sessões com sono <5h. Essa combinação reduz confiabilidade da leitura de dose e aumenta risco psicotomimético.",
      rationale: ["Privação de sono aumenta irritabilidade, impulsividade e vieses persecutórios/ideias de referência.", "A mesma dose pode parecer menos pró-executiva e mais ansiogênica quando o córtex está privado de sono."],
      management: "Não titular dose com base em dias privados de sono. Priorizar restauração do sono antes de concluir tolerância ou falha farmacológica.",
    });
  }

  const latest = latestCheckin(checkins);
  if (latest) {
    const focus = scoreFromCheckin(latest, ["focus_0_100", "focus", "focus_0_10", "attention_0_10"]);
    const anxiety = scoreFromCheckin(latest, ["anxiety_0_100", "anxiety", "anxiety_0_10"]);
    const sedation = scoreFromCheckin(latest, ["sedation_0_100", "sedation", "sedation_0_10"]);
    const craving = scoreFromCheckin(latest, ["craving_0_100", "craving", "craving_0_10"]);
    const paranoia = scoreFromCheckin(latest, ["paranoia_0_100", "paranoia", "paranoia_0_10"]);
    if ((anxiety ?? 0) >= 60 && stimulantDoses.length) {
      pushUnique(out, {
        id: "anxiety-pkpd-checkin",
        domain: "pkpd",
        title: "Ansiedade elevada precisa ser localizada na curva",
        severity: "warn",
        confidence: "moderada",
        involved: Array.from(new Set(stimulantDoses.map((d) => canonicalName(doseName(d))))),
        summary: `Último check-in mostrou ansiedade ${Math.round(anxiety!)}/100. Sem parear com fase da curva, não dá para saber se é come-up, pico, offset, cafeína ou privação.`,
        rationale: ["Ansiedade no come-up sugere subida rápida/ruído autonômico; ansiedade no offset sugere rebote/wearing-off; ansiedade fora da curva sugere eixo basal/contextual."],
        management: "Forçar check-in rápido em três pontos: 90–120 min, pico estimado e offset estimado.",
      });
    }
    if ((focus ?? 100) <= 40 && stimulantDoses.length) {
      pushUnique(out, {
        id: "focus-low-wearoff",
        domain: "wearoff",
        title: "Baixo foco pode ser wearing-off, não dose insuficiente global",
        severity: "warn",
        confidence: "moderada",
        involved: Array.from(new Set(stimulantDoses.map((d) => canonicalName(doseName(d))))),
        summary: `Último check-in mostrou foco ${Math.round(focus!)}/100 em paciente com estimulante registrado. A interpretação depende do horário relativo à dose.`,
        rationale: ["Baixo foco no final da curva sugere queda funcional; baixo foco no pico sugere sono, cafeína, ansiedade, sedação residual ou dose inadequada; baixo foco sem dose sugere adesão/rotina."],
        management: "Registrar horário exato do check-in e fase estimada da curva. Evitar redose reflexa sem confirmar fase.",
      });
    }
    if ((sedation ?? 0) >= 60) {
      const sedMeds = meds.map(medName).filter(isSedativeName);
      pushUnique(out, {
        id: "sedation-executive-cost",
        domain: "sedacao",
        title: "Sedação pode estar sabotando benefício executivo",
        severity: "warn",
        confidence: sedMeds.length ? "alta" : "moderada",
        involved: sedMeds,
        summary: `Último check-in mostrou sedação ${Math.round(sedation!)}/100. Em TDAH grave, sedação residual frequentemente vira compensação com estimulante/cafeína/redose.`,
        rationale: ["Sedativos podem proteger sono, mas ressaca cognitiva reduz iniciação e memória operacional.", "O paciente pode interpretar lentificação como falha do estimulante."],
        management: "Separar sedação terapêutica noturna de ressaca diurna. Cruzar horário de clonazepam/clonidina/divalproato com foco matinal.",
      });
    }
    if ((paranoia ?? 0) >= 50 && stimulantDoses.length) {
      pushUnique(out, {
        id: "psychotomimetic-context",
        domain: "pkpd",
        title: "Sinal psicotomimético contextual",
        severity: "high",
        confidence: "alta",
        involved: Array.from(new Set(stimulantDoses.map((d) => canonicalName(doseName(d))))),
        summary: `Check-in com paranoia ${Math.round(paranoia!)}/100 em contexto de estimulante exige revisão de sono, redose e cafeína.`,
        rationale: ["Histórico de delírio/paranoia por privação + estimulante torna esse achado clinicamente pesado."],
        management: "Priorizar segurança, sono e suspensão de redose/cafeína antes de novas camadas catecolaminérgicas.",
      });
    }
    if ((craving ?? 0) >= 50) {
      pushUnique(out, {
        id: "craving-context",
        domain: "tus",
        title: "Craving/fissura precisa ser lido por fase e afeto",
        severity: "warn",
        confidence: "moderada",
        summary: `Último check-in mostrou craving ${Math.round(craving!)}/100. Isso deve ser cruzado com queda da curva, frustração executiva, isolamento, dor emocional e acesso a substâncias.`,
        rationale: ["Fissura no offset pode ser reforço negativo; fissura fora da curva pode ser eixo adictivo/afetivo basal."],
        management: "Registrar gatilho, substância-alvo, intensidade pré/pós e consequência funcional.",
      });
    }
  }

  const hist = normalDrugText([patient.substance_use_history, patient.clinical_history, patient.current_complaint].join(" "));
  const opioidHistory = /opio|codein|codeina|morf|oxicod|fentan|metadon/.test(hist) || subUse.some((s) => isOpioidName(s.substance_name));
  const stimMed = meds.map(medName).some(isStimulantName) || stimulantDoses.length > 0;
  if (opioidHistory && stimMed) {
    pushUnique(out, {
      id: "post-opioid-dopamine-executive",
      domain: "hipotese",
      title: "Hipótese de anergia/neuroadaptação pós-opioide modulando resposta ao estimulante",
      severity: "info",
      confidence: "moderada",
      summary: "Histórico opioide + necessidade de estimulante sugere que anedonia/baixa motivação podem amplificar busca por restauração funcional.",
      involved: ["histórico opioide", "estimulante"],
      rationale: ["O padrão de redose pode ser reforço negativo: alívio do travamento e sensação de incapacidade, não necessariamente busca hedônica primária."],
      management: "No relatório, diferenciar busca por euforia, automedicação executiva, anedonia pós-opioide e falha terapêutica real.",
    });
  }

  if (!doses.length) {
    pushUnique(out, {
      id: "missing-dose-phenomenology",
      domain: "pkpd",
      title: "Sem dose registrada: impossível fazer fenomenologia PK/PD",
      severity: "info",
      confidence: "alta",
      summary: "Sem dose real com horário, o sistema só consegue listar medicações, não correlacionar curva e sintomas.",
      rationale: ["A fenomenologia exige dose + horário + contexto + check-in."],
      management: "Registrar pelo menos: horário real da dose, formulação, alimento, cafeína, sono e check-in pós-dose.",
    });
  }

  return out.sort((a, b) => {
    const rank = { high: 3, warn: 2, info: 1 } as const;
    return rank[b.severity] - rank[a.severity];
  });
}

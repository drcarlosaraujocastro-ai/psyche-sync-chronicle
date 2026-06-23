/**
 * Engine de interações contextuais — sem alarmismo genérico.
 */

export type InteractionRelevance =
  | "informativa"
  | "monitorar"
  | "cautela"
  | "relevante"
  | "urgente";

export type InteractionCategory =
  | "metabolica"
  | "farmacodinamica"
  | "comportamental"
  | "substancia-uso"
  | "contextual";

export interface InteractionInput {
  activeMedications: { name: string; classHint?: string }[];
  recentDoses: { substanceName: string; actualTime: string | Date; logType?: string; doseAmount?: number | null; caffeineMg?: number | null; sleepDeprivation?: number | null }[];
  recentSubstanceUse: { substanceName: string; usedAt: string | Date }[];
  sessionContext?: {
    sleepHours?: number | null;
    caffeine?: string | null;
    suicideRisk?: string | null;
  };
}

export interface InteractionFinding {
  category: InteractionCategory;
  relevance: InteractionRelevance;
  summary: string;
  detail?: string;
  involvedSubstances: string[];
  mechanism?: string;
  monitor?: string[];
  action?: string;
  confidence: "baixa" | "moderada" | "alta";
}

const norm = (s: string) => s.toLowerCase();
const includesAny = (s: string, list: string[]) =>
  list.some((x) => norm(s).includes(x));

const STIMULANTS = ["metilfenidato", "ritalina", "concerta", "foq", "lisdexanfetamina", "lisdexamfetamine", "venvanse", "lyberdia", "juneve", "vyvanse", "elvanse", "anfetamina", "dextroanfetamina"];
const BENZOS = ["clonazepam", "rivotril", "klonopin", "diazepam", "alprazolam", "lorazepam", "midazolam"];
const OPIOIDS = ["opioide", "morfina", "oxicodona", "codeina", "codeína", "fentanil", "metadona", "buprenorfina", "tramadol"];
const SEDATIVE = ["quetiapina", "mirtazapina", "trazodona"];
const ALPHA2 = ["clonidina", "atensina", "catapres", "guanfacina"];
const ATOMOXETINE = ["atomoxetina", "atentah", "strattera"];
const VALPROATE = ["divalproato", "valproato", "ácido valproico", "acido valproico", "depakote", "torval", "valpakine"];

function canonicalDoseKey(name: string) {
  const n = norm(name).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/lyberdia|venvanse|juneve|vyvanse|elvanse|lisdex/.test(n)) return "lisdexanfetamina";
  if (/ritalina|concerta|foq|metilfen/.test(n)) return "metilfenidato";
  if (/rivotril|clonaz/.test(n)) return "clonazepam";
  if (/atentah|strattera|atomox/.test(n)) return "atomoxetina";
  if (/vurtuoso|brintellix|trintellix|vortiox/.test(n)) return "vortioxetina";
  if (/depak|depakene|torval|valpakine|dival|valpro/.test(n)) return "valproato";
  return n.replace(/.*→/g, "").trim();
}

function expectedWindowHours(key: string) {
  if (key === "lisdexanfetamina") return { active: 14, tail: 24, label: "pró-fármaco anfetamínico" };
  if (key === "metilfenidato") return { active: 4, tail: 8, label: "metilfenidato IR/LA/OROS variável" };
  if (key === "atomoxetina") return { active: 24, tail: 72, label: "NRI de uso contínuo" };
  if (key === "clonazepam") return { active: 12, tail: 72, label: "benzodiazepínico de meia-vida longa" };
  if (key === "valproato") return { active: 24, tail: 72, label: "estabilizador/ER" };
  return { active: 8, tail: 24, label: "janela conservadora" };
}

export function runInteractionEngine(input: InteractionInput): InteractionFinding[] {
  const findings: InteractionFinding[] = [];
  const allNames = [
    ...input.activeMedications.map((m) => m.name),
    ...input.recentDoses.map((d) => d.substanceName),
    ...input.recentSubstanceUse.map((s) => s.substanceName),
  ];
  const has = (list: string[]) => allNames.find((n) => includesAny(n, list));

  const stim = has(STIMULANTS);
  const benzo = has(BENZOS);
  const opi = has(OPIOIDS);
  const sed = has(SEDATIVE);
  const alpha2 = has(ALPHA2);
  const atomoxetine = has(ATOMOXETINE);
  const valproate = has(VALPROATE);
  const caffeine = allNames.find((n) => norm(n).includes("cafeína") || norm(n).includes("cafeina"));
  const doseCaffeine = input.recentDoses.find((d) => Number(d.caffeineMg) >= 150);
  const alcool = allNames.find((n) => norm(n).includes("álcool") || norm(n).includes("alcool"));
  const bupropiona = allNames.find((n) => norm(n).includes("bupropiona"));
  const vortioxetina = allNames.find((n) => norm(n).includes("vortioxetina"));

  if (stim && (caffeine || doseCaffeine)) {
    findings.push({
      category: "farmacodinamica",
      relevance: "monitorar",
      summary: "Estimulante + cafeína: possível ruído autonômico e insônia.",
      involvedSubstances: [stim, caffeine ?? `cafeína ${doseCaffeine?.caffeineMg ?? "registrada"} mg`],
      mechanism: "Soma de drive noradrenérgico/adenosinérgico",
      monitor: ["taquicardia", "ansiedade", "insônia"],
      action: "Considerar reduzir cafeína ou afastá-la do horário de pico.",
      confidence: "moderada",
    });
  }

  const sleepRiskDose = input.recentDoses.find((d) => Number(d.sleepDeprivation) >= 6);
  if (stim && sleepRiskDose) {
    findings.push({
      category: "contextual",
      relevance: "relevante",
      summary: "Estimulante + privação de sono: maior risco de irritabilidade, redose e fenômeno psicotomimético.",
      detail: "A curva teórica pode estar correta, mas a fenomenologia muda: mais ruído autonômico, menor tolerância à frustração, maior chance de paranoia/ideias de referência e falsa leitura de 'não funcionou'.",
      involvedSubstances: [stim, sleepRiskDose.substanceName],
      mechanism: "Privação reduz controle pré-frontal e aumenta saliência/reatividade catecolaminérgica.",
      monitor: ["sono", "cafeína", "PA/FC", "irritabilidade", "paranoia", "motivação da redose"],
      action: "Não interpretar resposta ruim como falha primária do fármaco antes de corrigir sono/cafeína.",
      confidence: "alta",
    });
  }

  if (stim && atomoxetine) {
    findings.push({
      category: "farmacodinamica",
      relevance: "cautela",
      summary: "Estimulante + atomoxetina: somação noradrenérgica/catecolaminérgica.",
      detail: "Pode ser racional para cobertura executiva, mas aumenta risco de PA/FC, insônia, irritabilidade, sudorese, ansiedade autonômica e sintomas psicotomiméticos em vulneráveis.",
      involvedSubstances: [stim, atomoxetine],
      mechanism: "LDX aumenta DA/NE por liberação; atomoxetina aumenta NE e DA pré-frontal via NET.",
      monitor: ["PA", "FC", "sono", "irritabilidade", "ansiedade", "paranoia", "redose"],
      action: "Usar dose baixa/monitorada e revisar cafeína/sono antes de atribuir efeito adverso a uma só substância.",
      confidence: "alta",
    });
  }

  if (stim && sed) {
    findings.push({
      category: "farmacodinamica",
      relevance: "cautela",
      summary: "Estimulante + sedativo: tensão pró-vigília x anti-hiperarousal.",
      involvedSubstances: [stim, sed],
      detail: "Pode ser racional no eixo sono/impulsividade, mas avaliar timing.",
      monitor: ["sedação residual matinal", "hiperfoco estéril", "insônia"],
      confidence: "moderada",
    });
  }

  if (benzo && (opi || alcool)) {
    findings.push({
      category: "farmacodinamica",
      relevance: "relevante",
      summary: "Benzodiazepínico + opioide/álcool: risco de depressão do SNC.",
      involvedSubstances: [benzo, opi ?? alcool!].filter(Boolean) as string[],
      mechanism: "Potenciação GABAérgica + depressão respiratória opioide/álcool",
      monitor: ["sedação", "frequência respiratória", "nível de consciência"],
      action: "Discutir desprescrição/redução; orientar redução de dano.",
      confidence: "alta",
    });
  }

  if (bupropiona && vortioxetina) {
    findings.push({
      category: "metabolica",
      relevance: "cautela",
      summary: "Bupropiona inibe CYP2D6 — pode elevar exposição à vortioxetina.",
      involvedSubstances: [bupropiona, vortioxetina],
      mechanism: "Inibição CYP2D6",
      monitor: ["náusea", "tontura", "efeitos adversos da vortioxetina"],
      action: "Considerar dose menor da vortioxetina.",
      confidence: "alta",
    });
  }

  if (alpha2 && sed) {
    findings.push({
      category: "farmacodinamica",
      relevance: "monitorar",
      summary: "Alfa-2 agonista + sedativo: hipotensão e sedação contextuais.",
      involvedSubstances: [alpha2, sed],
      monitor: ["PA", "tontura ortostática", "sedação diurna"],
      confidence: "moderada",
    });
  }

  if (alpha2 && benzo) {
    findings.push({
      category: "farmacodinamica",
      relevance: "cautela",
      summary: "Clonidina/agonista alfa-2 + benzodiazepínico: sedação, hipotensão e ressaca cognitiva.",
      involvedSubstances: [alpha2, benzo],
      mechanism: "Redução noradrenérgica central + facilitação GABA-A.",
      monitor: ["PA", "FC", "tontura", "sedação matinal", "cognição", "compensação com estimulante"],
      action: "Separar efeito terapêutico de sono de ressaca/embotamento executivo no dia seguinte.",
      confidence: "alta",
    });
  }

  if (valproate && benzo) {
    findings.push({
      category: "farmacodinamica",
      relevance: "monitorar",
      summary: "Valproato/divalproato + benzodiazepínico: carga sedativa/cognitiva somada.",
      involvedSubstances: [valproate, benzo],
      mechanism: "Modulação GABA/glutamato + facilitação GABA-A.",
      monitor: ["sedação", "tremor", "lentificação", "memória", "função executiva"],
      action: "Diferenciar estabilização de humor de embotamento funcional.",
      confidence: "moderada",
    });
  }

  const redoseFlag = input.recentDoses.find((d) => /redose|extra|problem|abuso|misuse|uso_problematico/i.test(String(d.logType ?? "")));
  if (redoseFlag) {
    findings.push({
      category: "comportamental",
      relevance: "relevante",
      summary: `${canonicalDoseKey(redoseFlag.substanceName)}: registro marcado como ${redoseFlag.logType}.`,
      detail: "Redose/uso problemático é evento clínico em si, mesmo quando não há outra dose capturada no intervalo. Interpretar motivação, fase da curva, sono e cafeína.",
      involvedSubstances: [redoseFlag.substanceName],
      mechanism: "Reforço negativo, busca de restauração funcional, tolerância subjetiva ou escalada hedônica podem gerar o mesmo comportamento; o app precisa diferenciar por check-in.",
      monitor: ["gatilho", "fase da curva", "sono", "cafeína", "ansiedade/paranoia", "craving"],
      action: "Registrar check-in 1–3h após redose e comparar com dose sem redose.",
      confidence: "alta",
    });
  }

  // Interação intrassubstância: duas doses do mesmo fármaco/produto no mesmo período.
  const doseGroups = new Map<string, typeof input.recentDoses>();
  for (const d of input.recentDoses) {
    const key = canonicalDoseKey(d.substanceName || "");
    if (!key) continue;
    if (!doseGroups.has(key)) doseGroups.set(key, [] as any);
    doseGroups.get(key)!.push(d);
  }
  for (const [key, group] of doseGroups.entries()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => new Date(a.actualTime).getTime() - new Date(b.actualTime).getTime());
    const win = expectedWindowHours(key);
    for (let i = 1; i < sorted.length; i++) {
      const gap = (new Date(sorted[i].actualTime).getTime() - new Date(sorted[i - 1].actualTime).getTime()) / 3_600_000;
      if (!Number.isFinite(gap) || gap < 0) continue;
      if (gap <= win.active) {
        findings.push({
          category: "comportamental",
          relevance: key === "lisdexanfetamina" || key === "metilfenidato" ? "relevante" : "cautela",
          summary: `${key}: duas doses em ${gap.toFixed(1)} h — sobreposição dentro da janela funcional (${win.active} h).`,
          detail: `Isso é interação da substância consigo mesma: a segunda dose ocorre enquanto a primeira ainda pode estar ativa. Para ${win.label}, o efeito tende a prolongar área funcional/cauda e aumentar adversos, não somar eficácia linearmente.`,
          involvedSubstances: [sorted[i - 1].substanceName, sorted[i].substanceName],
          mechanism: "Sobreposição temporal de curvas PK/PD relativas; possível saturação de benefício e amplificação de eventos adversos.",
          monitor: key === "lisdexanfetamina" ? ["sono", "PA/FC", "irritabilidade", "paranoia", "cafeína", "motivação da redose", "benefício real vs reforço"] : ["sedação/adversos", "sono", "benefício real"],
          action: "Registrar gatilho da segunda dose e check-in 1–3 h depois; não interpretar como necessidade automática de dose maior.",
          confidence: "alta",
        });
        break;
      }
      if (gap <= win.tail) {
        findings.push({
          category: "comportamental",
          relevance: "monitorar",
          summary: `${key}: nova dose em ${gap.toFixed(1)} h — dentro de cauda residual estimada (${win.tail} h).`,
          detail: "Mesmo fora do pico principal, a cauda residual pode contaminar sono, sedação, ansiedade ou tolerância subjetiva.",
          involvedSubstances: [sorted[i - 1].substanceName, sorted[i].substanceName],
          mechanism: "Interação por cauda residual/efeito carry-over.",
          monitor: ["sono", "ressaca/residual", "ansiedade", "efeito percebido"],
          confidence: "moderada",
        });
        break;
      }
    }
  }


  // Cargas farmacológicas globais — mais útil clinicamente que lista par-a-par isolada.
  const serotonergic = allNames.filter((n) => includesAny(n, ["vortioxetina", "vurtuoso", "vilazodona", "sertralina", "escitalopram", "fluoxetina", "fluvoxamina", "paroxetina", "venlafaxina", "desvenlafaxina", "duloxetina", "clomipramina", "tramadol", "mdma", "ecstasy", "linezolida", "metadona"]));
  if (serotonergic.length >= 2) {
    findings.push({
      category: "farmacodinamica",
      relevance: serotonergic.some((x) => includesAny(x, ["mdma", "tramadol", "linezolida"])) ? "relevante" : "cautela",
      summary: `Carga serotoninérgica combinada: ${serotonergic.slice(0, 4).join(" + ")}.`,
      detail: "Não é contraindicação automática entre antidepressivo + estimulante, mas o risco passa a depender de dose, vulnerabilidade, outras substâncias e sintomas autonômicos/neuromusculares.",
      involvedSubstances: serotonergic,
      mechanism: "Somação serotoninérgica por SERT/modulação 5-HT/liberação serotoninérgica ou opioides serotoninérgicos.",
      monitor: ["hiperreflexia", "tremor", "sudorese", "diarreia", "confusão", "febre", "mioclonia", "taquicardia"],
      action: "Registrar sintomas neuromusculares/autonômicos se houver múltiplos serotoninérgicos; diferenciar ansiedade de síndrome serotoninérgica real.",
      confidence: "moderada",
    });
  }

  const sedativeLoad = allNames.filter((n) => includesAny(n, [...BENZOS, ...SEDATIVE, "zolpidem", "pregabalina", "gabapentina", "prometazina", "hidroxizina", "alcool", "álcool", "valproato", "divalproato", "clonidina"]));
  if (sedativeLoad.length >= 3) {
    findings.push({
      category: "farmacodinamica",
      relevance: sedativeLoad.some((x) => includesAny(x, OPIOIDS)) ? "urgente" : "cautela",
      summary: `Carga sedativa/cognitiva acumulada: ${sedativeLoad.slice(0, 5).join(" + ")}.`,
      detail: "O problema pode aparecer como apatia, baixa iniciativa, ressaca, lentificação, queda executiva e compensação com estimulante — não apenas 'sono'.",
      involvedSubstances: sedativeLoad,
      mechanism: "Somação GABAérgica, anti-histamínica, antiadrenérgica e/ou estabilizadora com prejuízo psicomotor e cognitivo.",
      monitor: ["sedação matinal", "memória", "coordenação", "queda de drive", "redose de estimulante", "PA/FC"],
      action: "Mapear horário de sedação e comparar com necessidade de redose/estimulante no dia seguinte.",
      confidence: "alta",
    });
  }

  const cyp2d6Inhibitors = allNames.filter((n) => includesAny(n, ["bupropiona", "wellbutrin", "zetron", "fluoxetina", "paroxetina", "quinidina"]));
  const cyp2d6Substrates = allNames.filter((n) => includesAny(n, ["atomoxetina", "atentah", "vortioxetina", "vurtuoso", "aripiprazol", "risperidona", "venlafaxina"]));
  if (cyp2d6Inhibitors.length && cyp2d6Substrates.length) {
    findings.push({
      category: "metabolica",
      relevance: "cautela",
      summary: `Possível interação CYP2D6: ${cyp2d6Inhibitors[0]} pode elevar exposição de ${cyp2d6Substrates.slice(0, 3).join(", ")}.`,
      detail: "A consequência clínica pode ser náusea/ativação com vortioxetina, PA/FC/irritabilidade com atomoxetina, ou acatisia com antipsicóticos parciais.",
      involvedSubstances: [...cyp2d6Inhibitors, ...cyp2d6Substrates],
      mechanism: "Inibição CYP2D6 com aumento de AUC/Cmax de substratos sensíveis.",
      monitor: ["náusea", "insônia", "irritabilidade", "PA/FC", "acatisia", "sonolência"],
      action: "Checar dose, titulação e tempo de início; evitar atribuir tudo ao diagnóstico antes de revisar CYP2D6.",
      confidence: "alta",
    });
  }

  const lamotrigina = allNames.find((n) => includesAny(n, ["lamotrigina", "lamictal"]));
  if (lamotrigina && valproate) {
    findings.push({
      category: "metabolica",
      relevance: "urgente",
      summary: "Valproato + lamotrigina: interação crítica por aumento de lamotrigina e risco de rash grave/SJS.",
      involvedSubstances: [valproate, lamotrigina],
      mechanism: "Valproato inibe glucuronidação/clearance da lamotrigina.",
      monitor: ["rash", "febre", "mucosa", "linfonodos", "eosinofilia", "titulação"],
      action: "Titulação de lamotrigina deve ser muito mais lenta; qualquer rash relevante exige reavaliação imediata.",
      confidence: "alta",
    });
  }

  if ((input.sessionContext?.sleepHours ?? 99) < 5) {
    findings.push({
      category: "contextual",
      relevance: "monitorar",
      summary: "Sono < 5 h — interpretar respostas medicamentosas com cautela.",
      involvedSubstances: [],
      confidence: "alta",
    });
  }

  return findings;
}
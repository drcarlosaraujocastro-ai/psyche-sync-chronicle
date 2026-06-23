/**
 * Engine de interações contextuais (PK/PD + sono + alimento + fase da curva).
 * Mensagens são interpretativas — sem alarme genérico, sem prescrição.
 */
import type { AdvDoseLog, AdvSubstance, DoseCurve, Phase } from "./curveEngine";

export type Severity = "informativa" | "monitorar" | "cautela" | "relevante" | "urgente";
export type Confidence = "baixa" | "moderada" | "alta";
export type InteractionCategory =
  | "farmacocinética" | "farmacodinâmica" | "alimentar" | "sono" | "abuso/TUS"
  | "cardiovascular" | "sedativa" | "serotoninérgica" | "dopaminérgica"
  | "noradrenérgica" | "GABAérgica" | "opioide" | "QT" | "convulsiva" | "contextual";

export interface ActiveSubstance {
  name: string;
  substance?: AdvSubstance | null;
  doses: AdvDoseLog[];
  curve?: DoseCurve;
  phase?: Phase;
}

export interface InteractionInput {
  active: ActiveSubstance[];
  session?: {
    sleepHours?: number | null;
    sleepDeprivation0_10?: number | null;
    caffeineTotalMg?: number | null;
    alcoholUseToday?: boolean | null;
    substanceUseToday?: boolean | null;
    psychosisWarning?: boolean | null;
    paranoia0_10?: number | null;
    cognitiveOverload0_10?: number | null;
  };
  recentSubstanceUse?: { substanceName: string; usedAt: string | Date }[];
}

export interface ClinicalInteraction {
  title: string;
  category: InteractionCategory;
  involved: string[];
  phases?: string;
  mechanism?: string;
  interpretation: string;
  amplifiers?: string[];
  buffers?: string[];
  monitor?: string[];
  action?: string;
  severity: Severity;
  confidence: Confidence;
}

const N = (s?: string | null) => (s ?? "").toLowerCase();
const includesAny = (s: string, arr: string[]) => arr.some((x) => N(s).includes(x));

const CLASS = {
  stimulant: ["estimulante", "anfetamina", "metilfen", "lisdex"],
  benzo: ["benzodiazep", "clonaz", "diaz", "alpraz", "lorazep", "midaz"],
  opioid: ["opioide", "morfin", "oxicodon", "codeín", "codein", "fentan", "metadon", "buprenorf", "tramadol"],
  alcohol: ["alcool", "álcool", "etanol"],
  ssri: ["isrs", "sertralin", "escitalopram", "fluoxet", "paroxet", "vortioxet", "vilazod"],
  snri: ["snri", "venlafax", "desvenlafax", "duloxet"],
  noradrenergic: ["atomoxet", "nri", "norepinefrina", "noradrenérgico"],
  alpha2: ["clonidina", "guanfacin"],
  sedativeAP: ["quetiapin", "mirtazapin", "trazodon", "olanzap"],
  bupropion: ["bupropion"],
  partialAP: ["aripipraz", "brexpip"],
  valproate: ["valproato", "divalproato", "ácido valproico"],
  caffeine: ["cafeína", "cafeina"],
  cannabis: ["cannabis", "thc", "maconha"],
};

function hasClass(active: ActiveSubstance[], keys: string[]): ActiveSubstance | undefined {
  return active.find((a) => {
    const text = `${a.name} ${a.substance?.name ?? ""} ${(a.substance as any)?.pharmacological_class ?? ""} ${(a.substance as any)?.clinical_category ?? ""}`;
    return includesAny(text, keys);
  });
}

function isActivePhase(p?: Phase): boolean {
  return p === "subida" || p === "pico" || p === "platô" || p === "steady-state";
}

export function runInteractionEngine(input: InteractionInput): ClinicalInteraction[] {
  const out: ClinicalInteraction[] = [];
  const { active, session, recentSubstanceUse = [] } = input;

  const stim = hasClass(active, CLASS.stimulant);
  const benzo = hasClass(active, CLASS.benzo);
  const opi = hasClass(active, CLASS.opioid);
  const alc = hasClass(active, CLASS.alcohol) || session?.alcoholUseToday;
  const ssri = hasClass(active, CLASS.ssri);
  const snri = hasClass(active, CLASS.snri);
  const noradren = hasClass(active, CLASS.noradrenergic);
  const alpha2 = hasClass(active, CLASS.alpha2);
  const sedAP = hasClass(active, CLASS.sedativeAP);
  const bup = hasClass(active, CLASS.bupropion);
  const partAP = hasClass(active, CLASS.partialAP);
  const valp = hasClass(active, CLASS.valproate);
  const caf = hasClass(active, CLASS.caffeine) || (session?.caffeineTotalMg ?? 0) > 0;
  const recentTUS = recentSubstanceUse.some((s) => includesAny(s.substanceName, [...CLASS.cannabis, "cocain", "mdma", "ketamin"]));
  const sleepShort = (session?.sleepHours ?? 99) < 5 || (session?.sleepDeprivation0_10 ?? 0) >= 6;

  // 1. BZD + opioide/álcool
  if (benzo && (opi || alc)) {
    const both = isActivePhase(benzo.phase) && (opi ? isActivePhase(opi.phase) : true);
    out.push({
      title: "Depressão do SNC: benzodiazepínico + opioide/álcool",
      category: "sedativa",
      involved: [benzo.name, opi?.name ?? "álcool"],
      phases: both ? "ambos em fase ativa" : undefined,
      mechanism: "Potenciação GABAérgica + depressão respiratória opioide/álcool.",
      interpretation: "Combinação de risco real para depressão respiratória, especialmente em pico/platê concomitantes.",
      amplifiers: ["sedação alta", "sono pouco", "doses crescentes", "via parenteral/inalada"],
      buffers: ["doses baixas", "horários afastados", "monitorização presencial"],
      monitor: ["frequência respiratória", "nível de consciência", "saturação"],
      action: "Discutir redução/desprescrição; orientar redução de dano e sinais de alerta.",
      severity: both ? "urgente" : "relevante",
      confidence: "alta",
    });
  }

  // 2. Estimulante + BZD — interpretação contextual (não alarmismo)
  if (stim && benzo) {
    const both = isActivePhase(stim.phase) && isActivePhase(benzo.phase);
    out.push({
      title: "Estimulante + benzodiazepínico: antagonismo funcional parcial",
      category: "farmacodinâmica",
      involved: [stim.name, benzo.name],
      phases: both ? "ambos em fase ativa" : "fases desencontradas",
      mechanism: "Drive catecolaminérgico × tônus GABAérgico.",
      interpretation: both
        ? "Estimulante pode mascarar sedação do benzodiazepínico; benzodiazepínico pode atenuar hiperestimulação. Avaliar objetivo clínico, horário e qualidade do foco."
        : "Risco de sedação residual matinal do BZD com hiperalerta posterior do estimulante.",
      monitor: ["sedação residual", "qualidade do foco (hiperfoco estéril?)", "insônia", "redose"],
      severity: "cautela",
      confidence: "moderada",
    });
  }

  // 3. Estimulante + atomoxetina/NRI
  if (stim && noradren) {
    out.push({
      title: "Somação noradrenérgica: estimulante + atomoxetina/NRI",
      category: "noradrenérgica",
      involved: [stim.name, noradren.name],
      mechanism: "Aumento sinérgico de NE; pode melhorar cobertura executiva.",
      interpretation: "Pode cobrir falhas do estimulante isolado, mas eleva PA/FC, ansiedade, irritabilidade e insônia.",
      amplifiers: ["privação de sono", "cafeína", "estresse", "doses altas"],
      monitor: ["PA", "FC", "ansiedade", "sono", "irritabilidade"],
      severity: sleepShort ? "relevante" : "monitorar",
      confidence: "moderada",
    });
  }

  // 4. Estimulante + privação de sono
  if (stim && sleepShort) {
    out.push({
      title: "Estimulante em privação de sono: risco psicotomimético",
      category: "sono",
      involved: [stim.name],
      mechanism: "Catecolaminergia sobre córtex sob privação aumenta risco paranoide/delirante e irritabilidade.",
      interpretation: "Interpretar respostas com cautela; risco de paranoia, irritabilidade, hiperfoco disfuncional e redose compulsiva.",
      monitor: ["paranoia", "ideias de referência", "irritabilidade", "redose"],
      action: "Priorizar restauração do sono antes de ajustar dose. Evitar redose.",
      severity: "relevante",
      confidence: "alta",
    });
  }

  // 5. Estimulante + cafeína
  if (stim && caf) {
    out.push({
      title: "Estimulante + cafeína: ruído autonômico",
      category: "cardiovascular",
      involved: [stim.name, "cafeína"],
      mechanism: "Adenosina antagonizada + drive NE/DA = mais FC, PA, ansiedade, insônia.",
      interpretation: "Cafeína no horário do pico amplifica eixo autonômico e prejudica sono.",
      monitor: ["FC", "ansiedade", "insônia"],
      action: "Reduzir cafeína ou afastá-la do pico.",
      severity: "monitorar", confidence: "moderada",
    });
  }

  // 6. Clonidina + estimulante
  if (alpha2 && stim) {
    out.push({
      title: "Alfa-2 agonista + estimulante: freio adrenérgico contextual",
      category: "noradrenérgica",
      involved: [alpha2.name, stim.name],
      mechanism: "Clonidina reduz tônus simpático central; estimulante eleva NE.",
      interpretation: "Clonidina pode atenuar hiperadrenergia/rebote do estimulante. Avaliar sedação, hipotensão e fadiga.",
      monitor: ["PA", "FC", "sedação diurna", "fadiga"],
      severity: "monitorar", confidence: "moderada",
    });
  }

  // 7. Clonidina + BZD/valproato
  if (alpha2 && (benzo || valp || sedAP)) {
    out.push({
      title: "Alfa-2 + sedativo: somação sedativa/hipotensiva",
      category: "sedativa",
      involved: [alpha2.name, (benzo ?? valp ?? sedAP)!.name],
      monitor: ["PA", "sedação", "ortostase"],
      interpretation: "Risco contextual de sonolência diurna e hipotensão.",
      severity: "monitorar", confidence: "moderada",
    });
  }

  // 8. ISRS/ISRSN + estimulante
  if ((ssri || snri) && stim) {
    out.push({
      title: "Serotoninérgico + estimulante: ativação e risco serotoninérgico contextual",
      category: "serotoninérgica",
      involved: [(ssri ?? snri)!.name, stim.name],
      interpretation: "Pode aumentar ativação, ansiedade e insônia; risco serotoninérgico clínico é baixo isoladamente, maior se MDMA/tramadol/IMAO associados.",
      amplifiers: ["MDMA recente", "tramadol", "IMAO", "doses altas"],
      monitor: ["ansiedade", "insônia", "tremor", "hiperreflexia"],
      severity: "monitorar", confidence: "moderada",
    });
  }

  // 9. Bupropiona + (atomoxetina/vortioxetina/aripiprazol)
  if (bup && (noradren || hasClass(active, ["vortiox"]) || partAP)) {
    const partner = noradren ?? hasClass(active, ["vortiox"]) ?? partAP!;
    out.push({
      title: "Bupropiona inibe CYP2D6 — eleva exposição do parceiro",
      category: "farmacocinética",
      involved: [bup.name, partner.name],
      mechanism: "Inibição CYP2D6 reduz clearance.",
      interpretation: "Considerar dose menor do parceiro; monitorar ativação/efeitos adversos.",
      monitor: ["ativação", "insônia", "náusea", "acatisia", "FC"],
      severity: "cautela", confidence: "alta",
    });
  }

  // 10. Valproato + sedativos
  if (valp && (benzo || sedAP)) {
    out.push({
      title: "Valproato + sedativos: embotamento cognitivo e sedação",
      category: "sedativa",
      involved: [valp.name, (benzo ?? sedAP)!.name],
      interpretation: "Pode somar sedação e prejuízo cognitivo; monitorar tremor e cognição.",
      monitor: ["cognição", "sedação diurna", "tremor"],
      severity: "monitorar", confidence: "moderada",
    });
  }

  // 11. Aripiprazol + TUS/impulsividade
  if (partAP && (recentTUS || (session?.cognitiveOverload0_10 ?? 0) >= 7)) {
    out.push({
      title: "Agonista parcial D2 + uso de substância/impulsividade",
      category: "dopaminérgica",
      involved: [partAP.name],
      interpretation: "Atenção a acatisia, impulsos novos (jogo, compulsões), insônia e ativação atípica.",
      monitor: ["acatisia", "impulsos novos", "insônia"],
      severity: "monitorar", confidence: "moderada",
    });
  }

  // 12. Sono curto isolado
  if (sleepShort && !stim) {
    out.push({
      title: "Sono curto contextual",
      category: "contextual",
      involved: [],
      interpretation: "Sono < 5h ou privação alta — interpretar respostas medicamentosas com cautela.",
      monitor: ["humor", "atenção", "irritabilidade"],
      severity: "monitorar", confidence: "alta",
    });
  }

  return out;
}
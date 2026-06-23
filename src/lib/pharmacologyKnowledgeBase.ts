/**
 * Base local de conhecimento farmacológico.
 * Template estrutural: sugere dados para revisão médica; não prescreve e não substitui julgamento clínico.
 * Curvas são relativas 0–100, não concentração sérica.
 */

export type RiskLevel = "muito baixo" | "baixo" | "moderado" | "alto" | "muito alto";
export type ConfidenceLevel = "low" | "medium" | "high";

export interface KBFormulationTemplate {
  formulation_name: string;
  formulation_type?: string;
  route?: string;
  curve_model?: string;
  onset_min_value?: number; onset_max_value?: number; onset_unit?: string;
  comeup_min_value?: number; comeup_max_value?: number; comeup_unit?: string;
  peak_min_value?: number; peak_max_value?: number; peak_unit?: string;
  plateau_min_value?: number; plateau_max_value?: number; plateau_unit?: string;
  offset_min_value?: number; offset_max_value?: number; offset_unit?: string;
  duration_min_value?: number; duration_max_value?: number; duration_unit?: string;
  half_life_min_value?: number; half_life_max_value?: number; half_life_unit?: string;
  has_steady_state?: boolean;
  steady_state_min_value?: number; steady_state_max_value?: number; steady_state_unit?: string;
  has_tail?: boolean;
  tail_min_value?: number; tail_max_value?: number; tail_unit?: string;
  food_effect_profile?: Record<string, unknown>;
  notes?: string;
  is_default?: boolean;
}

export interface KBTemplate {
  name: string;
  generic_name?: string;
  normalized_key?: string;
  match?: string[];
  brand_names?: string[];
  brands?: string[];
  international_brand_names?: string[];
  reference_names?: string[];
  synonyms?: string[];
  common_misspellings?: string[];
  confidence?: ConfidenceLevel;
  source_type?: "bula" | "guideline" | "revisão" | "consenso" | "harm reduction" | "estrutural";
  needs_review?: boolean;
  substance_type?: "medicamento" | "substância recreativa" | "metabólito" | "suplemento" | "alimento/interferente" | "outro";
  legal_status?: string;
  clinical_category?: string;
  pharmacological_class?: string;
  pharmacological_subclass?: string;
  therapeutic_areas?: string[];
  controlled_substance?: boolean;
  requires_prescription?: boolean;
  requires_clinical_review?: boolean;
  review_status?: string;
  evidence_level?: string;
  mechanism_summary?: string;
  mechanism_expanded?: string;
  short_description?: string;
  primary_targets?: Record<string, unknown> | string[];
  secondary_targets?: Record<string, unknown> | string[];
  receptor_profile?: { target: string; action_type: string; affinity_ki?: string; confidence?: ConfidenceLevel; clinical_relevance?: string; notes?: string }[];
  transporter_profile?: { target: string; action_type: string; clinical_relevance?: string; notes?: string }[];
  enzyme_profile?: Record<string, unknown>;
  neurotransmitter_effects?: Record<string, unknown>;
  circuit_effects?: Record<string, unknown>;
  pk_profile?: Record<string, unknown>;
  default_route?: string;
  available_routes?: string[];
  available_formulations?: string[];
  default_formulation?: string;
  default_curve_model?: string;
  release_curve_type?: string;
  absorption_notes?: string;
  distribution_notes?: string;
  metabolism_notes?: string;
  elimination_notes?: string;
  food_effect_notes?: string;
  empty_stomach_effect?: string;
  high_fat_meal_effect?: string;
  food_delay_onset_minutes_min?: number;
  food_delay_onset_minutes_max?: number;
  caffeine_interaction_notes?: string;
  alcohol_interaction_notes?: string;
  sleep_deprivation_risk_notes?: string;
  protein_binding_percent?: number;
  bioavailability_min?: number;
  bioavailability_max?: number;
  active_metabolites?: string[];
  prodrug_status?: boolean;
  active_moiety?: string;
  bioactivation_site?: string;
  bioactivation_required?: boolean;
  formulation_dependency_level?: "baixa" | "moderada" | "alta";
  onset_min_value?: number; onset_max_value?: number; onset_unit?: string;
  comeup_min_value?: number; comeup_max_value?: number; comeup_unit?: string;
  peak_min_value?: number; peak_max_value?: number; peak_unit?: string;
  plateau_min_value?: number; plateau_max_value?: number; plateau_unit?: string;
  offset_min_value?: number; offset_max_value?: number; offset_unit?: string;
  total_duration_min_value?: number; total_duration_max_value?: number; total_duration_unit?: string;
  residual_min_value?: number; residual_max_value?: number; residual_unit?: string;
  half_life_min_value?: number; half_life_max_value?: number; half_life_unit?: string;
  has_steady_state?: boolean;
  steady_state_min_value?: number; steady_state_max_value?: number; steady_state_unit?: string;
  has_tail?: boolean;
  tail_min_value?: number; tail_max_value?: number; tail_unit?: string;
  dose_unit_default?: string;
  default_dose_unit?: string;
  dose_low_min?: number; dose_low_max?: number;
  dose_usual_min?: number; dose_usual_max?: number;
  dose_high_min?: number; dose_high_max?: number;
  dose_max_recommended?: number;
  dose_notes?: string;
  titration_notes?: string;
  renal_adjustment_notes?: string;
  hepatic_adjustment_notes?: string;
  cyp_substrate?: string[];
  cyp_inhibitor?: string[];
  cyp_inducer?: string[];
  ugt_substrate?: string[];
  ugt_inhibitor?: string[];
  ugt_inducer?: string[];
  transporter_substrate?: string[];
  transporter_inhibitor?: string[];
  interaction_rules?: Record<string, unknown>;
  monitoring_rules?: Record<string, unknown>;
  contraindication_rules?: Record<string, unknown>;
  clinical_effect_profile?: Record<string, number>;
  adverse_effect_profile?: Record<string, number>;
  abuse_liability_profile?: Record<string, unknown>;
  withdrawal_profile?: Record<string, unknown> | string;
  tolerance_profile?: Record<string, unknown> | string;
  dependence_profile?: Record<string, unknown>;
  black_box_warnings?: string[];
  major_warnings?: string[];
  common_adverse_effects?: string[];
  serious_adverse_effects?: string[];
  cardiovascular_risk_level?: RiskLevel;
  seizure_risk_level?: RiskLevel;
  psychosis_mania_risk_level?: RiskLevel;
  respiratory_depression_risk_level?: RiskLevel;
  serotonin_syndrome_risk_level?: RiskLevel;
  qt_risk_level?: RiskLevel;
  metabolic_risk_level?: RiskLevel;
  cognitive_impairment_risk_level?: RiskLevel;
  sedation_risk_level?: RiskLevel;
  insomnia_risk_level?: RiskLevel;
  abuse_risk_level?: RiskLevel;
  safety_notes?: string;
  monitoring_profile?: string[];
  source_notes?: string;
  source_references?: Record<string, unknown> | string[];
  formulations?: KBFormulationTemplate[];
}

const review = {
  requires_clinical_review: true,
  review_status: "não revisada",
  confidence: "medium" as const,
  source_type: "bula" as const,
  needs_review: true,
  source_notes: "Template farmacológico estrutural. Revisão clínica obrigatória. Curvas relativas 0–100, não séricas.",
};

const oral = { default_route: "oral", available_routes: ["oral"] };

export const KNOWLEDGE_BASE: KBTemplate[] = [
  {
    ...review,
    name: "Lisdexanfetamina",
    generic_name: "dimesilato de lisdexanfetamina",
    normalized_key: "lisdexanfetamina",
    match: ["lisdex", "lisdexamfetamine", "lisdexamfetamine dimesylate", "ldx", "venvanse", "lyberdia", "juneve", "vyvanse", "elvanse"],
    brand_names: ["Venvanse", "Lyberdia", "Juneve"],
    brands: ["Venvanse", "Lyberdia", "Juneve"],
    international_brand_names: ["Vyvanse", "Elvanse"],
    reference_names: ["LDX", "lisdexamfetamine", "L-lisina-d-anfetamina", "pró-fármaco de dextroanfetamina"],
    synonyms: ["lisdexanfetamina", "dimesilato de lisdexanfetamina", "pró-fármaco anfetamínico", "pró-droga de dextroanfetamina"],
    common_misspellings: ["venanse", "venvasne", "venvanse", "lisdeks", "lisdexanfetamína", "lyberdia", "liberdia", "junev"],
    substance_type: "medicamento",
    legal_status: "Psicoestimulante sob controle especial; confirmar lista ANVISA vigente.",
    clinical_category: "TDAH / estimulante / função executiva",
    pharmacological_class: "Psicoestimulante anfetamínico",
    pharmacological_subclass: "Pró-fármaco de dextroanfetamina; liberador catecolaminérgico",
    therapeutic_areas: ["TDAH", "compulsão alimentar", "disfunção executiva", "controle inibitório"],
    controlled_substance: true,
    requires_prescription: true,
    evidence_level: "alto para TDAH; exige monitoramento rigoroso em TUS",
    mechanism_summary: "Pró-fármaco oral convertido em dextroanfetamina; aumenta dopamina e noradrenalina por liberação monoaminérgica e modulação DAT/NET/VMAT2/TAAR1.",
    mechanism_expanded: "A lisdexanfetamina é dextroanfetamina ligada à L-lisina. Após administração oral, ocorre desintegração da cápsula, dissolução do conteúdo, absorção intestinal da lisdexanfetamina intacta, circulação sistêmica e bioativação principalmente no sangue/hemácias, liberando dextroanfetamina. A suavização da curva deriva da bioativação hematológica gradual, não de matriz de liberação prolongada clássica. A dextroanfetamina aumenta DA/NE extracelular por DAT, NET, VMAT2 e TAAR1, melhorando sinal-ruído pré-frontal, vigília, iniciação, sustentação e controle inibitório.",
    primary_targets: ["bioativação hematológica", "DAT indireto", "NET indireto", "VMAT2", "TAAR1"],
    secondary_targets: ["sistema simpático periférico", "dopamina estriatal", "noradrenalina cortical", "circuito mesocorticolímbico"],
    receptor_profile: [{ target: "TAAR1", action_type: "agonismo funcional indireto por dextroanfetamina", confidence: "medium", clinical_relevance: "liberação monoaminérgica" }],
    transporter_profile: [
      { target: "DAT", action_type: "substrato/liberador funcional", clinical_relevance: "aumenta dopamina" },
      { target: "NET", action_type: "substrato/liberador funcional", clinical_relevance: "aumenta noradrenalina" },
      { target: "VMAT2", action_type: "modulação funcional", clinical_relevance: "redistribuição monoaminérgica vesicular" },
    ],
    enzyme_profile: { bioactivation: "hidrólise em hemácias", cyp_activation: false },
    neurotransmitter_effects: { dopamina: "↑↑", noradrenalina: "↑↑", serotonina: "↑ discreta/indireta" },
    circuit_effects: { PFC: "melhora sinal-ruído/iniciação", fronto_estriatal: "controle inibitório", recompensa: "reforço/risco de redose", vigilia: "aumenta alerta" },
    prodrug_status: true,
    active_moiety: "dextroanfetamina",
    bioactivation_required: true,
    bioactivation_site: "sangue/hemácias",
    formulation_dependency_level: "moderada",
    ...oral,
    available_formulations: ["cápsula oral pró-fármaco", "comprimido mastigável"],
    default_formulation: "Cápsula oral pró-fármaco",
    default_curve_model: "prodrug_with_bioactivation",
    release_curve_type: "prodrug_with_bioactivation",
    onset_min_value: 60, onset_max_value: 120, onset_unit: "minutos",
    comeup_min_value: 90, comeup_max_value: 210, comeup_unit: "minutos",
    peak_min_value: 3.5, peak_max_value: 5, peak_unit: "horas",
    plateau_min_value: 4, plateau_max_value: 8, plateau_unit: "horas",
    offset_min_value: 8, offset_max_value: 12, offset_unit: "horas",
    total_duration_min_value: 10, total_duration_max_value: 14, total_duration_unit: "horas",
    half_life_min_value: 10, half_life_max_value: 11.3, half_life_unit: "horas",
    has_steady_state: false,
    has_tail: true, tail_min_value: 14, tail_max_value: 24, tail_unit: "horas",
    residual_min_value: 14, residual_max_value: 24, residual_unit: "horas",
    bioavailability_min: 90, bioavailability_max: 96,
    protein_binding_percent: 25,
    active_metabolites: ["dextroanfetamina"],
    absorption_notes: "Cápsula se desintegra no trato GI, conteúdo dissolve, lisdexanfetamina hidrossolúvel é absorvida principalmente no intestino e entra na circulação ainda como pró-fármaco. O efeito depende de absorção + bioativação hematológica em dextroanfetamina; não é liberação prolongada clássica.",
    distribution_notes: "Após bioativação, dextroanfetamina atravessa BHE e atua em circuitos catecolaminérgicos centrais. Ligação proteica não é determinante clínico principal.",
    metabolism_notes: "Bioativação por hidrólise em hemácias; ativação não depende de CYP450. Dextroanfetamina segue metabolismo/excreção de anfetamina.",
    elimination_notes: "Eliminação renal da dextroanfetamina; pH urinário ácido aumenta eliminação e pH alcalino pode prolongar exposição.",
    food_effect_notes: "Alimento não reduz linearmente AUC/potência, mas pode atrasar percepção de onset/pico. Modelar deslocamento temporal, não perda de efeito.",
    high_fat_meal_effect: "Refeição rica em gordura/estômago cheio pode atrasar Tmax/pico subjetivo cerca de 45–90 min.",
    empty_stomach_effect: "Pode antecipar percepção de onset em relação a estômago cheio, sem transformar em anfetamina IR.",
    food_delay_onset_minutes_min: 45, food_delay_onset_minutes_max: 90,
    caffeine_interaction_notes: "Somação autonômica: ansiedade, taquicardia, tremor, sudorese, insônia e falsa leitura de eficácia.",
    alcohol_interaction_notes: "Piora julgamento, impulsividade, sono e risco comportamental.",
    sleep_deprivation_risk_notes: "Privação de sono + estimulante aumenta irritabilidade, hiperfoco disfuncional, redose, paranoia e delírio persecutório em vulneráveis.",
    dose_unit_default: "mg", default_dose_unit: "mg",
    dose_low_min: 30, dose_low_max: 40, dose_usual_min: 50, dose_usual_max: 70, dose_high_min: 70, dose_high_max: 70, dose_max_recommended: 70,
    dose_notes: "Dose única matinal. Não dividir dose. Redose é evento de risco.",
    titration_notes: "Titulação usual em incrementos semanais conforme resposta/tolerabilidade; máximo 70 mg/dia.",
    renal_adjustment_notes: "Insuficiência renal grave: reduzir máximo; DRET: máximo menor conforme bula/local.",
    cyp_substrate: [], cyp_inhibitor: [], cyp_inducer: [],
    clinical_effect_profile: { foco: 90, vigília: 90, "iniciação de tarefa": 90, "sustentação de tarefa": 80, "motivação/drive": 85, "anti-impulsividade": 65, "redução de craving": 65, antidepressivo: 45 },
    adverse_effect_profile: { insônia: 85, "ansiedade autonômica": 75, irritabilidade: 70, "taquicardia/PA": 75, "perda de apetite": 75, "paranoia/psicose": 50, "mania/hipomania": 45, "risco de abuso": 85, "risco de abstinência": 55, "ressaca/residual": 35, "risco convulsivo": 35 },
    abuse_liability_profile: { global_0_100: 85, rick_henrique_0_100: 95, note: "Alto em TUS/redose/reforço negativo; pró-fármaco reduz pico abrupto, mas não elimina risco." },
    withdrawal_profile: { score_0_100: 55, symptoms: ["fadiga", "hipersonia", "anedonia", "lentificação", "humor deprimido", "craving por estimulação"] },
    tolerance_profile: { score_0_100: 70, note: "Tolerância subjetiva ao componente ativador pode ser confundida com perda de benefício executivo." },
    cardiovascular_risk_level: "alto", insomnia_risk_level: "alto", abuse_risk_level: "alto", psychosis_mania_risk_level: "moderado", serotonin_syndrome_risk_level: "moderado", sedation_risk_level: "muito baixo", respiratory_depression_risk_level: "muito baixo", qt_risk_level: "baixo",
    safety_notes: "Monitorar PA/FC, sono, apetite, irritabilidade, redose e sintomas psicóticos/maniformes. Não usar com IMAO.",
    monitoring_profile: ["PA/FC", "sono", "apetite/peso", "redose", "cafeína", "irritabilidade", "paranoia/ideias de referência", "craving cocaína"],
    formulations: [{
      formulation_name: "Cápsula oral pró-fármaco",
      formulation_type: "pró-fármaco oral",
      route: "oral",
      curve_model: "prodrug_with_bioactivation",
      onset_min_value: 60, onset_max_value: 120, onset_unit: "minutos",
      comeup_min_value: 90, comeup_max_value: 210, comeup_unit: "minutos",
      peak_min_value: 3.5, peak_max_value: 5, peak_unit: "horas",
      plateau_min_value: 4, plateau_max_value: 8, plateau_unit: "horas",
      offset_min_value: 8, offset_max_value: 12, offset_unit: "horas",
      duration_min_value: 10, duration_max_value: 14, duration_unit: "horas",
      half_life_min_value: 10, half_life_max_value: 11.3, half_life_unit: "horas",
      has_steady_state: false,
      has_tail: true, tail_min_value: 14, tail_max_value: 24, tail_unit: "horas",
      is_default: true,
      notes: "Desintegração/dissolução GI + absorção intestinal + bioativação hematológica em dextroanfetamina. Curva relativa, não sérica.",
    }],
  },
  {
    ...review,
    name: "Vortioxetina",
    generic_name: "bromidrato de vortioxetina",
    normalized_key: "vortioxetina",
    match: ["vortiox", "vortioxetine", "vurtuoso", "brintellix", "trintellix"],
    brand_names: ["Vurtuoso", "Brintellix"],
    brands: ["Vurtuoso", "Brintellix"],
    international_brand_names: ["Trintellix"],
    reference_names: ["Lu AA21004", "SMS", "serotonin modulator and stimulator"],
    synonyms: ["vortioxetina", "bromidrato de vortioxetina", "antidepressivo multimodal", "modulador serotoninérgico multimodal"],
    common_misspellings: ["vortuoso", "vurtuoso", "brintelix", "trintelix", "vortiox"],
    substance_type: "medicamento",
    clinical_category: "Depressão / antidepressivo / cognição afetiva",
    pharmacological_class: "Antidepressivo multimodal serotoninérgico",
    pharmacological_subclass: "Inibidor de SERT + modulador 5-HT",
    therapeutic_areas: ["depressão", "anedonia", "ruminação", "cognição afetiva"],
    controlled_substance: false,
    requires_prescription: true,
    evidence_level: "alto para transtorno depressivo maior",
    mechanism_summary: "Inibe SERT e modula receptores 5-HT: agonismo 5-HT1A, agonismo parcial 5-HT1B e antagonismo 5-HT3/5-HT7/5-HT1D.",
    mechanism_expanded: "Antidepressivo multimodal com aumento de serotonina por inibição de SERT e modulação direta de receptores serotoninérgicos. Deve ser modelada como fármaco de steady-state longitudinal: pico plasmático não equivale a pico antidepressivo.",
    primary_targets: ["SERT", "5-HT1A", "5-HT1B", "5-HT3", "5-HT7", "5-HT1D"],
    receptor_profile: [
      { target: "SERT", action_type: "inibidor", affinity_ki: "~1.6 nM", confidence: "high", clinical_relevance: "aumento serotoninérgico" },
      { target: "5-HT1A", action_type: "agonista", confidence: "high" },
      { target: "5-HT1B", action_type: "agonista parcial", confidence: "high" },
      { target: "5-HT3", action_type: "antagonista", confidence: "high" },
      { target: "5-HT7", action_type: "antagonista", confidence: "high" },
      { target: "5-HT1D", action_type: "antagonista", confidence: "high" },
    ],
    neurotransmitter_effects: { serotonina: "↑↑", glutamato: "modulação indireta", GABA: "modulação indireta", acetilcolina: "modulação indireta", dopamina: "indireta leve", noradrenalina: "indireta leve" },
    circuit_effects: { limbico_cortical: "depressão", PFC: "cognição afetiva", default_mode: "ruminação", amigdala: "reatividade emocional" },
    ...oral,
    available_formulations: ["comprimido oral diário"],
    default_formulation: "Comprimido oral diário",
    default_curve_model: "steady_state_daily",
    onset_min_value: 4, onset_max_value: 8, onset_unit: "horas",
    comeup_min_value: 7, comeup_max_value: 14, comeup_unit: "dias",
    peak_min_value: 7, peak_max_value: 11, peak_unit: "horas",
    plateau_min_value: 14, plateau_max_value: 28, plateau_unit: "dias",
    offset_min_value: 7, offset_max_value: 14, offset_unit: "dias",
    total_duration_min_value: 24, total_duration_max_value: 24, total_duration_unit: "horas",
    half_life_min_value: 59, half_life_max_value: 69, half_life_unit: "horas",
    has_steady_state: true, steady_state_min_value: 10, steady_state_max_value: 14, steady_state_unit: "dias",
    has_tail: true, tail_min_value: 14, tail_max_value: 21, tail_unit: "dias",
    bioavailability_min: 75, bioavailability_max: 75, protein_binding_percent: 98,
    absorption_notes: "Comprimido revestido se desintegra/dissolve no trato GI; absorção oral com Tmax 7–11 h. Alimento não altera PK de forma clinicamente relevante.",
    distribution_notes: "Ampla distribuição; ligação proteica ~98%.",
    metabolism_notes: "Metabolismo hepático extenso principalmente CYP2D6, com participação CYP3A4/5, CYP2C19, CYP2C9, CYP2A6, CYP2C8 e CYP2B6; conjugação por ácido glucurônico. Metabólito carboxílico principal inativo.",
    elimination_notes: "Eliminação como metabólitos, urina e fezes; meia-vida terminal média ~66 h.",
    food_effect_notes: "Pode tomar com ou sem alimento; alimento pode melhorar tolerabilidade GI sem reduzir efeito.",
    caffeine_interaction_notes: "Sem interação PK central; pode somar ativação/insônia quando combinada a estimulantes.",
    alcohol_interaction_notes: "Pode piorar humor, sono, impulsividade e adesão; relevante em TUS.",
    sleep_deprivation_risk_notes: "Sono ruim distorce leitura de humor/ativação; não corrige agudamente hiperalerta por estimulante.",
    dose_unit_default: "mg", default_dose_unit: "mg", dose_low_min: 5, dose_low_max: 10, dose_usual_min: 10, dose_usual_max: 20, dose_high_min: 20, dose_high_max: 20, dose_max_recommended: 20,
    dose_notes: "Dose usual 10–20 mg 1x/dia; 5 mg se intolerância; máximo 10 mg em CYP2D6 pobre conhecido; reduzir pela metade com inibidor forte CYP2D6.",
    cyp_substrate: ["CYP2D6", "CYP3A4", "CYP2C19", "CYP2C9", "CYP2A6", "CYP2C8", "CYP2B6"], cyp_inhibitor: [], cyp_inducer: [],
    clinical_effect_profile: { antidepressivo: 75, "anti-ruminação": 70, foco: 35, "motivação/drive": 35, ansiolítico: 45, "sustentação de tarefa": 35 },
    adverse_effect_profile: { "náusea/GI": 60, insônia: 30, "ansiedade autonômica": 30, "disfunção sexual": 25, "risco serotoninérgico": 45, "mania/hipomania": 25, "risco de abuso": 0, "risco de abstinência": 20 },
    abuse_liability_profile: { score_0_100: 0, note: "Sem reforço dopaminérgico rápido." },
    withdrawal_profile: { score_0_100: 20, symptoms: ["tontura", "irritabilidade", "náusea", "alteração do sono", "ansiedade", "piora de humor"] },
    tolerance_profile: { score_0_100: 10, note: "Perda subjetiva costuma refletir adesão/tempo insuficiente/comorbidades." },
    serotonin_syndrome_risk_level: "moderado", insomnia_risk_level: "moderado", sedation_risk_level: "baixo", abuse_risk_level: "muito baixo", psychosis_mania_risk_level: "baixo", qt_risk_level: "baixo", metabolic_risk_level: "baixo",
    safety_notes: "Monitorar náusea, ativação, sono, sexualidade, sangramento, hiponatremia, mania/hipomania e síndrome serotoninérgica em combinações.",
    monitoring_profile: ["humor", "anedonia", "ruminação", "náusea", "sono", "ativação", "sinais serotoninérgicos", "adesão"],
    formulations: [{ formulation_name: "Comprimido oral diário", formulation_type: "uso contínuo", route: "oral", curve_model: "steady_state_daily", onset_min_value: 4, onset_max_value: 8, onset_unit: "horas", comeup_min_value: 7, comeup_max_value: 14, comeup_unit: "dias", peak_min_value: 7, peak_max_value: 11, peak_unit: "horas", plateau_min_value: 14, plateau_max_value: 28, plateau_unit: "dias", offset_min_value: 7, offset_max_value: 14, offset_unit: "dias", duration_min_value: 24, duration_max_value: 24, duration_unit: "horas", half_life_min_value: 59, half_life_max_value: 69, half_life_unit: "horas", has_steady_state: true, steady_state_min_value: 10, steady_state_max_value: 14, steady_state_unit: "dias", has_tail: true, tail_min_value: 14, tail_max_value: 21, tail_unit: "dias", is_default: true, notes: "Pico plasmático 7–11 h; resposta clínica em dias/semanas. Curva relativa, não sérica." }],
  },
  {
    ...review,
    name: "Clonazepam",
    generic_name: "clonazepam",
    normalized_key: "clonazepam",
    match: ["rivotril", "klonopin", "clonazepam", "clonazepan", "rivoril"],
    brand_names: ["Rivotril"], brands: ["Rivotril"], international_brand_names: ["Klonopin"],
    synonyms: ["benzodiazepínico de meia-vida longa", "modulador GABA-A"], common_misspellings: ["clonazepan", "clonazepm", "rivoril", "rivotriu"],
    substance_type: "medicamento", legal_status: "Benzodiazepínico controlado; confirmar lista vigente.", clinical_category: "Ansiolítico / hipnótico / anticonvulsivante", pharmacological_class: "Benzodiazepínico", pharmacological_subclass: "Modulador alostérico positivo GABA-A", therapeutic_areas: ["ansiedade", "insônia", "epilepsia", "hiperalerta"], controlled_substance: true, requires_prescription: true,
    mechanism_summary: "Benzodiazepínico de meia-vida longa; modulador alostérico positivo do receptor GABA-A.",
    mechanism_expanded: "Liga-se ao sítio benzodiazepínico do receptor GABA-A e aumenta a frequência de abertura do canal de cloro mediada por GABA, elevando inibição neuronal. Produz efeitos ansiolítico, sedativo/hipnótico, anticonvulsivante e miorrelaxante. Uso contínuo gera tolerância, dependência fisiológica e abstinência potencialmente grave.",
    primary_targets: ["GABA-A sítio benzodiazepínico"], receptor_profile: [{ target: "GABA-A", action_type: "PAM", confidence: "high", clinical_relevance: "sedação/ansiolítico/anticonvulsivante" }], neurotransmitter_effects: { GABA: "↑↑" }, circuit_effects: { amigdala: "ansiedade", hipocampo: "memória", cortex: "sedação/cognição", sono: "hipnótico", limiar_convulsivo: "aumenta" },
    ...oral, available_formulations: ["comprimido oral", "gotas"], default_formulation: "Comprimido oral sedativo longo", default_curve_model: "sedative_long",
    onset_min_value: 30, onset_max_value: 60, onset_unit: "minutos", comeup_min_value: 60, comeup_max_value: 120, comeup_unit: "minutos", peak_min_value: 1, peak_max_value: 4, peak_unit: "horas", plateau_min_value: 2, plateau_max_value: 8, plateau_unit: "horas", offset_min_value: 8, offset_max_value: 12, offset_unit: "horas", total_duration_min_value: 8, total_duration_max_value: 12, total_duration_unit: "horas", half_life_min_value: 19, half_life_max_value: 60, half_life_unit: "horas", has_steady_state: true, steady_state_min_value: 5, steady_state_max_value: 12, steady_state_unit: "dias", has_tail: true, tail_min_value: 24, tail_max_value: 72, tail_unit: "horas",
    bioavailability_min: 90, bioavailability_max: 90, protein_binding_percent: 85,
    absorption_notes: "Absorção oral rápida/moderada; início 30–60 min e pico 1–4 h. Gotas podem antecipar percepção por dissolução/administração, mas efeito sistêmico segue absorção oral.", distribution_notes: "Alta lipossolubilidade, penetra SNC; ligação proteica ~85%.", metabolism_notes: "Metabolismo hepático, nitroredução; CYP3A envolvido.", elimination_notes: "Eliminação renal como metabólitos.",
    dose_unit_default: "mg", default_dose_unit: "mg", dose_low_min: 0.25, dose_low_max: 0.5, dose_usual_min: 0.5, dose_usual_max: 2, dose_high_min: 2, dose_high_max: 4,
    cyp_substrate: ["CYP3A4"],
    clinical_effect_profile: { sono: 75, ansiolítico: 70, "redução de hiperalerta": 75, "estabilização de humor": 15, "anti-impulsividade": 20 },
    adverse_effect_profile: { sedação: 80, "prejuízo cognitivo": 70, "ressaca/residual": 75, "depressão respiratória": 95, "risco de abuso": 75, "risco de abstinência": 90 },
    abuse_liability_profile: { score_0_100: 75, rick_henrique_0_100: 85, note: "Risco alto em TUS e combinação com opioides/álcool." }, withdrawal_profile: { score_0_100: 90, symptoms: ["insônia rebote", "ansiedade", "tremor", "taquicardia", "convulsão", "delirium"] }, tolerance_profile: { score_0_100: 85, note: "Tolerância sedativa/hipnótica comum." },
    sedation_risk_level: "muito alto", abuse_risk_level: "alto", respiratory_depression_risk_level: "muito alto", cognitive_impairment_risk_level: "alto", insomnia_risk_level: "muito baixo",
    alcohol_interaction_notes: "Álcool/opioides: alerta máximo de depressão SNC/respiratória.", safety_notes: "Não retirar abruptamente. Monitorar sedação, cognição, quedas, uso de opioides/álcool e dependência.", monitoring_profile: ["sedação matinal", "cognição", "álcool/opioides", "uso extra", "abstinência"],
    formulations: [{ formulation_name: "Comprimido oral sedativo longo", formulation_type: "sedativo longo", route: "oral", curve_model: "sedative_long", onset_min_value: 30, onset_max_value: 60, onset_unit: "minutos", comeup_min_value: 60, comeup_max_value: 120, comeup_unit: "minutos", peak_min_value: 1, peak_max_value: 4, peak_unit: "horas", plateau_min_value: 2, plateau_max_value: 8, plateau_unit: "horas", offset_min_value: 8, offset_max_value: 12, offset_unit: "horas", duration_min_value: 8, duration_max_value: 12, duration_unit: "horas", half_life_min_value: 19, half_life_max_value: 60, half_life_unit: "horas", has_steady_state: true, steady_state_min_value: 5, steady_state_max_value: 12, steady_state_unit: "dias", has_tail: true, tail_min_value: 24, tail_max_value: 72, tail_unit: "horas", is_default: true, notes: "Efeito sedativo funcional 8–12 h, cauda cognitiva/acúmulo 24–72 h." }],
  },
  {
    ...review,
    name: "Clonidina",
    generic_name: "cloridrato de clonidina",
    normalized_key: "clonidina",
    match: ["atensina", "catapres", "kapvay", "clonidina", "clonidine"], brand_names: ["Atensina", "Catapres"], brands: ["Atensina", "Catapres"], international_brand_names: ["Kapvay"], synonyms: ["agonista alfa-2 central", "antiadrenérgico central"], common_misspellings: ["cloridina", "clonidine"],
    substance_type: "medicamento", clinical_category: "Antiadrenérgico / sono / hiperalerta / TDAH", pharmacological_class: "Agonista alfa-2 adrenérgico central", pharmacological_subclass: "α2A/α2 central; imidazolina I1", therapeutic_areas: ["hiperadrenergia", "insônia", "pesadelos", "TDAH", "abstinência opioide", "hipertensão"], controlled_substance: false, requires_prescription: true,
    mechanism_summary: "Agonista alfa-2 central que reduz descarga noradrenérgica e tônus simpático.", mechanism_expanded: "Estimula receptores alfa-2 centrais, especialmente no locus coeruleus/tronco, reduzindo liberação de noradrenalina, tônus simpático, PA/FC, hiperalerta, rebote autonômico, pesadelos e impulsividade autonômica.", primary_targets: ["α2A", "α2B", "α2C"], secondary_targets: ["receptores imidazolina I1"], receptor_profile: [{ target: "α2A", action_type: "agonista", confidence: "high", clinical_relevance: "antiadrenérgico central" }], neurotransmitter_effects: { noradrenalina: "↓" }, circuit_effects: { locus_coeruleus: "reduz hiperalerta", PFC: "modulação α2A", sono: "facilita", autonomico: "reduz PA/FC" },
    ...oral, available_formulations: ["comprimido IR"], default_formulation: "Comprimido oral IR antiadrenérgico", default_curve_model: "immediate_release",
    onset_min_value: 30, onset_max_value: 60, onset_unit: "minutos", comeup_min_value: 45, comeup_max_value: 90, comeup_unit: "minutos", peak_min_value: 1, peak_max_value: 2, peak_unit: "horas", plateau_min_value: 2, plateau_max_value: 6, plateau_unit: "horas", offset_min_value: 6, offset_max_value: 10, offset_unit: "horas", total_duration_min_value: 6, total_duration_max_value: 12, total_duration_unit: "horas", half_life_min_value: 6, half_life_max_value: 23, half_life_unit: "horas", has_steady_state: true, steady_state_min_value: 2, steady_state_max_value: 5, steady_state_unit: "dias", has_tail: true, tail_min_value: 12, tail_max_value: 24, tail_unit: "horas",
    bioavailability_min: 70, bioavailability_max: 80, protein_binding_percent: 30,
    absorption_notes: "Absorção oral IR com início 30–60 min e pico 1–2 h.", distribution_notes: "Penetra SNC; efeito central no locus coeruleus/tronco.", metabolism_notes: "Metabolismo hepático parcial; CYP2D6/CYP1A2/CYP3A descritos com relevância limitada; eliminação renal importante.", elimination_notes: "Eliminação renal parcial inalterada; ajustar cautela em disfunção renal.", food_effect_notes: "Sem efeito alimentar central; monitorar hipotensão/sedação.", caffeine_interaction_notes: "Cafeína pode antagonizar sedação e somar oscilação autonômica.", alcohol_interaction_notes: "Álcool aumenta sedação/hipotensão.", sleep_deprivation_risk_notes: "Pode ser protetora contra hiperalerta/rebote, mas não substitui sono adequado.",
    dose_unit_default: "mg", default_dose_unit: "mg", dose_low_min: 0.05, dose_low_max: 0.1, dose_usual_min: 0.1, dose_usual_max: 0.3, dose_high_min: 0.3, dose_high_max: 0.4,
    clinical_effect_profile: { sono: 70, "redução de hiperalerta": 85, "anti-impulsividade": 60, ansiolítico: 45, "redução de pesadelos": 60, "redução de craving": 30 }, adverse_effect_profile: { sedação: 60, "taquicardia/PA": 0, "prejuízo cognitivo": 35, "ressaca/residual": 45, "risco de abstinência": 75 },
    abuse_liability_profile: { score_0_100: 5 }, withdrawal_profile: { score_0_100: 75, symptoms: ["hipertensão rebote", "taquicardia", "ansiedade", "insônia", "tremor"] }, tolerance_profile: { score_0_100: 35, note: "Tolerância subjetiva à sedação pode ocorrer; efeito antiadrenérgico tende a persistir." },
    sedation_risk_level: "moderado", cardiovascular_risk_level: "moderado", abuse_risk_level: "muito baixo", insomnia_risk_level: "muito baixo", safety_notes: "Monitorar PA/FC, tontura, sedação e rebote se suspensão abrupta.", monitoring_profile: ["PA", "FC", "tontura", "sedação", "fadiga", "rebote"],
    formulations: [{ formulation_name: "Comprimido oral IR antiadrenérgico", formulation_type: "liberação imediata", route: "oral", curve_model: "immediate_release", onset_min_value: 30, onset_max_value: 60, onset_unit: "minutos", comeup_min_value: 45, comeup_max_value: 90, comeup_unit: "minutos", peak_min_value: 1, peak_max_value: 2, peak_unit: "horas", plateau_min_value: 2, plateau_max_value: 6, plateau_unit: "horas", offset_min_value: 6, offset_max_value: 10, offset_unit: "horas", duration_min_value: 6, duration_max_value: 12, duration_unit: "horas", half_life_min_value: 6, half_life_max_value: 23, half_life_unit: "horas", has_steady_state: true, steady_state_min_value: 2, steady_state_max_value: 5, steady_state_unit: "dias", has_tail: true, tail_min_value: 12, tail_max_value: 24, tail_unit: "horas", is_default: true, notes: "Antiadrenergico central; monitorar PA/FC e sedação." }],
  },
  {
    ...review,
    name: "Divalproato ER",
    generic_name: "divalproato de sódio de liberação prolongada",
    normalized_key: "divalproato_er",
    match: ["depakote", "depakote er", "depakene", "valpakine", "torval", "divalproato", "divalproex", "valproato", "acido valproico", "ácido valproico", "valproato semissodico", "valproato de sodio"],
    brand_names: ["Depakote ER", "Depakote", "Depakene", "Valpakine", "Torval CR"], brands: ["Depakote ER", "Depakote", "Depakene", "Valpakine", "Torval CR"],
    synonyms: ["divalproato", "divalproex", "valproato", "ácido valproico", "valproato semissódico", "valproato de sódio"], common_misspellings: ["valporato", "valproico", "depakote", "depakene"],
    substance_type: "medicamento", legal_status: "Controle especial; confirmar lista ANVISA vigente.", clinical_category: "Estabilizador de humor / anticonvulsivante / anti-impulsivo", pharmacological_class: "Anticonvulsivante estabilizador de humor", pharmacological_subclass: "Modulação GABA/glutamato/canais iônicos/HDAC", therapeutic_areas: ["labilidade", "impulsividade", "mania", "epilepsia", "enxaqueca"], controlled_substance: true, requires_prescription: true,
    mechanism_summary: "Aumenta tônus GABAérgico, reduz excitabilidade glutamatérgica funcional e modula canais de sódio/cálcio e HDAC.", mechanism_expanded: "Valproato aumenta disponibilidade/função GABAérgica, modula canais de sódio voltagem-dependentes e canais de cálcio tipo T, reduz excitabilidade límbica e pode atuar por HDAC. Em psiquiatria, reduz labilidade quente, impulsividade, irritabilidade e descarga comportamental.", primary_targets: ["GABA", "canais de sódio", "canais de cálcio tipo T", "HDAC"], neurotransmitter_effects: { GABA: "↑", glutamato: "↓ funcional" }, circuit_effects: { amigdala: "reduz descarga límbica", orbitofrontal: "impulsividade", humor: "estabilização" },
    ...oral, available_formulations: ["ER", "DR", "solução/cápsula conforme produto"], default_formulation: "Comprimido oral ER", default_curve_model: "extended_release",
    onset_min_value: 2, onset_max_value: 6, onset_unit: "horas", comeup_min_value: 4, comeup_max_value: 12, comeup_unit: "horas", peak_min_value: 4, peak_max_value: 17, peak_unit: "horas", plateau_min_value: 8, plateau_max_value: 24, plateau_unit: "horas", offset_min_value: 24, offset_max_value: 36, offset_unit: "horas", total_duration_min_value: 24, total_duration_max_value: 24, total_duration_unit: "horas", half_life_min_value: 9, half_life_max_value: 16, half_life_unit: "horas", has_steady_state: true, steady_state_min_value: 3, steady_state_max_value: 5, steady_state_unit: "dias", has_tail: true, tail_min_value: 24, tail_max_value: 72, tail_unit: "horas",
    protein_binding_percent: 90, absorption_notes: "Formulação ER produz absorção mais lenta/suave que IR/DR, com menor pico relativo e maior estabilidade.", distribution_notes: "Alta ligação à albumina; fração livre aumenta com dose, hipoalbuminemia e interações.", metabolism_notes: "Metabolismo hepático por glucuronidação UGT e beta-oxidação mitocondrial; CYP minoritário. Inibe UGT, relevante para lamotrigina.", elimination_notes: "Eliminação renal como metabólitos.", food_effect_notes: "Alimento pode melhorar tolerabilidade GI; não é modulador principal da eficácia.", alcohol_interaction_notes: "Álcool aumenta sedação e risco hepático/comportamental.", sleep_deprivation_risk_notes: "Pode reduzir labilidade/impulsividade, mas não substitui sono.",
    dose_unit_default: "mg", default_dose_unit: "mg", dose_low_min: 250, dose_low_max: 500, dose_usual_min: 500, dose_usual_max: 1000, dose_high_min: 1000, dose_high_max: 1500,
    ugt_inhibitor: ["UGT"],
    clinical_effect_profile: { "anti-impulsividade": 80, "estabilização de humor": 75, "anti-ruminação": 35, sono: 40, ansiolítico: 30, "redução de craving": 25 }, adverse_effect_profile: { sedação: 55, "prejuízo cognitivo": 45, "ganho de peso": 60, "náusea/GI": 45, "risco convulsivo": 0, "ressaca/residual": 55 },
    abuse_liability_profile: { score_0_100: 0 }, withdrawal_profile: { score_0_100: 15, note: "Sem abstinência adictiva típica; retirar gradualmente em epilepsia/instabilidade." }, tolerance_profile: { score_0_100: 20, note: "Sem tolerância eufórica; pode haver adaptação a sedação/GI." },
    sedation_risk_level: "moderado", metabolic_risk_level: "moderado", cognitive_impairment_risk_level: "moderado", abuse_risk_level: "muito baixo", seizure_risk_level: "muito baixo", safety_notes: "Monitorar hepatograma, plaquetas/hemograma, peso, tremor, sedação, hiperamonemia/pancreatite se sintomas.", monitoring_profile: ["hemograma/plaquetas", "TGO/TGP/GGT/FA/bilirrubinas", "peso", "tremor", "sedação", "valproatemia se indicado", "amônia se encefalopatia"],
    formulations: [{ formulation_name: "Comprimido oral ER", formulation_type: "liberação prolongada", route: "oral", curve_model: "extended_release", onset_min_value: 2, onset_max_value: 6, onset_unit: "horas", comeup_min_value: 4, comeup_max_value: 12, comeup_unit: "horas", peak_min_value: 4, peak_max_value: 17, peak_unit: "horas", plateau_min_value: 8, plateau_max_value: 24, plateau_unit: "horas", offset_min_value: 24, offset_max_value: 36, offset_unit: "horas", duration_min_value: 24, duration_max_value: 24, duration_unit: "horas", half_life_min_value: 9, half_life_max_value: 16, half_life_unit: "horas", has_steady_state: true, steady_state_min_value: 3, steady_state_max_value: 5, steady_state_unit: "dias", has_tail: true, tail_min_value: 24, tail_max_value: 72, tail_unit: "horas", is_default: true, notes: "ER: curva mais suave/sustentada; alvo longitudinal de impulsividade/labilidade." }],
  },
  {
    ...review,
    name: "Atomoxetina",
    generic_name: "cloridrato de atomoxetina",
    normalized_key: "atomoxetina",
    match: ["atentah", "strattera", "atomoxetina", "atomoxetine", "atentha", "atenta"], brand_names: ["Atentah"], brands: ["Atentah"], international_brand_names: ["Strattera"], synonyms: ["NRI", "NET inhibitor", "inibidor seletivo da recaptação de noradrenalina"], common_misspellings: ["atentha", "atenta", "stratera"],
    substance_type: "medicamento", legal_status: "Controle especial/prescrição; confirmar lista vigente.", clinical_category: "TDAH / não estimulante / função executiva", pharmacological_class: "Inibidor seletivo da recaptação de noradrenalina", pharmacological_subclass: "NRI / NET inhibitor", therapeutic_areas: ["TDAH", "controle inibitório", "cobertura executiva 24h"], controlled_substance: true, requires_prescription: true,
    mechanism_summary: "Bloqueia NET, aumentando noradrenalina e dopamina pré-frontal indireta; não é liberador monoaminérgico clássico.", mechanism_expanded: "Atomoxetina inibe NET, aumentando noradrenalina e, no córtex pré-frontal, dopamina extracelular pela baixa expressão local de DAT. Atua como camada de controle executivo de fundo, com efeito clínico gradual em dias/semanas.", primary_targets: ["NET"], transporter_profile: [{ target: "NET", action_type: "inibidor", clinical_relevance: "aumenta NE e DA-PFC" }], neurotransmitter_effects: { noradrenalina: "↑↑", dopamina_pre_frontal: "↑" }, circuit_effects: { PFC: "controle inibitório/atenção sustentada", fronto_estriatal: "impulsividade" },
    ...oral, available_formulations: ["cápsula oral diária"], default_formulation: "Cápsula oral diária", default_curve_model: "steady_state_daily",
    onset_min_value: 1, onset_max_value: 2, onset_unit: "horas", comeup_min_value: 3, comeup_max_value: 7, comeup_unit: "dias", peak_min_value: 1, peak_max_value: 2, peak_unit: "horas", plateau_min_value: 7, plateau_max_value: 14, plateau_unit: "dias", offset_min_value: 24, offset_max_value: 72, offset_unit: "horas", total_duration_min_value: 24, total_duration_max_value: 24, total_duration_unit: "horas", half_life_min_value: 5.2, half_life_max_value: 21.6, half_life_unit: "horas", has_steady_state: true, steady_state_min_value: 3, steady_state_max_value: 10, steady_state_unit: "dias", has_tail: true, tail_min_value: 48, tail_max_value: 96, tail_unit: "horas",
    bioavailability_min: 63, bioavailability_max: 94, protein_binding_percent: 98.7, active_metabolites: ["4-hidroxiatomoxetina"], absorption_notes: "Absorção oral rápida; Tmax 1–2 h. Alimento não altera AUC, mas reduz Cmax e pode atrasar Tmax para 3–5 h.", distribution_notes: "Alta ligação proteica (~98,7%).", metabolism_notes: "Metabolismo hepático principalmente CYP2D6; exposição muito maior em metabolizador pobre ou com inibidor forte CYP2D6.", elimination_notes: "Eliminação principalmente urinária como metabólitos.", food_effect_notes: "Alimento pode suavizar pico/náusea e atrasar Tmax; útil se ativação/GI.", high_fat_meal_effect: "Atraso operacional de pico para 3–5 h.", caffeine_interaction_notes: "Somação autonômica: ansiedade, PA/FC, insônia, tremor.", sleep_deprivation_risk_notes: "Com LDX e sono ruim, elevar risco de hiperalerta, irritabilidade e paranoia.",
    dose_unit_default: "mg", default_dose_unit: "mg", dose_low_min: 10, dose_low_max: 25, dose_usual_min: 40, dose_usual_max: 80, dose_high_min: 80, dose_high_max: 100,
    cyp_substrate: ["CYP2D6"],
    clinical_effect_profile: { foco: 45, "sustentação de tarefa": 50, "anti-impulsividade": 60, "iniciação de tarefa": 35, vigília: 35 }, adverse_effect_profile: { insônia: 55, "ansiedade autonômica": 60, irritabilidade: 50, "taquicardia/PA": 60, "náusea/GI": 60, "paranoia/psicose": 30, "risco de abuso": 0 },
    abuse_liability_profile: { score_0_100: 5 }, withdrawal_profile: { score_0_100: 5, note: "Sem abstinência adictiva típica; perda gradual de benefício." }, tolerance_profile: { score_0_100: 15, note: "Tolerância clássica não central; resposta parcial pode refletir dose/tempo/CYP/sono." },
    cardiovascular_risk_level: "moderado", insomnia_risk_level: "moderado", psychosis_mania_risk_level: "moderado", abuse_risk_level: "muito baixo", sedation_risk_level: "muito baixo", safety_notes: "Monitorar PA/FC, insônia, irritabilidade, náusea, retenção urinária, sintomas hepáticos raros e sinais psicotomiméticos em vulneráveis.", monitoring_profile: ["PA/FC", "sono", "náusea", "irritabilidade", "ansiedade", "paranoia", "retenção urinária", "CYP2D6/inibidores"],
    formulations: [{ formulation_name: "Cápsula oral diária", formulation_type: "uso contínuo", route: "oral", curve_model: "steady_state_daily", onset_min_value: 1, onset_max_value: 2, onset_unit: "horas", comeup_min_value: 3, comeup_max_value: 7, comeup_unit: "dias", peak_min_value: 1, peak_max_value: 2, peak_unit: "horas", plateau_min_value: 7, plateau_max_value: 14, plateau_unit: "dias", offset_min_value: 24, offset_max_value: 72, offset_unit: "horas", duration_min_value: 24, duration_max_value: 24, duration_unit: "horas", half_life_min_value: 5.2, half_life_max_value: 21.6, half_life_unit: "horas", has_steady_state: true, steady_state_min_value: 3, steady_state_max_value: 10, steady_state_unit: "dias", has_tail: true, tail_min_value: 48, tail_max_value: 96, tail_unit: "horas", is_default: true, notes: "NRI de uso contínuo; alimento pode reduzir pico e atrasar Tmax." }],
  },
  // Templates mínimos adicionais para resolver aliases comuns e manter utilidade clínica ampla.
  { ...review, name: "Bupropiona XL", generic_name: "bupropiona", normalized_key: "bupropiona", match: ["wellbutrin", "zetron", "bup", "zyban"], brand_names: ["Wellbutrin XL", "Zetron", "Zyban"], substance_type: "medicamento", clinical_category: "Antidepressivo atípico", pharmacological_class: "NDRI / inibidor CYP2D6", pharmacological_subclass: "NET/DAT + hidroxibupropiona", ...oral, default_formulation: "Comprimido XL", default_curve_model: "xr_er_xl", onset_min_value: 2, onset_max_value: 4, onset_unit: "semanas", peak_min_value: 5, peak_max_value: 8, peak_unit: "horas", half_life_min_value: 12, half_life_max_value: 30, half_life_unit: "horas", has_steady_state: true, steady_state_min_value: 5, steady_state_max_value: 8, steady_state_unit: "dias", dose_unit_default: "mg", dose_usual_min: 150, dose_usual_max: 300, dose_max_recommended: 450, cyp_substrate: ["CYP2B6"], cyp_inhibitor: ["CYP2D6"], clinical_effect_profile: { antidepressivo: 55, foco: 45, "motivação/drive": 55 }, adverse_effect_profile: { insônia: 55, "ansiedade autonômica": 45, "risco convulsivo": 45 }, safety_notes: "Inibe CYP2D6; aumenta exposição de atomoxetina/vortioxetina/aripiprazol. Cautela em insônia, irritabilidade e convulsão." },
  { ...review, name: "Aripiprazol", generic_name: "aripiprazol", normalized_key: "aripiprazol", match: ["abilify", "aristab", "aripiprazole"], brand_names: ["Abilify", "Aristab"], substance_type: "medicamento", clinical_category: "Antipsicótico / potencializador", pharmacological_class: "Agonista parcial D2/5-HT1A; antagonista 5-HT2A", ...oral, default_curve_model: "long_half_life", peak_min_value: 3, peak_max_value: 5, peak_unit: "horas", half_life_min_value: 75, half_life_max_value: 95, half_life_unit: "horas", has_steady_state: true, steady_state_min_value: 14, steady_state_max_value: 21, steady_state_unit: "dias", cyp_substrate: ["CYP2D6", "CYP3A4"], clinical_effect_profile: { "estabilização de humor": 45, antidepressivo: 35 }, adverse_effect_profile: { acatisia: 65, insônia: 45, "impulsividade": 35 }, safety_notes: "Monitorar acatisia, insônia, compulsividade/impulsos e interações CYP2D6/3A4." },
  { ...review, name: "Quetiapina IR", generic_name: "quetiapina", normalized_key: "quetiapina_ir", match: ["seroquel", "quetiapina", "quet", "quetiapine"], brand_names: ["Seroquel"], substance_type: "medicamento", clinical_category: "Antipsicótico sedativo", pharmacological_class: "Antagonista H1/α1/5-HT2A/D2 dependente de dose", ...oral, default_curve_model: "sedative_intermediate", onset_min_value: 30, onset_max_value: 90, onset_unit: "minutos", peak_min_value: 1.5, peak_max_value: 2, peak_unit: "horas", half_life_min_value: 6, half_life_max_value: 7, half_life_unit: "horas", cyp_substrate: ["CYP3A4"], clinical_effect_profile: { sono: 80, ansiolítico: 45 }, adverse_effect_profile: { sedação: 85, "prejuízo cognitivo": 65, "ganho de peso": 60, "ressaca/residual": 70 }, safety_notes: "Cuidado com ressaca cognitiva e carga metabólica." },
  { ...review, name: "Metilfenidato IR", generic_name: "metilfenidato", normalized_key: "metilfenidato_ir", match: ["ritalina", "ritalin", "metilfenidato"], brand_names: ["Ritalina"], substance_type: "medicamento", clinical_category: "TDAH / estimulante", pharmacological_class: "Inibidor DAT/NET", ...oral, default_curve_model: "immediate_release", onset_min_value: 20, onset_max_value: 45, onset_unit: "minutos", peak_min_value: 1, peak_max_value: 2, peak_unit: "horas", total_duration_min_value: 3, total_duration_max_value: 5, total_duration_unit: "horas", half_life_min_value: 2, half_life_max_value: 4, half_life_unit: "horas", dose_unit_default: "mg", dose_usual_min: 5, dose_usual_max: 20, clinical_effect_profile: { foco: 70, vigília: 65 }, adverse_effect_profile: { insônia: 55, "ansiedade autonômica": 50, "risco de abuso": 65 } },
  { ...review, name: "Metilfenidato OROS", generic_name: "metilfenidato", normalized_key: "metilfenidato_oros", match: ["concerta", "metilfenidato oros"], brand_names: ["Concerta"], substance_type: "medicamento", clinical_category: "TDAH / estimulante", pharmacological_class: "Inibidor DAT/NET", ...oral, default_curve_model: "oros", onset_min_value: 30, onset_max_value: 90, onset_unit: "minutos", peak_min_value: 6, peak_max_value: 10, peak_unit: "horas", total_duration_min_value: 8, total_duration_max_value: 12, total_duration_unit: "horas", half_life_min_value: 2, half_life_max_value: 4, half_life_unit: "horas", clinical_effect_profile: { foco: 75, vigília: 70 }, adverse_effect_profile: { insônia: 60, "ansiedade autonômica": 45, "risco de abuso": 45 } },
  { ...review, name: "Sertralina", generic_name: "sertralina", normalized_key: "sertralina", match: ["zoloft", "sertralina"], brand_names: ["Zoloft"], substance_type: "medicamento", clinical_category: "Antidepressivo ISRS", pharmacological_class: "ISRS", ...oral, default_curve_model: "steady_state_daily", onset_min_value: 1, onset_max_value: 4, onset_unit: "semanas", peak_min_value: 4, peak_max_value: 8, peak_unit: "horas", half_life_min_value: 24, half_life_max_value: 26, half_life_unit: "horas", has_steady_state: true, steady_state_min_value: 5, steady_state_max_value: 7, steady_state_unit: "dias", cyp_substrate: ["CYP2B6", "CYP2C19", "CYP2D6"], clinical_effect_profile: { antidepressivo: 65, ansiolítico: 60 }, adverse_effect_profile: { "náusea/GI": 45, "disfunção sexual": 55, insônia: 25, "risco serotoninérgico": 45 } },
  { ...review, name: "Cafeína", generic_name: "cafeína", normalized_key: "cafeina", match: ["cafeina", "café", "coffee", "caffeine"], substance_type: "alimento/interferente", clinical_category: "Estimulante leve", pharmacological_class: "Antagonista adenosina A1/A2A", requires_prescription: false, ...oral, default_curve_model: "immediate_release", onset_min_value: 15, onset_max_value: 45, onset_unit: "minutos", peak_min_value: 30, peak_max_value: 75, peak_unit: "minutos", half_life_min_value: 3, half_life_max_value: 7, half_life_unit: "horas", cyp_substrate: ["CYP1A2"], clinical_effect_profile: { vigília: 40, foco: 30 }, adverse_effect_profile: { insônia: 50, "ansiedade autonômica": 45, "taquicardia/PA": 35 } },
  { ...review, source_type: "harm reduction", name: "Álcool", generic_name: "etanol", normalized_key: "alcool", match: ["alcool", "álcool", "etanol"], substance_type: "substância recreativa", clinical_category: "Depressor SNC", pharmacological_class: "Modulador GABA-A/NMDA", requires_prescription: false, controlled_substance: false, ...oral, default_curve_model: "immediate_release", onset_min_value: 10, onset_max_value: 30, onset_unit: "minutos", peak_min_value: 30, peak_max_value: 90, peak_unit: "minutos", half_life_min_value: 4, half_life_max_value: 5, half_life_unit: "horas", adverse_effect_profile: { sedação: 60, "depressão respiratória": 40, "prejuízo cognitivo": 60, "risco de abuso": 70 }, safety_notes: "Registro clínico/redução de danos; não orientar uso." },
  { ...review, source_type: "harm reduction", name: "Cocaína", generic_name: "cocaína", normalized_key: "cocaina", match: ["cocaina", "cocaína", "crack"], substance_type: "substância recreativa", clinical_category: "Estimulante ilícito", pharmacological_class: "Inibidor DAT/NET/SERT", controlled_substance: true, requires_prescription: false, default_route: "intranasal", available_routes: ["intranasal", "inalatória", "IV"], default_curve_model: "intranasal", onset_min_value: 1, onset_max_value: 5, onset_unit: "minutos", peak_min_value: 15, peak_max_value: 30, peak_unit: "minutos", half_life_min_value: 0.5, half_life_max_value: 1.5, half_life_unit: "horas", adverse_effect_profile: { "taquicardia/PA": 80, "paranoia/psicose": 65, "risco de abuso": 95, insônia: 70 }, safety_notes: "Registro clínico para TUS/redução de danos; sem orientação de uso." },

  { ...review, name: "Venlafaxina XR", generic_name: "venlafaxina", normalized_key: "venlafaxina_xr", match: ["venlafaxina", "venlafaxine", "efexor", "effexor", "venlift"], brand_names: ["Efexor XR", "Venlift OD"], substance_type: "medicamento", clinical_category: "Antidepressivo ISRSN", pharmacological_class: "ISRSN", pharmacological_subclass: "SERT > NET dependente de dose; metabólito ativo desvenlafaxina", therapeutic_areas: ["depressão", "ansiedade", "dor neuropática"], ...oral, default_formulation: "Cápsula oral XR", default_curve_model: "extended_release", onset_min_value: 2, onset_max_value: 4, onset_unit: "horas", comeup_min_value: 7, comeup_max_value: 14, comeup_unit: "dias", peak_min_value: 5, peak_max_value: 8, peak_unit: "horas", half_life_min_value: 5, half_life_max_value: 11, half_life_unit: "horas", has_steady_state: true, steady_state_min_value: 3, steady_state_max_value: 5, steady_state_unit: "dias", cyp_substrate: ["CYP2D6", "CYP3A4"], active_metabolites: ["desvenlafaxina"], clinical_effect_profile: { antidepressivo: 70, ansiolítico: 55, "energia": 35 }, adverse_effect_profile: { "náusea/GI": 55, "insônia": 35, "taquicardia/PA": 45, "risco de abstinência": 70 }, safety_notes: "Monitorar PA/FC, ativação, síndrome de descontinuação e carga serotoninérgica." },
  { ...review, name: "Duloxetina", generic_name: "duloxetina", normalized_key: "duloxetina", match: ["duloxetina", "duloxetine", "cymbalta", "velija"], brand_names: ["Cymbalta", "Velija"], substance_type: "medicamento", clinical_category: "Antidepressivo ISRSN / dor", pharmacological_class: "ISRSN", ...oral, default_formulation: "Cápsula oral de liberação retardada", default_curve_model: "delayed_release", onset_min_value: 2, onset_max_value: 6, onset_unit: "horas", peak_min_value: 6, peak_max_value: 10, peak_unit: "horas", half_life_min_value: 10, half_life_max_value: 14, half_life_unit: "horas", has_steady_state: true, steady_state_min_value: 3, steady_state_max_value: 5, steady_state_unit: "dias", cyp_substrate: ["CYP1A2", "CYP2D6"], clinical_effect_profile: { antidepressivo: 70, ansiolítico: 50, analgesia: 55 }, adverse_effect_profile: { "náusea/GI": 50, "disfunção sexual": 45, "taquicardia/PA": 25, "hepatotoxicidade": 25 }, safety_notes: "Monitorar PA, fígado em risco hepático/álcool, ativação e descontinuação." },
  { ...review, name: "Mirtazapina", generic_name: "mirtazapina", normalized_key: "mirtazapina", match: ["mirtazapina", "mirtazapine", "remeron", "menelat"], brand_names: ["Remeron", "Menelat"], substance_type: "medicamento", clinical_category: "Antidepressivo sedativo", pharmacological_class: "NaSSA / antagonista α2 e 5-HT2/5-HT3", ...oral, default_curve_model: "sedative_long", onset_min_value: 30, onset_max_value: 120, onset_unit: "minutos", peak_min_value: 1, peak_max_value: 3, peak_unit: "horas", half_life_min_value: 20, half_life_max_value: 40, half_life_unit: "horas", has_tail: true, tail_min_value: 24, tail_max_value: 48, tail_unit: "horas", clinical_effect_profile: { sono: 80, antidepressivo: 60, apetite: 70 }, adverse_effect_profile: { sedação: 75, "ganho de peso": 75, "ressaca/residual": 55 }, receptor_profile: [{ target: "H1", action_type: "antagonista", clinical_relevance: "sedação/apetite" }, { target: "α2", action_type: "antagonista", clinical_relevance: "aumento NE/5-HT" }] },
  { ...review, name: "Lamotrigina", generic_name: "lamotrigina", normalized_key: "lamotrigina", match: ["lamotrigina", "lamotrigine", "lamictal"], brand_names: ["Lamictal"], substance_type: "medicamento", clinical_category: "Estabilizador de humor / anticonvulsivante", pharmacological_class: "Bloqueador de canais de sódio", ...oral, default_curve_model: "steady_state_daily", onset_min_value: 1, onset_max_value: 2, onset_unit: "horas", peak_min_value: 1.5, peak_max_value: 5, peak_unit: "horas", half_life_min_value: 25, half_life_max_value: 33, half_life_unit: "horas", has_steady_state: true, steady_state_min_value: 5, steady_state_max_value: 7, steady_state_unit: "dias", ugt_substrate: ["UGT1A4"], clinical_effect_profile: { "estabilização de humor": 65, antidepressivo: 45 }, adverse_effect_profile: { rash: 65, "sedação": 10 }, safety_notes: "Rash/SJS é alerta crítico; valproato aumenta exposição e exige titulação muito mais lenta." },
  { ...review, name: "Lítio", generic_name: "carbonato de lítio", normalized_key: "litio", match: ["litio", "lítio", "carbolitium", "lithium"], brand_names: ["Carbolitium"], substance_type: "medicamento", clinical_category: "Estabilizador de humor", pharmacological_class: "Cátion monovalente; janela terapêutica estreita", ...oral, default_curve_model: "steady_state_daily", onset_min_value: 1, onset_max_value: 3, onset_unit: "horas", peak_min_value: 1, peak_max_value: 3, peak_unit: "horas", half_life_min_value: 18, half_life_max_value: 36, half_life_unit: "horas", has_steady_state: true, steady_state_min_value: 5, steady_state_max_value: 7, steady_state_unit: "dias", clinical_effect_profile: { "estabilização de humor": 85, "anti-suicida": 70 }, adverse_effect_profile: { tremor: 55, "risco renal/tireóide": 60, "toxicidade": 75 }, safety_notes: "Exige litemia, função renal, TSH, eletrólitos; atenção a AINE/IECA/diurético/desidratação." },
  { ...review, name: "Pregabalina", generic_name: "pregabalina", normalized_key: "pregabalina", match: ["pregabalina", "pregabalin", "lyrica", "prebictal"], brand_names: ["Lyrica", "Prebictal"], substance_type: "medicamento", clinical_category: "Ansiolítico / dor neuropática", pharmacological_class: "Ligante α2δ de canais de cálcio", ...oral, default_curve_model: "immediate_release", onset_min_value: 30, onset_max_value: 90, onset_unit: "minutos", peak_min_value: 1, peak_max_value: 2, peak_unit: "horas", half_life_min_value: 5, half_life_max_value: 7, half_life_unit: "horas", clinical_effect_profile: { ansiolítico: 55, analgesia: 55, sono: 35 }, adverse_effect_profile: { sedação: 60, tontura: 55, "risco de abuso": 45 }, safety_notes: "Monitorar sedação, edema, ganho de peso e uso problemático em TUS." },
  { ...review, source_type: "harm reduction", name: "Nicotina", generic_name: "nicotina", normalized_key: "nicotina", match: ["nicotina", "nicotine", "cigarro", "vape", "tabaco", "narguile"], substance_type: "substância recreativa", clinical_category: "Estimulante nicotínico", pharmacological_class: "Agonista nicotínico nAChR", requires_prescription: false, default_route: "inalatória", available_routes: ["inalatória", "transdérmica", "oral", "sublingual"], default_curve_model: "rapid_reinforcement", onset_min_value: 5, onset_max_value: 20, onset_unit: "segundos", peak_min_value: 5, peak_max_value: 10, peak_unit: "minutos", half_life_min_value: 1, half_life_max_value: 2, half_life_unit: "horas", clinical_effect_profile: { vigília: 35, foco: 25 }, adverse_effect_profile: { "risco de abuso": 90, ansiedade: 45, insônia: 35 }, safety_notes: "Registro clínico/redução de danos; não orientar uso. Monitorar dependência, ansiedade e sono." },
  { ...review, source_type: "harm reduction", name: "Cannabis/THC", generic_name: "delta-9-tetrahidrocanabinol", normalized_key: "cannabis_thc", match: ["cannabis", "maconha", "thc", "weed", "haxixe"], substance_type: "substância recreativa", clinical_category: "Canabinoide", pharmacological_class: "Agonista parcial CB1/CB2", requires_prescription: false, default_route: "inalatória", available_routes: ["inalatória", "oral"], default_curve_model: "route_dependent", onset_min_value: 1, onset_max_value: 10, onset_unit: "minutos", peak_min_value: 15, peak_max_value: 30, peak_unit: "minutos", half_life_min_value: 24, half_life_max_value: 72, half_life_unit: "horas", clinical_effect_profile: { relaxamento: 45, apetite: 55 }, adverse_effect_profile: { ansiedade: 55, "prejuízo cognitivo": 65, "paranoia/psicose": 45, "risco de abuso": 55 }, safety_notes: "Registrar via e padrão. Pode piorar cognição, motivação, ansiedade, psicose vulnerável e sono REM." },
  { ...review, source_type: "harm reduction", name: "MDMA", generic_name: "3,4-metilenodioximetanfetamina", normalized_key: "mdma", match: ["mdma", "ecstasy", "bala", "molly"], substance_type: "substância recreativa", clinical_category: "Entactógeno/estimulante ilícito", pharmacological_class: "Liberador serotoninérgico/catecolaminérgico", controlled_substance: true, requires_prescription: false, default_route: "oral", default_curve_model: "acute_serotonergic_stimulant", onset_min_value: 20, onset_max_value: 60, onset_unit: "minutos", peak_min_value: 1.5, peak_max_value: 3, peak_unit: "horas", half_life_min_value: 7, half_life_max_value: 9, half_life_unit: "horas", adverse_effect_profile: { "risco serotoninérgico": 85, hipertermia: 75, "risco de abuso": 65, insônia: 70 }, safety_notes: "Registro clínico/redução de danos; não orientar uso. Alertar risco serotoninérgico, hipertermia e interações." },
  { ...review, source_type: "harm reduction", name: "Cetamina", generic_name: "cetamina", normalized_key: "cetamina", match: ["ketamina", "cetamina", "ketamine", "k"], substance_type: "substância recreativa", clinical_category: "Dissociativo / anestésico", pharmacological_class: "Antagonista NMDA", default_route: "intranasal", available_routes: ["intranasal", "IV", "IM", "oral"], default_curve_model: "route_dependent", onset_min_value: 5, onset_max_value: 15, onset_unit: "minutos", peak_min_value: 20, peak_max_value: 60, peak_unit: "minutos", half_life_min_value: 2, half_life_max_value: 3, half_life_unit: "horas", active_metabolites: ["norcetamina"], clinical_effect_profile: { analgesia: 55, dissociação: 80 }, adverse_effect_profile: { dissociação: 80, "prejuízo cognitivo": 70, "risco de abuso": 60, "risco urinário": 50 }, safety_notes: "Registro clínico/redução de danos; monitorar dissociação, pressão, uso compulsivo e trato urinário." },
  { ...review, source_type: "harm reduction", name: "LSD", generic_name: "dietilamida do ácido lisérgico", normalized_key: "lsd", match: ["lsd", "ácido", "acido", "lsd-25"], substance_type: "substância recreativa", clinical_category: "Psicodélico clássico", pharmacological_class: "Agonista parcial 5-HT2A", default_route: "oral/sublingual", default_curve_model: "long_psychedelic", onset_min_value: 20, onset_max_value: 90, onset_unit: "minutos", peak_min_value: 2, peak_max_value: 5, peak_unit: "horas", total_duration_min_value: 8, total_duration_max_value: 12, total_duration_unit: "horas", adverse_effect_profile: { ansiedade: 65, "paranoia/psicose": 45, insônia: 70 }, safety_notes: "Registro clínico/redução de danos; não orientar uso. Avaliar vulnerabilidade psicótica/maniforme e contexto." },
  { ...review, source_type: "harm reduction", name: "Psilocibina", generic_name: "psilocibina", normalized_key: "psilocibina", match: ["psilocibina", "psilocybin", "cogumelo", "cogumelos", "magic mushrooms"], substance_type: "substância recreativa", clinical_category: "Psicodélico clássico", pharmacological_class: "Pró-fármaco de psilocina; agonismo 5-HT2A", default_route: "oral", default_curve_model: "psychedelic_oral", onset_min_value: 20, onset_max_value: 60, onset_unit: "minutos", peak_min_value: 1.5, peak_max_value: 3, peak_unit: "horas", total_duration_min_value: 4, total_duration_max_value: 6, total_duration_unit: "horas", adverse_effect_profile: { ansiedade: 60, "náusea/GI": 45, "paranoia/psicose": 35 }, safety_notes: "Registro clínico/redução de danos; não orientar uso. Avaliar vulnerabilidade psicótica/maniforme e interações." },
  { ...review, source_type: "harm reduction", name: "Metanfetamina", generic_name: "metanfetamina", normalized_key: "metanfetamina", match: ["metanfetamina", "meth", "crystal", "ice", "cristal"], substance_type: "substância recreativa", clinical_category: "Estimulante ilícito", pharmacological_class: "Liberador DA/NE potente", controlled_substance: true, default_route: "inalatória", available_routes: ["inalatória", "intranasal", "IV", "oral"], default_curve_model: "potent_stimulant", onset_min_value: 1, onset_max_value: 10, onset_unit: "minutos", peak_min_value: 1, peak_max_value: 4, peak_unit: "horas", half_life_min_value: 10, half_life_max_value: 12, half_life_unit: "horas", adverse_effect_profile: { "risco de abuso": 98, "paranoia/psicose": 90, insônia: 95, "taquicardia/PA": 85 }, safety_notes: "Registro clínico/redução de danos; alto risco de psicose, neurotoxicidade funcional, compulsão e privação de sono." },
  { ...review, source_type: "harm reduction", name: "Codeína", generic_name: "codeína", normalized_key: "codeina", match: ["codeina", "codeína", "codein", "xarope", "lean"], substance_type: "substância recreativa", clinical_category: "Opioide", pharmacological_class: "Pró-fármaco opioide; CYP2D6 para morfina", controlled_substance: true, default_route: "oral", default_curve_model: "opioid_oral", onset_min_value: 30, onset_max_value: 60, onset_unit: "minutos", peak_min_value: 1, peak_max_value: 2, peak_unit: "horas", half_life_min_value: 3, half_life_max_value: 4, half_life_unit: "horas", cyp_substrate: ["CYP2D6", "CYP3A4"], active_metabolites: ["morfina"], adverse_effect_profile: { "depressão respiratória": 75, sedação: 65, "risco de abuso": 80, constipação: 55 }, safety_notes: "Alerta máximo com benzodiazepínicos/álcool. Variabilidade CYP2D6 altera risco/efeito." },
  { ...review, source_type: "harm reduction", name: "Morfina", generic_name: "morfina", normalized_key: "morfina", match: ["morfina", "morphine"], substance_type: "substância recreativa", clinical_category: "Opioide", pharmacological_class: "Agonista MOR", controlled_substance: true, default_route: "oral", available_routes: ["oral", "IV", "SC", "IM"], default_curve_model: "route_dependent_opioid", onset_min_value: 15, onset_max_value: 60, onset_unit: "minutos", peak_min_value: 0.5, peak_max_value: 2, peak_unit: "horas", half_life_min_value: 2, half_life_max_value: 4, half_life_unit: "horas", active_metabolites: ["M6G", "M3G"], adverse_effect_profile: { "depressão respiratória": 90, sedação: 75, "risco de abuso": 90 }, safety_notes: "Alerta máximo com BZD/álcool; registrar via e dose sem orientar uso." },
  { ...review, source_type: "harm reduction", name: "Oxicodona", generic_name: "oxicodona", normalized_key: "oxicodona", match: ["oxicodona", "oxycodone", "oxycontin", "oxicontin"], substance_type: "substância recreativa", clinical_category: "Opioide", pharmacological_class: "Agonista MOR", controlled_substance: true, default_route: "oral", default_curve_model: "opioid_oral", onset_min_value: 15, onset_max_value: 45, onset_unit: "minutos", peak_min_value: 1, peak_max_value: 2, peak_unit: "horas", half_life_min_value: 3, half_life_max_value: 5, half_life_unit: "horas", cyp_substrate: ["CYP3A4", "CYP2D6"], adverse_effect_profile: { "depressão respiratória": 90, sedação: 70, "risco de abuso": 92 }, safety_notes: "Alto risco em TUS; alerta máximo com benzodiazepínicos/álcool." },
  { ...review, source_type: "harm reduction", name: "Fentanil", generic_name: "fentanil", normalized_key: "fentanil", match: ["fentanil", "fentanyl", "fenta"], substance_type: "substância recreativa", clinical_category: "Opioide sintético de alta potência", pharmacological_class: "Agonista MOR potente", controlled_substance: true, default_route: "IV/transdérmica", available_routes: ["IV", "transdérmica", "mucosa"], default_curve_model: "route_dependent_high_potency_opioid", onset_min_value: 1, onset_max_value: 5, onset_unit: "minutos", half_life_min_value: 3, half_life_max_value: 12, half_life_unit: "horas", cyp_substrate: ["CYP3A4"], adverse_effect_profile: { "depressão respiratória": 100, sedação: 80, "risco de abuso": 98 }, safety_notes: "Alerta máximo. Risco fatal de depressão respiratória, especialmente com BZD/álcool/outros sedativos." },
  { ...review, name: "Metadona", generic_name: "metadona", normalized_key: "metadona", match: ["metadona", "methadone", "mytedom"], brand_names: ["Mytedom"], substance_type: "medicamento", clinical_category: "Tratamento TUS opioide / analgesia", pharmacological_class: "Agonista MOR; antagonismo NMDA fraco", controlled_substance: true, requires_prescription: true, default_route: "oral", default_curve_model: "long_half_life_opioid", onset_min_value: 30, onset_max_value: 60, onset_unit: "minutos", peak_min_value: 2, peak_max_value: 4, peak_unit: "horas", half_life_min_value: 8, half_life_max_value: 59, half_life_unit: "horas", has_steady_state: true, steady_state_min_value: 4, steady_state_max_value: 10, steady_state_unit: "dias", cyp_substrate: ["CYP3A4", "CYP2B6", "CYP2D6"], adverse_effect_profile: { "depressão respiratória": 90, "risco QT": 65, sedação: 65 }, safety_notes: "Janela complexa, acúmulo e QT. Alerta máximo com BZD/álcool." },
  { ...review, name: "Buprenorfina", generic_name: "buprenorfina", normalized_key: "buprenorfina", match: ["buprenorfina", "buprenorphine", "suboxone", "subutex"], substance_type: "medicamento", clinical_category: "Tratamento TUS opioide", pharmacological_class: "Agonista parcial MOR / antagonista KOR", controlled_substance: true, requires_prescription: true, default_route: "sublingual", default_curve_model: "long_partial_opioid", onset_min_value: 30, onset_max_value: 90, onset_unit: "minutos", peak_min_value: 1, peak_max_value: 4, peak_unit: "horas", half_life_min_value: 24, half_life_max_value: 42, half_life_unit: "horas", cyp_substrate: ["CYP3A4"], adverse_effect_profile: { sedação: 50, "depressão respiratória": 65, "risco de abstinência precipitada": 70 }, safety_notes: "Alerta para abstinência precipitada se opioide agonista pleno ativo; risco com BZD/álcool." },
  { ...review, name: "Naltrexona", generic_name: "naltrexona", normalized_key: "naltrexona", match: ["naltrexona", "naltrexone", "revia"], substance_type: "medicamento", clinical_category: "Antagonista opioide / álcool", pharmacological_class: "Antagonista MOR/KOR/DOR", ...oral, default_curve_model: "steady_state_daily", onset_min_value: 1, onset_max_value: 2, onset_unit: "horas", peak_min_value: 1, peak_max_value: 2, peak_unit: "horas", half_life_min_value: 4, half_life_max_value: 13, half_life_unit: "horas", clinical_effect_profile: { "redução de craving": 55 }, adverse_effect_profile: { "náusea/GI": 35, "hepatotoxicidade": 25, "abstinência precipitada": 80 }, safety_notes: "Exige ausência de opioide ativo para evitar abstinência precipitada; monitorar função hepática." },
];

export function normalizeDrugName(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function aliasesOf(t: KBTemplate): string[] {
  return [t.name, t.generic_name, ...(t.match ?? []), ...(t.brand_names ?? []), ...(t.brands ?? []), ...(t.international_brand_names ?? []), ...(t.reference_names ?? []), ...(t.synonyms ?? []), ...(t.common_misspellings ?? [])]
    .filter(Boolean) as string[];
}

/** Busca template por nome digitado, marca, alias ou erro comum. */
export function findTemplate(query: string): KBTemplate | null {
  const q = normalizeDrugName(query);
  if (!q) return null;
  return KNOWLEDGE_BASE.find((t) => aliasesOf(t).some((a) => {
    const n = normalizeDrugName(a);
    return n === q || (q.length >= 3 && (n.includes(q) || q.includes(n)));
  })) ?? null;
}

export const PHARM_CLASSES = [
  "Psicoestimulante anfetamínico", "Inibidor DAT/NET", "Inibidor seletivo da recaptação de noradrenalina", "NDRI / inibidor CYP2D6",
  "ISRS", "ISRSN", "Antidepressivo multimodal serotoninérgico", "Tricíclico", "NaSSA", "SARI",
  "Agonista alfa-2 adrenérgico central", "Benzodiazepínico", "Z-drug", "Anticonvulsivante estabilizador de humor",
  "Agonista parcial D2/5-HT1A", "Antipsicótico sedativo", "Opioide", "Antagonista opioide", "Antagonista adenosina A1/A2A",
];

export const RECEPTOR_CHIPS = ["D1", "D2", "D3", "5-HT1A", "5-HT1B", "5-HT2A", "5-HT2C", "5-HT3", "5-HT7", "H1", "M1", "α1", "α2", "β1", "β2", "DAT", "NET", "SERT", "VMAT2", "TAAR1", "GABA-A", "GABA-B", "NMDA", "AMPA", "MOR", "KOR", "DOR", "NOP", "CB1", "CB2", "nAChR", "Adenosina A1", "Adenosina A2A"];
export const CYP_LIST = ["CYP1A2", "CYP2B6", "CYP2C9", "CYP2C19", "CYP2D6", "CYP3A4", "CYP3A5", "UGT", "P-gp", "OCT", "OATP", "BCRP"];
export const FORMULATIONS = ["cápsula oral pró-fármaco", "comprimido oral diário", "comprimido oral sedativo longo", "comprimido oral IR antiadrenérgico", "comprimido oral ER", "cápsula oral diária", "liberação imediata oral", "liberação retardada", "liberação prolongada", "liberação sustentada", "liberação controlada", "XR", "ER", "XL", "LA", "OROS", "pró-fármaco oral", "sedativo curto", "sedativo intermediário", "sedativo longo", "steady-state diário", "meia-vida longa", "sublingual", "intranasal", "inalatória", "oral líquida", "metabólito ativo dominante"];
export const CURVE_MODELS = ["immediate_release", "delayed_release", "extended_release", "sustained_release", "controlled_release", "xr_er_xl", "la", "oros", "prodrug", "prodrug_with_bioactivation", "sedative_short", "sedative_intermediate", "sedative_long", "steady_state_daily", "steady_state_prolonged", "progressive_accumulation", "long_half_life", "transdermal", "depot", "sublingual", "intranasal", "inhaled", "liquid_oral", "prn_acute", "continuous_use", "intermittent_use", "biphasic", "multiphasic", "food_dependent", "active_metabolite_dominant", "unknown_conservative"];
export const BENEFIT_AXES = ["foco", "vigília", "energia", "iniciação de tarefa", "sustentação de tarefa", "motivação/drive", "antidepressivo", "ansiolítico", "anti-ruminação", "anti-impulsividade", "estabilização de humor", "redução de craving", "sono", "analgesia", "apetite", "socialização", "redução de hiperalerta", "redução de pesadelos"];
export const ADVERSE_AXES = ["sedação", "insônia", "ansiedade autonômica", "irritabilidade", "acatisia", "paranoia/psicose", "mania/hipomania", "taquicardia/PA", "náusea/GI", "disfunção sexual", "ganho de peso", "perda de apetite", "prejuízo cognitivo", "anticolinérgico", "depressão respiratória", "risco convulsivo", "risco serotoninérgico", "risco QT", "risco de abuso", "risco de abstinência", "ressaca/residual"];
export const RISK_LEVELS = ["muito baixo", "baixo", "moderado", "alto", "muito alto"];

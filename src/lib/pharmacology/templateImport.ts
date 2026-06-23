import type { KBFormulationTemplate, KBTemplate } from "@/lib/pharmacologyKnowledgeBase";

const SUBSTANCE_COLUMNS = new Set([
  "absorption_notes", "abuse_liability_profile", "abuse_risk_level", "active_metabolites", "adverse_effect_profile", "alcohol_interaction_notes",
  "available_formulations", "available_routes", "bioavailability_max", "bioavailability_min", "black_box_warnings", "brand_names", "brands",
  "caffeine_interaction_notes", "cardiovascular_risk_level", "circuit_effects", "clinical_category", "clinical_effect_profile", "cognitive_impairment_risk_level",
  "comeup_max_value", "comeup_min_value", "comeup_unit", "common_adverse_effects", "common_misspellings", "contraindication_rules", "controlled_substance",
  "cyp_inducer", "cyp_inhibitor", "cyp_substrate", "default_curve_model", "default_dose_unit", "default_formulation", "default_route", "dependence_profile",
  "distribution_notes", "dose_high_max", "dose_high_min", "dose_low_max", "dose_low_min", "dose_max_recommended", "dose_notes", "dose_unit_default",
  "dose_usual_max", "dose_usual_min", "elimination_notes", "empty_stomach_effect", "enzyme_profile", "evidence_level", "food_delay_onset_minutes_max",
  "food_delay_onset_minutes_min", "food_effect_notes", "food_influence", "food_interaction_profile", "generic_name", "half_life_max_value", "half_life_min_value",
  "half_life_unit", "has_steady_state", "has_tail", "hepatic_adjustment_notes", "high_fat_meal_effect", "insomnia_risk_level", "interaction_rules", "is_global",
  "legal_status", "major_warnings", "mechanism_expanded", "mechanism_summary", "metabolic_risk_level", "metabolic_role", "metabolism", "metabolism_notes",
  "monitoring_rules", "name", "neurotransmitter_effects", "offset_max_value", "offset_min_value", "offset_unit", "onset_max_value", "onset_min_value",
  "onset_unit", "peak_max_value", "peak_min_value", "peak_unit", "pharmacological_class", "pharmacological_subclass", "pk", "pk_profile", "plateau_max_value",
  "plateau_min_value", "plateau_unit", "potentials", "presentations", "primary_targets", "protein_binding_percent", "psychosis_mania_risk_level", "qt_risk_level",
  "receptor_profile", "reference_names", "references", "release_curve_type", "relevant_enzymes", "renal_adjustment_notes", "requires_clinical_review", "requires_prescription",
  "residual_max_value", "residual_min_value", "residual_unit", "respiratory_depression_risk_level", "review_status", "reviewed_by", "safety_notes", "secondary_targets",
  "sedation_risk_level", "seizure_risk_level", "serious_adverse_effects", "serotonin_syndrome_risk_level", "short_description", "sleep_deprivation_risk_notes",
  "source_notes", "source_references", "steady_state_max_value", "steady_state_min_value", "steady_state_unit", "substance_type", "synonyms", "tail_max_value",
  "tail_min_value", "tail_unit", "targets_receptors", "therapeutic_areas", "titration_notes", "tolerance_model", "tolerance_profile", "total_duration_max_value",
  "total_duration_min_value", "total_duration_unit", "transporter_inhibitor", "transporter_profile", "transporter_substrate", "ugt_inducer", "ugt_inhibitor",
  "ugt_substrate", "withdrawal_profile",
]);

const FORMULATION_COLUMNS = new Set([
  "formulation_name", "formulation_type", "route", "curve_model", "onset_min_value", "onset_max_value", "onset_unit", "comeup_min_value", "comeup_max_value",
  "comeup_unit", "peak_min_value", "peak_max_value", "peak_unit", "plateau_min_value", "plateau_max_value", "plateau_unit", "offset_min_value", "offset_max_value",
  "offset_unit", "duration_min_value", "duration_max_value", "duration_unit", "half_life_min_value", "half_life_max_value", "half_life_unit", "has_steady_state",
  "steady_state_min_value", "steady_state_max_value", "steady_state_unit", "has_tail", "tail_min_value", "tail_max_value", "tail_unit", "food_effect_profile", "notes", "is_default",
]);

export function toSubstanceInsert(template: KBTemplate): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(template)) {
    if (SUBSTANCE_COLUMNS.has(k) && v !== undefined) out[k] = v;
  }
  out.requires_clinical_review = true;
  out.review_status = out.review_status ?? "não revisada";
  out.source_notes = out.source_notes ?? "Template farmacológico estrutural. Revisão clínica obrigatória.";
  return out;
}

export function toFormulationInserts(template: KBTemplate): KBFormulationTemplate[] {
  const formulations = template.formulations?.length
    ? template.formulations
    : template.default_formulation
      ? [{
          formulation_name: template.default_formulation,
          formulation_type: template.default_formulation,
          route: template.default_route,
          curve_model: template.default_curve_model,
          onset_min_value: template.onset_min_value,
          onset_max_value: template.onset_max_value,
          onset_unit: template.onset_unit,
          comeup_min_value: template.comeup_min_value,
          comeup_max_value: template.comeup_max_value,
          comeup_unit: template.comeup_unit,
          peak_min_value: template.peak_min_value,
          peak_max_value: template.peak_max_value,
          peak_unit: template.peak_unit,
          plateau_min_value: template.plateau_min_value,
          plateau_max_value: template.plateau_max_value,
          plateau_unit: template.plateau_unit,
          offset_min_value: template.offset_min_value,
          offset_max_value: template.offset_max_value,
          offset_unit: template.offset_unit,
          duration_min_value: template.total_duration_min_value,
          duration_max_value: template.total_duration_max_value,
          duration_unit: template.total_duration_unit,
          half_life_min_value: template.half_life_min_value,
          half_life_max_value: template.half_life_max_value,
          half_life_unit: template.half_life_unit,
          has_steady_state: template.has_steady_state,
          steady_state_min_value: template.steady_state_min_value,
          steady_state_max_value: template.steady_state_max_value,
          steady_state_unit: template.steady_state_unit,
          has_tail: template.has_tail,
          tail_min_value: template.tail_min_value,
          tail_max_value: template.tail_max_value,
          tail_unit: template.tail_unit,
          is_default: true,
          notes: "Criada a partir do template farmacológico local. Revisão clínica obrigatória.",
        }]
      : [];

  return formulations.map((f) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(f)) {
      if (FORMULATION_COLUMNS.has(k) && v !== undefined) out[k] = v;
    }
    return out as KBFormulationTemplate;
  });
}

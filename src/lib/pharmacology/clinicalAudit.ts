/**
 * Auditoria clínico-farmacológica leve.
 * Detecta dados faltantes / inconsistências sem gerar prescrição.
 */
export interface AuditIssue {
  severity: "info" | "warn" | "high";
  code: string;
  message: string;
  suggestion?: string;
}

export interface AuditableSubstance {
  name?: string | null;
  default_curve_model?: string | null;
  default_formulation?: string | null;
  has_steady_state?: boolean | null;
  has_tail?: boolean | null;
  brand_names?: string[] | null;
  pharmacological_class?: string | null;
  clinical_effect_profile?: Record<string, number> | null;
  adverse_effect_profile?: Record<string, number> | null;
  monitoring_profile?: string[] | null;
  cyp_substrate?: string[] | null;
  controlled_substance?: boolean | null;
}

export function auditSubstance(s: AuditableSubstance): AuditIssue[] {
  const out: AuditIssue[] = [];
  if (!s.name?.trim()) out.push({ severity: "high", code: "no_name", message: "Substância sem nome." });
  if (!s.default_curve_model) out.push({ severity: "warn", code: "no_curve_model", message: "Modelo de curva não definido — curva padrão imediata será usada.", suggestion: "Selecionar modelo (immediate_release, prodrug, steady_state_daily, etc.)." });
  if (!s.default_formulation) out.push({ severity: "warn", code: "no_formulation", message: "Sem formulação padrão.", suggestion: "Adicionar pelo menos uma formulação." });
  if (!s.pharmacological_class) out.push({ severity: "info", code: "no_class", message: "Classe farmacológica não preenchida." });
  if (!s.clinical_effect_profile || Object.keys(s.clinical_effect_profile).length === 0)
    out.push({ severity: "info", code: "no_benefit_axes", message: "Eixos terapêuticos 0–100 não definidos." });
  if (!s.adverse_effect_profile || Object.keys(s.adverse_effect_profile).length === 0)
    out.push({ severity: "info", code: "no_adverse_axes", message: "Eixos adversos 0–100 não definidos." });
  if (s.has_steady_state && !s.monitoring_profile?.length)
    out.push({ severity: "warn", code: "ss_no_monitoring", message: "Steady-state ativo sem plano de monitorização." });
  if (s.controlled_substance && !s.adverse_effect_profile?.["risco de abuso"])
    out.push({ severity: "warn", code: "controlled_no_abuse_axis", message: "Substância controlada sem eixo de risco de abuso preenchido." });
  return out;
}

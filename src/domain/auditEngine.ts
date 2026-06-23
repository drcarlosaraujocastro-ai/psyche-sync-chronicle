export type AuditDomain =
  | "paciente"
  | "sessao"
  | "dose"
  | "curva"
  | "sintomas"
  | "interacao"
  | "seguranca";

export interface AuditFinding {
  domain: AuditDomain;
  message: string;
  severity: "info" | "warn" | "high";
}

export interface AuditInput {
  patient?: any;
  session?: any;
  doses?: any[];
  symptoms?: any[];
  targetSymptoms?: any[];
  medications?: any[];
}

export function runAudit(input: AuditInput): { score: number; findings: AuditFinding[] } {
  const f: AuditFinding[] = [];
  const p = input.patient ?? {};
  if (!p.primary_diagnoses?.length && !p.diagnostic_hypotheses)
    f.push({ domain: "paciente", message: "Sem diagnósticos nem hipóteses registradas.", severity: "warn" });
  if (!p.current_complaint)
    f.push({ domain: "paciente", message: "Sem queixa atual.", severity: "info" });
  if (!p.suicide_risk)
    f.push({ domain: "seguranca", message: "Risco suicida não avaliado.", severity: "high" });
  if (!p.cardiovascular_history)
    f.push({ domain: "seguranca", message: "História cardiovascular não registrada.", severity: "warn" });

  const s = input.session;
  if (s) {
    if (!s.baseline_state)
      f.push({ domain: "sessao", message: "Estado basal não registrado na sessão.", severity: "warn" });
    if (s.sleep_hours == null)
      f.push({ domain: "sessao", message: "Horas de sono não registradas.", severity: "warn" });
    if (!s.patient_narrative && !s.physician_observation)
      f.push({ domain: "sessao", message: "Sessão sem narrativa nem observação clínica.", severity: "info" });
  }

  for (const d of input.doses ?? []) {
    if (!d.actual_time)
      f.push({ domain: "dose", message: `Dose de ${d.substance_name} sem horário real.`, severity: "high" });
    if (!d.stomach)
      f.push({ domain: "dose", message: `Dose de ${d.substance_name} sem contexto alimentar.`, severity: "info" });
  }

  if (!(input.targetSymptoms ?? []).length)
    f.push({ domain: "sintomas", message: "Sem sintomas-alvo definidos.", severity: "warn" });

  const meds = input.medications ?? [];
  if (meds.length >= 2)
    f.push({ domain: "interacao", message: "Combinações ativas — revise módulo de interações.", severity: "info" });

  // score 0–100: começa em 100 e desconta por gravidade
  let score = 100;
  for (const item of f) {
    score -= item.severity === "high" ? 12 : item.severity === "warn" ? 6 : 2;
  }
  return { score: Math.max(0, score), findings: f };
}
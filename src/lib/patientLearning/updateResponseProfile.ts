import { supabase } from "@/integrations/supabase/client";
import { withOwner } from "@/lib/supabase/withOwner";
import type { User } from "@supabase/supabase-js";

/**
 * Atualiza patient_substance_response_profiles com média móvel a partir
 * do check-in clínico atual e doses recentes.
 * Associação temporal — não prova causalidade.
 */
export async function updatePatientSubstanceResponseProfile(opts: {
  user: User;
  patientId: string;
  sessionId?: string | null;
  checkin: Record<string, any>;
  recentDoses: Array<{ substance_id?: string | null; substance_name: string; actual_time: string;
    stomach_fullness_0_10?: number | null; caffeine_near_dose_mg?: number | null;
    sleep_deprivation_at_dose_0_10?: number | null; }>;
}) {
  const { user, patientId, recentDoses, checkin } = opts;
  if (!recentDoses?.length) return;

  // métricas derivadas do check-in (escala 0–10 -> 0–100)
  const x10 = (k: string) => checkin?.[k] != null ? Number(checkin[k]) * 10 : null;
  const focus = x10("focus_0_10");
  const sedation = x10("sedation_0_10");
  const stim = x10("energy_0_10");
  const anxiety = x10("anxiety_0_10");
  const impuls = x10("impulsivity_0_10");
  const craving = x10("craving_0_10");
  const adverse = [x10("paranoia_0_10"), x10("cardiovascular_0_10"), x10("insomnia_0_10")]
    .filter((v): v is number => v != null);
  const adverseAvg = adverse.length ? adverse.reduce((a, b) => a + b, 0) / adverse.length : null;
  const benefit = [focus, x10("mood_0_10"), x10("motivation_0_10")].filter((v): v is number => v != null);
  const benefitAvg = benefit.length ? benefit.reduce((a, b) => a + b, 0) / benefit.length : null;

  for (const d of recentDoses) {
    // localizar perfil existente
    const { data: existing } = await (supabase as any)
      .from("patient_substance_response_profiles").select("*")
      .eq("owner_id", user.id).eq("patient_id", patientId)
      .eq("substance_name", d.substance_name).maybeSingle();

    const n = (existing?.sample_count ?? 0) + 1;
    const avg = (prev: any, next: number | null) => {
      if (next == null) return prev ?? null;
      if (prev == null) return next;
      return (Number(prev) * (n - 1) + next) / n;
    };
    const conf = n >= 8 ? "alta" : n >= 3 ? "média" : "baixa";

    // sensibilidades — usar dose mais próxima do check-in
    const food = d.stomach_fullness_0_10 != null ? Math.abs(Number(d.stomach_fullness_0_10) * 10 - (sedation ?? 50)) : null;
    const caf = d.caffeine_near_dose_mg != null ? Math.min(100, Number(d.caffeine_near_dose_mg) / 4) : null;
    const slp = d.sleep_deprivation_at_dose_0_10 != null ? Number(d.sleep_deprivation_at_dose_0_10) * 10 : null;

    const axisDeltas = {
      ...(existing?.axis_deltas ?? {}),
      [new Date().toISOString()]: {
        focus, sedation, stim, anxiety, impuls, craving,
        paranoia: x10("paranoia_0_10"),
      },
    };

    const payload = {
      substance_name: d.substance_name,
      substance_id: d.substance_id ?? existing?.substance_id ?? null,
      patient_id: patientId,
      sample_count: n,
      average_benefit_0_100: avg(existing?.average_benefit_0_100, benefitAvg),
      average_adverse_0_100: avg(existing?.average_adverse_0_100, adverseAvg),
      average_sedation_0_100: avg(existing?.average_sedation_0_100, sedation),
      average_stimulation_0_100: avg(existing?.average_stimulation_0_100, stim),
      average_anxiety_0_100: avg(existing?.average_anxiety_0_100, anxiety),
      average_focus_0_100: avg(existing?.average_focus_0_100, focus),
      average_impulsivity_change_0_100: avg(existing?.average_impulsivity_change_0_100, impuls),
      average_craving_change_0_100: avg(existing?.average_craving_change_0_100, craving),
      food_sensitivity_0_100: avg(existing?.food_sensitivity_0_100, food),
      caffeine_sensitivity_0_100: avg(existing?.caffeine_sensitivity_0_100, caf),
      sleep_deprivation_sensitivity_0_100: avg(existing?.sleep_deprivation_sensitivity_0_100, slp),
      psychosis_activation_risk_0_100: avg(existing?.psychosis_activation_risk_0_100, x10("paranoia_0_10")),
      redose_risk_0_100: avg(existing?.redose_risk_0_100, x10("craving_0_10")),
      confidence: conf,
      axis_deltas: axisDeltas,
      notes: "Associação temporal baseada em histórico individual. Não prova causalidade.",
    };

    if (existing?.id) {
      await (supabase as any).from("patient_substance_response_profiles").update(payload).eq("id", existing.id);
    } else {
      await (supabase as any).from("patient_substance_response_profiles").insert(withOwner(payload, user));
    }
  }
}
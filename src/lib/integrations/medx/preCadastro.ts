/**
 * MedX pré-cadastro — modo "somente link/preparado".
 * Não envia dados clínicos automaticamente. Não expõe token.
 * Token real fica server-side (placeholder MEDX_API_TOKEN).
 */
import { supabase } from "@/integrations/supabase/client";
import { withOwner } from "@/lib/supabase/withOwner";
import type { User } from "@supabase/supabase-js";

export interface MedxSettings {
  id?: string;
  status?: string;
  public_config?: { precadastro_url?: string | null; key_masked?: string | null };
  last_success_at?: string | null;
  last_error?: string | null;
  last_checked_at?: string | null;
}

export async function getMedxSettings(user: User): Promise<MedxSettings | null> {
  const { data } = await (supabase as any)
    .from("integration_settings")
    .select("*")
    .eq("owner_id", user.id)
    .eq("provider", "medx")
    .maybeSingle();
  return data ?? null;
}

export async function upsertMedxSettings(user: User, payload: { precadastro_url?: string; key_masked?: string; status?: string }) {
  const existing = await getMedxSettings(user);
  const public_config = { precadastro_url: payload.precadastro_url ?? null, key_masked: payload.key_masked ?? null };
  if (existing?.id) {
    const { error } = await (supabase as any).from("integration_settings").update({
      public_config, status: payload.status ?? existing.status ?? "configured", last_checked_at: new Date().toISOString(),
    }).eq("id", existing.id);
    if (error) throw error;
  } else {
    const row = withOwner({ provider: "medx", status: payload.status ?? "configured", public_config }, user);
    const { error } = await (supabase as any).from("integration_settings").insert(row);
    if (error) throw error;
  }
}

export function getMedxPreCadastroUrl(settings: MedxSettings | null): string | null {
  return settings?.public_config?.precadastro_url ?? null;
}

export async function copyPreCadastroLink(settings: MedxSettings | null) {
  const url = getMedxPreCadastroUrl(settings);
  if (!url) throw new Error("URL de pré-cadastro não configurada.");
  await navigator.clipboard.writeText(url);
}

export function openPreCadastroLink(settings: MedxSettings | null) {
  const url = getMedxPreCadastroUrl(settings);
  if (!url) throw new Error("URL de pré-cadastro não configurada.");
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function logIntegration(user: User, params: {
  action: string; status: string; patient_id?: string | null;
  request_summary?: any; response_summary?: any; error_message?: string | null;
}) {
  const row = withOwner({
    provider: "medx",
    action: params.action,
    status: params.status,
    patient_id: params.patient_id ?? null,
    request_summary: params.request_summary ?? {},
    response_summary: params.response_summary ?? {},
    error_message: params.error_message ?? null,
  }, user);
  await (supabase as any).from("integration_logs").insert(row);
}

export async function listIntegrationLogs(user: User, limit = 30) {
  const { data } = await (supabase as any)
    .from("integration_logs").select("*")
    .eq("owner_id", user.id).eq("provider", "medx")
    .order("created_at", { ascending: false }).limit(limit);
  return data ?? [];
}

export async function getMedxPatientLink(user: User, patientId: string) {
  const { data } = await (supabase as any)
    .from("medx_patient_links").select("*")
    .eq("owner_id", user.id).eq("patient_id", patientId).maybeSingle();
  return data ?? null;
}

export async function upsertMedxPatientLink(user: User, patientId: string, patch: Partial<{
  medx_patient_id: string | null; medx_precadastro_url: string | null; medx_status: string;
  last_sent_at: string | null; last_error: string | null;
}>) {
  const existing = await getMedxPatientLink(user, patientId);
  if (existing?.id) {
    const { error } = await (supabase as any).from("medx_patient_links").update(patch).eq("id", existing.id);
    if (error) throw error;
  } else {
    const row = withOwner({ patient_id: patientId, ...patch }, user);
    const { error } = await (supabase as any).from("medx_patient_links").insert(row);
    if (error) throw error;
  }
}

export function buildPatientAdministrativeContext(patient: any) {
  return {
    nome_completo: patient?.full_name ?? null,
    nome_social: patient?.social_name ?? null,
    data_nascimento: patient?.birth_date ?? null,
    sexo_biologico: patient?.biological_sex ?? null,
    genero: patient?.gender ?? null,
    telefone: patient?.phone ?? null,
    email: patient?.email ?? null,
    observacao_administrativa: patient?.administrative_note ?? null,
  };
}
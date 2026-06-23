import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { BACKUP_TABLES, type BackupFile, type BackupTable } from "./exportAll";

export interface ImportPreview {
  ok: boolean;
  errors: string[];
  warnings: string[];
  ownerMatches: boolean;
  counts: Record<string, number>;
  schemaVersion: number;
  exportedAt: string;
}

export function validateBackup(raw: unknown, user: User): ImportPreview {
  const errors: string[] = [];
  const warnings: string[] = [];
  const f = raw as Partial<BackupFile>;
  if (!f || typeof f !== "object") errors.push("Arquivo inválido.");
  if (!f?.schema_version) errors.push("Faltando schema_version.");
  if (!f?.tables || typeof f.tables !== "object") errors.push("Faltando seção tables.");
  const ownerMatches = !!f?.owner_id && f.owner_id === user.id;
  if (!ownerMatches) warnings.push("Backup gerado por outra conta — owner_id será remapeado para você ao importar.");
  const counts: Record<string, number> = {};
  if (f?.tables) for (const t of Object.keys(f.tables)) counts[t] = (f.tables[t] as any[])?.length ?? 0;
  return {
    ok: errors.length === 0,
    errors, warnings, ownerMatches, counts,
    schemaVersion: f?.schema_version ?? 0,
    exportedAt: f?.exported_at ?? "",
  };
}

// ordem segura para FKs (pais antes de filhos)
const IMPORT_ORDER: BackupTable[] = [
  "substances",
  "substance_formulations",
  "patients",
  "patient_medications",
  "patient_target_symptoms",
  "clinical_sessions",
  "session_checkins",
  "medication_dose_logs",
  "substance_use_logs",
  "symptom_measurements",
  "patient_substance_response_profiles",
  "clinical_interactions",
  "clinical_reports",
  "app_settings",
];

export interface ImportResult {
  inserted: Record<string, number>;
  failed: Record<string, string>;
  remappedOwner: boolean;
}

/**
 * Importa um backup usando UPSERT por id. Remapeia owner_id ao usuário atual.
 * Não deleta nada. Em conflito de id, faz update; senão, insere.
 */
export async function importBackup(file: BackupFile, user: User): Promise<ImportResult> {
  const inserted: Record<string, number> = {};
  const failed: Record<string, string> = {};
  const remappedOwner = file.owner_id !== user.id;

  for (const t of IMPORT_ORDER) {
    const rows = (file.tables?.[t] ?? []) as any[];
    if (!rows.length) continue;
    const safe = rows.map((r) => ({ ...r, owner_id: user.id }));
    const { error, count } = await (supabase as any).from(t).upsert(safe, { onConflict: "id", count: "exact" });
    if (error) {
      failed[t] = error.message;
      console.warn(`[importBackup] ${t}:`, error.message);
    } else {
      inserted[t] = count ?? safe.length;
    }
  }

  // registra auditoria
  try {
    await (supabase as any).from("audit_logs").insert({
      owner_id: user.id,
      entity: "backup",
      action: "import",
      diff: { exported_at: file.exported_at, counts: file.counts, remappedOwner },
    });
  } catch {}

  return { inserted, failed, remappedOwner };
}

export { BACKUP_TABLES };
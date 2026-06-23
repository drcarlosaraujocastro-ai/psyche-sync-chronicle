import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export const BACKUP_SCHEMA_VERSION = 2;

export const BACKUP_TABLES = [
  "patients",
  "patient_medications",
  "clinical_sessions",
  "session_checkins",
  "medication_dose_logs",
  "substance_use_logs",
  "patient_target_symptoms",
  "symptom_measurements",
  "patient_substance_response_profiles",
  "clinical_interactions",
  "clinical_reports",
  "substances",
  "substance_formulations",
  "app_settings",
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

export interface BackupFile {
  schema_version: number;
  exported_at: string;
  owner_id: string;
  user_email?: string | null;
  tables: Record<string, any[]>;
  counts: Record<string, number>;
}

export async function exportAll(user: User, opts?: { onlyTables?: BackupTable[] }): Promise<BackupFile> {
  const tables = opts?.onlyTables ?? BACKUP_TABLES;
  const out: Record<string, any[]> = {};
  const counts: Record<string, number> = {};
  for (const t of tables) {
    const { data, error } = await (supabase as any).from(t).select("*");
    if (error) {
      console.warn(`[exportAll] ${t}:`, error.message);
      out[t] = [];
    } else {
      out[t] = data ?? [];
    }
    counts[t] = out[t].length;
  }
  return {
    schema_version: BACKUP_SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    owner_id: user.id,
    user_email: user.email,
    tables: out,
    counts,
  };
}

export function downloadBackup(file: BackupFile, filename?: string) {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `psiconorte-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
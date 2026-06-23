import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, Download, Upload, ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { exportAll, downloadBackup } from "@/lib/backup/exportAll";
import { validateBackup, importBackup } from "@/lib/backup/importBackup";
import { toast } from "sonner";

export function DataPersistenceBanner() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [lastExport, setLastExport] = useState<string | null>(() => localStorage.getItem("psn:last_export"));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const tables = ["patients", "substances", "clinical_sessions", "medication_dose_logs", "session_checkins"] as const;
      const res: Record<string, number> = {};
      for (const t of tables) {
        const { count } = await (supabase as any).from(t).select("id", { count: "exact", head: true });
        res[t] = count ?? 0;
      }
      if (live) setCounts(res);
    })();
    return () => { live = false; };
  }, [user?.id]);

  async function doExport() {
    if (!user) return;
    setBusy(true);
    try {
      const file = await exportAll(user);
      downloadBackup(file);
      const ts = new Date().toISOString();
      localStorage.setItem("psn:last_export", ts);
      setLastExport(ts);
      toast.success("Backup completo gerado.");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao exportar.");
    } finally { setBusy(false); }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (!user) return;
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const preview = validateBackup(parsed, user);
      if (!preview.ok) return toast.error("Backup inválido: " + preview.errors.join("; "));
      const sum = Object.entries(preview.counts).map(([k, v]) => `${k}: ${v}`).join("\n");
      const ok = confirm(
        `Importar backup de ${preview.exportedAt || "?"}\n\n${sum}\n\n` +
        (preview.ownerMatches ? "Conta corresponde." : "⚠ Conta diferente — owner_id será remapeado para você.") +
        "\n\nConfirmar?",
      );
      if (!ok) return;
      setBusy(true);
      const res = await importBackup(parsed, user);
      const ins = Object.entries(res.inserted).map(([k, v]) => `${k}: ${v}`).join(", ");
      const fail = Object.entries(res.failed).map(([k, v]) => `${k}: ${v}`).join("; ");
      toast.success(`Importado — ${ins || "0 linhas"}` + (fail ? ` • erros: ${fail}` : ""));
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao importar.");
    } finally { setBusy(false); }
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Database className="h-4 w-4 text-primary" /> Persistência de dados
        </div>
        <Badge variant="outline" className="text-[10px] flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" /> Supabase conectado
        </Badge>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <div><span className="text-muted-foreground">Conta:</span> <b>{user?.email ?? "—"}</b></div>
          <div className="font-mono text-[10px] break-all text-muted-foreground">owner_id: {user?.id ?? "—"}</div>
          <div className="text-[10px] text-muted-foreground">Trocar de conta muda o conjunto de dados. Importe um backup para migrar entre contas.</div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(counts).map(([k, v]) => (
            <div key={k} className="rounded-md border border-border/60 px-2 py-1">
              <div className="text-[10px] text-muted-foreground">{k.replace(/_/g, " ")}</div>
              <div className="font-mono text-sm">{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <AlertTriangle className="h-3 w-3" />
        Último backup local: {lastExport ? new Date(lastExport).toLocaleString("pt-BR") : "nunca"}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={doExport} disabled={busy}><Download className="h-4 w-4 mr-1.5" />Exportar backup completo</Button>
        <Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4 mr-1.5" />Importar backup
        </Button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onPickFile} />
      </div>
    </Card>
  );
}
import { useMemo } from "react";
import { Activity, CheckCircle2, Copy, Database, Globe, ShieldAlert, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/clinical/PageHeader";
import { ReviewNote } from "@/components/clinical/ReviewNote";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const TABLES = ["patients", "clinical_sessions", "patient_medications", "medication_dose_logs", "substances", "substance_formulations", "session_checkins", "medication_inventory", "pharmacology_knowledge_templates", "clinical_reports"];

export default function SystemDiagnostics() {
  const env = {
    supabaseUrl: Boolean(import.meta.env.VITE_SUPABASE_URL),
    supabaseKey: Boolean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
    mode: import.meta.env.MODE,
    prod: import.meta.env.PROD,
  };
  const { data = [], isLoading } = useQuery({
    queryKey: ["system-diagnostics-tables"],
    queryFn: async () => {
      const results = [] as { table: string; ok: boolean; message: string }[];
      for (const table of TABLES) {
        try {
          const { error } = await (supabase as any).from(table).select("*", { count: "exact", head: true }).limit(1);
          results.push({ table, ok: !error, message: error?.message ?? "OK" });
        } catch (e: any) {
          results.push({ table, ok: false, message: e?.message ?? "erro" });
        }
      }
      return results;
    },
  });
  const report = useMemo(() => JSON.stringify({ env, tables: data, userAgent: navigator.userAgent, at: new Date().toISOString() }, null, 2), [env, data]);
  return (
    <div className="space-y-6">
      <PageHeader title="Diagnóstico do sistema" description="Verifica ambiente, Supabase e tabelas críticas. Sem IA externa, sem API paga." actions={<Button variant="outline" onClick={() => { navigator.clipboard?.writeText(report); toast.success("Diagnóstico copiado"); }}><Copy className="h-4 w-4 mr-2" />Copiar</Button>} />
      <ReviewNote>Use esta tela quando algo não salvar, não carregar ou parecer sumir. A checagem não altera dados.</ReviewNote>
      <div className="grid md:grid-cols-3 gap-3">
        <StatusCard icon={<Globe className="h-4 w-4" />} title="Modo" ok value={String(env.mode)} />
        <StatusCard icon={<Database className="h-4 w-4" />} title="Supabase URL" ok={env.supabaseUrl} value={env.supabaseUrl ? "configurada" : "faltando"} />
        <StatusCard icon={<Database className="h-4 w-4" />} title="Supabase key" ok={env.supabaseKey} value={env.supabaseKey ? "configurada" : "faltando"} />
      </div>
      <Card className="p-4">
        <div className="font-semibold flex items-center gap-2 mb-3"><Activity className="h-4 w-4" /> Tabelas críticas</div>
        {isLoading ? <div className="text-sm text-muted-foreground">Verificando…</div> : (
          <div className="grid md:grid-cols-2 gap-2">
            {data.map((r) => (
              <div key={r.table} className="rounded-lg border p-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-sm">{r.table}</div>
                  <div className="text-xs text-muted-foreground break-all">{r.message}</div>
                </div>
                <Badge variant={r.ok ? "secondary" : "destructive"} className="shrink-0">{r.ok ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}{r.ok ? "OK" : "erro"}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card className="p-4 border-warning/40 bg-warning/5">
        <div className="font-semibold flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Deploy recomendado</div>
        <div className="text-sm text-muted-foreground mt-1">Cloudflare Pages, Netlify, Vercel ou Lovable podem servir este app como SPA estático. O banco segue no Supabase. Não há API paga neste pacote.</div>
      </Card>
    </div>
  );
}

function StatusCard({ title, value, ok, icon }: { title: string; value: string; ok: boolean; icon: React.ReactNode }) {
  return <Card className="p-4"><div className="text-xs text-muted-foreground flex items-center gap-1">{icon}{title}</div><div className="font-semibold mt-1 flex items-center gap-2">{ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}{value}</div></Card>;
}

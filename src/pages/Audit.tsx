import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePatients } from "@/lib/usePatients";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/clinical/PageHeader";
import { ReviewNote } from "@/components/clinical/ReviewNote";
import { runAudit } from "@/domain/auditEngine";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useState } from "react";

export default function Audit() {
  const { data: patients = [] } = usePatients();
  const [pid, setPid] = useState<string>("");
  const patient = patients.find((p: any) => p.id === pid);
  const { data: meds = [] } = useQuery({
    queryKey: ["audit-meds", pid], enabled: !!pid,
    queryFn: async () => (await supabase.from("patient_medications").select("*").eq("patient_id", pid)).data ?? [],
  });
  const { data: doses = [] } = useQuery({
    queryKey: ["audit-doses", pid], enabled: !!pid,
    queryFn: async () => (await supabase.from("medication_dose_logs").select("*").eq("patient_id", pid).order("actual_time", { ascending: false }).limit(40)).data ?? [],
  });
  const { data: tgs = [] } = useQuery({
    queryKey: ["audit-tgs", pid], enabled: !!pid,
    queryFn: async () => (await supabase.from("patient_target_symptoms").select("*").eq("patient_id", pid)).data ?? [],
  });
  const { data: openSession } = useQuery({
    queryKey: ["audit-session", pid], enabled: !!pid,
    queryFn: async () => (await supabase.from("clinical_sessions").select("*").eq("patient_id", pid).eq("status", "aberta").maybeSingle()).data,
  });

  const audit = patient ? runAudit({ patient, session: openSession, doses, targetSymptoms: tgs, medications: meds }) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Auditoria clínica" description="Score 0–100 de completude clínica. Use antes de qualquer interpretação sofisticada." />
      <ReviewNote />
      <Card className="p-4">
        <label className="text-xs uppercase tracking-wide text-muted-foreground">Paciente</label>
        <select className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          value={pid} onChange={(e) => setPid(e.target.value)}>
          <option value="">Selecione…</option>
          {patients.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
      </Card>

      {audit && (
        <>
          <Card className="p-5 flex items-center gap-4">
            <div className="h-16 w-16 rounded-full grid place-items-center bg-primary/10 text-primary text-xl font-mono font-bold">{audit.score}</div>
            <div>
              <div className="text-sm font-medium flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Score de completude</div>
              <div className="text-xs text-muted-foreground">Quanto maior, mais segura a interpretação clínica longitudinal.</div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-medium mb-3">Pendências e inconsistências</div>
            {audit.findings.length === 0 ? (
              <div className="text-xs text-success">Nenhuma pendência relevante.</div>
            ) : (
              <ul className="space-y-2">
                {audit.findings.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm border-l-2 pl-3 py-1"
                    style={{ borderColor: f.severity === "high" ? "hsl(var(--destructive))" : f.severity === "warn" ? "hsl(var(--warning))" : "hsl(var(--border))" }}>
                    <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${f.severity === "high" ? "text-destructive" : f.severity === "warn" ? "text-warning" : "text-muted-foreground"}`} />
                    <div>
                      <div className="capitalize text-xs text-muted-foreground">{f.domain}</div>
                      <div>{f.message}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

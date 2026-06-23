import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BrainCircuit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePatients } from "@/lib/usePatients";
import { PageHeader } from "@/components/clinical/PageHeader";
import { ReviewNote } from "@/components/clinical/ReviewNote";
import { EmptyState } from "@/components/clinical/EmptyState";
import { IntegratedClinicalConsole } from "@/components/clinical/IntegratedClinicalConsole";
import { LocalClinicalCopilotPanel } from "@/components/clinical/LocalClinicalCopilotPanel";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function ClinicalIntelligence() {
  const { data: patients = [] } = usePatients();
  const [patientId, setPatientId] = useState("");
  const [periodDays, setPeriodDays] = useState(30);
  const sinceIso = useMemo(() => new Date(Date.now() - periodDays * 24 * 3600_000).toISOString(), [periodDays]);

  const { data: patient } = useQuery({ queryKey: ["ci-p", patientId], enabled: !!patientId, queryFn: async () => (await supabase.from("patients").select("*").eq("id", patientId).maybeSingle()).data });
  const { data: medications = [], refetch: refetchMedications } = useQuery({ queryKey: ["ci-meds", patientId], enabled: !!patientId, queryFn: async () => (await supabase.from("patient_medications").select("*, substances(*), substance_formulations(*)").eq("patient_id", patientId)).data ?? [] });
  const { data: sessions = [] } = useQuery({ queryKey: ["ci-sessions", patientId, periodDays], enabled: !!patientId, queryFn: async () => (await supabase.from("clinical_sessions").select("*").eq("patient_id", patientId).gte("session_at", sinceIso).order("session_at", { ascending: false }).limit(120)).data ?? [] });
  const { data: doses = [], refetch: refetchDoses } = useQuery({ queryKey: ["ci-doses", patientId, periodDays], enabled: !!patientId, queryFn: async () => (await supabase.from("medication_dose_logs").select("*, substances(*), substance_formulations(*)").eq("patient_id", patientId).gte("actual_time", sinceIso).order("actual_time", { ascending: false }).limit(600)).data ?? [] });
  const { data: checkins = [] } = useQuery({ queryKey: ["ci-checkins", patientId, periodDays], enabled: !!patientId, queryFn: async () => (await (supabase as any).from("session_checkins").select("*").eq("patient_id", patientId).gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(600)).data ?? [] });
  const { data: subUse = [] } = useQuery({ queryKey: ["ci-subuse", patientId, periodDays], enabled: !!patientId, queryFn: async () => (await (supabase as any).from("substance_use_logs").select("*").eq("patient_id", patientId).gte("used_at", sinceIso).order("used_at", { ascending: false }).limit(300)).data ?? [] });
  const { data: inventory = [] } = useQuery({ queryKey: ["ci-inv", patientId], enabled: !!patientId, queryFn: async () => (await (supabase as any).from("medication_inventory").select("*").eq("patient_id", patientId)).data ?? [] });

  function refresh() {
    refetchDoses();
    refetchMedications();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Inteligência clínica" description="Central integrada: dose editável, curva viva, interação por fase, hipóteses e dados faltantes em uma tela." />
      <ReviewNote>Esta tela é o cockpit principal. Ela não lista dados: ela cruza dose real, contexto, PK/PD, fenomenologia, interações e lacunas de qualidade para orientar a próxima decisão clínica.</ReviewNote>
      <Card className="p-4 grid md:grid-cols-[1fr_auto] gap-3 items-end">
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Paciente</Label>
          <select className="mt-1 h-10 px-3 rounded-md border border-input bg-background text-sm min-w-[260px] w-full" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            <option value="">Selecione…</option>
            {patients.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Janela</Label>
          <select className="mt-1 h-10 px-3 rounded-md border border-input bg-background text-sm" value={periodDays} onChange={(e) => setPeriodDays(Number(e.target.value))}>
            {[1, 3, 7, 14, 30, 60, 90].map((d) => <option key={d} value={d}>{d === 1 ? "24h" : `${d} dias`}</option>)}
          </select>
        </div>
      </Card>
      {!patientId ? <Card className="p-6"><EmptyState icon={<BrainCircuit className="h-5 w-5" />} title="Selecione um paciente" description="A inteligência clínica precisa de paciente + medicações + doses + check-ins. Depois disso, esta tela passa a ser o painel de comando." /></Card> : (
        <>
        <IntegratedClinicalConsole
          patient={patient}
          medications={medications as any}
          doses={doses as any}
          checkins={checkins as any}
          sessions={sessions as any}
          substanceUse={subUse as any}
          inventory={inventory as any}
          periodDays={periodDays}
          onDoseChanged={refresh}
        />
        <LocalClinicalCopilotPanel
          patient={patient}
          medications={medications as any}
          doses={doses as any}
          checkins={checkins as any}
          sessions={sessions as any}
          substanceUse={subUse as any}
          inventory={inventory as any}
          periodDays={periodDays}
        />
        </>
      )}
    </div>
  );
}

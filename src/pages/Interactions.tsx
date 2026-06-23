import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePatients } from "@/lib/usePatients";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/clinical/PageHeader";
import { ReviewNote } from "@/components/clinical/ReviewNote";
import { RelevanceBadge } from "@/components/clinical/PhaseBadge";
import { EmptyState } from "@/components/clinical/EmptyState";
import { runInteractionEngine } from "@/domain/interactionEngine";
import { AdvancedCurveExplorer } from "@/components/clinical/AdvancedCurveExplorer";
import { Zap } from "lucide-react";
import { useState } from "react";

export default function Interactions() {
  const { data: patients = [] } = usePatients();
  const [patientId, setPatientId] = useState("");
  const [hours, setHours] = useState(72);
  const { data: meds = [] } = useQuery({
    queryKey: ["int-meds", patientId], enabled: !!patientId,
    queryFn: async () => (await supabase.from("patient_medications").select("*, substances(name)").eq("patient_id", patientId).eq("status", "ativo")).data ?? [],
  });
  const { data: doses = [] } = useQuery({
    queryKey: ["int-doses", patientId, hours], enabled: !!patientId,
    queryFn: async () => {
      const t = new Date(Date.now() - hours * 3600_000).toISOString();
      return (await (supabase as any)
        .from("medication_dose_logs")
        .select("*, substances(*), substance_formulations(*)")
        .eq("patient_id", patientId)
        .gte("actual_time", t)
        .order("actual_time", { ascending: true })).data ?? [];
    },
  });
  const { data: subUse = [] } = useQuery({
    queryKey: ["int-subuse", patientId, hours], enabled: !!patientId,
    queryFn: async () => {
      const t = new Date(Date.now() - Math.max(hours, 168) * 3600_000).toISOString();
      return (await supabase.from("substance_use_logs").select("substance_name, used_at").eq("patient_id", patientId).gte("used_at", t)).data ?? [];
    },
  });

  const interactions = patientId ? runInteractionEngine({
    activeMedications: meds.map((m: any) => ({ name: m.substances?.name ?? m.free_text_name ?? m.brand_name ?? "" })),
    recentDoses: doses.map((d: any) => ({ substanceName: d.substance_name, actualTime: d.actual_time, logType: d.log_type, doseAmount: d.dose_amount, caffeineMg: d.caffeine_near_dose_mg ?? d.caffeine_amount, sleepDeprivation: d.sleep_deprivation_at_dose_0_10 })),
    recentSubstanceUse: subUse.map((s: any) => ({ substanceName: s.substance_name, usedAt: s.used_at })),
  }) : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Interações contextuais" description="Cruza fármacos, redose, duas doses da mesma substância, cafeína, sono e uso de substâncias. Não é só interação genérica de bula." />
      <ReviewNote />
      <Card className="p-4">
        <div className="grid md:grid-cols-[1fr_auto_auto] gap-3 items-end mb-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Paciente</Label>
            <select className="h-10 px-3 rounded-md border border-input bg-background text-sm min-w-[240px]" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Selecione…</option>
              {patients.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Janela de doses</Label>
            <select className="h-10 px-3 rounded-md border border-input bg-background text-sm" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
              <option value={24}>24 h</option>
              <option value={48}>48 h</option>
              <option value={72}>72 h</option>
              <option value={168}>7 dias</option>
            </select>
          </div>
          {patientId && <div className="text-xs text-muted-foreground">{doses.length} doses · {subUse.length} usos/substâncias</div>}
        </div>
        {!patientId ? <EmptyState icon={<Zap className="h-5 w-5" />} title="Selecione um paciente" /> :
         interactions.length === 0 ? <div className="text-sm text-muted-foreground">Nenhuma interação contextual relevante nessa janela. Se houver redose, confirme se o registro está como log_type redose e com horário real.</div> : (
          <ul className="space-y-3">
            {interactions.map((it, i) => (
              <li key={i} className="border-l-2 border-warning pl-3">
                <div className="flex items-center gap-2"><RelevanceBadge relevance={it.relevance} /><span className="text-sm font-medium">{it.summary}</span></div>
                {it.detail && <div className="text-xs text-muted-foreground mt-1">{it.detail}</div>}
                {it.mechanism && <div className="text-xs mt-1"><span className="text-muted-foreground">Mecanismo:</span> {it.mechanism}</div>}
                {it.monitor && it.monitor.length > 0 && <div className="text-xs mt-1"><span className="text-muted-foreground">Monitorar:</span> {it.monitor.join(", ")}</div>}
                {it.action && <div className="text-xs mt-1"><span className="text-muted-foreground">Ação:</span> {it.action}</div>}
                <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">Confiança {it.confidence}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {patientId && doses.length > 0 && <AdvancedCurveExplorer doses={doses as any} title="Curva para interpretar interações por fase" />}
    </div>
  );
}

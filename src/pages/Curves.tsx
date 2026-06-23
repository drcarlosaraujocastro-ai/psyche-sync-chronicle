import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePatients } from "@/lib/usePatients";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/clinical/PageHeader";
import { ReviewNote } from "@/components/clinical/ReviewNote";
import { EmptyState } from "@/components/clinical/EmptyState";
import { AdvancedCurveExplorer } from "@/components/clinical/AdvancedCurveExplorer";
import { LineChart as LCIcon } from "lucide-react";
import { useState } from "react";

export default function Curves() {
  const { data: patients = [] } = usePatients();
  const [patientId, setPatientId] = useState("");
  const [days, setDays] = useState(3);
  const { data: doses = [] } = useQuery({
    queryKey: ["curves-doses", patientId, days],
    enabled: !!patientId,
    queryFn: async () => {
      const t = new Date(Date.now() - days * 24 * 3600_000).toISOString();
      return (await (supabase as any)
        .from("medication_dose_logs")
        .select("*, substances(*), substance_formulations(*)")
        .eq("patient_id", patientId)
        .gte("actual_time", t)
        .order("actual_time", { ascending: true })).data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Curvas PK/PD relativas 0–100"
        description="Gráfico interativo com múltiplas substâncias, carga total, brush/arraste, expansão e leitura por horário. Não é concentração sérica."
      />
      <ReviewNote />
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Paciente</Label>
            <select className="h-10 px-3 rounded-md border border-input bg-background text-sm min-w-[240px]" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Selecione…</option>
              {patients.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Período carregado</Label>
            <select className="h-10 px-3 rounded-md border border-input bg-background text-sm" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={1}>24 h</option>
              <option value={2}>48 h</option>
              <option value={3}>72 h</option>
              <option value={7}>7 dias</option>
            </select>
          </div>
          {patientId && <div className="text-xs text-muted-foreground ml-auto">{doses.length} doses carregadas</div>}
        </div>
      </Card>
      {!patientId ? <EmptyState icon={<LCIcon className="h-5 w-5" />} title="Selecione um paciente" /> : (
        <AdvancedCurveExplorer doses={doses as any} title="Curvas por substância e carga total" />
      )}
    </div>
  );
}

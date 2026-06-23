import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Activity, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { withOwner } from "@/lib/supabase/withOwner";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { updatePatientSubstanceResponseProfile } from "@/lib/patientLearning/updateResponseProfile";

const AXES: { key: string; label: string }[] = [
  { key: "focus_0_10", label: "foco" },
  { key: "energy_0_10", label: "energia" },
  { key: "motivation_0_10", label: "motivação" },
  { key: "anxiety_0_10", label: "ansiedade" },
  { key: "irritability_0_10", label: "irritabilidade" },
  { key: "impulsivity_0_10", label: "impulsividade" },
  { key: "rumination_0_10", label: "ruminação" },
  { key: "craving_0_10", label: "craving" },
  { key: "withdrawal_0_10", label: "abstinência" },
  { key: "sedation_0_10", label: "sedação" },
  { key: "insomnia_0_10", label: "insônia" },
  { key: "sleep_quality_0_10", label: "qualidade do sono" },
  { key: "paranoia_0_10", label: "paranoia/desconfiança" },
  { key: "ideas_of_reference_0_10", label: "ideias de referência" },
  { key: "cognitive_overload_0_10", label: "sobrecarga cognitiva" },
  { key: "mood_0_10", label: "humor" },
  { key: "anhedonia_0_10", label: "anedonia" },
  { key: "appetite_0_10", label: "apetite" },
  { key: "cardiovascular_0_10", label: "sintomas cardiovasculares" },
];

export function SessionCheckin({ patientId, sessionId, onSaved }: { patientId: string; sessionId?: string | null; onSaved?: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [v, setV] = useState<Record<string, number>>({});
  const [text, setText] = useState({ patient_report: "", physician_observation: "", adverse_event: "", trigger_text: "", context_text: "" });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      const payload = withOwner({ patient_id: patientId, session_id: sessionId ?? null, ...v, ...text }, user);
      const { error } = await (supabase as any).from("session_checkins").insert(payload);
      if (error) throw error;
      // aprendizado individual a partir das doses das últimas 24h
      try {
        const since = new Date(Date.now() - 24 * 3600_000).toISOString();
        const { data: recent } = await (supabase as any)
          .from("medication_dose_logs").select("*")
          .eq("patient_id", patientId).gte("actual_time", since)
          .order("actual_time", { ascending: false });
        if (recent?.length) {
          await updatePatientSubstanceResponseProfile({
            user, patientId, sessionId: sessionId ?? null,
            checkin: { ...v }, recentDoses: recent as any,
          });
        }
      } catch (e) {
        console.warn("learning skip:", e);
      }
      toast.success("Check-in salvo. Previsibilidade recalculada.");
      setV({}); setText({ patient_report: "", physician_observation: "", adverse_event: "", trigger_text: "", context_text: "" });
      qc.invalidateQueries({ queryKey: ["checkins"] });
      qc.invalidateQueries({ queryKey: ["resp-profiles"] });
      qc.invalidateQueries({ queryKey: ["recent-doses", patientId] });
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar check-in.");
    } finally { setSaving(false); }
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Activity className="h-4 w-4 text-primary" /> Check-in clínico (0–10)
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {AXES.map((a) => {
          const val = v[a.key] ?? 0;
          return (
            <div key={a.key} className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5">
              <div className="text-xs flex-1 truncate" title={a.label}>{a.label}</div>
              <Slider value={[val]} min={0} max={10} step={1} onValueChange={([n]) => setV({ ...v, [a.key]: n })} className="w-28" />
              <div className="w-5 text-right text-[11px] font-mono">{val}</div>
            </div>
          );
        })}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-[11px] uppercase text-muted-foreground">Relato do paciente</Label>
          <Textarea rows={2} value={text.patient_report} onChange={(e) => setText({ ...text, patient_report: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-[11px] uppercase text-muted-foreground">Observação médica</Label>
          <Textarea rows={2} value={text.physician_observation} onChange={(e) => setText({ ...text, physician_observation: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-[11px] uppercase text-muted-foreground">Evento adverso</Label>
          <Textarea rows={2} value={text.adverse_event} onChange={(e) => setText({ ...text, adverse_event: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-[11px] uppercase text-muted-foreground">Gatilho / contexto</Label>
          <Textarea rows={2} value={text.context_text} onChange={(e) => setText({ ...text, context_text: e.target.value })} /></div>
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1.5" />Salvar check-in</Button>
      </div>
    </Card>
  );
}
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePatients } from "@/lib/usePatients";
import { withOwner } from "@/lib/supabase/withOwner";
import { displayMedicationName } from "@/lib/pharmacology/smartSubstance";
import { PageHeader } from "@/components/clinical/PageHeader";
import { ReviewNote } from "@/components/clinical/ReviewNote";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Activity, Clock, Coffee, Moon, Pill, Save, Sparkles } from "lucide-react";

const quickAxes = [
  ["focus_0_100", "Foco"], ["anxiety_0_100", "Ansiedade"], ["sedation_0_100", "Sedação"], ["stimulation_0_100", "Estimulação"],
  ["impulsivity_0_100", "Impulsividade"], ["craving_0_100", "Fissura"], ["benefit_0_100", "Benefício"], ["adverse_0_100", "Adverso"],
] as const;

function localDateTimeNow() {
  return new Date().toISOString().slice(0, 16);
}

export default function PatientDiary() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: patients = [] } = usePatients();
  const [patientId, setPatientId] = useState("");
  const [ctx, setCtx] = useState<any>({ actual_time: localDateTimeNow(), stomach: "desconhecido", taken_with_food: false, caffeine_near_dose_mg: "", sleep_deprivation_at_dose_0_10: "", perceived_effect_text: "" });
  const [axes, setAxes] = useState<any>({ focus_0_100: "", anxiety_0_100: "", sedation_0_100: "", stimulation_0_100: "", impulsivity_0_100: "", craving_0_100: "", benefit_0_100: "", adverse_0_100: "" });

  const { data: meds = [] } = useQuery({
    queryKey: ["diary-meds", patientId], enabled: !!patientId,
    queryFn: async () => (await (supabase as any).from("patient_medications").select("*, substances(*), substance_formulations(*)").eq("patient_id", patientId).eq("status", "ativo").order("usual_time", { ascending: true })).data ?? [],
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["diary-recent-doses", patientId], enabled: !!patientId,
    queryFn: async () => (await (supabase as any).from("medication_dose_logs").select("*").eq("patient_id", patientId).order("actual_time", { ascending: false }).limit(12)).data ?? [],
  });

  const selectedPatient = useMemo(() => patients.find((p: any) => p.id === patientId), [patients, patientId]);

  const n = (v: any) => v === "" || v == null ? null : Number(v);

  async function logMedication(med: any, logType = "manutencao") {
    if (!user || !patientId) return;
    const name = displayMedicationName(med);
    const payload = withOwner({
      patient_id: patientId,
      patient_medication_id: med.id,
      substance_id: med.substance_id ?? null,
      formulation_id: med.formulation_id ?? null,
      substance_name: name,
      formulation_name: med.substance_formulations?.formulation_name ?? null,
      dose_amount: med.current_dose ?? null,
      dose_unit: med.dose_unit ?? null,
      dose_text: med.current_dose && med.dose_unit ? `${med.current_dose} ${med.dose_unit}` : null,
      actual_time: new Date(ctx.actual_time || localDateTimeNow()).toISOString(),
      planned_time: med.usual_time ? new Date(`${new Date().toISOString().slice(0,10)}T${med.usual_time}`).toISOString() : null,
      route: med.substance_formulations?.route ?? med.substances?.default_route ?? "oral",
      log_type: logType,
      dose_goal: med.indication ?? med.diagnostic_target ?? null,
      taken_with_food: !!ctx.taken_with_food,
      stomach: ctx.stomach || null,
      caffeine_near_dose_mg: n(ctx.caffeine_near_dose_mg),
      sleep_deprivation_at_dose_0_10: n(ctx.sleep_deprivation_at_dose_0_10),
      perceived_effect_text: ctx.perceived_effect_text || null,
      benefit_0_100: n(axes.benefit_0_100), adverse_0_100: n(axes.adverse_0_100), focus_0_100: n(axes.focus_0_100), anxiety_0_100: n(axes.anxiety_0_100), sedation_0_100: n(axes.sedation_0_100), stimulation_0_100: n(axes.stimulation_0_100), impulsivity_0_100: n(axes.impulsivity_0_100), craving_0_100: n(axes.craving_0_100),
      notes_patient: "Registro rápido pelo diário do paciente.",
    }, user);
    const { error } = await (supabase as any).from("medication_dose_logs").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(`${name}: registrado agora.`);
    qc.invalidateQueries({ queryKey: ["diary-recent-doses", patientId] });
    qc.invalidateQueries({ queryKey: ["recent-doses", patientId] });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Diário do paciente" description="Registro rápido de dose, sintomas e contexto. Interface de adesão: poucos toques, dados clinicamente úteis." />
      <ReviewNote>Diário simplificado. Curva relativa, não sérica. Eventos de redose e uso problemático devem ser revisados clinicamente.</ReviewNote>

      <Card className="p-4 space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="Paciente">
            <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Selecione…</option>
              {patients.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </Field>
          <Field label="Horário do registro"><Input type="datetime-local" value={ctx.actual_time} onChange={(e) => setCtx({ ...ctx, actual_time: e.target.value })} /></Field>
          <Field label="Estômago"><select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={ctx.stomach} onChange={(e) => setCtx({ ...ctx, stomach: e.target.value })}>{["desconhecido","vazio","leve","cheio","refeição gordurosa"].map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Cafeína próxima mg"><Input type="number" value={ctx.caffeine_near_dose_mg} onChange={(e) => setCtx({ ...ctx, caffeine_near_dose_mg: e.target.value })} /></Field>
          <Field label="Privação de sono 0–10"><Input type="number" min={0} max={10} value={ctx.sleep_deprivation_at_dose_0_10} onChange={(e) => setCtx({ ...ctx, sleep_deprivation_at_dose_0_10: e.target.value })} /></Field>
          <Field label="Observação rápida"><Input value={ctx.perceived_effect_text} onChange={(e) => setCtx({ ...ctx, perceived_effect_text: e.target.value })} placeholder="ex: bateu fraco, ansiedade, náusea, queda" /></Field>
        </div>
        <div className="grid sm:grid-cols-4 gap-2">
          {quickAxes.map(([key, label]) => <Field key={key} label={`${label} 0–100`}><Input type="number" min={0} max={100} value={axes[key]} onChange={(e) => setAxes({ ...axes, [key]: e.target.value })} /></Field>)}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2"><div className="font-medium flex items-center gap-2"><Pill className="h-4 w-4" /> Medicações ativas {selectedPatient ? `— ${selectedPatient.full_name}` : ""}</div><Badge variant="outline" className="text-[10px]">tomado agora</Badge></div>
        {!patientId ? <div className="text-sm text-muted-foreground">Selecione paciente.</div> : meds.length === 0 ? <div className="text-sm text-muted-foreground">Nenhuma medicação ativa cadastrada para este paciente.</div> : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {meds.map((m: any) => (
              <div key={m.id} className="rounded-md border border-border p-3 space-y-2">
                <div className="font-medium text-sm">{displayMedicationName(m)}</div>
                <div className="text-xs text-muted-foreground">{m.current_dose ?? "—"} {m.dose_unit ?? ""} • {m.frequency ?? "—"} • {m.usual_time ?? "sem horário"}</div>
                <div className="text-[11px] text-muted-foreground truncate">{m.substance_formulations?.formulation_name ?? "sem formulação estruturada"}</div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => logMedication(m)}><Clock className="h-3.5 w-3.5 mr-1" />Tomado agora</Button>
                  <Button size="sm" variant="outline" onClick={() => logMedication(m, "redose")}><Sparkles className="h-3.5 w-3.5 mr-1" />Redose</Button>
                  <Button size="sm" variant="ghost" onClick={() => logMedication(m, "esquecimento")}>Esqueci</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid md:grid-cols-3 gap-3">
        <MiniCard icon={<Moon className="h-4 w-4" />} title="Sono" text="A privação modula efeito, tolerabilidade, redose e risco psicotomimético." />
        <MiniCard icon={<Coffee className="h-4 w-4" />} title="Cafeína" text="Registre dose próxima: muda ansiedade autonômica e leitura subjetiva do estimulante." />
        <MiniCard icon={<Activity className="h-4 w-4" />} title="Check-in" text="Sliders simples recalibram o modelo individual ao longo do tempo." />
      </div>

      <Card className="p-4">
        <div className="text-sm font-medium mb-2">Registros recentes</div>
        {recent.length === 0 ? <div className="text-sm text-muted-foreground">Sem doses recentes.</div> : (
          <ul className="divide-y text-sm">
            {recent.map((d: any) => <li key={d.id} className="py-2 flex justify-between gap-2"><span>{d.substance_name}</span><span className="text-xs text-muted-foreground">{new Date(d.actual_time).toLocaleString("pt-BR")} • {d.log_type}</span></li>)}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Field({ label, children }: any) { return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>; }
function MiniCard({ icon, title, text }: any) { return <Card className="p-3 text-sm"><div className="flex items-center gap-2 font-medium mb-1">{icon}{title}</div><div className="text-xs text-muted-foreground">{text}</div></Card>; }

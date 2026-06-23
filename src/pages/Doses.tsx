import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePatients, useSubstances } from "@/lib/usePatients";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/clinical/PageHeader";
import { EmptyState } from "@/components/clinical/EmptyState";
import { PhaseBadge } from "@/components/clinical/PhaseBadge";
import { ReviewNote } from "@/components/clinical/ReviewNote";
import { computeCurve } from "@/domain/curveEngine";
import { CurvePreview } from "@/components/clinical/CurvePreview";
import { AdvancedCurveExplorer } from "@/components/clinical/AdvancedCurveExplorer";
import { DoseLogManager } from "@/components/clinical/DoseLogManager";
import { QuickFormulationModal } from "@/components/substances/QuickFormulationModal";
import { withOwner } from "@/lib/supabase/withOwner";
import { fmtDate } from "@/lib/format";
import { Activity, Plus, Trash2, FlaskConical } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";

export default function Doses() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: patients = [] } = usePatients();
  const { data: substances = [] } = useSubstances();
  const [filterPatientId, setFilterPatientId] = useState("");
  const { data: doses = [] } = useQuery({
    queryKey: ["all-doses", filterPatientId],
    queryFn: async () => {
      let q = (supabase as any).from("medication_dose_logs").select("*, patients(full_name), substances(*), substance_formulations(*)").order("actual_time", { ascending: false }).limit(160);
      if (filterPatientId) q = q.eq("patient_id", filterPatientId);
      return (await q).data ?? [];
    },
  });
  const [open, setOpen] = useState(false);
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [f, setF] = useState<any>({
    patient_id: "", session_id: "", substance_id: "", substance_name: "",
    formulation_id: "", formulation_name: "",
    dose_amount: "", dose_unit: "mg", actual_time: new Date().toISOString().slice(0,16),
    stomach: "desconhecido", log_type: "manutencao", route: "oral", dose_goal: "manutencao",
    taken_with_food: false, stomach_fullness_0_10: "", last_meal_time: "",
    meal_size: "", meal_fat_level_0_10: "",
    caffeine_amount: "", caffeine_near_dose_mg: "", caffeine_timing: "",
    sleep_deprivation_at_dose_0_10: "",
    expected_effect_text: "", perceived_effect_text: "",
    notes_patient: "", notes_clinician: "",
  });

  // formulações da substância selecionada
  const { data: formulations = [], refetch: refetchFormulations } = useQuery({
    queryKey: ["formulations", f.substance_id],
    enabled: !!f.substance_id,
    queryFn: async () => (await (supabase as any).from("substance_formulations")
      .select("*").eq("substance_id", f.substance_id).order("formulation_name")).data ?? [],
  });

  const minutesSinceMeal = useMemo(() => {
    if (!f.last_meal_time || !f.actual_time) return "";
    const ms = new Date(f.actual_time).getTime() - new Date(f.last_meal_time).getTime();
    return ms > 0 ? Math.round(ms / 60_000) : "";
  }, [f.last_meal_time, f.actual_time]);

  async function save() {
    if (!user) return toast.error("Não autenticado.");
    if (!f.patient_id || !f.substance_name) return toast.error("Paciente e substância são obrigatórios");
    if (f.substance_id && !f.formulation_id && formulations.length === 0) {
      toast.warning("Substância sem formulação estruturada — previsão com menor confiança.");
    }
    const num = (v: any) => v === "" || v == null ? null : Number(v);
    const payload = withOwner({
      patient_id: f.patient_id,
      session_id: f.session_id || null,
      substance_id: f.substance_id || null,
      substance_name: f.substance_name,
      formulation_id: f.formulation_id || null,
      formulation_name: f.formulation_name || null,
      dose_amount: num(f.dose_amount),
      dose_unit: f.dose_unit || null,
      dose_text: f.dose_amount && f.dose_unit ? `${f.dose_amount} ${f.dose_unit}` : null,
      actual_time: new Date(f.actual_time).toISOString(),
      route: f.route, dose_goal: f.dose_goal,
      stomach: f.stomach, log_type: f.log_type,
      taken_with_food: !!f.taken_with_food,
      stomach_fullness_0_10: num(f.stomach_fullness_0_10),
      last_meal_time: f.last_meal_time ? new Date(f.last_meal_time).toISOString() : null,
      minutes_since_last_meal: minutesSinceMeal === "" ? null : Number(minutesSinceMeal),
      meal_size: f.meal_size || null,
      meal_fat_level_0_10: num(f.meal_fat_level_0_10),
      caffeine_amount: num(f.caffeine_amount),
      caffeine_near_dose_mg: num(f.caffeine_near_dose_mg),
      caffeine_timing: f.caffeine_timing || null,
      sleep_deprivation_at_dose_0_10: num(f.sleep_deprivation_at_dose_0_10),
      expected_effect_text: f.expected_effect_text || null,
      perceived_effect_text: f.perceived_effect_text || null,
      notes_patient: f.notes_patient || null,
      notes_clinician: f.notes_clinician || null,
    }, user);
    const { error } = await supabase.from("medication_dose_logs").insert(payload as any);
    if (error) return toast.error(error.message);
    toast.success("Dose registrada — curva, interações e previsibilidade atualizadas.");
    qc.invalidateQueries({ queryKey: ["all-doses"] });
    qc.invalidateQueries({ queryKey: ["recent-doses", f.patient_id] });
    qc.invalidateQueries({ queryKey: ["pat-meds", f.patient_id] });
    setOpen(false);
  }
  async function remove(id: string) {
    if (!confirm("Excluir dose?")) return;
    await supabase.from("medication_dose_logs").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["all-doses"] });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Registro de doses" description="Cada dose é evento clínico interpretável — horário, contexto alimentar e cafeína importam."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" />Nova dose</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Registrar dose</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Field label="Paciente">
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={f.patient_id} onChange={(e) => setF({...f, patient_id: e.target.value})}>
                    <option value="">Selecione…</option>
                    {patients.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </Field>
                <Field label="Substância da base (opcional)">
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={f.substance_id} onChange={(e) => {
                    const s = substances.find((x: any) => x.id === e.target.value);
                    setF({...f, substance_id: e.target.value, substance_name: s?.name ?? f.substance_name, dose_unit: s?.default_dose_unit ?? f.dose_unit, formulation_id: "", formulation_name: ""});
                  }}>
                    <option value="">— digite manualmente —</option>
                    {substances.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label="Nome da substância (obrigatório)"><Input value={f.substance_name} onChange={(e) => setF({...f, substance_name: e.target.value})} /></Field>
                {f.substance_id && (
                  <Field label="Formulação">
                    <div className="flex gap-2">
                      <select className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm"
                        value={f.formulation_id}
                        onChange={(e) => {
                          const fm = formulations.find((x: any) => x.id === e.target.value);
                          setF({ ...f, formulation_id: e.target.value, formulation_name: fm?.formulation_name ?? "", route: fm?.route ?? f.route });
                        }}>
                        <option value="">{formulations.length ? "Selecione formulação…" : "Sem formulação estruturada (previsão menos confiável)"}</option>
                        {formulations.map((fm: any) => <option key={fm.id} value={fm.id}>{fm.formulation_name} {fm.route ? `· ${fm.route}` : ""}</option>)}
                      </select>
                      <Button type="button" variant="outline" onClick={() => setShowQuickForm(true)}>
                        <FlaskConical className="h-4 w-4 mr-1" />Nova
                      </Button>
                    </div>
                    {!f.formulation_id && (
                      <div className="text-[11px] text-warning mt-1">Formulação não estruturada; previsão com menor confiança.</div>
                    )}
                  </Field>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Dose"><Input type="number" value={f.dose_amount} onChange={(e) => setF({...f, dose_amount: e.target.value})} /></Field>
                  <Field label="Unidade"><Input value={f.dose_unit} onChange={(e) => setF({...f, dose_unit: e.target.value})} /></Field>
                  <Field label="Via"><Input value={f.route} onChange={(e) => setF({...f, route: e.target.value})} /></Field>
                </div>
                <Field label="Horário real"><Input type="datetime-local" value={f.actual_time} onChange={(e) => setF({...f, actual_time: e.target.value})} /></Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Estômago">
                    <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={f.stomach} onChange={(e) => setF({...f, stomach: e.target.value})}>
                      {["vazio","leve","cheio","muito cheio","refeição gordurosa","desconhecido"].map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </Field>
                  <Field label="Objetivo / log">
                    <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={f.dose_goal} onChange={(e) => setF({...f, dose_goal: e.target.value, log_type: e.target.value})}>
                      {["manutencao","PRN","redose","atraso","esquecimento","ajuste","suspensão","abuso","outro"].map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Estômago 0–10"><Input type="number" min={0} max={10} value={f.stomach_fullness_0_10} onChange={(e) => setF({...f, stomach_fullness_0_10: e.target.value})} /></Field>
                  <Field label="Gordura refeição 0–10"><Input type="number" min={0} max={10} value={f.meal_fat_level_0_10} onChange={(e) => setF({...f, meal_fat_level_0_10: e.target.value})} /></Field>
                  <Field label="Última refeição"><Input type="datetime-local" value={f.last_meal_time} onChange={(e) => setF({...f, last_meal_time: e.target.value})} /></Field>
                  <Field label="Minutos desde refeição"><Input value={minutesSinceMeal} disabled /></Field>
                  <Field label="Cafeína próxima (mg)"><Input type="number" value={f.caffeine_near_dose_mg} onChange={(e) => setF({...f, caffeine_near_dose_mg: e.target.value, caffeine_amount: e.target.value})} /></Field>
                  <Field label="Timing cafeína"><Input value={f.caffeine_timing} onChange={(e) => setF({...f, caffeine_timing: e.target.value})} placeholder="antes / durante / depois" /></Field>
                  <Field label="Privação sono 0–10"><Input type="number" min={0} max={10} value={f.sleep_deprivation_at_dose_0_10} onChange={(e) => setF({...f, sleep_deprivation_at_dose_0_10: e.target.value})} /></Field>
                  <Field label="Tamanho refeição"><Input value={f.meal_size} onChange={(e) => setF({...f, meal_size: e.target.value})} placeholder="pequena / média / grande" /></Field>
                </div>
                <Field label="Efeito esperado (texto)"><Input value={f.expected_effect_text} onChange={(e) => setF({...f, expected_effect_text: e.target.value})} /></Field>
                <Field label="Efeito percebido (texto)"><Input value={f.perceived_effect_text} onChange={(e) => setF({...f, perceived_effect_text: e.target.value})} /></Field>
              </div>
              {f.substance_name && f.actual_time && (
                <div className="pt-2">
                  <CurvePreview
                    doses={[{
                      substanceName: f.substance_name,
                      actualTime: new Date(f.actual_time).toISOString(),
                      doseAmount: f.dose_amount ? Number(f.dose_amount) : undefined,
                      stomach: f.stomach,
                      caffeineAmount: f.caffeine_amount ? Number(f.caffeine_amount) : undefined,
                      pk: (substances.find((s: any) => s.id === f.substance_id)?.pk as any) ?? null,
                      releaseType: (substances.find((s: any) => s.id === f.substance_id) as any)?.release_curve_type ?? null,
                    }]}
                    windowHours={12}
                  />
                </div>
              )}
              <DialogFooter><Button onClick={save}>Registrar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      {f.substance_id && (
        <QuickFormulationModal
          open={showQuickForm}
          onOpenChange={setShowQuickForm}
          substanceId={f.substance_id}
          substanceName={f.substance_name}
          onCreated={async (fm) => {
            await refetchFormulations();
            setF((cur: any) => ({ ...cur, formulation_id: fm.id, formulation_name: fm.formulation_name, route: fm.route ?? cur.route }));
          }}
        />
      )}
      <ReviewNote />
      <Card className="p-4 space-y-3">
        <div className="grid md:grid-cols-[1fr_auto] gap-3 items-end">
          <Field label="Filtrar/gerenciar por paciente">
            <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={filterPatientId} onChange={(e) => setFilterPatientId(e.target.value)}>
              <option value="">Todos os pacientes — lista simples</option>
              {patients.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </Field>
          <div className="text-xs text-muted-foreground">{doses.length} doses carregadas</div>
        </div>
        {filterPatientId && <AdvancedCurveExplorer doses={doses as any} title="Curva das doses filtradas" />}
      </Card>
      {filterPatientId ? (
        <DoseLogManager doses={doses as any} patientId={filterPatientId} onChanged={() => qc.invalidateQueries({ queryKey: ["all-doses", filterPatientId] })} />
      ) : doses.length === 0 ? <EmptyState icon={<Activity className="h-5 w-5" />} title="Sem doses registradas" /> : (
        <Card className="divide-y">
          {doses.map((d: any) => {
            const c = computeCurve([{
              substanceName: d.substance_name, actualTime: d.actual_time,
              doseAmount: d.dose_amount, stomach: d.stomach,
              caffeineAmount: d.caffeine_amount, pk: d.substances?.pk, releaseType: d.substances?.release_curve_type,
            }], { windowHours: 12 });
            return (
              <div key={d.id} className="p-3 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">{d.substance_name} <span className="text-xs text-muted-foreground">• {d.dose_amount ?? "?"} {d.dose_unit ?? ""}</span></div>
                  <div className="text-xs text-muted-foreground">{d.patients?.full_name} • {fmtDate(d.actual_time)} • {d.stomach}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">Fase agora:</span>
                  <PhaseBadge phase={c.now.phase} />
                  <Button size="icon" variant="ghost" onClick={() => remove(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
function Field({ label, children }: any) { return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>; }
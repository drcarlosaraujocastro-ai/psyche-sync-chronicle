import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { withOwner } from "@/lib/supabase/withOwner";
import { useSubstances } from "@/lib/usePatients";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { QuickFormulationModal } from "@/components/substances/QuickFormulationModal";
import { ensureCanonicalSubstanceFromInput, resolveSmartSubstance, displayMedicationName } from "@/lib/pharmacology/smartSubstance";
import { FlaskConical, Save, Search, Syringe, Wand2 } from "lucide-react";
import { toast } from "sonner";

const logTypes = [
  { value: "manutencao", label: "manutenção" },
  { value: "redose", label: "redose" },
  { value: "atraso", label: "atraso" },
  { value: "esquecimento", label: "esquecimento" },
  { value: "prn", label: "PRN" },
  { value: "uso_problematico", label: "uso problemático" },
];

function num(v: any) { return v === "" || v == null ? null : Number(v); }
function dtNow() { return new Date().toISOString().slice(0, 16); }

export function SessionDoseRecorder({ patientId, sessionId, onSaved }: { patientId: string; sessionId?: string | null; onSaved?: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: substances = [] } = useSubstances();
  const [quick, setQuick] = useState(false);
  const [aliasInput, setAliasInput] = useState("");
  const [aliasMessage, setAliasMessage] = useState("");
  const [f, setF] = useState<any>({
    patient_medication_id: "", substance_id: "", substance_name: "", formulation_id: "", formulation_name: "",
    dose_amount: "", dose_unit: "mg", route: "oral", actual_time: dtNow(), planned_time: "",
    log_type: "manutencao", dose_goal: "", taken_with_food: false, stomach: "desconhecido",
    stomach_fullness_0_10: "", last_meal_time: "", meal_size: "", meal_fat_level_0_10: "",
    caffeine_near_dose_mg: "", caffeine_timing: "", sleep_deprivation_at_dose_0_10: "",
    expected_effect_text: "", perceived_effect_text: "", notes_clinician: "", notes_patient: "",
    benefit_0_100: "", adverse_0_100: "", focus_0_100: "", anxiety_0_100: "", sedation_0_100: "", stimulation_0_100: "", impulsivity_0_100: "", craving_0_100: "",
  });

  const { data: patientMeds = [] } = useQuery({
    queryKey: ["session-dose-patient-meds", patientId], enabled: !!patientId,
    queryFn: async () => (await (supabase as any).from("patient_medications").select("*, substances(*), substance_formulations(*)").eq("patient_id", patientId).eq("status", "ativo").order("usual_time", { ascending: true })).data ?? [],
  });

  const { data: formulations = [], refetch: refetchFormulations } = useQuery({
    queryKey: ["session-dose-formulations", f.substance_id],
    enabled: !!f.substance_id,
    queryFn: async () => (await (supabase as any).from("substance_formulations").select("*").eq("substance_id", f.substance_id).order("is_default", { ascending: false }).order("formulation_name")).data ?? [],
  });

  const minutesSinceMeal = useMemo(() => {
    if (!f.last_meal_time || !f.actual_time) return "";
    const delta = new Date(f.actual_time).getTime() - new Date(f.last_meal_time).getTime();
    return delta > 0 ? Math.round(delta / 60_000) : "";
  }, [f.last_meal_time, f.actual_time]);

  function applyMedication(med: any) {
    const display = displayMedicationName(med);
    setF((cur: any) => ({
      ...cur,
      patient_medication_id: med.id,
      substance_id: med.substance_id ?? "",
      substance_name: display,
      formulation_id: med.formulation_id ?? "",
      formulation_name: med.substance_formulations?.formulation_name ?? "",
      dose_amount: med.current_dose ?? "",
      dose_unit: med.dose_unit ?? cur.dose_unit ?? "mg",
      route: med.substance_formulations?.route ?? med.substances?.default_route ?? cur.route,
      planned_time: med.usual_time ? `${new Date().toISOString().slice(0,10)}T${med.usual_time}` : cur.planned_time,
      dose_goal: med.indication ?? med.diagnostic_target ?? cur.dose_goal,
      expected_effect_text: med.clinical_rationale ?? cur.expected_effect_text,
    }));
  }

  async function resolveAliasAndUse() {
    if (!user) return toast.error("Não autenticado.");
    if (!aliasInput.trim()) return toast.error("Digite nome, marca ou princípio ativo.");
    const resolution = resolveSmartSubstance(aliasInput, substances as any[]);
    setAliasMessage(resolution.message);
    if (!resolution.template) {
      setF((cur: any) => ({ ...cur, substance_id: "", substance_name: aliasInput }));
      return toast.warning("Sem template: registrado como manual se você salvar.");
    }
    try {
      const ensured = await ensureCanonicalSubstanceFromInput(aliasInput, user, substances as any[]);
      if (!ensured.substance) return;
      const { data: forms = [] } = await (supabase as any).from("substance_formulations").select("*").eq("substance_id", ensured.substance.id).order("is_default", { ascending: false }).order("formulation_name");
      const fm = forms?.[0];
      setF((cur: any) => ({
        ...cur,
        substance_id: ensured.substance.id,
        substance_name: aliasInput.trim() !== ensured.substance.name ? `${aliasInput.trim()} → ${ensured.substance.name}` : ensured.substance.name,
        formulation_id: fm?.id ?? "",
        formulation_name: fm?.formulation_name ?? "",
        route: fm?.route ?? ensured.substance.default_route ?? cur.route,
        dose_unit: ensured.substance.default_dose_unit ?? ensured.substance.dose_unit_default ?? cur.dose_unit,
      }));
      qc.invalidateQueries({ queryKey: ["substances"] });
      toast.success(ensured.created ? `${ensured.template?.name ?? ensured.substance.name} importada da base de conhecimento.` : `${ensured.substance.name} selecionada como canônica.`);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao resolver/importar substância.");
    }
  }

  async function save() {
    if (!user) return toast.error("Não autenticado.");
    if (!patientId) return toast.error("Paciente ausente.");
    if (!f.substance_name.trim()) return toast.error("Substância é obrigatória.");
    if (f.substance_id && !f.formulation_id) toast.warning("Dose sem formulação estruturada: previsão menos confiável.");
    const payload = withOwner({
      patient_id: patientId,
      session_id: sessionId ?? null,
      patient_medication_id: f.patient_medication_id || null,
      substance_id: f.substance_id || null,
      substance_name: f.substance_name,
      formulation_id: f.formulation_id || null,
      formulation_name: f.formulation_name || null,
      formulation: f.formulation_name || null,
      dose_amount: num(f.dose_amount),
      dose_unit: f.dose_unit || null,
      dose_text: f.dose_amount && f.dose_unit ? `${f.dose_amount} ${f.dose_unit}` : null,
      actual_time: new Date(f.actual_time).toISOString(),
      planned_time: f.planned_time ? new Date(f.planned_time).toISOString() : null,
      route: f.route || null,
      log_type: f.log_type,
      dose_goal: f.dose_goal || null,
      stomach: f.stomach || null,
      taken_with_food: !!f.taken_with_food,
      stomach_fullness_0_10: num(f.stomach_fullness_0_10),
      last_meal_time: f.last_meal_time ? new Date(f.last_meal_time).toISOString() : null,
      minutes_since_last_meal: minutesSinceMeal === "" ? null : Number(minutesSinceMeal),
      meal_size: f.meal_size || null,
      meal_fat_level_0_10: num(f.meal_fat_level_0_10),
      caffeine_near_dose_mg: num(f.caffeine_near_dose_mg),
      caffeine_timing: f.caffeine_timing || null,
      sleep_deprivation_at_dose_0_10: num(f.sleep_deprivation_at_dose_0_10),
      expected_effect_text: f.expected_effect_text || null,
      perceived_effect_text: f.perceived_effect_text || null,
      benefit_0_100: num(f.benefit_0_100), adverse_0_100: num(f.adverse_0_100), sedation_0_100: num(f.sedation_0_100), stimulation_0_100: num(f.stimulation_0_100), anxiety_0_100: num(f.anxiety_0_100), focus_0_100: num(f.focus_0_100), impulsivity_0_100: num(f.impulsivity_0_100), craving_0_100: num(f.craving_0_100),
      notes_patient: f.notes_patient || null,
      notes_clinician: f.notes_clinician || null,
    }, user);
    const { error } = await (supabase as any).from("medication_dose_logs").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Dose registrada dentro da sessão.");
    qc.invalidateQueries({ queryKey: ["session-doses", sessionId] });
    qc.invalidateQueries({ queryKey: ["recent-doses", patientId] });
    qc.invalidateQueries({ queryKey: ["dose-checkins", patientId] });
    onSaved?.();
    setF((cur: any) => ({ ...cur, dose_amount: "", perceived_effect_text: "", notes_patient: "", notes_clinician: "", actual_time: dtNow() }));
  }


  const isKnowledgeImport = (s: any) => {
    const src = String(s?.source_notes ?? "").toLowerCase();
    const status = String(s?.review_status ?? "").toLowerCase();
    return src.includes("template farmacológico") || src.includes("template farmacologico") || (status.includes("não revisada") && src.includes("revisão clínica obrigatória"));
  };
  const patientSubstanceIds = new Set(patientMeds.map((m: any) => m.substance_id).filter(Boolean));
  const visibleSubstances = (substances as any[]).filter((s: any) => !isKnowledgeImport(s) || s.id === f.substance_id || patientSubstanceIds.has(s.id));

  const selectedSubstance = substances.find((s: any) => s.id === f.substance_id);

  return (
    <Card className="p-4 space-y-3 border-primary/20">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium"><Syringe className="h-4 w-4 text-primary" /> Registrar dose nesta sessão</div>
        <Badge variant="outline" className="text-[10px]">medicação → substância canônica → formulação</Badge>
      </div>
      <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
        <div className="grid md:grid-cols-[1fr_auto] gap-2">
          <div>
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Resolver nome comercial, genérico ou substância</Label>
            <Input value={aliasInput} onChange={(e) => setAliasInput(e.target.value)} placeholder="ex.: Lyberdia, Venvanse, Rivotril, codeína, MDMA…" />
          </div>
          <Button type="button" variant="outline" className="md:mt-6" onClick={resolveAliasAndUse}><Search className="h-4 w-4 mr-1" />Resolver</Button>
        </div>
        {aliasMessage && <div className="text-xs text-muted-foreground">{aliasMessage}</div>}
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Medicação do paciente">
          <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={f.patient_medication_id} onChange={(e) => {
            const med = patientMeds.find((x: any) => x.id === e.target.value);
            if (med) applyMedication(med);
            else setF({ ...f, patient_medication_id: "" });
          }}>
            <option value="">— registrar avulso —</option>
            {patientMeds.map((m: any) => <option key={m.id} value={m.id}>{displayMedicationName(m)} · {m.current_dose ?? "—"} {m.dose_unit ?? ""} · {m.frequency ?? ""}</option>)}
          </select>
        </Field>
        <Field label="Substância canônica da base revisada">
          <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={f.substance_id} onChange={(e) => {
            const s = substances.find((x: any) => x.id === e.target.value);
            setF({ ...f, substance_id: e.target.value, substance_name: s?.name ?? f.substance_name, dose_unit: s?.default_dose_unit ?? f.dose_unit, formulation_id: "", formulation_name: "" });
          }}>
            <option value="">— sem vínculo / manual —</option>
            {visibleSubstances.map((s: any) => <option key={s.id} value={s.id}>{s.name}{isKnowledgeImport(s) ? " · canônico" : ""}</option>)}
          </select>
        </Field>
        <Field label="Nome exibido no registro"><Input value={f.substance_name} onChange={(e) => setF({ ...f, substance_name: e.target.value })} placeholder="ex.: Lyberdia → Lisdexanfetamina" /></Field>
        {f.substance_id && (
          <Field label="Formulação estruturada">
            <div className="flex gap-2">
              <select className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm" value={f.formulation_id} onChange={(e) => {
                const fm = formulations.find((x: any) => x.id === e.target.value);
                setF({ ...f, formulation_id: e.target.value, formulation_name: fm?.formulation_name ?? "", route: fm?.route ?? f.route });
              }}>
                <option value="">{formulations.length ? "Selecione…" : "Sem formulação estruturada"}</option>
                {formulations.map((fm: any) => <option key={fm.id} value={fm.id}>{fm.formulation_name} · {fm.curve_model ?? fm.route ?? ""}</option>)}
              </select>
              <Button type="button" variant="outline" onClick={() => setQuick(true)}><FlaskConical className="h-4 w-4 mr-1" />Criar</Button>
            </div>
            {!f.formulation_id && <div className="text-[11px] text-warning mt-1">Sem formulação: curva menos confiável.</div>}
          </Field>
        )}
        <div className="grid grid-cols-3 gap-2">
          <Field label="Dose"><Input type="number" value={f.dose_amount} onChange={(e) => setF({ ...f, dose_amount: e.target.value })} /></Field>
          <Field label="Unidade"><Input value={f.dose_unit} onChange={(e) => setF({ ...f, dose_unit: e.target.value })} /></Field>
          <Field label="Via"><Input value={f.route} onChange={(e) => setF({ ...f, route: e.target.value })} /></Field>
        </div>
        <Field label="Horário real"><Input type="datetime-local" value={f.actual_time} onChange={(e) => setF({ ...f, actual_time: e.target.value })} /></Field>
        <Field label="Tipo de registro">
          <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={f.log_type} onChange={(e) => setF({ ...f, log_type: e.target.value })}>{logTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
        </Field>
        <Field label="Objetivo da dose"><Input value={f.dose_goal} onChange={(e) => setF({ ...f, dose_goal: e.target.value })} placeholder="ex: foco, sono, anti-impulsividade" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Estômago"><select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={f.stomach} onChange={(e) => setF({ ...f, stomach: e.target.value })}>{["desconhecido","vazio","leve","cheio","refeição gordurosa"].map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Cheio 0–10"><Input type="number" min={0} max={10} value={f.stomach_fullness_0_10} onChange={(e) => setF({ ...f, stomach_fullness_0_10: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Última refeição"><Input type="datetime-local" value={f.last_meal_time} onChange={(e) => setF({ ...f, last_meal_time: e.target.value })} /></Field>
          <Field label="Min desde refeição"><Input readOnly value={minutesSinceMeal} placeholder="auto" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Cafeína próxima mg"><Input type="number" value={f.caffeine_near_dose_mg} onChange={(e) => setF({ ...f, caffeine_near_dose_mg: e.target.value })} /></Field>
          <Field label="Privação sono 0–10"><Input type="number" min={0} max={10} value={f.sleep_deprivation_at_dose_0_10} onChange={(e) => setF({ ...f, sleep_deprivation_at_dose_0_10: e.target.value })} /></Field>
        </div>
        <Field label="Efeito esperado"><Textarea rows={2} value={f.expected_effect_text} onChange={(e) => setF({ ...f, expected_effect_text: e.target.value })} /></Field>
        <Field label="Efeito percebido / observação"><Textarea rows={2} value={f.perceived_effect_text} onChange={(e) => setF({ ...f, perceived_effect_text: e.target.value })} /></Field>
      </div>
      <div className="grid sm:grid-cols-4 gap-2">
        <Field label="benefício 0–100"><Input type="number" value={f.benefit_0_100} onChange={(e) => setF({ ...f, benefit_0_100: e.target.value })} /></Field>
        <Field label="adverso 0–100"><Input type="number" value={f.adverse_0_100} onChange={(e) => setF({ ...f, adverse_0_100: e.target.value })} /></Field>
        <Field label="foco 0–100"><Input type="number" value={f.focus_0_100} onChange={(e) => setF({ ...f, focus_0_100: e.target.value })} /></Field>
        <Field label="ansiedade 0–100"><Input type="number" value={f.anxiety_0_100} onChange={(e) => setF({ ...f, anxiety_0_100: e.target.value })} /></Field>
      </div>
      <div className="flex justify-between items-center gap-2"><div className="text-[11px] text-muted-foreground"><Wand2 className="h-3.5 w-3.5 inline mr-1" /> Produto/marca pode ficar no nome exibido; o cálculo deve usar a substância canônica e formulação.</div><Button onClick={save}><Save className="h-4 w-4 mr-1.5" />Salvar dose na sessão</Button></div>
      {selectedSubstance && (
        <QuickFormulationModal open={quick} onOpenChange={setQuick} substanceId={selectedSubstance.id} substanceName={selectedSubstance.name} onCreated={(fm) => { refetchFormulations(); setF((cur: any) => ({ ...cur, formulation_id: fm.id, formulation_name: fm.formulation_name, route: fm.route ?? cur.route })); }} />
      )}
    </Card>
  );
}

function Field({ label, children }: any) {
  return <div className="space-y-1.5"><Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>;
}

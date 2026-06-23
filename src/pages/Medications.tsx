import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePatients, useSubstances } from "@/lib/usePatients";
import { resolveSmartSubstance, ensureCanonicalSubstanceFromInput, displayMedicationName } from "@/lib/pharmacology/smartSubstance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/clinical/PageHeader";
import { EmptyState } from "@/components/clinical/EmptyState";
import { Pill, Plus, Search, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";

export default function Medications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: patients = [] } = usePatients();
  const { data: substances = [] } = useSubstances();
  const { data: meds = [] } = useQuery({
    queryKey: ["all-meds"],
    queryFn: async () => (await (supabase as any).from("patient_medications").select("*, patients(full_name), substances(*), substance_formulations(*)").order("created_at", { ascending: false })).data ?? [],
  });
  const [open, setOpen] = useState(false);
  const [aliasMsg, setAliasMsg] = useState("");
  const [f, setF] = useState<any>({ patient_id: "", medication_query: "", brand_name: "", free_text_name: "", substance_id: "", formulation_id: "", current_dose: "", dose_unit: "mg", frequency: "1x/dia", status: "ativo", usual_time: "", expected_benefit_0_100: "", expected_cost_0_100: "", individual_sensitivity_0_100: "", individual_tolerance_0_100: "", redose_risk_individual_0_100: "", psychosis_activation_risk_individual_0_100: "", clinical_rationale: "", monitoring_plan: "", warning_signs: "" });

  const resolution = useMemo(() => f.medication_query ? resolveSmartSubstance(f.medication_query, substances as any[]) : null, [f.medication_query, substances]);

  const { data: formulations = [] } = useQuery({
    queryKey: ["med-formulations", f.substance_id],
    enabled: !!f.substance_id,
    queryFn: async () => (await (supabase as any).from("substance_formulations").select("*").eq("substance_id", f.substance_id).order("is_default", { ascending: false }).order("formulation_name")).data ?? [],
  });


  const isKnowledgeImport = (s: any) => {
    const src = String(s?.source_notes ?? "").toLowerCase();
    const status = String(s?.review_status ?? "").toLowerCase();
    return src.includes("template farmacológico") || src.includes("template farmacologico") || (status.includes("não revisada") && src.includes("revisão clínica obrigatória"));
  };
  const visibleSubstances = (substances as any[]).filter((s: any) => !isKnowledgeImport(s) || s.id === f.substance_id);

  const n = (v: any) => v === "" || v == null ? null : Number(v);

  async function resolveMedicationName() {
    if (!user) return;
    if (!f.medication_query.trim()) return toast.error("Digite nome comercial, genérico ou princípio ativo.");
    setAliasMsg(resolution?.message ?? "");
    if (!resolution?.template) {
      setF({ ...f, free_text_name: f.medication_query, brand_name: f.medication_query, substance_id: "", formulation_id: "" });
      return toast.warning("Sem template. Será salvo como medicação manual se você prosseguir.");
    }
    try {
      const ensured = await ensureCanonicalSubstanceFromInput(f.medication_query, user, substances as any[]);
      const { data: forms = [] } = await (supabase as any).from("substance_formulations").select("*").eq("substance_id", ensured.substance.id).order("is_default", { ascending: false }).order("formulation_name");
      const fm = forms?.[0];
      setF((cur: any) => ({
        ...cur,
        brand_name: cur.medication_query,
        free_text_name: `${cur.medication_query} → ${ensured.substance.name}`,
        substance_id: ensured.substance.id,
        formulation_id: fm?.id ?? "",
        dose_unit: ensured.substance.default_dose_unit ?? ensured.substance.dose_unit_default ?? cur.dose_unit,
        clinical_rationale: cur.clinical_rationale || ensured.template?.mechanism_summary || "",
        monitoring_plan: cur.monitoring_plan || (ensured.template?.monitoring_profile ?? []).join(", "),
      }));
      toast.success(ensured.created ? `${ensured.substance.name} importada e vinculada.` : `${ensured.substance.name} vinculada como substância canônica.`);
      qc.invalidateQueries({ queryKey: ["substances"] });
    } catch (e: any) { toast.error(e.message ?? "Falha ao resolver medicação."); }
  }

  async function save() {
    if (!f.patient_id) return toast.error("Selecione paciente");
    const { error } = await (supabase as any).from("patient_medications").insert({
      owner_id: user!.id, patient_id: f.patient_id,
      substance_id: f.substance_id || null,
      formulation_id: f.formulation_id || null,
      brand_name: f.brand_name || f.medication_query || null,
      free_text_name: f.free_text_name || f.medication_query || null,
      current_dose: f.current_dose ? Number(f.current_dose) : null,
      dose_unit: f.dose_unit || null, frequency: f.frequency || null, status: f.status,
      usual_time: f.usual_time || null,
      expected_benefit_0_100: n(f.expected_benefit_0_100), expected_cost_0_100: n(f.expected_cost_0_100), individual_sensitivity_0_100: n(f.individual_sensitivity_0_100), individual_tolerance_0_100: n(f.individual_tolerance_0_100), redose_risk_individual_0_100: n(f.redose_risk_individual_0_100), psychosis_activation_risk_individual_0_100: n(f.psychosis_activation_risk_individual_0_100), clinical_rationale: f.clinical_rationale || null, monitoring_plan: f.monitoring_plan || null, warning_signs: f.warning_signs || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Medicação adicionada ao paciente");
    qc.invalidateQueries({ queryKey: ["all-meds"] });
    setOpen(false);
  }
  async function remove(id: string) {
    if (!confirm("Excluir medicação?")) return;
    await (supabase as any).from("patient_medications").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["all-meds"] });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Medicamentos do paciente" description="Produto/marca usado pelo paciente vinculado a uma substância canônica + formulação + resposta individual."
        actions={<Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" />Nova medicação</Button></DialogTrigger><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Adicionar medicação ao paciente</DialogTitle></DialogHeader><div className="space-y-3">
          <Field label="Paciente"><select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={f.patient_id} onChange={(e) => setF({...f, patient_id: e.target.value})}><option value="">Selecione…</option>{patients.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></Field>
          <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2"><div className="grid md:grid-cols-[1fr_auto] gap-2"><Field label="Nome/marca/princípio ativo"><Input value={f.medication_query} onChange={(e)=>setF({...f, medication_query:e.target.value})} placeholder="ex.: Lyberdia, Venvanse, Rivotril, Vurtuoso…" /></Field><Button type="button" variant="outline" className="md:mt-6" onClick={resolveMedicationName}><Search className="h-4 w-4 mr-1" />Resolver</Button></div>{resolution?.message && <div className="text-xs text-muted-foreground">{resolution.message}</div>}{aliasMsg && <div className="text-xs text-primary">{aliasMsg}</div>}</div>
          <div className="grid md:grid-cols-2 gap-2"><Field label="Produto/marca exibido"><Input value={f.brand_name} onChange={(e)=>setF({...f, brand_name:e.target.value})} /></Field><Field label="Nome livre no paciente"><Input value={f.free_text_name} onChange={(e)=>setF({...f, free_text_name:e.target.value})} /></Field></div>
          <Field label="Substância canônica"><select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={f.substance_id} onChange={(e)=>setF({...f, substance_id:e.target.value, formulation_id:""})}><option value="">— sem vínculo —</option>{visibleSubstances.map((s:any)=><option key={s.id} value={s.id}>{s.name}{isKnowledgeImport(s) ? " · canônico" : ""}</option>)}</select></Field>
          {f.substance_id && <Field label="Formulação"><select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={f.formulation_id} onChange={(e)=>setF({...f, formulation_id:e.target.value})}><option value="">— sem formulação estruturada —</option>{formulations.map((fm:any)=><option key={fm.id} value={fm.id}>{fm.formulation_name} · {fm.curve_model ?? fm.route ?? ""}</option>)}</select></Field>}
          <div className="grid grid-cols-3 gap-2"><Field label="Dose"><Input type="number" value={f.current_dose} onChange={(e)=>setF({...f,current_dose:e.target.value})} /></Field><Field label="Unidade"><Input value={f.dose_unit} onChange={(e)=>setF({...f,dose_unit:e.target.value})} /></Field><Field label="Horário"><Input type="time" value={f.usual_time} onChange={(e)=>setF({...f,usual_time:e.target.value})} /></Field></div>
          <Field label="Frequência"><Input value={f.frequency} onChange={(e)=>setF({...f,frequency:e.target.value})} /></Field>
          <div className="grid grid-cols-2 gap-2"><Field label="Benefício esperado 0–100"><Input type="number" value={f.expected_benefit_0_100} onChange={(e)=>setF({...f,expected_benefit_0_100:e.target.value})} /></Field><Field label="Custo/risco esperado 0–100"><Input type="number" value={f.expected_cost_0_100} onChange={(e)=>setF({...f,expected_cost_0_100:e.target.value})} /></Field><Field label="Tolerância individual 0–100"><Input type="number" value={f.individual_tolerance_0_100} onChange={(e)=>setF({...f,individual_tolerance_0_100:e.target.value})} /></Field><Field label="Risco redose 0–100"><Input type="number" value={f.redose_risk_individual_0_100} onChange={(e)=>setF({...f,redose_risk_individual_0_100:e.target.value})} /></Field></div>
          <Field label="Racional clínico individual"><Textarea rows={2} value={f.clinical_rationale} onChange={(e)=>setF({...f,clinical_rationale:e.target.value})} /></Field>
          <Field label="Monitorização / sinais de alerta"><Textarea rows={2} value={f.monitoring_plan} onChange={(e)=>setF({...f,monitoring_plan:e.target.value})} /></Field>
        </div><DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter></DialogContent></Dialog>}
      />
      <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Wand2 className="h-3.5 w-3.5" /> Ex.: cadastrar “Lyberdia” no paciente, mas vincular internamente a “Lisdexanfetamina” para cálculo PK/PD.</div>
      {meds.length === 0 ? <EmptyState icon={<Pill className="h-5 w-5" />} title="Nenhuma medicação" description="Adicione medicações vinculadas à substância canônica e formulação." /> : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">{meds.map((m:any)=><Card key={m.id} className="p-4"><div className="flex justify-between items-start"><div><div className="font-medium">{displayMedicationName(m)}</div><div className="text-xs text-muted-foreground">{m.patients?.full_name}</div><div className="text-sm mt-1">{m.current_dose} {m.dose_unit} • {m.frequency}</div><div className="text-[11px] text-muted-foreground mt-1">{m.substance_formulations?.formulation_name ?? "sem formulação"}</div></div><div className="flex flex-col items-end gap-2"><Badge variant="outline" className="capitalize text-xs">{m.status}</Badge><Button size="icon" variant="ghost" onClick={()=>remove(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></div></Card>)}</div>}
    </div>
  );
}
function Field({ label, children }: any) { return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>; }

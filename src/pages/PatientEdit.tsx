import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/clinical/PageHeader";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

const empty = {
  full_name: "", social_name: "", birth_date: "", biological_sex: "", gender: "",
  weight_kg: "", height_cm: "",
  primary_diagnoses: "", dsm5_codes: "", cid11_codes: "", diagnostic_hypotheses: "",
  current_complaint: "", clinical_history: "",
  psychiatric_comorbidities: "", clinical_comorbidities: "", allergies: "",
  medication_sensitivity: "", cardiovascular_history: "", seizure_history: "",
  mania_history: "", substance_use_history: "", suicide_risk: "", safety_notes: "",
  responsible_physician: "", status: "ativo", tags: "",
};

const arrField = (s: string) => s ? s.split(",").map((x) => x.trim()).filter(Boolean) : [];

export default function PatientEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState<any>(empty);

  const { data } = useQuery({
    queryKey: ["patient-edit", id],
    enabled: !!id,
    queryFn: async () => (await supabase.from("patients").select("*").eq("id", id!).maybeSingle()).data,
  });

  useEffect(() => {
    if (data) {
      setForm({
        ...empty,
        ...data,
        birth_date: data.birth_date ?? "",
        primary_diagnoses: (data.primary_diagnoses ?? []).join(", "),
        dsm5_codes: (data.dsm5_codes ?? []).join(", "),
        cid11_codes: (data.cid11_codes ?? []).join(", "),
        psychiatric_comorbidities: (data.psychiatric_comorbidities ?? []).join(", "),
        clinical_comorbidities: (data.clinical_comorbidities ?? []).join(", "),
        allergies: (data.allergies ?? []).join(", "),
        tags: (data.tags ?? []).join(", "),
      });
    }
  }, [data]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.full_name) { toast.error("Nome completo é obrigatório"); return; }
    const payload: any = {
      owner_id: user!.id,
      full_name: form.full_name,
      social_name: form.social_name || null,
      birth_date: form.birth_date || null,
      biological_sex: form.biological_sex || null,
      gender: form.gender || null,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      primary_diagnoses: arrField(form.primary_diagnoses),
      dsm5_codes: arrField(form.dsm5_codes),
      cid11_codes: arrField(form.cid11_codes),
      diagnostic_hypotheses: form.diagnostic_hypotheses || null,
      current_complaint: form.current_complaint || null,
      clinical_history: form.clinical_history || null,
      psychiatric_comorbidities: arrField(form.psychiatric_comorbidities),
      clinical_comorbidities: arrField(form.clinical_comorbidities),
      allergies: arrField(form.allergies),
      medication_sensitivity: form.medication_sensitivity || null,
      cardiovascular_history: form.cardiovascular_history || null,
      seizure_history: form.seizure_history || null,
      mania_history: form.mania_history || null,
      substance_use_history: form.substance_use_history || null,
      suicide_risk: form.suicide_risk || null,
      safety_notes: form.safety_notes || null,
      responsible_physician: form.responsible_physician || null,
      status: form.status || "ativo",
      tags: arrField(form.tags),
    };
    let res;
    if (id) res = await supabase.from("patients").update(payload).eq("id", id);
    else res = await supabase.from("patients").insert(payload).select().single();
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("Paciente salvo");
    qc.invalidateQueries({ queryKey: ["patients"] });
    const newId = id ?? (res as any).data?.id;
    nav(`/pacientes/${newId}`);
  }

  async function remove() {
    if (!id) return;
    if (!confirm("Excluir este paciente e todos os dados clínicos vinculados? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("patients").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Paciente excluído");
    qc.invalidateQueries({ queryKey: ["patients"] });
    nav("/pacientes");
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title={id ? "Editar paciente" : "Novo paciente"}
        description="Use abas para organizar a entrada de dados. Listas separadas por vírgula."
        actions={
          <div className="flex gap-2">
            {id && <Button variant="destructive" onClick={remove}>Excluir</Button>}
            <Button variant="outline" onClick={() => nav(-1)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        }
      />
      <Card className="p-4">
        <Tabs defaultValue="ident">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="ident">Identificação</TabsTrigger>
            <TabsTrigger value="diag">Diagnósticos</TabsTrigger>
            <TabsTrigger value="hist">História clínica</TabsTrigger>
            <TabsTrigger value="safety">Segurança</TabsTrigger>
            <TabsTrigger value="meta">Status & tags</TabsTrigger>
          </TabsList>
          <TabsContent value="ident" className="grid md:grid-cols-2 gap-4 pt-4">
            <Field label="Nome completo *"><Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} /></Field>
            <Field label="Nome social"><Input value={form.social_name} onChange={(e) => set("social_name", e.target.value)} /></Field>
            <Field label="Data de nascimento"><Input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} /></Field>
            <Field label="Sexo biológico"><Input value={form.biological_sex} onChange={(e) => set("biological_sex", e.target.value)} /></Field>
            <Field label="Gênero"><Input value={form.gender} onChange={(e) => set("gender", e.target.value)} /></Field>
            <Field label="Peso (kg)"><Input type="number" value={form.weight_kg} onChange={(e) => set("weight_kg", e.target.value)} /></Field>
            <Field label="Altura (cm)"><Input type="number" value={form.height_cm} onChange={(e) => set("height_cm", e.target.value)} /></Field>
            <Field label="Médico responsável"><Input value={form.responsible_physician} onChange={(e) => set("responsible_physician", e.target.value)} /></Field>
          </TabsContent>
          <TabsContent value="diag" className="grid gap-4 pt-4">
            <Field label="Diagnósticos principais (vírgula)"><Input value={form.primary_diagnoses} onChange={(e) => set("primary_diagnoses", e.target.value)} /></Field>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="DSM-5"><Input value={form.dsm5_codes} onChange={(e) => set("dsm5_codes", e.target.value)} /></Field>
              <Field label="CID-11"><Input value={form.cid11_codes} onChange={(e) => set("cid11_codes", e.target.value)} /></Field>
            </div>
            <Field label="Hipóteses diagnósticas"><Textarea value={form.diagnostic_hypotheses} onChange={(e) => set("diagnostic_hypotheses", e.target.value)} /></Field>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Comorbidades psiquiátricas"><Input value={form.psychiatric_comorbidities} onChange={(e) => set("psychiatric_comorbidities", e.target.value)} /></Field>
              <Field label="Comorbidades clínicas"><Input value={form.clinical_comorbidities} onChange={(e) => set("clinical_comorbidities", e.target.value)} /></Field>
            </div>
          </TabsContent>
          <TabsContent value="hist" className="grid gap-4 pt-4">
            <Field label="Queixa atual"><Textarea value={form.current_complaint} onChange={(e) => set("current_complaint", e.target.value)} /></Field>
            <Field label="História clínica"><Textarea rows={6} value={form.clinical_history} onChange={(e) => set("clinical_history", e.target.value)} /></Field>
            <Field label="Histórico de uso de substâncias"><Textarea value={form.substance_use_history} onChange={(e) => set("substance_use_history", e.target.value)} /></Field>
          </TabsContent>
          <TabsContent value="safety" className="grid gap-4 pt-4">
            <Field label="Risco suicida atual"><Input value={form.suicide_risk} onChange={(e) => set("suicide_risk", e.target.value)} /></Field>
            <Field label="Alergias"><Input value={form.allergies} onChange={(e) => set("allergies", e.target.value)} /></Field>
            <Field label="Sensibilidade medicamentosa"><Input value={form.medication_sensitivity} onChange={(e) => set("medication_sensitivity", e.target.value)} /></Field>
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Cardiovascular"><Input value={form.cardiovascular_history} onChange={(e) => set("cardiovascular_history", e.target.value)} /></Field>
              <Field label="Convulsivo"><Input value={form.seizure_history} onChange={(e) => set("seizure_history", e.target.value)} /></Field>
              <Field label="Mania/hipomania"><Input value={form.mania_history} onChange={(e) => set("mania_history", e.target.value)} /></Field>
            </div>
            <Field label="Notas de segurança"><Textarea value={form.safety_notes} onChange={(e) => set("safety_notes", e.target.value)} /></Field>
          </TabsContent>
          <TabsContent value="meta" className="grid md:grid-cols-2 gap-4 pt-4">
            <Field label="Status">
              <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.status} onChange={(e) => set("status", e.target.value)}>
                {["ativo","pausado","alta","interrompido","triagem"].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Tags clínicas"><Input value={form.tags} onChange={(e) => set("tags", e.target.value)} /></Field>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
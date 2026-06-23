import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePatients, useSubstances } from "@/lib/usePatients";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/clinical/PageHeader";
import { EmptyState } from "@/components/clinical/EmptyState";
import { ReviewNote } from "@/components/clinical/ReviewNote";
import { fmtDate } from "@/lib/format";
import { FlaskConical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SubstanceUse() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: patients = [] } = usePatients();
  const { data: substances = [] } = useSubstances();
  const { data: logs = [] } = useQuery({
    queryKey: ["sub-use-all"],
    queryFn: async () => (await supabase.from("substance_use_logs").select("*, patients(full_name)").order("used_at", { ascending: false }).limit(100)).data ?? [],
  });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({
    patient_id: "", substance_id: "", substance_name: "",
    used_at: new Date().toISOString().slice(0,16),
    craving_before: "", craving_after: "", withdrawal: "", reinforcement: "", compulsion: "",
    trigger: "", consequence: "sem dano", intent: "uso planejado", context: "",
  });

  async function save() {
    if (!f.patient_id || !f.substance_name) return toast.error("Paciente e substância são obrigatórios");
    const num = (v: string) => v === "" ? null : Number(v);
    const { error } = await supabase.from("substance_use_logs").insert({
      owner_id: user!.id, patient_id: f.patient_id,
      substance_id: f.substance_id || null,
      substance_name: f.substance_name,
      used_at: new Date(f.used_at).toISOString(),
      craving_before: num(f.craving_before), craving_after: num(f.craving_after),
      withdrawal: num(f.withdrawal), reinforcement: num(f.reinforcement), compulsion: num(f.compulsion),
      trigger: f.trigger || null, consequence: f.consequence, intent: f.intent, context: f.context || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Uso registrado");
    qc.invalidateQueries({ queryKey: ["sub-use-all"] });
    setOpen(false);
  }
  async function remove(id: string) {
    if (!confirm("Excluir registro?")) return;
    await supabase.from("substance_use_logs").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["sub-use-all"] });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Uso de substâncias" description="Registro clínico sem julgamento moral. Inclui licitas, prescritas e ilícitas para acompanhamento longitudinal e redução de dano."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" />Registrar uso</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Registrar uso de substância</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Field label="Paciente">
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={f.patient_id} onChange={(e) => setF({...f, patient_id: e.target.value})}>
                    <option value="">Selecione…</option>
                    {patients.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </Field>
                <Field label="Substância">
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={f.substance_id} onChange={(e) => {
                    const s = substances.find((x: any) => x.id === e.target.value);
                    setF({...f, substance_id: e.target.value, substance_name: s?.name ?? f.substance_name});
                  }}>
                    <option value="">— digite —</option>
                    {substances.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label="Nome (obrigatório)"><Input value={f.substance_name} onChange={(e) => setF({...f, substance_name: e.target.value})} /></Field>
                <Field label="Horário"><Input type="datetime-local" value={f.used_at} onChange={(e) => setF({...f, used_at: e.target.value})} /></Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Craving antes (0–10)"><Input type="number" min={0} max={10} value={f.craving_before} onChange={(e) => setF({...f, craving_before: e.target.value})} /></Field>
                  <Field label="Craving depois"><Input type="number" min={0} max={10} value={f.craving_after} onChange={(e) => setF({...f, craving_after: e.target.value})} /></Field>
                  <Field label="Abstinência"><Input type="number" min={0} max={10} value={f.withdrawal} onChange={(e) => setF({...f, withdrawal: e.target.value})} /></Field>
                </div>
                <Field label="Gatilho"><Input value={f.trigger} onChange={(e) => setF({...f, trigger: e.target.value})} /></Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Intenção">
                    <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={f.intent} onChange={(e) => setF({...f, intent: e.target.value})}>
                      {["terapêutica","automedicação","recreativa","recaída","uso planejado","uso impulsivo","outro"].map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </Field>
                  <Field label="Consequência">
                    <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={f.consequence} onChange={(e) => setF({...f, consequence: e.target.value})}>
                      {["sem dano","prejuízo funcional","conflito","risco físico","overdose/risco grave","outro"].map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Contexto"><Textarea rows={2} value={f.context} onChange={(e) => setF({...f, context: e.target.value})} /></Field>
              </div>
              <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <ReviewNote>Sem julgamento moral. Foco em redução de dano e monitoramento longitudinal.</ReviewNote>
      {logs.length === 0 ? <EmptyState icon={<FlaskConical className="h-5 w-5" />} title="Nenhum uso registrado" /> : (
        <Card className="divide-y">
          {logs.map((u: any) => (
            <div key={u.id} className="p-3 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{u.substance_name}</div>
                <div className="text-xs text-muted-foreground">{u.patients?.full_name} • {fmtDate(u.used_at)} • {u.intent} • {u.consequence}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">craving {u.craving_before ?? "—"} → {u.craving_after ?? "—"}</span>
                <Button size="icon" variant="ghost" onClick={() => remove(u.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
function Field({ label, children }: any) { return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>; }
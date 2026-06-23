import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePatients } from "@/lib/usePatients";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/clinical/PageHeader";
import { EmptyState } from "@/components/clinical/EmptyState";
import { Target, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Symptoms() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: patients = [] } = usePatients();
  const { data: tgs = [] } = useQuery({
    queryKey: ["all-tgs"],
    queryFn: async () => (await supabase.from("patient_target_symptoms").select("*, patients(full_name)").order("created_at", { ascending: false })).data ?? [],
  });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({ patient_id: "", symptom_name: "", baseline: "", therapeutic_goal: "", priority: 3 });
  async function save() {
    if (!f.patient_id || !f.symptom_name) return toast.error("Paciente e sintoma são obrigatórios");
    const { error } = await supabase.from("patient_target_symptoms").insert({
      owner_id: user!.id, patient_id: f.patient_id, symptom_name: f.symptom_name,
      baseline: f.baseline ? Number(f.baseline) : null,
      therapeutic_goal: f.therapeutic_goal ? Number(f.therapeutic_goal) : null,
      priority: Number(f.priority),
    });
    if (error) return toast.error(error.message);
    toast.success("Sintoma-alvo criado");
    qc.invalidateQueries({ queryKey: ["all-tgs"] });
    setOpen(false);
  }
  async function remove(id: string) {
    if (!confirm("Excluir?")) return;
    await supabase.from("patient_target_symptoms").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["all-tgs"] });
  }
  return (
    <div className="space-y-6">
      <PageHeader title="Sintomas-alvo" description="Defina baseline, meta terapêutica e prioridade para medir evolução."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" />Novo</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Sintoma-alvo</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Field label="Paciente">
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={f.patient_id} onChange={(e) => setF({...f, patient_id: e.target.value})}>
                    <option value="">Selecione…</option>
                    {patients.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </Field>
                <Field label="Sintoma"><Input value={f.symptom_name} onChange={(e) => setF({...f, symptom_name: e.target.value})} placeholder="ex.: foco, craving, impulsividade…" /></Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Baseline 0–10"><Input type="number" min={0} max={10} value={f.baseline} onChange={(e) => setF({...f, baseline: e.target.value})} /></Field>
                  <Field label="Meta 0–10"><Input type="number" min={0} max={10} value={f.therapeutic_goal} onChange={(e) => setF({...f, therapeutic_goal: e.target.value})} /></Field>
                  <Field label="Prioridade 1–5"><Input type="number" min={1} max={5} value={f.priority} onChange={(e) => setF({...f, priority: e.target.value})} /></Field>
                </div>
              </div>
              <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      {tgs.length === 0 ? <EmptyState icon={<Target className="h-5 w-5" />} title="Nenhum sintoma-alvo" /> : (
        <Card className="divide-y">
          {tgs.map((t: any) => (
            <div key={t.id} className="p-3 flex justify-between text-sm">
              <div>
                <div className="font-medium">{t.symptom_name}</div>
                <div className="text-xs text-muted-foreground">{t.patients?.full_name} • baseline {t.baseline ?? "—"} → meta {t.therapeutic_goal ?? "—"} • prioridade {t.priority}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
function Field({ label, children }: any) { return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>; }
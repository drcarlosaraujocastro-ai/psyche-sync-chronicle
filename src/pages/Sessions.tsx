import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePatients } from "@/lib/usePatients";
import { Link, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/clinical/PageHeader";
import { EmptyState } from "@/components/clinical/EmptyState";
import { Badge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/format";
import { Plus, CalendarClock, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const TYPES = ["monitoramento","consulta","crise","ajuste medicamentoso","recaída","evento adverso","sono","retorno","triagem","outro"];

export default function Sessions() {
  const [params] = useSearchParams();
  const patientPrefill = params.get("patient") ?? "";
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: patients = [] } = usePatients();
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => (await supabase.from("clinical_sessions").select("*, patients(full_name)").order("session_at", { ascending: false })).data ?? [],
  });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("monitoramento");
  const [patientId, setPatientId] = useState(patientPrefill);

  async function create() {
    if (!name || !patientId) return toast.error("Nome e paciente são obrigatórios");
    const { data, error } = await supabase.from("clinical_sessions").insert({
      owner_id: user!.id, patient_id: patientId, name, session_type: type,
    }).select().single();
    if (error) return toast.error(error.message);
    toast.success("Sessão criada");
    qc.invalidateQueries({ queryKey: ["sessions"] });
    setOpen(false); setName("");
    window.location.href = `/sessoes/${data.id}`;
  }

  async function remove(id: string) {
    if (!confirm("Excluir sessão?")) return;
    await supabase.from("clinical_sessions").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["sessions"] });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Sessões clínicas" description="Diário avançado: cada sessão é um snapshot clínico contextual."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" />Nova sessão</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova sessão</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label>Paciente</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
                    <option value="">Selecione…</option>
                    {patients.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5"><Label>Nome da sessão</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Revisão pós-ajuste estimulante" /></div>
                <div className="space-y-1.5"><Label>Tipo</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={type} onChange={(e) => setType(e.target.value)}>
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <DialogFooter><Button onClick={create}>Criar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      {isLoading ? <div className="text-sm text-muted-foreground">Carregando…</div> :
      sessions.length === 0 ? (
        <EmptyState icon={<CalendarClock className="h-5 w-5" />} title="Nenhuma sessão" description="Crie a primeira sessão clínica para registrar evolução, doses e sintomas." />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {sessions.map((s: any) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link to={`/sessoes/${s.id}`} className="font-medium hover:underline">{s.name}</Link>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.patients?.full_name} • {s.session_type}</div>
                  <div className="text-xs text-muted-foreground">{fmtDate(s.session_at)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize text-xs">{s.status}</Badge>
                  <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePatients } from "@/lib/usePatients";
import { withOwner } from "@/lib/supabase/withOwner";
import { PageHeader } from "@/components/clinical/PageHeader";
import { EmptyState } from "@/components/clinical/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Package, Plus, ArrowDownCircle, ArrowUpCircle, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { buildStockAlerts, estimateDailyUse } from "@/lib/clinical/effectProjection";

function num(v: any) { return v === "" || v == null ? null : Number(v); }

export default function MedicationInventory() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: patients = [] } = usePatients();
  const [open, setOpen] = useState(false);
  const [movement, setMovement] = useState<any>(null);
  const [f, setF] = useState<any>({ patient_id: "", patient_medication_id: "", medication_name: "", current_quantity: "", unit: "un", low_stock_threshold: "7", daily_consumption_estimate: "", expiration_date: "", lot_number: "", location: "", notes: "" });

  const { data: meds = [] } = useQuery({
    queryKey: ["inventory-meds", f.patient_id],
    enabled: !!f.patient_id,
    queryFn: async () => (await supabase.from("patient_medications").select("*, substances(name)").eq("patient_id", f.patient_id).order("created_at", { ascending: false })).data ?? [],
  });
  const { data: inventory = [] } = useQuery({
    queryKey: ["medication-inventory"],
    queryFn: async () => (await (supabase as any).from("medication_inventory").select("*, patients(full_name), patient_medications(*, substances(name))").order("updated_at", { ascending: false })).data ?? [],
  });

  const alerts = useMemo(() => buildStockAlerts(inventory, inventory.map((i: any) => i.patient_medications).filter(Boolean)), [inventory]);

  async function save() {
    if (!user) return toast.error("Não autenticado");
    if (!f.patient_id || !f.medication_name) return toast.error("Paciente e nome do medicamento são obrigatórios");
    const payload = withOwner({
      patient_id: f.patient_id,
      patient_medication_id: f.patient_medication_id || null,
      medication_name: f.medication_name,
      current_quantity: num(f.current_quantity) ?? 0,
      unit: f.unit || "un",
      low_stock_threshold: num(f.low_stock_threshold) ?? 7,
      daily_consumption_estimate: num(f.daily_consumption_estimate),
      expiration_date: f.expiration_date || null,
      lot_number: f.lot_number || null,
      location: f.location || null,
      notes: f.notes || null,
    }, user);
    const { error } = await (supabase as any).from("medication_inventory").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Estoque cadastrado");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["medication-inventory"] });
  }

  async function addMovement(inv: any, type: "entrada" | "saida" | "ajuste") {
    if (!user) return;
    const amountText = prompt(`${type}: quantidade (${inv.unit})`);
    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const signed = type === "saida" ? -amount : amount;
    const nextQty = Number(inv.current_quantity ?? 0) + signed;
    const reason = prompt("Motivo/observação") ?? type;
    const { error } = await (supabase as any).from("medication_inventory_movements").insert(withOwner({
      inventory_id: inv.id, patient_id: inv.patient_id, movement_type: type, amount, unit: inv.unit, reason,
      quantity_before: Number(inv.current_quantity ?? 0), quantity_after: nextQty,
    }, user));
    if (error) return toast.error(error.message);
    await (supabase as any).from("medication_inventory").update({ current_quantity: nextQty }).eq("id", inv.id);
    toast.success("Movimento registrado");
    qc.invalidateQueries({ queryKey: ["medication-inventory"] });
  }

  async function remove(id: string) {
    if (!confirm("Excluir item do estoque?")) return;
    await (supabase as any).from("medication_inventory").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["medication-inventory"] });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Estoque de medicamentos" description="Controle de disponibilidade, baixa quantidade, validade e consumo estimado por paciente."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" />Novo estoque</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Cadastrar estoque</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Field label="Paciente">
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={f.patient_id} onChange={(e) => setF({ ...f, patient_id: e.target.value, patient_medication_id: "" })}>
                    <option value="">Selecione…</option>
                    {patients.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </Field>
                <Field label="Medicamento do paciente">
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={f.patient_medication_id} onChange={(e) => {
                    const m = meds.find((x: any) => x.id === e.target.value);
                    setF({ ...f, patient_medication_id: e.target.value, medication_name: m?.substances?.name ?? m?.free_text_name ?? f.medication_name, daily_consumption_estimate: estimateDailyUse(m, {}) || f.daily_consumption_estimate });
                  }}>
                    <option value="">— sem vínculo —</option>
                    {meds.map((m: any) => <option key={m.id} value={m.id}>{m.substances?.name ?? m.free_text_name} • {m.current_dose ?? "?"} {m.dose_unit ?? ""}</option>)}
                  </select>
                </Field>
                <Field label="Nome do medicamento"><Input value={f.medication_name} onChange={(e) => setF({ ...f, medication_name: e.target.value })} /></Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Quantidade"><Input type="number" value={f.current_quantity} onChange={(e) => setF({ ...f, current_quantity: e.target.value })} /></Field>
                  <Field label="Unidade"><Input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></Field>
                  <Field label="Alerta baixo"><Input type="number" value={f.low_stock_threshold} onChange={(e) => setF({ ...f, low_stock_threshold: e.target.value })} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Consumo/dia estimado"><Input type="number" value={f.daily_consumption_estimate} onChange={(e) => setF({ ...f, daily_consumption_estimate: e.target.value })} /></Field>
                  <Field label="Validade"><Input type="date" value={f.expiration_date} onChange={(e) => setF({ ...f, expiration_date: e.target.value })} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Lote"><Input value={f.lot_number} onChange={(e) => setF({ ...f, lot_number: e.target.value })} /></Field>
                  <Field label="Local"><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
                </div>
                <Field label="Notas"><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
              </div>
              <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {alerts.length > 0 && (
        <Card className="p-4 space-y-2 border-warning/30 bg-warning/5">
          <div className="text-sm font-medium">Alertas de estoque</div>
          {alerts.map((a, i) => <div key={i} className="text-xs"><Badge variant="outline" className="mr-2">{a.severity}</Badge>{a.message}</div>)}
        </Card>
      )}

      {inventory.length === 0 ? <EmptyState icon={<Package className="h-5 w-5" />} title="Nenhum estoque" description="Cadastre quantidade disponível e consumo estimado por medicação." /> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {inventory.map((inv: any) => {
            const daily = estimateDailyUse(inv.patient_medications, inv);
            const days = daily > 0 ? Math.floor(Number(inv.current_quantity ?? 0) / daily) : null;
            const low = days != null ? days <= Number(inv.low_stock_threshold ?? 7) : Number(inv.current_quantity ?? 0) <= Number(inv.low_stock_threshold ?? 7);
            return (
              <Card key={inv.id} className={`p-4 space-y-3 ${low ? "border-warning/40" : ""}`}>
                <div className="flex justify-between gap-2">
                  <div>
                    <div className="font-medium">{inv.medication_name}</div>
                    <div className="text-xs text-muted-foreground">{inv.patients?.full_name ?? "—"}</div>
                  </div>
                  <Badge variant={low ? "destructive" : "outline"} className="h-fit">{low ? "baixo" : "ok"}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><div className="text-[10px] uppercase text-muted-foreground">restante</div><div className="font-mono">{inv.current_quantity} {inv.unit}</div></div>
                  <div><div className="text-[10px] uppercase text-muted-foreground">dias estimados</div><div className="font-mono">{days ?? "—"}</div></div>
                  <div><div className="text-[10px] uppercase text-muted-foreground">validade</div><div>{inv.expiration_date ?? "—"}</div></div>
                  <div><div className="text-[10px] uppercase text-muted-foreground">local</div><div>{inv.location ?? "—"}</div></div>
                </div>
                {inv.notes && <div className="text-xs text-muted-foreground">{inv.notes}</div>}
                <div className="flex gap-1.5 justify-end">
                  <Button size="sm" variant="outline" onClick={() => addMovement(inv, "entrada")}><ArrowDownCircle className="h-3.5 w-3.5 mr-1" />Entrada</Button>
                  <Button size="sm" variant="outline" onClick={() => addMovement(inv, "saida")}><ArrowUpCircle className="h-3.5 w-3.5 mr-1" />Saída</Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(inv.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: any) {
  return <div className="space-y-1.5"><Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>;
}

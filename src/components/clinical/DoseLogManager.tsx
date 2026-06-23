import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { withOwner } from "@/lib/supabase/withOwner";
import { fmtDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Activity, AlertTriangle, Copy, Pencil, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nowLocalInput() {
  return toLocalInput(new Date().toISOString());
}

function num(v: any) {
  return v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v);
}

function canonicalName(d: any) {
  return String(d?.substances?.name ?? d?.substance_name ?? "").toLowerCase();
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}

export function DoseLogManager({
  doses,
  patientId,
  sessionId,
  onChanged,
}: {
  doses: any[];
  patientId: string;
  sessionId?: string | null;
  onChanged?: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const metrics = useMemo(() => {
    const redoses = doses.filter((d) => String(d.log_type ?? "").toLowerCase().includes("redose") || String(d.log_type ?? "").toLowerCase().includes("abuso")).length;
    const noFormula = doses.filter((d) => !d.formulation_id && !d.formulation_name).length;
    const highCaffeine = doses.filter((d) => Number(d.caffeine_near_dose_mg ?? d.caffeine_amount ?? 0) >= 200).length;
    const sleepRisk = doses.filter((d) => Number(d.sleep_deprivation_at_dose_0_10 ?? 0) >= 6).length;
    const sameSubstanceWindows = doses
      .slice()
      .sort((a, b) => new Date(a.actual_time).getTime() - new Date(b.actual_time).getTime())
      .filter((d, i, arr) => {
        if (i === 0) return false;
        const prev = arr[i - 1];
        const same = canonicalName(prev) && canonicalName(prev) === canonicalName(d);
        const deltaH = (new Date(d.actual_time).getTime() - new Date(prev.actual_time).getTime()) / 36e5;
        return same && deltaH > 0 && deltaH <= 24;
      }).length;
    return { redoses, noFormula, highCaffeine, sleepRisk, sameSubstanceWindows };
  }, [doses]);

  function openEdit(d: any) {
    setEditing({
      ...d,
      actual_time_local: toLocalInput(d.actual_time),
      planned_time_local: toLocalInput(d.planned_time),
      last_meal_time_local: toLocalInput(d.last_meal_time),
    });
  }

  async function updateDose() {
    if (!editing?.id) return;
    setBusy(true);
    const payload = {
      substance_name: editing.substance_name || null,
      formulation_name: editing.formulation_name || null,
      dose_amount: num(editing.dose_amount),
      dose_unit: editing.dose_unit || null,
      dose_text: editing.dose_amount && editing.dose_unit ? `${editing.dose_amount} ${editing.dose_unit}` : editing.dose_text ?? null,
      actual_time: editing.actual_time_local ? new Date(editing.actual_time_local).toISOString() : editing.actual_time,
      planned_time: editing.planned_time_local ? new Date(editing.planned_time_local).toISOString() : null,
      route: editing.route || null,
      log_type: editing.log_type || null,
      dose_goal: editing.dose_goal || null,
      stomach: editing.stomach || null,
      taken_with_food: !!editing.taken_with_food,
      stomach_fullness_0_10: num(editing.stomach_fullness_0_10),
      last_meal_time: editing.last_meal_time_local ? new Date(editing.last_meal_time_local).toISOString() : null,
      meal_size: editing.meal_size || null,
      meal_fat_level_0_10: num(editing.meal_fat_level_0_10),
      caffeine_near_dose_mg: num(editing.caffeine_near_dose_mg),
      caffeine_timing: editing.caffeine_timing || null,
      sleep_deprivation_at_dose_0_10: num(editing.sleep_deprivation_at_dose_0_10),
      expected_effect_text: editing.expected_effect_text || null,
      perceived_effect_text: editing.perceived_effect_text || null,
      benefit_0_100: num(editing.benefit_0_100),
      adverse_0_100: num(editing.adverse_0_100),
      focus_0_100: num(editing.focus_0_100),
      anxiety_0_100: num(editing.anxiety_0_100),
      sedation_0_100: num(editing.sedation_0_100),
      stimulation_0_100: num(editing.stimulation_0_100),
      impulsivity_0_100: num(editing.impulsivity_0_100),
      craving_0_100: num(editing.craving_0_100),
      notes_patient: editing.notes_patient || null,
      notes_clinician: editing.notes_clinician || null,
    };
    const { error } = await (supabase as any).from("medication_dose_logs").update(payload).eq("id", editing.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Dose editada.");
    setEditing(null);
    invalidate();
  }

  async function deleteDose(d: any) {
    const label = `${d.substance_name ?? "dose"} ${d.dose_amount ?? ""} ${d.dose_unit ?? ""}`.trim();
    if (!confirm(`Excluir ${label}?`)) return;
    const { error } = await (supabase as any).from("medication_dose_logs").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Dose excluída.");
    invalidate();
  }

  async function duplicateAsRedose(d: any) {
    if (!user) return toast.error("Não autenticado.");
    const { id, created_at, updated_at, substances, patients, substance_formulations, ...rest } = d;
    const payload = withOwner({
      ...rest,
      patient_id: patientId,
      session_id: sessionId ?? d.session_id ?? null,
      actual_time: new Date().toISOString(),
      planned_time: null,
      log_type: "redose",
      dose_goal: d.dose_goal || "redose / alívio de queda funcional",
      perceived_effect_text: null,
      notes_clinician: [
        d.notes_clinician,
        "Duplicada como redose agora. Interpretar como sobreposição/cauda, não como soma linear de eficácia.",
      ].filter(Boolean).join("\n"),
    }, user);
    const { error } = await (supabase as any).from("medication_dose_logs").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Redose registrada a partir da dose original.");
    invalidate();
  }

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["session-doses", sessionId] });
    qc.invalidateQueries({ queryKey: ["recent-doses", patientId] });
    qc.invalidateQueries({ queryKey: ["all-doses"] });
    qc.invalidateQueries({ queryKey: ["dose-checkins", patientId] });
    onChanged?.();
  }

  return (
    <div className="space-y-3">
      <Card className="p-3 grid md:grid-cols-5 gap-2 text-xs">
        <Metric label="doses" value={doses.length} />
        <Metric label="redoses" value={metrics.redoses} warn={metrics.redoses > 0} />
        <Metric label="sem formulação" value={metrics.noFormula} warn={metrics.noFormula > 0} />
        <Metric label="cafeína alta" value={metrics.highCaffeine} warn={metrics.highCaffeine > 0} />
        <Metric label="sono/risco" value={metrics.sleepRisk + metrics.sameSubstanceWindows} warn={metrics.sleepRisk + metrics.sameSubstanceWindows > 0} />
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <div className="text-sm font-medium flex items-center gap-1.5"><Activity className="h-4 w-4 text-primary" />Doses desta sessão</div>
            <div className="text-xs text-muted-foreground">Agora cada dose pode ser editada, excluída ou duplicada como redose para alimentar interações e fenomenologia.</div>
          </div>
          {metrics.sameSubstanceWindows > 0 && <Badge variant="outline" className="border-warning/40 text-warning"><AlertTriangle className="h-3 w-3 mr-1" />sobreposição possível</Badge>}
        </div>
        {doses.length === 0 ? <div className="text-sm text-muted-foreground">Nenhuma dose registrada.</div> : (
          <div className="divide-y">
            {doses.map((d: any) => (
              <div key={d.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">{d.substance_name || "Substância sem nome"} <span className="text-xs text-muted-foreground">• {d.dose_amount ?? "?"} {d.dose_unit ?? ""}</span></div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-1">
                    <span>{fmtDate(d.actual_time)}</span>
                    {d.formulation_name && <span>formulação: {d.formulation_name}</span>}
                    {d.log_type && <span>log: {d.log_type}</span>}
                    {d.caffeine_near_dose_mg != null && <span>cafeína: {d.caffeine_near_dose_mg} mg</span>}
                    {d.sleep_deprivation_at_dose_0_10 != null && <span>privação: {d.sleep_deprivation_at_dose_0_10}/10</span>}
                  </div>
                  {(d.perceived_effect_text || d.notes_clinician) && <div className="text-xs mt-1 line-clamp-2">{d.perceived_effect_text || d.notes_clinician}</div>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => duplicateAsRedose(d)}><Zap className="h-3.5 w-3.5 mr-1" />Redose</Button>
                  <Button size="icon" variant="ghost" title="Editar dose" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" title="Duplicar como redose" onClick={() => duplicateAsRedose(d)}><Copy className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" title="Excluir dose" onClick={() => deleteDose(d)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar dose</DialogTitle></DialogHeader>
          {editing && <div className="space-y-4">
            <div className="grid md:grid-cols-4 gap-2">
              <Field label="Substância/produto"><Input value={editing.substance_name ?? ""} onChange={(e) => setEditing({ ...editing, substance_name: e.target.value })} /></Field>
              <Field label="Dose"><Input type="number" value={editing.dose_amount ?? ""} onChange={(e) => setEditing({ ...editing, dose_amount: e.target.value })} /></Field>
              <Field label="Unidade"><Input value={editing.dose_unit ?? ""} onChange={(e) => setEditing({ ...editing, dose_unit: e.target.value })} /></Field>
              <Field label="Via"><Input value={editing.route ?? ""} onChange={(e) => setEditing({ ...editing, route: e.target.value })} /></Field>
            </div>
            <div className="grid md:grid-cols-3 gap-2">
              <Field label="Horário real"><Input type="datetime-local" value={editing.actual_time_local ?? ""} onChange={(e) => setEditing({ ...editing, actual_time_local: e.target.value })} /></Field>
              <Field label="Horário planejado"><Input type="datetime-local" value={editing.planned_time_local ?? ""} onChange={(e) => setEditing({ ...editing, planned_time_local: e.target.value })} /></Field>
              <Field label="Tipo de log"><select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={editing.log_type ?? "manutencao"} onChange={(e) => setEditing({ ...editing, log_type: e.target.value })}>{["manutencao","redose","atraso","esquecimento","prn","uso_problematico","abuso","ajuste"].map((o) => <option key={o}>{o}</option>)}</select></Field>
            </div>
            <div className="grid md:grid-cols-4 gap-2">
              <Field label="Formulação"><Input value={editing.formulation_name ?? ""} onChange={(e) => setEditing({ ...editing, formulation_name: e.target.value })} /></Field>
              <Field label="Estômago 0–10"><Input type="number" min={0} max={10} value={editing.stomach_fullness_0_10 ?? ""} onChange={(e) => setEditing({ ...editing, stomach_fullness_0_10: e.target.value })} /></Field>
              <Field label="Cafeína mg"><Input type="number" value={editing.caffeine_near_dose_mg ?? ""} onChange={(e) => setEditing({ ...editing, caffeine_near_dose_mg: e.target.value })} /></Field>
              <Field label="Privação sono 0–10"><Input type="number" min={0} max={10} value={editing.sleep_deprivation_at_dose_0_10 ?? ""} onChange={(e) => setEditing({ ...editing, sleep_deprivation_at_dose_0_10: e.target.value })} /></Field>
            </div>
            <div className="grid md:grid-cols-4 gap-2">
              <Field label="Benefício 0–100"><Input type="number" min={0} max={100} value={editing.benefit_0_100 ?? ""} onChange={(e) => setEditing({ ...editing, benefit_0_100: e.target.value })} /></Field>
              <Field label="Adverso 0–100"><Input type="number" min={0} max={100} value={editing.adverse_0_100 ?? ""} onChange={(e) => setEditing({ ...editing, adverse_0_100: e.target.value })} /></Field>
              <Field label="Foco 0–100"><Input type="number" min={0} max={100} value={editing.focus_0_100 ?? ""} onChange={(e) => setEditing({ ...editing, focus_0_100: e.target.value })} /></Field>
              <Field label="Ansiedade 0–100"><Input type="number" min={0} max={100} value={editing.anxiety_0_100 ?? ""} onChange={(e) => setEditing({ ...editing, anxiety_0_100: e.target.value })} /></Field>
              <Field label="Sedação 0–100"><Input type="number" min={0} max={100} value={editing.sedation_0_100 ?? ""} onChange={(e) => setEditing({ ...editing, sedation_0_100: e.target.value })} /></Field>
              <Field label="Estimulação 0–100"><Input type="number" min={0} max={100} value={editing.stimulation_0_100 ?? ""} onChange={(e) => setEditing({ ...editing, stimulation_0_100: e.target.value })} /></Field>
              <Field label="Impulsividade 0–100"><Input type="number" min={0} max={100} value={editing.impulsivity_0_100 ?? ""} onChange={(e) => setEditing({ ...editing, impulsivity_0_100: e.target.value })} /></Field>
              <Field label="Craving 0–100"><Input type="number" min={0} max={100} value={editing.craving_0_100 ?? ""} onChange={(e) => setEditing({ ...editing, craving_0_100: e.target.value })} /></Field>
            </div>
            <Field label="Objetivo da dose"><Input value={editing.dose_goal ?? ""} onChange={(e) => setEditing({ ...editing, dose_goal: e.target.value })} /></Field>
            <Field label="Efeito percebido"><Textarea value={editing.perceived_effect_text ?? ""} onChange={(e) => setEditing({ ...editing, perceived_effect_text: e.target.value })} /></Field>
            <Field label="Notas clínicas"><Textarea value={editing.notes_clinician ?? ""} onChange={(e) => setEditing({ ...editing, notes_clinician: e.target.value })} /></Field>
          </div>}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => editing && setEditing({ ...editing, actual_time_local: nowLocalInput(), log_type: "redose" })}>Converter em redose agora</Button>
            <Button onClick={updateDose} disabled={busy}>{busy ? "Salvando…" : "Salvar alterações"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return <div className={warn ? "rounded-md border border-warning/30 bg-warning/5 p-2" : "rounded-md border border-border/60 p-2"}><div className="text-lg font-semibold">{value}</div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div></div>;
}

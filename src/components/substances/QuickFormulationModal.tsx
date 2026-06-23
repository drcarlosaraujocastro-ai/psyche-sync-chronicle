import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { withOwner } from "@/lib/supabase/withOwner";
import { toast } from "sonner";
import { findTemplate } from "@/lib/pharmacologyKnowledgeBase";
import { toFormulationInserts } from "@/lib/pharmacology/templateImport";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  substanceId: string;
  substanceName?: string;
  onCreated?: (formulation: any) => void;
}

const empty = {
  formulation_name: "", formulation_type: "oral", route: "oral", curve_model: "padrao",
  onset_min_value: "", onset_max_value: "", onset_unit: "min",
  comeup_min_value: "", comeup_max_value: "", comeup_unit: "min",
  peak_min_value: "", peak_max_value: "", peak_unit: "min",
  plateau_min_value: "", plateau_max_value: "", plateau_unit: "min",
  offset_min_value: "", offset_max_value: "", offset_unit: "min",
  duration_min_value: "", duration_max_value: "", duration_unit: "h",
  half_life_min_value: "", half_life_max_value: "", half_life_unit: "h",
  has_steady_state: false, steady_state_min_value: "", steady_state_max_value: "", steady_state_unit: "dias",
  has_tail: false, tail_min_value: "", tail_max_value: "", tail_unit: "h",
  notes: "",
};

export function QuickFormulationModal({ open, onOpenChange, substanceId, substanceName, onCreated }: Props) {
  const { user } = useAuth();
  const [f, setF] = useState<any>(empty);
  const [saving, setSaving] = useState(false);

  const template = useMemo(() => findTemplate(substanceName ?? ""), [substanceName]);
  const templateFormulations = useMemo(() => template ? toFormulationInserts(template) : [], [template]);

  useEffect(() => {
    if (!open) return;
    const first = templateFormulations[0];
    if (first) {
      setF((cur: any) => ({
        ...cur,
        formulation_name: first.formulation_name ?? cur.formulation_name,
        formulation_type: first.formulation_type ?? cur.formulation_type,
        route: first.route ?? cur.route,
        curve_model: first.curve_model ?? cur.curve_model,
        onset_min_value: first.onset_min_value ?? cur.onset_min_value,
        onset_max_value: first.onset_max_value ?? cur.onset_max_value,
        onset_unit: first.onset_unit ?? cur.onset_unit,
        comeup_min_value: first.comeup_min_value ?? cur.comeup_min_value,
        comeup_max_value: first.comeup_max_value ?? cur.comeup_max_value,
        comeup_unit: first.comeup_unit ?? cur.comeup_unit,
        peak_min_value: first.peak_min_value ?? cur.peak_min_value,
        peak_max_value: first.peak_max_value ?? cur.peak_max_value,
        peak_unit: first.peak_unit ?? cur.peak_unit,
        plateau_min_value: first.plateau_min_value ?? cur.plateau_min_value,
        plateau_max_value: first.plateau_max_value ?? cur.plateau_max_value,
        plateau_unit: first.plateau_unit ?? cur.plateau_unit,
        offset_min_value: first.offset_min_value ?? cur.offset_min_value,
        offset_max_value: first.offset_max_value ?? cur.offset_max_value,
        offset_unit: first.offset_unit ?? cur.offset_unit,
        duration_min_value: first.duration_min_value ?? cur.duration_min_value,
        duration_max_value: first.duration_max_value ?? cur.duration_max_value,
        duration_unit: first.duration_unit ?? cur.duration_unit,
        half_life_min_value: first.half_life_min_value ?? cur.half_life_min_value,
        half_life_max_value: first.half_life_max_value ?? cur.half_life_max_value,
        half_life_unit: first.half_life_unit ?? cur.half_life_unit,
        has_steady_state: first.has_steady_state ?? cur.has_steady_state,
        steady_state_min_value: first.steady_state_min_value ?? cur.steady_state_min_value,
        steady_state_max_value: first.steady_state_max_value ?? cur.steady_state_max_value,
        steady_state_unit: first.steady_state_unit ?? cur.steady_state_unit,
        has_tail: first.has_tail ?? cur.has_tail,
        tail_min_value: first.tail_min_value ?? cur.tail_min_value,
        tail_max_value: first.tail_max_value ?? cur.tail_max_value,
        tail_unit: first.tail_unit ?? cur.tail_unit,
        notes: first.notes ?? cur.notes,
      }));
    }
  }, [open, templateFormulations]);

  function num(v: any) { return v === "" || v == null ? null : Number(v); }

  async function save(useNow = false) {
    if (!user) return;
    if (!f.formulation_name) return toast.error("Nome da formulação é obrigatório.");
    setSaving(true);
    try {
      const payload = withOwner({
        substance_id: substanceId,
        formulation_name: f.formulation_name,
        formulation_type: f.formulation_type, route: f.route, curve_model: f.curve_model,
        onset_min_value: num(f.onset_min_value), onset_max_value: num(f.onset_max_value), onset_unit: f.onset_unit,
        comeup_min_value: num(f.comeup_min_value), comeup_max_value: num(f.comeup_max_value), comeup_unit: f.comeup_unit,
        peak_min_value: num(f.peak_min_value), peak_max_value: num(f.peak_max_value), peak_unit: f.peak_unit,
        plateau_min_value: num(f.plateau_min_value), plateau_max_value: num(f.plateau_max_value), plateau_unit: f.plateau_unit,
        offset_min_value: num(f.offset_min_value), offset_max_value: num(f.offset_max_value), offset_unit: f.offset_unit,
        duration_min_value: num(f.duration_min_value), duration_max_value: num(f.duration_max_value), duration_unit: f.duration_unit,
        half_life_min_value: num(f.half_life_min_value), half_life_max_value: num(f.half_life_max_value), half_life_unit: f.half_life_unit,
        has_steady_state: !!f.has_steady_state,
        steady_state_min_value: num(f.steady_state_min_value), steady_state_max_value: num(f.steady_state_max_value), steady_state_unit: f.steady_state_unit,
        has_tail: !!f.has_tail,
        tail_min_value: num(f.tail_min_value), tail_max_value: num(f.tail_max_value), tail_unit: f.tail_unit,
        notes: f.notes,
      }, user);
      const { data, error } = await (supabase as any).from("substance_formulations").insert(payload).select().single();
      if (error) throw error;
      toast.success("Formulação criada.");
      onOpenChange(false);
      setF(empty);
      if (useNow) onCreated?.(data);
      else onCreated?.(data);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar.");
    } finally { setSaving(false); }
  }

  function row(label: string, key: string, key2?: string, unitKey?: string) {
    return (
      <div className="grid grid-cols-[1fr_70px_70px_70px] items-center gap-2">
        <Label className="text-[11px] text-muted-foreground">{label}</Label>
        <Input className="h-8 text-xs" placeholder="min" value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} />
        <Input className="h-8 text-xs" placeholder="máx" value={key2 ? f[key2] : ""} onChange={(e) => key2 && setF({ ...f, [key2]: e.target.value })} />
        <Input className="h-8 text-xs" placeholder="unidade" value={unitKey ? f[unitKey] : ""} onChange={(e) => unitKey && setF({ ...f, [unitKey]: e.target.value })} />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova formulação {substanceName ? `— ${substanceName}` : ""}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {template && templateFormulations.length > 0 && (
            <div className="rounded-md border border-primary/40 bg-primary/5 p-2 text-xs text-muted-foreground">
              Template encontrado para <b>{template.name}</b>. Campos principais foram pré-preenchidos; revise antes de salvar.
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-[11px] uppercase text-muted-foreground">Nome</Label>
              <Input value={f.formulation_name} onChange={(e) => setF({ ...f, formulation_name: e.target.value })} placeholder="ex: Oral IR 10 mg" /></div>
            <div className="space-y-1"><Label className="text-[11px] uppercase text-muted-foreground">Tipo</Label>
              <Input value={f.formulation_type} onChange={(e) => setF({ ...f, formulation_type: e.target.value })} placeholder="oral / sublingual / OROS / pró-fármaco" /></div>
            <div className="space-y-1"><Label className="text-[11px] uppercase text-muted-foreground">Via</Label>
              <Input value={f.route} onChange={(e) => setF({ ...f, route: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-[11px] uppercase text-muted-foreground">Curve model</Label>
              <Input value={f.curve_model} onChange={(e) => setF({ ...f, curve_model: e.target.value })} placeholder="padrao / oros / sustained_release / prodrug" /></div>
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] uppercase text-muted-foreground">Cinética relativa</div>
            {row("onset", "onset_min_value", "onset_max_value", "onset_unit")}
            {row("come-up", "comeup_min_value", "comeup_max_value", "comeup_unit")}
            {row("pico", "peak_min_value", "peak_max_value", "peak_unit")}
            {row("platô", "plateau_min_value", "plateau_max_value", "plateau_unit")}
            {row("offset", "offset_min_value", "offset_max_value", "offset_unit")}
            {row("duração", "duration_min_value", "duration_max_value", "duration_unit")}
            {row("meia-vida", "half_life_min_value", "half_life_max_value", "half_life_unit")}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={f.has_steady_state} onChange={(e) => setF({ ...f, has_steady_state: e.target.checked })} /> tem steady-state</label>
            <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={f.has_tail} onChange={(e) => setF({ ...f, has_tail: e.target.checked })} /> tem cauda</label>
          </div>
          {f.has_steady_state && row("steady-state", "steady_state_min_value", "steady_state_max_value", "steady_state_unit")}
          {f.has_tail && row("cauda", "tail_min_value", "tail_max_value", "tail_unit")}
          <div className="space-y-1"><Label className="text-[11px] uppercase text-muted-foreground">Notas</Label>
            <Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => save(false)} disabled={saving}>Salvar</Button>
          <Button onClick={() => save(true)} disabled={saving}>Salvar e usar nesta dose</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
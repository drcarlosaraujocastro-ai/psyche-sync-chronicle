import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChipInput } from "./ChipInput";
import { CurvePreview } from "@/components/clinical/CurvePreview";
import {
  KNOWLEDGE_BASE, BENEFIT_AXES, ADVERSE_AXES, CURVE_MODELS, CYP_LIST, RISK_LEVELS, RECEPTOR_CHIPS, PHARM_CLASSES,
  findTemplate, type KBTemplate,
} from "@/lib/pharmacologyKnowledgeBase";
import { resolveAlias, describeMatch, type AliasMatch } from "@/lib/pharmacology/aliasResolver";
import { auditSubstance } from "@/lib/pharmacology/clinicalAudit";
import { toFormulationInserts, toSubstanceInsert } from "@/lib/pharmacology/templateImport";
import { TIME_UNITS } from "@/lib/units";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { withOwner } from "@/lib/supabase/withOwner";
import { Sparkles, ArrowLeft, ArrowRight, Save, AlertTriangle, Copy } from "lucide-react";
import { toast } from "sonner";

const STEPS = ["Identificação", "Curva e formulação", "Efeitos 0–100", "Metabolismo e segurança"] as const;

function Select({ value, onChange, options, placeholder }: any) {
  return (
    <select
      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">{placeholder ?? "—"}</option>
      {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Range({ label, vMin, vMax, unit, onMin, onMax, onUnit, defaultUnit = "horas" }: any) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="grid grid-cols-3 gap-1.5">
        <Input type="number" placeholder="min" value={vMin ?? ""} onChange={(e) => onMin(e.target.value === "" ? null : Number(e.target.value))} />
        <Input type="number" placeholder="máx" value={vMax ?? ""} onChange={(e) => onMax(e.target.value === "" ? null : Number(e.target.value))} />
        <Select value={unit ?? defaultUnit} onChange={onUnit} options={TIME_UNITS} />
      </div>
    </div>
  );
}

function AxisGroup({ title, axes, values, onChange }: { title: string; axes: string[]; values: Record<string, number>; onChange: (next: Record<string, number>) => void }) {
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="grid sm:grid-cols-2 gap-2">
        {axes.map((a) => {
          const v = values?.[a] ?? 0;
          return (
            <div key={a} className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5">
              <div className="text-xs flex-1 truncate" title={a}>{a}</div>
              <Slider value={[v]} min={0} max={100} step={5} onValueChange={([n]) => onChange({ ...values, [a]: n })} className="w-28" />
              <div className="w-7 text-right text-[11px] font-mono">{v}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SubstanceWizard({
  open, onOpenChange, initialName, onCreated,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  initialName?: string;
  onCreated?: (substanceId: string) => void;
}) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(0);
      setF({
        name: initialName ?? "",
        requires_clinical_review: true,
        review_status: "não revisada",
        clinical_effect_profile: {},
        adverse_effect_profile: {},
      });
    }
  }, [open, initialName]);

  function patch(p: any) { setF((cur: any) => ({ ...cur, ...p })); }

  const suggestions = useMemo<KBTemplate[]>(() => {
    return resolveAlias(f.name ?? "", 5).map((m) => m.template);
  }, [f.name]);

  const aliasMatches = useMemo<AliasMatch[]>(() => resolveAlias(f.name ?? "", 5), [f.name]);
  const topMatch = aliasMatches[0];
  const auditIssues = useMemo(() => auditSubstance(f), [f]);

  function useTemplate(t: KBTemplate, autoCreateFormulations = true) {
    setF((cur: any) => ({
      ...t,
      // preserva o que usuário digitou de identificação manual quando template não trouxer o campo
      brand_names: t.brand_names ?? cur.brand_names ?? [],
      brands: t.brands ?? t.brand_names ?? cur.brands ?? [],
      _template: t,
      _autoCreateFormulations: autoCreateFormulations,
      requires_clinical_review: true,
      review_status: "não revisada",
      clinical_effect_profile: t.clinical_effect_profile ?? {},
      adverse_effect_profile: t.adverse_effect_profile ?? {},
      source_notes: t.source_notes ?? "Template estrutural local. Revisão médica obrigatória.",
    }));
    toast.success(`Template aplicado: ${t.name}`);
    setStep(1);
  }

  // dose preview para o passo 2
  const previewDose = useMemo(() => ([{
    substance_name: f.name || "preview",
    actual_time: new Date(Date.now() - 30 * 60_000).toISOString(),
    dose_amount: f.dose_usual_min ?? null,
  }]), [f.name, f.dose_usual_min]);

  const previewSub = useMemo(() => ({
    ...f,
    name: f.name || "preview",
  }), [f]);

  async function save(after: "close" | "open-detail" | "duplicate") {
    if (!f.name?.trim()) { setStep(0); return toast.error("Nome é obrigatório."); }
    if (!user) return toast.error("Você precisa estar autenticado.");
    setSaving(true);
    try {
      const template = (f._template ?? f) as KBTemplate;
      const cleaned = toSubstanceInsert({ ...template, ...f, requires_clinical_review: true });
      delete (cleaned as any)._template;
      delete (cleaned as any)._autoCreateFormulations;
      const payload = withOwner(cleaned, user);
      Object.keys(payload).forEach((k) => (payload as any)[k] === undefined && delete (payload as any)[k]);
      const { data, error } = await supabase.from("substances").insert(payload as any).select().single();
      if (error) throw error;
      if (f._autoCreateFormulations !== false) {
        const forms = toFormulationInserts(template).map((fm) => withOwner({ ...fm, substance_id: data.id }, user));
        if (forms.length) {
          const { error: fmError } = await (supabase as any).from("substance_formulations").insert(forms);
          if (fmError) toast.warning(`Substância criada, mas a formulação não foi criada: ${fmError.message}`);
        }
      }
      toast.success(f._autoCreateFormulations !== false ? "Substância + formulação criadas." : "Substância criada.");
      onCreated?.(data.id);
      if (after === "duplicate") {
        setF((cur: any) => ({ ...cur, name: `${cur.name} (variação)` }));
        setStep(1);
      } else {
        onOpenChange(false);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar.");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 max-h-[92vh] flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center justify-between gap-2 flex-wrap">
            <span>Nova substância — assistente</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              Passo {step + 1} de {STEPS.length} · {STEPS[step]}
            </div>
          </DialogTitle>
          <div className="text-[11px] text-warning flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" /> Revisão clínica obrigatória. Curva relativa, não sérica.
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-4">
            {step === 0 && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Nome (digite e veja sugestões)</Label>
                  <Input autoFocus value={f.name ?? ""} onChange={(e) => patch({ name: e.target.value })} placeholder="ex.: Lyberdia, Vurtuoso, Rivotril, Atensina…" />
                </div>
                {topMatch && topMatch.score >= 0.85 && topMatch.template.name.toLowerCase() !== (f.name ?? "").toLowerCase() && (
                  <div className="rounded-md border border-primary/50 bg-primary/5 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div className="text-sm flex-1">
                        <div className="font-medium">{describeMatch(topMatch)}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {topMatch.template.pharmacological_class ?? topMatch.template.clinical_category ?? ""}
                          {topMatch.template.prodrug_status ? " · pró-fármaco" : ""}
                          {topMatch.template.has_steady_state ? " · steady-state" : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" onClick={() => useTemplate(topMatch.template, false)}>Importar {topMatch.template.name}</Button>
                      <Button size="sm" variant="outline" onClick={() => { useTemplate(topMatch.template, true); }}>Importar + formulação</Button>
                      <Button size="sm" variant="ghost" onClick={() => patch({ name: topMatch.template.name })}>Editar antes de salvar</Button>
                    </div>
                  </div>
                )}
                {suggestions.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><Sparkles className="h-3 w-3" /> Templates locais sugeridos</div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {suggestions.map((t) => (
                        <button type="button" key={t.name} onClick={() => useTemplate(t, true)} className="text-left rounded-md border border-border hover:border-primary/60 hover:bg-primary/5 transition p-2.5">
                          <div className="text-sm font-medium">{t.name}</div>
                          <div className="text-[11px] text-muted-foreground">{t.clinical_category ?? t.pharmacological_class ?? "—"}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{(t.brand_names ?? []).join(", ")}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label className="text-[11px] uppercase text-muted-foreground">Nome genérico</Label>
                    <Input value={f.generic_name ?? ""} onChange={(e) => patch({ generic_name: e.target.value })} /></div>
                  <div><Label className="text-[11px] uppercase text-muted-foreground">Tipo</Label>
                    <Select value={f.substance_type} onChange={(v: any) => patch({ substance_type: v })} options={["medicamento","substância recreativa","metabólito","suplemento","alimento/interferente","outro"]} /></div>
                  <div><Label className="text-[11px] uppercase text-muted-foreground">Categoria clínica</Label>
                    <Input value={f.clinical_category ?? ""} onChange={(e) => patch({ clinical_category: e.target.value })} /></div>
                  <div><Label className="text-[11px] uppercase text-muted-foreground">Classe farmacológica</Label>
                    <Select value={f.pharmacological_class} onChange={(v: any) => patch({ pharmacological_class: v })} options={PHARM_CLASSES} /></div>
                </div>
                <div><Label className="text-[11px] uppercase text-muted-foreground">Nomes comerciais</Label>
                  <ChipInput value={f.brand_names} onChange={(v) => patch({ brand_names: v })} /></div>
                <div><Label className="text-[11px] uppercase text-muted-foreground">Sinônimos / erros comuns</Label>
                  <ChipInput value={f.synonyms} onChange={(v) => patch({ synonyms: v })} /></div>
                {auditIssues.length > 0 && (
                  <div className="rounded-md border border-warning/40 bg-warning/5 p-2.5 space-y-1">
                    <div className="text-[11px] uppercase tracking-wide text-warning flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" /> Auditoria — dados faltantes</div>
                    <ul className="text-xs space-y-0.5 list-disc pl-5">
                      {auditIssues.slice(0, 5).map((i) => (
                        <li key={i.code}><span className="font-medium">{i.message}</span>{i.suggestion ? <span className="text-muted-foreground"> · {i.suggestion}</span> : null}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="grid lg:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div><Label className="text-[11px] uppercase text-muted-foreground">Modelo de curva</Label>
                    <Select value={f.default_curve_model} onChange={(v: any) => patch({ default_curve_model: v })} options={CURVE_MODELS} /></div>
                  <div><Label className="text-[11px] uppercase text-muted-foreground">Via padrão</Label>
                    <Select value={f.default_route} onChange={(v: any) => patch({ default_route: v })} options={["oral","sublingual","intranasal","inalatória","transdérmica","IV","IM","SC","retal"]} /></div>
                  <Range label="Onset" defaultUnit="minutos" vMin={f.onset_min_value} vMax={f.onset_max_value} unit={f.onset_unit ?? "minutos"} onMin={(v:any)=>patch({onset_min_value:v})} onMax={(v:any)=>patch({onset_max_value:v})} onUnit={(v:any)=>patch({onset_unit:v})}/>
                  <Range label="Pico" vMin={f.peak_min_value} vMax={f.peak_max_value} unit={f.peak_unit ?? "horas"} onMin={(v:any)=>patch({peak_min_value:v})} onMax={(v:any)=>patch({peak_max_value:v})} onUnit={(v:any)=>patch({peak_unit:v})}/>
                  <Range label="Platô" vMin={f.plateau_min_value} vMax={f.plateau_max_value} unit={f.plateau_unit ?? "horas"} onMin={(v:any)=>patch({plateau_min_value:v})} onMax={(v:any)=>patch({plateau_max_value:v})} onUnit={(v:any)=>patch({plateau_unit:v})}/>
                  <Range label="Offset" vMin={f.offset_min_value} vMax={f.offset_max_value} unit={f.offset_unit ?? "horas"} onMin={(v:any)=>patch({offset_min_value:v})} onMax={(v:any)=>patch({offset_max_value:v})} onUnit={(v:any)=>patch({offset_unit:v})}/>
                  <Range label="Duração total" vMin={f.total_duration_min_value} vMax={f.total_duration_max_value} unit={f.total_duration_unit ?? "horas"} onMin={(v:any)=>patch({total_duration_min_value:v})} onMax={(v:any)=>patch({total_duration_max_value:v})} onUnit={(v:any)=>patch({total_duration_unit:v})}/>
                  <Range label="Meia-vida" vMin={f.half_life_min_value} vMax={f.half_life_max_value} unit={f.half_life_unit ?? "horas"} onMin={(v:any)=>patch({half_life_min_value:v})} onMax={(v:any)=>patch({half_life_max_value:v})} onUnit={(v:any)=>patch({half_life_unit:v})}/>
                  <div className="flex items-center gap-3 pt-1">
                    <Switch checked={!!f.has_steady_state} onCheckedChange={(v) => patch({ has_steady_state: v })} />
                    <span className="text-sm">Tem steady-state</span>
                  </div>
                  {f.has_steady_state && <Range label="Tempo até steady-state" defaultUnit="dias" vMin={f.steady_state_min_value} vMax={f.steady_state_max_value} unit={f.steady_state_unit ?? "dias"} onMin={(v:any)=>patch({steady_state_min_value:v})} onMax={(v:any)=>patch({steady_state_max_value:v})} onUnit={(v:any)=>patch({steady_state_unit:v})}/>}
                  <div className="flex items-center gap-3">
                    <Switch checked={!!f.has_tail} onCheckedChange={(v) => patch({ has_tail: v })} />
                    <span className="text-sm">Tem cauda/residual</span>
                  </div>
                  {f.has_tail && <Range label="Cauda/residual" vMin={f.tail_min_value} vMax={f.tail_max_value} unit={f.tail_unit ?? "horas"} onMin={(v:any)=>patch({tail_min_value:v})} onMax={(v:any)=>patch({tail_max_value:v})} onUnit={(v:any)=>patch({tail_unit:v})}/>}
                </div>
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">Pré-visualização da curva 0–100 (relativa) com os parâmetros atuais.</div>
                  <CurvePreview doses={previewDose as any} windowHours={12} height={180} />
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-[11px] uppercase text-muted-foreground">Unidade padrão</Label><Input value={f.dose_unit_default ?? ""} onChange={(e)=>patch({dose_unit_default:e.target.value})}/></div>
                    <div><Label className="text-[11px] uppercase text-muted-foreground">Dose usual mín</Label><Input type="number" value={f.dose_usual_min ?? ""} onChange={(e)=>patch({dose_usual_min:e.target.value===""?null:Number(e.target.value)})}/></div>
                    <div><Label className="text-[11px] uppercase text-muted-foreground">Dose usual máx</Label><Input type="number" value={f.dose_usual_max ?? ""} onChange={(e)=>patch({dose_usual_max:e.target.value===""?null:Number(e.target.value)})}/></div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <AxisGroup title="Efeitos terapêuticos esperados (0–100)" axes={BENEFIT_AXES} values={f.clinical_effect_profile ?? {}} onChange={(v) => patch({ clinical_effect_profile: v })} />
                <AxisGroup title="Efeitos adversos / riscos (0–100)" axes={ADVERSE_AXES} values={f.adverse_effect_profile ?? {}} onChange={(v) => patch({ adverse_effect_profile: v })} />
                <div className="text-[11px] text-muted-foreground">Esses valores representam intensidade média esperada. O modelo individual do paciente ajustará depois com base nos check-ins.</div>
              </div>
            )}

            {step === 3 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div><Label className="text-[11px] uppercase text-muted-foreground">CYP substrato</Label>
                    <ChipInput value={f.cyp_substrate} onChange={(v) => patch({ cyp_substrate: v })} suggestions={CYP_LIST} /></div>
                  <div><Label className="text-[11px] uppercase text-muted-foreground">CYP inibidor</Label>
                    <ChipInput value={f.cyp_inhibitor} onChange={(v) => patch({ cyp_inhibitor: v })} suggestions={CYP_LIST} /></div>
                  <div><Label className="text-[11px] uppercase text-muted-foreground">CYP indutor</Label>
                    <ChipInput value={f.cyp_inducer} onChange={(v) => patch({ cyp_inducer: v })} suggestions={CYP_LIST} /></div>
                  <div><Label className="text-[11px] uppercase text-muted-foreground">Alvos / receptores</Label>
                    <ChipInput value={f.targets_receptors} onChange={(v) => patch({ targets_receptors: v })} suggestions={RECEPTOR_CHIPS} /></div>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-[11px] uppercase text-muted-foreground">Risco CV</Label>
                      <Select value={f.cardiovascular_risk_level} onChange={(v:any)=>patch({cardiovascular_risk_level:v})} options={RISK_LEVELS}/></div>
                    <div><Label className="text-[11px] uppercase text-muted-foreground">Sedação</Label>
                      <Select value={f.sedation_risk_level} onChange={(v:any)=>patch({sedation_risk_level:v})} options={RISK_LEVELS}/></div>
                    <div><Label className="text-[11px] uppercase text-muted-foreground">Insônia</Label>
                      <Select value={f.insomnia_risk_level} onChange={(v:any)=>patch({insomnia_risk_level:v})} options={RISK_LEVELS}/></div>
                    <div><Label className="text-[11px] uppercase text-muted-foreground">Abuso</Label>
                      <Select value={f.abuse_risk_level} onChange={(v:any)=>patch({abuse_risk_level:v})} options={RISK_LEVELS}/></div>
                    <div><Label className="text-[11px] uppercase text-muted-foreground">Psicose/mania</Label>
                      <Select value={f.psychosis_mania_risk_level} onChange={(v:any)=>patch({psychosis_mania_risk_level:v})} options={RISK_LEVELS}/></div>
                    <div><Label className="text-[11px] uppercase text-muted-foreground">QT</Label>
                      <Select value={f.qt_risk_level} onChange={(v:any)=>patch({qt_risk_level:v})} options={RISK_LEVELS}/></div>
                  </div>
                  <div><Label className="text-[11px] uppercase text-muted-foreground">Efeito de cafeína</Label>
                    <Textarea rows={2} value={f.caffeine_interaction_notes ?? ""} onChange={(e)=>patch({caffeine_interaction_notes:e.target.value})}/></div>
                  <div><Label className="text-[11px] uppercase text-muted-foreground">Efeito de álcool</Label>
                    <Textarea rows={2} value={f.alcohol_interaction_notes ?? ""} onChange={(e)=>patch({alcohol_interaction_notes:e.target.value})}/></div>
                  <div><Label className="text-[11px] uppercase text-muted-foreground">Privação de sono</Label>
                    <Textarea rows={2} value={f.sleep_deprivation_risk_notes ?? ""} onChange={(e)=>patch({sleep_deprivation_risk_notes:e.target.value})}/></div>
                  <div><Label className="text-[11px] uppercase text-muted-foreground">Notas de segurança</Label>
                    <Textarea rows={2} value={f.safety_notes ?? ""} onChange={(e)=>patch({safety_notes:e.target.value})}/></div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t px-5 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-1">
            {STEPS.map((s, i) => (
              <Badge key={s} variant={i === step ? "default" : "outline"} className="text-[10px]">{i + 1}</Badge>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled={step === 0} onClick={() => setStep(step - 1)}>
              <ArrowLeft className="h-4 w-4 mr-1" />Voltar
            </Button>
            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={() => setStep(step + 1)} disabled={step === 0 && !f.name?.trim()}>
                Próximo<ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" disabled={saving} onClick={() => save("duplicate")}>
                  <Copy className="h-4 w-4 mr-1" />Salvar e duplicar
                </Button>
                <Button size="sm" disabled={saving} onClick={() => save("close")}>
                  <Save className="h-4 w-4 mr-1" />Salvar substância
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
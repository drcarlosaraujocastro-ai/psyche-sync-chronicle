import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChipInput } from "./ChipInput";
import { AxisSliders } from "./AxisSliders";
import {
  BENEFIT_AXES, ADVERSE_AXES, CURVE_MODELS, CYP_LIST, FORMULATIONS,
  PHARM_CLASSES, RECEPTOR_CHIPS, RISK_LEVELS,
  findTemplate, type KBTemplate,
} from "@/lib/pharmacologyKnowledgeBase";
import { TIME_UNITS } from "@/lib/units";
import { Sparkles, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const F = ({ label, hint, children }: any) => (
  <div className="space-y-1.5">
    <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
    {children}
    {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
  </div>
);

function Select({ value, onChange, options, placeholder }: any) {
  return (
    <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
      value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{placeholder ?? "—"}</option>
      {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function TimeRange({ label, vMin, vMax, unit, onMin, onMax, onUnit, defaultUnit = "horas" }: any) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="grid grid-cols-3 gap-1.5">
        <Input type="number" placeholder="min" value={vMin ?? ""} onChange={(e) => onMin(e.target.value === "" ? null : Number(e.target.value))} />
        <Input type="number" placeholder="máx" value={vMax ?? ""} onChange={(e) => onMax(e.target.value === "" ? null : Number(e.target.value))} />
        <Select value={unit ?? defaultUnit} onChange={onUnit} options={TIME_UNITS} />
      </div>
    </div>
  );
}

export function SubstanceEditor({
  open, onOpenChange, initial, onSaved,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  initial?: any | null;
  onSaved?: () => void;
}) {
  const { user } = useAuth();
  const [f, setF] = useState<any>(initial ?? {});
  const [tab, setTab] = useState("ident");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setF(initial ?? {}); setTab("ident"); }, [initial, open]);

  function patch(p: any) { setF((cur: any) => ({ ...cur, ...p })); }

  function applyTemplate(t: KBTemplate) {
    patch({
      ...t,
      requires_clinical_review: true,
      review_status: "não revisada",
    });
    toast.success(`Estrutura sugerida aplicada — revisão clínica obrigatória.`);
  }

  function trySuggest() {
    const t = findTemplate(f.name ?? "");
    if (!t) return toast.message("Sem template local para este nome.", { description: "Preencha manualmente — pode salvar e revisar depois." });
    applyTemplate(t);
  }

  async function save() {
    if (!f.name?.trim()) return toast.error("Nome é obrigatório.");
    setSaving(true);
    try {
      const payload: any = {
        ...f,
        owner_id: user!.id,
        requires_clinical_review: true,
      };
      // remove undefined
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
      let res;
      if (initial?.id) {
        res = await supabase.from("substances").update(payload).eq("id", initial.id);
      } else {
        res = await supabase.from("substances").insert(payload);
      }
      if (res.error) throw res.error;
      toast.success(initial?.id ? "Substância atualizada." : "Substância criada.");
      onSaved?.(); onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar.");
    } finally { setSaving(false); }
  }

  const tabs = useMemo(() => [
    { id: "ident", label: "Identificação" },
    { id: "class", label: "Classe/Mecanismo" },
    { id: "pd", label: "Farmacodinâmica" },
    { id: "pk", label: "Farmacocinética" },
    { id: "curve", label: "Curva/Tempo" },
    { id: "dose", label: "Doses/Vias" },
    { id: "food", label: "Alimento/Sono" },
    { id: "enz", label: "Enzimas" },
    { id: "inter", label: "Interações" },
    { id: "risk", label: "Riscos" },
    { id: "eff", label: "Efeitos 0–100" },
    { id: "src", label: "Fontes/Revisão" },
  ], []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center justify-between gap-2 flex-wrap">
            <span>{initial?.id ? "Editar substância" : "Nova substância"}</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={trySuggest}>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />Preencher estrutura sugerida
              </Button>
            </div>
          </DialogTitle>
          <div className="text-[11px] text-warning flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" /> Revisão clínica obrigatória — confirmar com bula e diretrizes.
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="border-b">
            <TabsList className="w-max gap-1 px-3 h-10">
              {tabs.map((t) => <TabsTrigger key={t.id} value={t.id} className="text-xs">{t.label}</TabsTrigger>)}
            </TabsList>
          </ScrollArea>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <TabsContent value="ident" className="space-y-3 mt-0">
              <F label="Nome principal *"><Input value={f.name ?? ""} onChange={(e) => patch({ name: e.target.value })} /></F>
              <F label="Nome genérico"><Input value={f.generic_name ?? ""} onChange={(e) => patch({ generic_name: e.target.value })} /></F>
              <div className="grid sm:grid-cols-2 gap-3">
                <F label="Nomes comerciais"><ChipInput value={f.brand_names} onChange={(v) => patch({ brand_names: v })} /></F>
                <F label="Nomes de referência"><ChipInput value={f.reference_names} onChange={(v) => patch({ reference_names: v })} /></F>
                <F label="Sinônimos"><ChipInput value={f.synonyms} onChange={(v) => patch({ synonyms: v })} /></F>
                <F label="Erros comuns de escrita"><ChipInput value={f.common_misspellings} onChange={(v) => patch({ common_misspellings: v })} /></F>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <F label="Tipo"><Select value={f.substance_type} onChange={(v: any) => patch({ substance_type: v })} options={["medicamento","substância recreativa","metabólito","suplemento","alimento/interferente","outro"]} /></F>
                <F label="Status legal"><Input value={f.legal_status ?? ""} onChange={(e) => patch({ legal_status: e.target.value })} /></F>
                <F label="Categoria clínica"><Input value={f.clinical_category ?? ""} onChange={(e) => patch({ clinical_category: e.target.value })} /></F>
                <F label="Áreas terapêuticas"><ChipInput value={f.therapeutic_areas} onChange={(v) => patch({ therapeutic_areas: v })} /></F>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <F label="Controlado"><Switch checked={!!f.controlled_substance} onCheckedChange={(v) => patch({ controlled_substance: v })} /></F>
                <F label="Exige prescrição"><Switch checked={f.requires_prescription ?? true} onCheckedChange={(v) => patch({ requires_prescription: v })} /></F>
                <F label="Revisão clínica obrigatória"><Switch checked={f.requires_clinical_review ?? true} onCheckedChange={(v) => patch({ requires_clinical_review: v })} /></F>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <F label="Nível de evidência"><Select value={f.evidence_level} onChange={(v: any) => patch({ evidence_level: v })} options={["expert/observacional","ECR isolado","meta-análise","consenso de diretriz"]} /></F>
                <F label="Status de revisão"><Select value={f.review_status} onChange={(v: any) => patch({ review_status: v })} options={["não revisada","revisão parcial","revisada","precisa atualizar"]} /></F>
              </div>
            </TabsContent>

            <TabsContent value="class" className="space-y-3 mt-0">
              <F label="Classe farmacológica"><Select value={f.pharmacological_class} onChange={(v: any) => patch({ pharmacological_class: v })} options={PHARM_CLASSES} /></F>
              <F label="Subclasse"><Input value={f.pharmacological_subclass ?? ""} onChange={(e) => patch({ pharmacological_subclass: e.target.value })} /></F>
              <F label="Resumo do mecanismo"><Textarea rows={2} value={f.mechanism_summary ?? ""} onChange={(e) => patch({ mechanism_summary: e.target.value })} /></F>
              <F label="Mecanismo expandido"><Textarea rows={4} value={f.mechanism_expanded ?? ""} onChange={(e) => patch({ mechanism_expanded: e.target.value })} /></F>
              <F label="Alvos / receptores" hint="Chips. Use sugestões ou digite livre."><ChipInput value={f.targets_receptors} onChange={(v) => patch({ targets_receptors: v })} suggestions={RECEPTOR_CHIPS} /></F>
            </TabsContent>

            <TabsContent value="pd" className="space-y-3 mt-0">
              <div className="text-xs text-muted-foreground">Perfil farmacodinâmico estrutural. Os efeitos 0–100 ficam na aba “Efeitos 0–100”.</div>
              <F label="Neurotransmissores afetados"><Textarea rows={2} value={f.neurotransmitter_effects?.text ?? ""} onChange={(e) => patch({ neurotransmitter_effects: { ...(f.neurotransmitter_effects ?? {}), text: e.target.value } })} /></F>
              <F label="Circuitos afetados"><Textarea rows={2} value={f.circuit_effects?.text ?? ""} onChange={(e) => patch({ circuit_effects: { ...(f.circuit_effects ?? {}), text: e.target.value } })} /></F>
              <F label="Liability de abuso"><Textarea rows={2} value={f.abuse_liability_profile?.text ?? ""} onChange={(e) => patch({ abuse_liability_profile: { text: e.target.value } })} /></F>
              <F label="Abstinência"><Textarea rows={2} value={f.withdrawal_profile?.text ?? ""} onChange={(e) => patch({ withdrawal_profile: { text: e.target.value } })} /></F>
              <F label="Tolerância"><Textarea rows={2} value={f.tolerance_profile?.text ?? ""} onChange={(e) => patch({ tolerance_profile: { text: e.target.value } })} /></F>
            </TabsContent>

            <TabsContent value="pk" className="space-y-3 mt-0">
              <div className="grid sm:grid-cols-2 gap-3">
                <F label="Biodisponibilidade min (%)"><Input type="number" value={f.bioavailability_min ?? ""} onChange={(e) => patch({ bioavailability_min: e.target.value === "" ? null : Number(e.target.value) })} /></F>
                <F label="Biodisponibilidade máx (%)"><Input type="number" value={f.bioavailability_max ?? ""} onChange={(e) => patch({ bioavailability_max: e.target.value === "" ? null : Number(e.target.value) })} /></F>
                <F label="Ligação proteica (%)"><Input type="number" value={f.protein_binding_percent ?? ""} onChange={(e) => patch({ protein_binding_percent: e.target.value === "" ? null : Number(e.target.value) })} /></F>
                <F label="Metabólitos ativos"><ChipInput value={f.active_metabolites} onChange={(v) => patch({ active_metabolites: v })} /></F>
              </div>
              <TimeRange label="Meia-vida" vMin={f.half_life_min_value} vMax={f.half_life_max_value} unit={f.half_life_unit} onMin={(v: any) => patch({ half_life_min_value: v })} onMax={(v: any) => patch({ half_life_max_value: v })} onUnit={(v: any) => patch({ half_life_unit: v })} />
              <div className="flex items-center gap-3">
                <Switch checked={!!f.has_steady_state} onCheckedChange={(v) => patch({ has_steady_state: v })} />
                <span className="text-sm">Tem steady-state</span>
              </div>
              {f.has_steady_state && (
                <TimeRange label="Tempo até steady-state" vMin={f.steady_state_min_value} vMax={f.steady_state_max_value} unit={f.steady_state_unit ?? "dias"} onMin={(v: any) => patch({ steady_state_min_value: v })} onMax={(v: any) => patch({ steady_state_max_value: v })} onUnit={(v: any) => patch({ steady_state_unit: v })} defaultUnit="dias" />
              )}
              <div className="flex items-center gap-3">
                <Switch checked={!!f.has_tail} onCheckedChange={(v) => patch({ has_tail: v })} />
                <span className="text-sm">Tem cauda/residual</span>
              </div>
              {f.has_tail && (
                <TimeRange label="Cauda/residual" vMin={f.tail_min_value} vMax={f.tail_max_value} unit={f.tail_unit} onMin={(v: any) => patch({ tail_min_value: v })} onMax={(v: any) => patch({ tail_max_value: v })} onUnit={(v: any) => patch({ tail_unit: v })} />
              )}
              <F label="Absorção"><Textarea rows={2} value={f.absorption_notes ?? ""} onChange={(e) => patch({ absorption_notes: e.target.value })} /></F>
              <F label="Distribuição"><Textarea rows={2} value={f.distribution_notes ?? ""} onChange={(e) => patch({ distribution_notes: e.target.value })} /></F>
              <F label="Metabolismo"><Textarea rows={2} value={f.metabolism_notes ?? ""} onChange={(e) => patch({ metabolism_notes: e.target.value })} /></F>
              <F label="Eliminação"><Textarea rows={2} value={f.elimination_notes ?? ""} onChange={(e) => patch({ elimination_notes: e.target.value })} /></F>
            </TabsContent>

            <TabsContent value="curve" className="space-y-3 mt-0">
              <div className="text-xs text-muted-foreground">Curva relativa 0–100. Não representa concentração sérica real.</div>
              <F label="Modelo de curva"><Select value={f.default_curve_model} onChange={(v: any) => patch({ default_curve_model: v })} options={CURVE_MODELS} /></F>
              <TimeRange label="Onset" vMin={f.onset_min_value} vMax={f.onset_max_value} unit={f.onset_unit ?? "minutos"} onMin={(v: any) => patch({ onset_min_value: v })} onMax={(v: any) => patch({ onset_max_value: v })} onUnit={(v: any) => patch({ onset_unit: v })} defaultUnit="minutos" />
              <TimeRange label="Come-up" vMin={f.comeup_min_value} vMax={f.comeup_max_value} unit={f.comeup_unit ?? "minutos"} onMin={(v: any) => patch({ comeup_min_value: v })} onMax={(v: any) => patch({ comeup_max_value: v })} onUnit={(v: any) => patch({ comeup_unit: v })} defaultUnit="minutos" />
              <TimeRange label="Pico" vMin={f.peak_min_value} vMax={f.peak_max_value} unit={f.peak_unit} onMin={(v: any) => patch({ peak_min_value: v })} onMax={(v: any) => patch({ peak_max_value: v })} onUnit={(v: any) => patch({ peak_unit: v })} />
              <TimeRange label="Platô" vMin={f.plateau_min_value} vMax={f.plateau_max_value} unit={f.plateau_unit} onMin={(v: any) => patch({ plateau_min_value: v })} onMax={(v: any) => patch({ plateau_max_value: v })} onUnit={(v: any) => patch({ plateau_unit: v })} />
              <TimeRange label="Offset/Descida" vMin={f.offset_min_value} vMax={f.offset_max_value} unit={f.offset_unit} onMin={(v: any) => patch({ offset_min_value: v })} onMax={(v: any) => patch({ offset_max_value: v })} onUnit={(v: any) => patch({ offset_unit: v })} />
              <TimeRange label="Duração total" vMin={f.total_duration_min_value} vMax={f.total_duration_max_value} unit={f.total_duration_unit} onMin={(v: any) => patch({ total_duration_min_value: v })} onMax={(v: any) => patch({ total_duration_max_value: v })} onUnit={(v: any) => patch({ total_duration_unit: v })} />
              <TimeRange label="Residual" vMin={f.residual_min_value} vMax={f.residual_max_value} unit={f.residual_unit} onMin={(v: any) => patch({ residual_min_value: v })} onMax={(v: any) => patch({ residual_max_value: v })} onUnit={(v: any) => patch({ residual_unit: v })} />
            </TabsContent>

            <TabsContent value="dose" className="space-y-3 mt-0">
              <div className="grid sm:grid-cols-2 gap-3">
                <F label="Unidade padrão"><Input value={f.dose_unit_default ?? ""} onChange={(e) => patch({ dose_unit_default: e.target.value })} /></F>
                <F label="Via padrão"><Input value={f.default_route ?? ""} onChange={(e) => patch({ default_route: e.target.value })} /></F>
                <F label="Vias disponíveis"><ChipInput value={f.available_routes} onChange={(v) => patch({ available_routes: v })} suggestions={["oral","sublingual","intranasal","inalatória","transdérmica","IV","IM","SC","retal"]} /></F>
                <F label="Formulação padrão"><Select value={f.default_formulation} onChange={(v: any) => patch({ default_formulation: v })} options={FORMULATIONS} /></F>
              </div>
              <F label="Formulações disponíveis"><ChipInput value={f.available_formulations} onChange={(v) => patch({ available_formulations: v })} suggestions={FORMULATIONS} /></F>
              <div className="grid sm:grid-cols-3 gap-2">
                <F label="Dose baixa min"><Input type="number" value={f.dose_low_min ?? ""} onChange={(e) => patch({ dose_low_min: e.target.value === "" ? null : Number(e.target.value) })} /></F>
                <F label="Dose baixa máx"><Input type="number" value={f.dose_low_max ?? ""} onChange={(e) => patch({ dose_low_max: e.target.value === "" ? null : Number(e.target.value) })} /></F>
                <F label="Dose usual min"><Input type="number" value={f.dose_usual_min ?? ""} onChange={(e) => patch({ dose_usual_min: e.target.value === "" ? null : Number(e.target.value) })} /></F>
                <F label="Dose usual máx"><Input type="number" value={f.dose_usual_max ?? ""} onChange={(e) => patch({ dose_usual_max: e.target.value === "" ? null : Number(e.target.value) })} /></F>
                <F label="Dose alta min"><Input type="number" value={f.dose_high_min ?? ""} onChange={(e) => patch({ dose_high_min: e.target.value === "" ? null : Number(e.target.value) })} /></F>
                <F label="Dose alta máx"><Input type="number" value={f.dose_high_max ?? ""} onChange={(e) => patch({ dose_high_max: e.target.value === "" ? null : Number(e.target.value) })} /></F>
                <F label="Dose máx recomendada"><Input type="number" value={f.dose_max_recommended ?? ""} onChange={(e) => patch({ dose_max_recommended: e.target.value === "" ? null : Number(e.target.value) })} /></F>
              </div>
              <F label="Notas de dose"><Textarea rows={2} value={f.dose_notes ?? ""} onChange={(e) => patch({ dose_notes: e.target.value })} /></F>
              <F label="Titulação"><Textarea rows={2} value={f.titration_notes ?? ""} onChange={(e) => patch({ titration_notes: e.target.value })} /></F>
              <F label="Ajuste renal"><Textarea rows={2} value={f.renal_adjustment_notes ?? ""} onChange={(e) => patch({ renal_adjustment_notes: e.target.value })} /></F>
              <F label="Ajuste hepático"><Textarea rows={2} value={f.hepatic_adjustment_notes ?? ""} onChange={(e) => patch({ hepatic_adjustment_notes: e.target.value })} /></F>
            </TabsContent>

            <TabsContent value="food" className="space-y-3 mt-0">
              <F label="Estômago vazio — efeito"><Input value={f.empty_stomach_effect ?? ""} onChange={(e) => patch({ empty_stomach_effect: e.target.value })} /></F>
              <F label="Refeição gordurosa — efeito"><Input value={f.high_fat_meal_effect ?? ""} onChange={(e) => patch({ high_fat_meal_effect: e.target.value })} /></F>
              <div className="grid sm:grid-cols-2 gap-3">
                <F label="Atraso de onset por alimento — min (minutos)"><Input type="number" value={f.food_delay_onset_minutes_min ?? ""} onChange={(e) => patch({ food_delay_onset_minutes_min: e.target.value === "" ? null : Number(e.target.value) })} /></F>
                <F label="Atraso de onset por alimento — máx (minutos)"><Input type="number" value={f.food_delay_onset_minutes_max ?? ""} onChange={(e) => patch({ food_delay_onset_minutes_max: e.target.value === "" ? null : Number(e.target.value) })} /></F>
              </div>
              <F label="Notas de alimento"><Textarea rows={2} value={f.food_effect_notes ?? ""} onChange={(e) => patch({ food_effect_notes: e.target.value })} /></F>
              <F label="Interação com cafeína"><Textarea rows={2} value={f.caffeine_interaction_notes ?? ""} onChange={(e) => patch({ caffeine_interaction_notes: e.target.value })} /></F>
              <F label="Interação com álcool"><Textarea rows={2} value={f.alcohol_interaction_notes ?? ""} onChange={(e) => patch({ alcohol_interaction_notes: e.target.value })} /></F>
              <F label="Privação de sono"><Textarea rows={2} value={f.sleep_deprivation_risk_notes ?? ""} onChange={(e) => patch({ sleep_deprivation_risk_notes: e.target.value })} /></F>
            </TabsContent>

            <TabsContent value="enz" className="space-y-3 mt-0">
              <F label="CYP substrato"><ChipInput value={f.cyp_substrate} onChange={(v) => patch({ cyp_substrate: v })} suggestions={CYP_LIST} /></F>
              <F label="CYP inibidor"><ChipInput value={f.cyp_inhibitor} onChange={(v) => patch({ cyp_inhibitor: v })} suggestions={CYP_LIST} /></F>
              <F label="CYP indutor"><ChipInput value={f.cyp_inducer} onChange={(v) => patch({ cyp_inducer: v })} suggestions={CYP_LIST} /></F>
              <F label="UGT substrato"><ChipInput value={f.ugt_substrate} onChange={(v) => patch({ ugt_substrate: v })} /></F>
              <F label="UGT inibidor"><ChipInput value={f.ugt_inhibitor} onChange={(v) => patch({ ugt_inhibitor: v })} /></F>
              <F label="Transportadores substrato"><ChipInput value={f.transporter_substrate} onChange={(v) => patch({ transporter_substrate: v })} suggestions={["P-gp","OCT","OATP","BCRP"]} /></F>
              <F label="Transportadores inibidor"><ChipInput value={f.transporter_inhibitor} onChange={(v) => patch({ transporter_inhibitor: v })} suggestions={["P-gp"]} /></F>
            </TabsContent>

            <TabsContent value="inter" className="space-y-3 mt-0">
              <div className="text-xs text-muted-foreground">Regras adicionais como JSON livre. O engine global usa classes e perfis automaticamente — aqui você documenta exceções/observações.</div>
              <F label="Regras de interação (JSON)"><Textarea rows={4} value={JSON.stringify(f.interaction_rules ?? [], null, 2)} onChange={(e) => { try { patch({ interaction_rules: JSON.parse(e.target.value || "[]") }); } catch {} }} /></F>
              <F label="Contraindicações (JSON)"><Textarea rows={3} value={JSON.stringify(f.contraindication_rules ?? [], null, 2)} onChange={(e) => { try { patch({ contraindication_rules: JSON.parse(e.target.value || "[]") }); } catch {} }} /></F>
              <F label="Monitorização (JSON)"><Textarea rows={3} value={JSON.stringify(f.monitoring_rules ?? [], null, 2)} onChange={(e) => { try { patch({ monitoring_rules: JSON.parse(e.target.value || "[]") }); } catch {} }} /></F>
            </TabsContent>

            <TabsContent value="risk" className="space-y-3 mt-0">
              <F label="Alertas importantes"><ChipInput value={f.major_warnings} onChange={(v) => patch({ major_warnings: v })} /></F>
              <F label="Black box warnings"><ChipInput value={f.black_box_warnings} onChange={(v) => patch({ black_box_warnings: v })} /></F>
              <F label="Eventos adversos comuns"><ChipInput value={f.common_adverse_effects} onChange={(v) => patch({ common_adverse_effects: v })} /></F>
              <F label="Eventos adversos graves"><ChipInput value={f.serious_adverse_effects} onChange={(v) => patch({ serious_adverse_effects: v })} /></F>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  ["cardiovascular_risk_level","Cardiovascular"],
                  ["seizure_risk_level","Convulsivo"],
                  ["psychosis_mania_risk_level","Psicose/Mania"],
                  ["respiratory_depression_risk_level","Depressão respiratória"],
                  ["serotonin_syndrome_risk_level","Serotoninérgico"],
                  ["qt_risk_level","QT"],
                  ["metabolic_risk_level","Metabólico"],
                  ["cognitive_impairment_risk_level","Cognitivo"],
                  ["sedation_risk_level","Sedativo"],
                  ["insomnia_risk_level","Insônia"],
                  ["abuse_risk_level","Abuso"],
                ].map(([k,l]) => (
                  <F key={k} label={l}><Select value={f[k]} onChange={(v: any) => patch({ [k]: v })} options={RISK_LEVELS} /></F>
                ))}
              </div>
              <F label="Notas de segurança"><Textarea rows={3} value={f.safety_notes ?? ""} onChange={(e) => patch({ safety_notes: e.target.value })} /></F>
            </TabsContent>

            <TabsContent value="eff" className="space-y-4 mt-0">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Efeitos terapêuticos (0–100)</div>
                <AxisSliders axes={BENEFIT_AXES} value={f.clinical_effect_profile} onChange={(v) => patch({ clinical_effect_profile: v })} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Efeitos adversos / riscos (0–100)</div>
                <AxisSliders axes={ADVERSE_AXES} value={f.adverse_effect_profile} onChange={(v) => patch({ adverse_effect_profile: v })} />
              </div>
            </TabsContent>

            <TabsContent value="src" className="space-y-3 mt-0">
              <F label="Referências (JSON)"><Textarea rows={4} value={JSON.stringify(f.source_references ?? [], null, 2)} onChange={(e) => { try { patch({ source_references: JSON.parse(e.target.value || "[]") }); } catch {} }} /></F>
              <F label="Observações de fonte"><Textarea rows={3} value={f.source_notes ?? ""} onChange={(e) => patch({ source_notes: e.target.value })} /></F>
              <div className="grid sm:grid-cols-2 gap-3">
                <F label="Revisado por"><Input value={f.reviewed_by ?? ""} onChange={(e) => patch({ reviewed_by: e.target.value })} /></F>
                <F label="Última revisão"><Input type="datetime-local" value={f.last_reviewed_at ? new Date(f.last_reviewed_at).toISOString().slice(0,16) : ""} onChange={(e) => patch({ last_reviewed_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></F>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="border-t px-5 py-3 flex items-center justify-between gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px]">{f.review_status ?? "não revisada"}</Badge>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}><Save className="h-3.5 w-3.5 mr-1.5" />Salvar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
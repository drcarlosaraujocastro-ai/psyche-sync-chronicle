import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, FlaskConical } from "lucide-react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function fmtRange(min?: number | null, max?: number | null, unit?: string | null) {
  if (min == null && max == null) return null;
  const u = unit ?? "";
  if (min != null && max != null && min !== max) return `${min}–${max} ${u}`;
  return `${min ?? max} ${u}`;
}

export function PharmacologyExplainer({ substance, open, onOpenChange }: { substance: any | null; open: boolean; onOpenChange: (b: boolean) => void }) {
  const s = substance ?? {};
  const onset = fmtRange(s.onset_min_value, s.onset_max_value, s.onset_unit);
  const peak = fmtRange(s.peak_min_value, s.peak_max_value, s.peak_unit);
  const duration = fmtRange(s.total_duration_min_value, s.total_duration_max_value, s.total_duration_unit);
  const halfLife = fmtRange(s.half_life_min_value, s.half_life_max_value, s.half_life_unit);
  const ss = fmtRange(s.steady_state_min_value, s.steady_state_max_value, s.steady_state_unit);
  const tail = fmtRange(s.tail_min_value, s.tail_max_value, s.tail_unit);

  const benefitTop = useMemo(() => Object.entries(s.clinical_effect_profile ?? {}).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 5), [s]);
  const adverseTop = useMemo(() => Object.entries(s.adverse_effect_profile ?? {}).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 5), [s]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 max-h-[92vh] flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            <span>Farmacologia — {s.name ?? "—"}</span>
          </DialogTitle>
          <div className="text-[11px] text-warning flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" /> Apoio clínico. Curva relativa 0–100, não concentração sérica. Revisão médica obrigatória.</div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <Tabs defaultValue="rapido" className="px-5 py-4">
            <TabsList>
              <TabsTrigger value="rapido">Rápido</TabsTrigger>
              <TabsTrigger value="clinico">Clínico</TabsTrigger>
              <TabsTrigger value="avancado">Avançado</TabsTrigger>
            </TabsList>

            <TabsContent value="rapido" className="space-y-3 pt-3">
              <Section title="Classe">{s.clinical_category ?? s.pharmacological_class ?? "—"}</Section>
              <Section title="Mecanismo (resumo)">{s.mechanism_summary ?? "Não preenchido."}</Section>
              <Section title="Curva">
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {onset && <Badge variant="secondary">onset {onset}</Badge>}
                  {peak && <Badge variant="secondary">pico {peak}</Badge>}
                  {duration && <Badge variant="secondary">duração {duration}</Badge>}
                  {halfLife && <Badge variant="secondary">t½ {halfLife}</Badge>}
                  {ss && <Badge variant="secondary">steady-state {ss}</Badge>}
                  {tail && <Badge variant="secondary">cauda {tail}</Badge>}
                  {!onset && !peak && !duration && <span className="text-muted-foreground">Parâmetros não preenchidos.</span>}
                </div>
              </Section>
              <Section title="Riscos principais">
                <div className="flex flex-wrap gap-1.5">
                  {adverseTop.length > 0
                    ? adverseTop.map(([k, v]) => <Badge key={k} variant="outline">{k} · {String(v)}</Badge>)
                    : <span className="text-muted-foreground text-xs">—</span>}
                </div>
              </Section>
            </TabsContent>

            <TabsContent value="clinico" className="space-y-3 pt-3">
              <Section title="Farmacocinética">
                <ul className="text-xs space-y-0.5 list-disc pl-5">
                  {onset && <li>Onset: {onset}</li>}
                  {peak && <li>Pico: {peak}</li>}
                  {halfLife && <li>Meia-vida: {halfLife}</li>}
                  {ss && <li>Steady-state: {ss}</li>}
                  {tail && <li>Cauda residual: {tail}</li>}
                  {s.prodrug_status && <li>Pró-fármaco — bioativação: {s.bioactivation_site ?? "ver bula"}{s.active_moiety ? ` · molécula ativa: ${s.active_moiety}` : ""}</li>}
                  {s.food_effect && <li>Alimento: {s.food_effect}</li>}
                  {s.protein_binding_percent != null && <li>Ligação proteica: {s.protein_binding_percent}%</li>}
                  {Array.isArray(s.cyp_substrate) && s.cyp_substrate.length > 0 && <li>CYP substrato: {s.cyp_substrate.join(", ")}</li>}
                  {Array.isArray(s.cyp_inhibitor) && s.cyp_inhibitor.length > 0 && <li>CYP inibidor: {s.cyp_inhibitor.join(", ")}</li>}
                  {Array.isArray(s.cyp_inducer) && s.cyp_inducer.length > 0 && <li>CYP indutor: {s.cyp_inducer.join(", ")}</li>}
                </ul>
              </Section>
              <Section title="Eixos terapêuticos">
                <div className="flex flex-wrap gap-1.5">
                  {benefitTop.length > 0
                    ? benefitTop.map(([k, v]) => <Badge key={k} variant="secondary">{k} · {String(v)}</Badge>)
                    : <span className="text-muted-foreground text-xs">—</span>}
                </div>
              </Section>
              <Section title="Eixos adversos">
                <div className="flex flex-wrap gap-1.5">
                  {adverseTop.length > 0
                    ? adverseTop.map(([k, v]) => <Badge key={k} variant="outline">{k} · {String(v)}</Badge>)
                    : <span className="text-muted-foreground text-xs">—</span>}
                </div>
              </Section>
              {Array.isArray(s.monitoring_profile) && s.monitoring_profile.length > 0 && (
                <Section title="Monitorização">
                  <ul className="text-xs space-y-0.5 list-disc pl-5">{s.monitoring_profile.map((m: string) => <li key={m}>{m}</li>)}</ul>
                </Section>
              )}
              {s.safety_notes && <Section title="Segurança">{s.safety_notes}</Section>}
            </TabsContent>

            <TabsContent value="avancado" className="space-y-3 pt-3">
              <Section title="Receptores / transportadores">
                {Array.isArray(s.receptor_profile) && s.receptor_profile.length > 0 ? (
                  <ul className="text-xs space-y-1">
                    {s.receptor_profile.map((r: any, i: number) => (
                      <li key={i} className="flex flex-wrap gap-1.5 items-center">
                        <Badge variant="secondary">{r.target}</Badge>
                        <span className="text-muted-foreground">{r.action_type}</span>
                        {r.clinical_relevance && <span className="text-[10px] text-muted-foreground">· relevância {r.clinical_relevance}</span>}
                        {r.notes && <span className="text-[10px] text-muted-foreground">· {r.notes}</span>}
                      </li>
                    ))}
                  </ul>
                ) : <span className="text-muted-foreground text-xs">Perfil de receptor não preenchido.</span>}
              </Section>
              <Section title="Tolerância / abstinência / abuso">
                <ul className="text-xs space-y-0.5 list-disc pl-5">
                  {s.tolerance_profile && <li>Tolerância: {s.tolerance_profile}</li>}
                  {s.withdrawal_profile && <li>Abstinência: {s.withdrawal_profile}</li>}
                  {s.abuse_liability && <li>Abuse liability: {s.abuse_liability}</li>}
                  {s.abuse_risk_level && <li>Nível de abuso: {s.abuse_risk_level}</li>}
                  {!s.tolerance_profile && !s.withdrawal_profile && !s.abuse_liability && !s.abuse_risk_level && <li className="text-muted-foreground list-none">Não preenchido.</li>}
                </ul>
              </Section>
              <Section title="Interação contextual">
                <ul className="text-xs space-y-0.5 list-disc pl-5">
                  {s.caffeine_interaction_notes && <li>Cafeína: {s.caffeine_interaction_notes}</li>}
                  {s.alcohol_interaction_notes && <li>Álcool: {s.alcohol_interaction_notes}</li>}
                  {s.sleep_deprivation_risk_notes && <li>Privação de sono: {s.sleep_deprivation_risk_notes}</li>}
                  {!s.caffeine_interaction_notes && !s.alcohol_interaction_notes && !s.sleep_deprivation_risk_notes && <li className="text-muted-foreground list-none">Sem notas contextuais.</li>}
                </ul>
              </Section>
              <Section title="Confiança / fonte">
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {s.confidence && <Badge variant="outline">confiança {s.confidence}</Badge>}
                  {s.source_type && <Badge variant="outline">fonte {s.source_type}</Badge>}
                  {s.needs_review !== false && <Badge variant="outline">requer revisão clínica</Badge>}
                </div>
              </Section>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/clinical/PageHeader";
import { ReviewNote } from "@/components/clinical/ReviewNote";
import { SessionDoseRecorder } from "@/components/clinical/SessionDoseRecorder";
import { DoseLogManager } from "@/components/clinical/DoseLogManager";
import { MedicationForecastPanel } from "@/components/clinical/MedicationForecastPanel";
import { ClinicalHypothesisPanel } from "@/components/clinical/ClinicalHypothesisPanel";
import { PhenomenologyPanel } from "@/components/clinical/PhenomenologyPanel";
import { RelevanceBadge } from "@/components/clinical/PhaseBadge";
import { AdvancedCurveExplorer } from "@/components/clinical/AdvancedCurveExplorer";
import { LocalClinicalCopilotPanel } from "@/components/clinical/LocalClinicalCopilotPanel";
import { runAudit } from "@/domain/auditEngine";
import { runInteractionEngine } from "@/domain/interactionEngine";
import { fmtDate } from "@/lib/format";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function SessionView() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { data: s } = useQuery({
    queryKey: ["session", id], enabled: !!id,
    queryFn: async () => (await supabase.from("clinical_sessions").select("*, patients(*)").eq("id", id!).maybeSingle()).data,
  });
  const { data: doses = [] } = useQuery({
    queryKey: ["session-doses", id], enabled: !!id,
    queryFn: async () => (await (supabase as any).from("medication_dose_logs").select("*, substances(*), substance_formulations(*)").eq("session_id", id!).order("actual_time")).data ?? [],
  });
  const { data: subUse = [] } = useQuery({
    queryKey: ["session-subuse", id], enabled: !!id,
    queryFn: async () => (await supabase.from("substance_use_logs").select("*").eq("session_id", id!).order("used_at")).data ?? [],
  });
  const { data: meds = [] } = useQuery({
    queryKey: ["session-meds", id, s?.patient_id], enabled: !!s?.patient_id,
    queryFn: async () => (await supabase.from("patient_medications").select("*, substances(*)").eq("patient_id", s!.patient_id).eq("status", "ativo")).data ?? [],
  });
  const { data: symptoms = [] } = useQuery({
    queryKey: ["session-symptoms", id], enabled: !!id,
    queryFn: async () => (await supabase.from("symptom_measurements").select("*").eq("session_id", id!).order("measured_at")).data ?? [],
  });
  const { data: checkins = [] } = useQuery({
    queryKey: ["session-checkins", id], enabled: !!id,
    queryFn: async () => (await (supabase as any).from("session_checkins").select("*").eq("session_id", id!).order("checkin_at", { ascending: false })).data ?? [],
  });
  const { data: respProfiles = [] } = useQuery({
    queryKey: ["resp-profiles", s?.patient_id], enabled: !!s?.patient_id,
    queryFn: async () => (await (supabase as any).from("patient_substance_response_profiles").select("*").eq("patient_id", s!.patient_id)).data ?? [],
  });
  const { data: inventory = [] } = useQuery({
    queryKey: ["session-inventory", s?.patient_id], enabled: !!s?.patient_id,
    queryFn: async () => (await (supabase as any).from("medication_inventory").select("*, patient_medications(*, substances(name))").eq("patient_id", s!.patient_id)).data ?? [],
  });
  const { data: substanceCatalog = [] } = useQuery({
    queryKey: ["substances"],
    queryFn: async () => (await supabase.from("substances").select("*")).data ?? [],
  });

  const [form, setForm] = useState<any>({});
  useEffect(() => { if (s) setForm(s); }, [s]);

  if (!s) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  async function save() {
    const { id: _i, patients: _p, owner_id: _o, created_at: _c, updated_at: _u, ...payload } = form;
    const { error } = await supabase.from("clinical_sessions").update(payload).eq("id", id!);
    if (error) return toast.error(error.message);
    toast.success("Sessão salva");
    qc.invalidateQueries({ queryKey: ["session", id] });
  }

  const audit = runAudit({ patient: s.patients, session: s, doses, symptoms, medications: meds });
  const interactions = runInteractionEngine({
    activeMedications: meds.map((m: any) => ({ name: m.substances?.name ?? m.free_text_name ?? "" })),
    recentDoses: doses.map((d: any) => ({ substanceName: d.substance_name, actualTime: d.actual_time, logType: d.log_type, doseAmount: d.dose_amount, caffeineMg: d.caffeine_near_dose_mg ?? d.caffeine_amount, sleepDeprivation: d.sleep_deprivation_at_dose_0_10 })),
    recentSubstanceUse: subUse.map((u: any) => ({ substanceName: u.substance_name, usedAt: u.used_at })),
    sessionContext: { sleepHours: s.sleep_hours, caffeine: s.caffeine, suicideRisk: s.patients?.suicide_risk },
  });
  return (
    <div className="space-y-6">
      <PageHeader title={s.name} description={`${s.patients?.full_name} • ${s.session_type} • ${fmtDate(s.session_at)}`}
        actions={<Button onClick={save}>Salvar sessão</Button>}
      />
      <ReviewNote />
      <MedicationForecastPanel
        patient={s.patients}
        session={s}
        medications={meds}
        doses={doses as any}
        substances={substanceCatalog as any}
        checkins={checkins}
        responseProfiles={respProfiles}
        inventory={inventory}
      />
      <ClinicalHypothesisPanel
        patient={s.patients}
        session={s}
        medications={meds as any}
        doses={doses as any}
        checkins={checkins as any}
        substanceUse={subUse as any}
      />
      <PhenomenologyPanel
        patient={s.patients}
        medications={meds as any}
        doses={doses as any}
        checkins={checkins as any}
        sessions={[s]}
        substanceUse={subUse as any}
        periodDays={1}
      />
      <Tabs defaultValue="resumo">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="doses">Doses ({doses.length})</TabsTrigger>
          <TabsTrigger value="sub">Substâncias ({subUse.length})</TabsTrigger>
          <TabsTrigger value="sym">Sintomas ({symptoms.length})</TabsTrigger>
          <TabsTrigger value="curves">Curvas</TabsTrigger>
          <TabsTrigger value="inter">Interações ({interactions.length})</TabsTrigger>
          <TabsTrigger value="audit">Auditoria ({audit.score})</TabsTrigger>
          <TabsTrigger value="copilot">Copiloto local</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="pt-4">
          <Card className="p-4 grid md:grid-cols-2 gap-4">
            <Field label="Status">
              <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.status ?? "aberta"} onChange={(e) => set("status", e.target.value)}>
                {["aberta","fechada","revisada","arquivada"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Tipo">
              <Input value={form.session_type ?? ""} onChange={(e) => set("session_type", e.target.value)} />
            </Field>
            <Field label="Queixa da sessão"><Textarea value={form.complaint ?? ""} onChange={(e) => set("complaint", e.target.value)} /></Field>
            <Field label="Objetivo terapêutico"><Textarea value={form.therapeutic_goal ?? ""} onChange={(e) => set("therapeutic_goal", e.target.value)} /></Field>
            <Field label="Estado basal"><Textarea value={form.baseline_state ?? ""} onChange={(e) => set("baseline_state", e.target.value)} /></Field>
            <Field label="Narrativa do paciente"><Textarea value={form.patient_narrative ?? ""} onChange={(e) => set("patient_narrative", e.target.value)} /></Field>
            <Field label="Observação médica"><Textarea value={form.physician_observation ?? ""} onChange={(e) => set("physician_observation", e.target.value)} /></Field>
            <Field label="Conduta"><Textarea value={form.conduct ?? ""} onChange={(e) => set("conduct", e.target.value)} /></Field>
            <Field label="Horas de sono"><Input type="number" step="0.5" value={form.sleep_hours ?? ""} onChange={(e) => set("sleep_hours", e.target.value ? Number(e.target.value) : null)} /></Field>
            <Field label="Qualidade sono 0–10"><Input type="number" min={0} max={10} value={form.sleep_quality ?? ""} onChange={(e) => set("sleep_quality", e.target.value ? Number(e.target.value) : null)} /></Field>
            <Field label="Cafeína"><Input value={form.caffeine ?? ""} onChange={(e) => set("caffeine", e.target.value)} /></Field>
            <Field label="Próxima revisão"><Input type="date" value={form.next_review ?? ""} onChange={(e) => set("next_review", e.target.value || null)} /></Field>
          </Card>
        </TabsContent>

        <TabsContent value="doses" className="pt-4 space-y-4">
          <SessionDoseRecorder patientId={s.patient_id} sessionId={s.id} onSaved={() => qc.invalidateQueries({ queryKey: ["session-doses", id] })} />
          <DoseLogManager
            doses={doses as any[]}
            patientId={s.patient_id}
            sessionId={s.id}
            onChanged={() => qc.invalidateQueries({ queryKey: ["session-doses", id] })}
          />
        </TabsContent>

        <TabsContent value="sub" className="pt-4">
          <Card className="p-4">
            {subUse.length === 0 ? <div className="text-sm text-muted-foreground">Nenhum uso registrado nesta sessão.</div> : (
              <ul className="divide-y text-sm">
                {subUse.map((u: any) => (
                  <li key={u.id} className="py-2 flex justify-between">
                    <span>{u.substance_name}</span>
                    <span className="text-xs text-muted-foreground">craving {u.craving_after ?? "—"} • {fmtDate(u.used_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="sym" className="pt-4">
          <Card className="p-4">
            {symptoms.length === 0 ? <div className="text-sm text-muted-foreground">Nenhuma medição.</div> : (
              <ul className="divide-y text-sm">
                {symptoms.map((m: any) => (
                  <li key={m.id} className="py-2 flex justify-between">
                    <span>{m.symptom_name}</span>
                    <span className="text-xs text-muted-foreground">{m.intensity_0_10 ?? "—"}/10 • {fmtDate(m.measured_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="curves" className="pt-4">
          <AdvancedCurveExplorer
            doses={doses as any}
            title="Curva da sessão: substâncias, sobreposição e carga total"
            description="Use Expandir para gráfico grande. Desmarque substâncias para isolar curvas. Tooltip mostra intensidade 0–100, fase e carga total em cada horário."
          />
        </TabsContent>

        <TabsContent value="inter" className="pt-4">
          <Card className="p-4">
            {interactions.length === 0 ? <div className="text-sm text-muted-foreground">Sem interações contextuais relevantes.</div> : (
              <ul className="space-y-3">
                {interactions.map((it, i) => (
                  <li key={i} className="border-l-2 border-warning pl-3">
                    <div className="flex items-center gap-2"><RelevanceBadge relevance={it.relevance} /><span className="text-sm font-medium">{it.summary}</span></div>
                    {it.mechanism && <div className="text-xs text-muted-foreground mt-1">{it.mechanism}</div>}
                    {it.monitor && <div className="text-xs mt-1">Monitorar: {it.monitor.join(", ")}</div>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="pt-4">
          <Card className="p-4">
            <div className="flex justify-between mb-2"><div className="text-sm font-medium">Auditoria de dados clínicos</div><div className="font-mono">{audit.score}/100</div></div>
            {audit.findings.length === 0 ? <div className="text-sm text-success">Sem pendências.</div> : (
              <ul className="space-y-1 text-sm">
                {audit.findings.map((f, i) => <li key={i}><span className="text-xs uppercase tracking-wide text-muted-foreground mr-2">{f.domain}</span>{f.message}</li>)}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="copilot" className="pt-4 space-y-4">
          <LocalClinicalCopilotPanel
            patient={s.patients}
            medications={meds as any}
            doses={doses as any}
            checkins={checkins as any}
            sessions={[s]}
            substanceUse={subUse as any}
            inventory={inventory as any}
            periodDays={7}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>;
}
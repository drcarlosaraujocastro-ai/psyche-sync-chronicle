import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePatients } from "@/lib/usePatients";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/clinical/PageHeader";
import { ReviewNote } from "@/components/clinical/ReviewNote";
import { EmptyState } from "@/components/clinical/EmptyState";
import { runAudit } from "@/domain/auditEngine";
import { runInteractionEngine } from "@/domain/interactionEngine";
import { buildClinicalPharmacologyReport } from "@/lib/clinical/clinicalReportEngine";
import { PhenomenologyPanel } from "@/components/clinical/PhenomenologyPanel";
import { toast } from "sonner";
import { FileText, Download, Printer, Save, Copy, ShieldAlert, Brain, Pill, Activity, ClipboardList } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { withOwner } from "@/lib/supabase/withOwner";

const reportTypes = [
  ["farmaco_fenomenologico", "PK/PD + Fenomenologia"],
  ["sessao", "Sessão"],
  ["longitudinal", "Longitudinal"],
  ["farmacologico", "Farmacológico"],
  ["adesao_estoque", "Adesão + Estoque"],
  ["substancias_tus", "Substâncias / TUS"],
  ["seguranca", "Segurança"],
  ["revisao_medica", "Revisão médica"],
];

export default function Reports() {
  const { user } = useAuth();
  const { data: patients = [] } = usePatients();
  const [patientId, setPatientId] = useState("");
  const [reportType, setReportType] = useState<string>("farmaco_fenomenologico");
  const [sessionId, setSessionId] = useState<string>("");
  const [periodDays, setPeriodDays] = useState<number>(30);

  const sinceIso = useMemo(() => new Date(Date.now() - periodDays * 24 * 3600_000).toISOString(), [periodDays]);

  const { data: p } = useQuery({
    queryKey: ["rep-p", patientId],
    enabled: !!patientId,
    queryFn: async () => (await supabase.from("patients").select("*").eq("id", patientId).maybeSingle()).data,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["rep-s", patientId, periodDays],
    enabled: !!patientId,
    queryFn: async () => (await supabase.from("clinical_sessions").select("*").eq("patient_id", patientId).gte("session_at", sinceIso).order("session_at", { ascending: false }).limit(60)).data ?? [],
  });

  const selectedSession = useMemo(() => sessions.find((s: any) => s.id === sessionId) ?? sessions[0], [sessions, sessionId]);

  const { data: meds = [] } = useQuery({
    queryKey: ["rep-m", patientId],
    enabled: !!patientId,
    queryFn: async () => (await supabase.from("patient_medications").select("*, substances(name,generic_name)").eq("patient_id", patientId)).data ?? [],
  });

  const { data: doses = [] } = useQuery({
    queryKey: ["rep-d", patientId, periodDays],
    enabled: !!patientId,
    queryFn: async () => (await supabase.from("medication_dose_logs").select("*").eq("patient_id", patientId).gte("actual_time", sinceIso).order("actual_time", { ascending: false }).limit(250)).data ?? [],
  });

  const { data: subUse = [] } = useQuery({
    queryKey: ["rep-u", patientId, periodDays],
    enabled: !!patientId,
    queryFn: async () => (await (supabase as any).from("substance_use_logs").select("*").eq("patient_id", patientId).gte("used_at", sinceIso).order("used_at", { ascending: false }).limit(150)).data ?? [],
  });

  const { data: checkins = [] } = useQuery({
    queryKey: ["rep-c", patientId, periodDays],
    enabled: !!patientId,
    queryFn: async () => (await (supabase as any).from("session_checkins").select("*").eq("patient_id", patientId).gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(250)).data ?? [],
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["rep-prof", patientId],
    enabled: !!patientId,
    queryFn: async () => (await (supabase as any).from("patient_substance_response_profiles").select("*").eq("patient_id", patientId)).data ?? [],
  });

  const { data: tgsym = [] } = useQuery({
    queryKey: ["rep-t", patientId],
    enabled: !!patientId,
    queryFn: async () => (await supabase.from("patient_target_symptoms").select("*").eq("patient_id", patientId)).data ?? [],
  });

  const { data: substances = [] } = useQuery({
    queryKey: ["rep-substances"],
    queryFn: async () => (await supabase.from("substances").select("*")).data ?? [],
  });

  const { data: formulations = [] } = useQuery({
    queryKey: ["rep-formulations", patientId],
    enabled: !!patientId,
    queryFn: async () => (await (supabase as any).from("substance_formulations").select("*")).data ?? [],
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["rep-inventory", patientId],
    enabled: !!patientId,
    queryFn: async () => (await (supabase as any).from("medication_inventory").select("*").eq("patient_id", patientId)).data ?? [],
  });

  const audit = p ? runAudit({ patient: p, session: selectedSession, doses, medications: meds, targetSymptoms: tgsym }) : null;
  const interactions = p ? runInteractionEngine({
    activeMedications: meds.map((m: any) => ({ name: m.substances?.name ?? m.free_text_name ?? m.brand_name ?? "" })),
    recentDoses: doses.map((d: any) => ({ substanceName: d.substance_name, actualTime: d.actual_time })),
    recentSubstanceUse: subUse.map((s: any) => ({ substanceName: s.substance_name, usedAt: s.used_at })),
    sessionContext: { sleepHours: selectedSession?.sleep_hours, caffeineTotalMg: (selectedSession as any)?.caffeine_total_mg },
  }) : [];

  const report = useMemo(() => {
    if (!p) return null;
    return buildClinicalPharmacologyReport({
      reportType,
      patient: p,
      sessions,
      selectedSession,
      medications: meds,
      doses,
      substanceUse: subUse,
      checkins,
      individualProfiles: profiles,
      targetSymptoms: tgsym,
      substances,
      formulations,
      inventory,
      audit,
      interactions,
      periodDays,
    });
  }, [p, reportType, sessions, selectedSession, meds, doses, subUse, checkins, profiles, tgsym, substances, formulations, inventory, audit, interactions, periodDays]);

  function download(name: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    if (!report || !p) return;
    download(`relatorio-${p.full_name.replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(report.structuredData, null, 2), "application/json");
    toast.success("JSON exportado.");
  }

  function exportMarkdown() {
    if (!report || !p) return;
    download(`relatorio-${p.full_name.replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.md`, report.markdown, "text/markdown;charset=utf-8");
    toast.success("Markdown exportado.");
  }

  async function saveReport() {
    if (!user || !p || !report) return;
    const { error } = await (supabase as any).from("clinical_reports").insert(withOwner({
      patient_id: p.id,
      title: report.title,
      payload: report.structuredData,
      period_start: sinceIso,
      period_end: new Date().toISOString(),
    }, user));
    if (error) return toast.error(error.message || "Não foi possível salvar. Verifique a tabela clinical_reports.");
    toast.success("Relatório salvo no histórico clínico.");
  }

  async function copyText() {
    if (!report) return;
    await navigator.clipboard.writeText(report.markdown);
    toast.success("Relatório copiado em Markdown.");
  }

  const severityClass = (s?: string) => s === "high" ? "border-destructive/40 bg-destructive/5" : s === "warn" ? "border-amber-400/40 bg-amber-50/50 dark:bg-amber-950/10" : "";

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios clínico-farmacológicos" description="Relatório automático com curva PK/PD, doses reais, check-ins, hipóteses, adesão, estoque, riscos, exames e lacunas de dados." />
      <ReviewNote />

      <Card className="p-4 no-print">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Paciente</Label>
            <select className="h-10 px-3 rounded-md border border-input bg-background text-sm min-w-[240px]" value={patientId} onChange={(e) => { setPatientId(e.target.value); setSessionId(""); }}>
              <option value="">Selecione…</option>
              {patients.map((pt: any) => <option key={pt.id} value={pt.id}>{pt.full_name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tipo</Label>
            <select className="h-10 px-3 rounded-md border border-input bg-background text-sm" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              {reportTypes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Período</Label>
            <select className="h-10 px-3 rounded-md border border-input bg-background text-sm" value={periodDays} onChange={(e) => setPeriodDays(Number(e.target.value))}>
              <option value={7}>7 dias</option>
              <option value={14}>14 dias</option>
              <option value={30}>30 dias</option>
              <option value={60}>60 dias</option>
              <option value={90}>90 dias</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Sessão de referência</Label>
            <select className="h-10 px-3 rounded-md border border-input bg-background text-sm max-w-[260px]" value={sessionId} onChange={(e) => setSessionId(e.target.value)} disabled={!sessions.length}>
              <option value="">Mais recente / aberta</option>
              {sessions.map((s: any) => <option key={s.id} value={s.id}>{s.name} — {new Date(s.session_at).toLocaleDateString("pt-BR")}</option>)}
            </select>
          </div>
          {report && (
            <div className="ml-auto flex flex-wrap gap-2">
              <Button variant="outline" onClick={copyText}><Copy className="h-4 w-4 mr-1.5" />Copiar</Button>
              <Button variant="outline" onClick={saveReport}><Save className="h-4 w-4 mr-1.5" />Salvar</Button>
              <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1.5" />PDF</Button>
              <Button variant="outline" onClick={exportMarkdown}><Download className="h-4 w-4 mr-1.5" />Markdown</Button>
              <Button onClick={exportJson}><Download className="h-4 w-4 mr-1.5" />JSON</Button>
            </div>
          )}
        </div>
      </Card>

      {!report ? (
        <Card className="p-6"><EmptyState icon={<FileText className="h-5 w-5" />} title="Selecione um paciente" description="O relatório cruza medicamentos, formulações, doses, check-ins, estoque, uso de substâncias e hipóteses clínicas." /></Card>
      ) : (
        <div className="space-y-4 print-area">
          <Card className="p-5 border-primary/20 bg-primary/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{report.title}</h2>
                <p className="text-xs text-muted-foreground">Gerado em {new Date(report.generatedAt).toLocaleString("pt-BR")} • Período: {periodDays} dias • Confiança: {report.structuredData?.forecast?.confidence ?? "—"}</p>
              </div>
              <Badge variant="secondary">{report.reportType.replace(/_/g, " ")}</Badge>
            </div>
            <div className="grid md:grid-cols-4 gap-3 mt-4">
              <Metric icon={<Pill className="h-4 w-4" />} label="Medicações" value={meds.length} />
              <Metric icon={<Activity className="h-4 w-4" />} label="Doses" value={doses.length} />
              <Metric icon={<Brain className="h-4 w-4" />} label="Hipóteses" value={report.hypotheses.length} />
              <Metric icon={<ShieldAlert className="h-4 w-4" />} label="Alertas" value={report.warnings.length + report.stockAlerts.length} />
            </div>
            <div className="mt-4 space-y-1 text-sm">
              {report.executiveSummary.map((x, i) => <div key={i} className="flex gap-2"><span className="text-primary">•</span><span>{x}</span></div>)}
            </div>
          </Card>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Adesão / Redose</div>
              <div className="text-2xl font-semibold">{report.adherence.adherencePct ?? "—"}{report.adherence.adherencePct != null ? "%" : ""}</div>
              <p className="text-xs text-muted-foreground mt-1">{report.adherence.interpretation}</p>
            </Card>
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Eixos previstos</div>
              <div className="flex flex-wrap gap-1.5">{report.forecastAxes.slice(0, 5).map((a) => <Badge key={a.axis} variant="outline">{a.axis}: {a.now}→{a.next6h}</Badge>)}{!report.forecastAxes.length && <span className="text-xs text-muted-foreground">Sem previsão suficiente.</span>}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Estoque</div>
              <div className="space-y-1 text-xs">{report.stockAlerts.slice(0, 4).map((s) => <div key={s.medicationName}>{s.message}</div>)}{!report.stockAlerts.length && <span className="text-muted-foreground">Sem alerta de estoque.</span>}</div>
            </Card>
          </div>



          <PhenomenologyPanel
            patient={p}
            medications={meds}
            doses={doses}
            checkins={checkins}
            sessions={sessions}
            substanceUse={subUse}
            periodDays={periodDays}
          />

          <Card className="p-4">
            <div className="font-medium mb-3 flex items-center gap-2"><ClipboardList className="h-4 w-4" />Resumo por medicação</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b"><tr><th className="text-left py-2">Medicação</th><th>Doses</th><th>Benefício</th><th>Adverso</th><th>Foco</th><th>Ansiedade</th><th>Sedação</th><th>Direção</th></tr></thead>
                <tbody>
                  {report.medicationEffects.map((m) => <tr key={m.medication} className="border-b last:border-0"><td className="py-2 pr-2">{m.medication}</td><td className="text-center">{m.doseCount}</td><td className="text-center">{fmt(m.benefitAvg)}</td><td className="text-center">{fmt(m.adverseAvg)}</td><td className="text-center">{fmt(m.focusAvg)}</td><td className="text-center">{fmt(m.anxietyAvg)}</td><td className="text-center">{fmt(m.sedationAvg)}</td><td className="text-center"><Badge variant="outline">{m.likelyDirection}</Badge></td></tr>)}
                </tbody>
              </table>
            </div>
          </Card>

          {report.sections.map((section) => (
            <Card key={section.id} className={`p-4 ${severityClass(section.severity)}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-semibold">{section.title}</h3>
                {section.severity && <Badge variant={section.severity === "high" ? "destructive" : "outline"}>{section.severity}</Badge>}
              </div>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {section.bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
              {section.details?.length ? <div className="mt-2 text-xs text-muted-foreground space-y-1">{section.details.map((d, i) => <div key={i}>↳ {d}</div>)}</div> : null}
            </Card>
          ))}

          <Card className="p-4 text-xs text-muted-foreground">
            <div className="font-medium text-foreground mb-1">Observações de segurança</div>
            <ul className="list-disc pl-5 space-y-1">{report.disclaimers.map((d) => <li key={d}>{d}</li>)}</ul>
          </Card>
        </div>
      )}
    </div>
  );
}

function Metric({ icon, label, value }: any) {
  return <div className="rounded-lg border bg-background/60 p-3"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><div className="text-xl font-semibold mt-1">{value}</div></div>;
}

function fmt(v: number | null | undefined) {
  return v == null || !Number.isFinite(v) ? "—" : Math.round(v);
}

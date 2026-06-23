import { useMemo } from "react";
import { AlertTriangle, BrainCircuit, CheckCircle2, ClipboardList, Database, LineChart, Pill, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdvancedCurveExplorer } from "@/components/clinical/AdvancedCurveExplorer";
import { DoseLogManager } from "@/components/clinical/DoseLogManager";
import { buildClinicalIntelligenceSummary, type ClinicalSeverity } from "@/domain/clinicalIntelligenceEngine";
import { cn } from "@/lib/utils";

function toneClass(severity?: ClinicalSeverity) {
  switch (severity) {
    case "urgente": return "border-destructive/50 bg-destructive/5 text-destructive";
    case "relevante": return "border-warning/60 bg-warning/5 text-warning";
    case "cautela": return "border-warning/40 bg-warning/5 text-foreground";
    case "monitorar": return "border-info/40 bg-info/5 text-foreground";
    default: return "border-border bg-card text-foreground";
  }
}

function pct(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${Math.round(v)}%`;
}

function num(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "—";
  return String(Math.round(v));
}

export function IntegratedClinicalConsole({
  patient,
  medications = [],
  doses = [],
  checkins = [],
  sessions = [],
  substanceUse = [],
  inventory = [],
  periodDays = 30,
  onDoseChanged,
  sessionId,
}: {
  patient?: any;
  medications?: any[];
  doses?: any[];
  checkins?: any[];
  sessions?: any[];
  substanceUse?: any[];
  inventory?: any[];
  periodDays?: number;
  onDoseChanged?: () => void;
  sessionId?: string | null;
}) {
  const summary = useMemo(() => buildClinicalIntelligenceSummary({ patient, medications, doses, checkins, sessions, substanceUse, inventory, periodDays }), [patient, medications, doses, checkins, sessions, substanceUse, inventory, periodDays]);

  const patientId = patient?.id ?? doses?.[0]?.patient_id ?? medications?.[0]?.patient_id;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Metric icon={<BrainCircuit className="h-4 w-4" />} label="Risco composto" value={`${summary.riskScore}/100`} sub={summary.riskLabel} severity={summary.riskLabel} />
        <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Qualidade dados" value={`${summary.dataQualityScore}/100`} sub={summary.missingCore.slice(0, 1).join("; ") || "núcleo ok"} severity={summary.dataQualityScore < 70 ? "cautela" : "info"} />
        <Metric icon={<Pill className="h-4 w-4" />} label="Doses" value={String(doses.length)} sub={`${summary.redoseCount} redose(s)`} severity={summary.redoseCount ? "relevante" : "info"} />
        <Metric icon={<Zap className="h-4 w-4" />} label="Interações" value={String(summary.interactions.length)} sub="fase + contexto" severity={summary.interactions.some((i) => ["urgente", "relevante"].includes(i.relevance)) ? "relevante" : "info"} />
        <Metric icon={<ClipboardList className="h-4 w-4" />} label="Adesão estimada" value={pct(summary.adherenceEstimate)} sub="por logs no período" severity={(summary.adherenceEstimate ?? 100) < 70 ? "cautela" : "info"} />
      </div>

      <Card className="p-4 space-y-3 border-primary/20 bg-primary/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-primary" /> Central de decisão clínica</div>
            <div className="text-xs text-muted-foreground">O sistema cruza dose real, formulação, curva, sono, cafeína, check-in, uso de substâncias e histórico. Curva relativa, não sérica.</div>
          </div>
          <Badge variant="secondary">{periodDays} dias</Badge>
        </div>
        {summary.actionCards.length === 0 ? (
          <div className="text-sm text-muted-foreground">Ainda faltam dados para gerar ações clínicas robustas. Registre dose + formulação + check-in pós-dose.</div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-3">
            {summary.actionCards.slice(0, 8).map((a) => (
              <div key={a.id} className={cn("rounded-xl border p-3 space-y-2", toneClass(a.severity))}>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-sm">{a.title}</div>
                  <Badge variant="outline" className="shrink-0 text-[10px] bg-background/70">{a.severity}</Badge>
                </div>
                <div className="text-xs opacity-90">{a.rationale}</div>
                <div className="text-xs"><span className="font-medium">Ação:</span> {a.action}</div>
                {a.missing?.length ? <div className="text-[11px] opacity-80"><span className="font-medium">Falta:</span> {a.missing.join("; ")}</div> : null}
                <div className="text-[10px] uppercase tracking-wide opacity-70">confiança {a.confidence}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="font-medium flex items-center gap-2"><LineChart className="h-4 w-4 text-primary" /> Curva viva e cargas por substância</div>
            <div className="text-xs text-muted-foreground">Desmarque substâncias, expanda o gráfico e use tooltip/brush para ler horário, fase e intensidade 0–100.</div>
          </div>
          <Badge variant="outline">{summary.substanceLoads.length} substância(s)</Badge>
        </div>
        <AdvancedCurveExplorer doses={doses as any} title="Curva viva PK/PD + contexto" description="100 = maior intensidade relativa do pico daquela substância. A linha total é carga combinada saturada em 100 para evitar falsa precisão." />
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
          {summary.substanceLoads.map((s) => (
            <div key={s.key} className="rounded-lg border p-3 text-xs space-y-1">
              <div className="font-medium flex items-center justify-between gap-2"><span>{s.label}</span><Badge variant="secondary">{s.currentIntensity}/100 · {s.phase}</Badge></div>
              <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                <span>Doses: {s.doseCount}</span><span>Redoses: {s.redoseCount}</span>
                <span>Benefício: {num(s.meanBenefit)}</span><span>Adverso: {num(s.meanAdverse)}</span>
                <span>Foco: {num(s.meanFocus)}</span><span>Ansiedade: {num(s.meanAnxiety)}</span>
                <span>Cafeína: {s.caffeineMg || 0} mg</span><span>Privação máx: {num(s.maxSleepDeprivation)}</span>
              </div>
              {s.missing.length ? <div className="text-warning">Falta: {s.missing.join(", ")}</div> : <div className="text-success">Dados mínimos presentes.</div>}
            </div>
          ))}
        </div>
      </Card>

      {patientId ? (
        <DoseLogManager doses={doses as any[]} patientId={patientId} sessionId={sessionId ?? null} onChanged={onDoseChanged} />
      ) : (
        <Card className="p-4 text-sm text-muted-foreground">Sem paciente para habilitar edição de doses.</Card>
      )}

      <Card className="p-4 space-y-3">
        <div className="font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Interações e sobreposições priorizadas</div>
        {summary.interactions.length === 0 ? <div className="text-sm text-muted-foreground">Sem interação contextual detectada. Isso pode significar ausência de dados, não ausência real de risco.</div> : (
          <div className="grid lg:grid-cols-2 gap-3">
            {summary.interactions.map((it, idx) => (
              <div key={idx} className={cn("rounded-lg border p-3 space-y-1", toneClass(it.relevance as any))}>
                <div className="flex items-center gap-2"><Badge variant="outline" className="bg-background/70">{it.relevance}</Badge><span className="text-sm font-medium">{it.summary}</span></div>
                {it.detail && <div className="text-xs opacity-90">{it.detail}</div>}
                {it.mechanism && <div className="text-xs"><span className="font-medium">Mecanismo:</span> {it.mechanism}</div>}
                {it.monitor?.length ? <div className="text-xs"><span className="font-medium">Monitorar:</span> {it.monitor.join(", ")}</div> : null}
                {it.action && <div className="text-xs"><span className="font-medium">Ação:</span> {it.action}</div>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-2">
        <div className="font-medium flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> Qualidade do dado: o que ainda impede inteligência real</div>
        {summary.missingCore.length === 0 ? <div className="text-sm text-success">Dados mínimos adequados para análise longitudinal inicial.</div> : (
          <ul className="text-sm list-disc pl-5 space-y-1">
            {summary.missingCore.map((m) => <li key={m}>{m}</li>)}
          </ul>
        )}
        <Button variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(JSON.stringify(summary, null, 2))}>Copiar snapshot JSON da inteligência</Button>
      </Card>
    </div>
  );
}

function Metric({ icon, label, value, sub, severity }: any) {
  return (
    <Card className={cn("p-4", toneClass(severity))}>
      <div className="flex items-center justify-between text-xs uppercase tracking-wide opacity-80"><span>{label}</span>{icon}</div>
      <div className="text-2xl font-semibold mt-2 tabular-nums">{value}</div>
      <div className="text-[11px] truncate opacity-80">{sub}</div>
    </Card>
  );
}

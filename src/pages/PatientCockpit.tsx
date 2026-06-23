import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/clinical/PageHeader";
import { ReviewNote } from "@/components/clinical/ReviewNote";
import { PhaseBadge } from "@/components/clinical/PhaseBadge";
import { PredictabilityPanel } from "@/components/clinical/PredictabilityPanel";
import { SessionCheckin } from "@/components/clinical/SessionCheckin";
import { MedxCard } from "@/components/clinical/MedxCard";
import { MedicationForecastPanel } from "@/components/clinical/MedicationForecastPanel";
import { ClinicalHypothesisPanel } from "@/components/clinical/ClinicalHypothesisPanel";
import { PhenomenologyPanel } from "@/components/clinical/PhenomenologyPanel";
import { computeCurve } from "@/domain/curveEngine";
import { runAudit } from "@/domain/auditEngine";
import { runInteractionEngine } from "@/domain/interactionEngine";
import { age, fmtDate } from "@/lib/format";
import { Pencil, Plus, Activity, Pill, AlertTriangle } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, BarChart, Bar } from "recharts";

export default function PatientCockpit() {
  const { id } = useParams();
  const { data: p } = useQuery({
    queryKey: ["patient", id],
    enabled: !!id,
    queryFn: async () => (await supabase.from("patients").select("*").eq("id", id!).maybeSingle()).data,
  });
  const { data: meds = [] } = useQuery({
    queryKey: ["pat-meds", id],
    enabled: !!id,
    queryFn: async () => (await supabase.from("patient_medications").select("*, substances(*)").eq("patient_id", id!).eq("status", "ativo")).data ?? [],
  });
  const { data: openSession } = useQuery({
    queryKey: ["open-session", id],
    enabled: !!id,
    queryFn: async () => (await supabase.from("clinical_sessions").select("*").eq("patient_id", id!).eq("status", "aberta").order("session_at", { ascending: false }).limit(1).maybeSingle()).data,
  });
  const { data: recentDoses = [] } = useQuery({
    queryKey: ["recent-doses", id],
    enabled: !!id,
    queryFn: async () => {
      const t = new Date(Date.now() - 24 * 3600_000).toISOString();
      return (await supabase.from("medication_dose_logs").select("*, substances(*)").eq("patient_id", id!).gte("actual_time", t).order("actual_time")).data ?? [];
    },
  });
  const { data: targetSymptoms = [] } = useQuery({
    queryKey: ["tgsym", id],
    enabled: !!id,
    queryFn: async () => (await supabase.from("patient_target_symptoms").select("*").eq("patient_id", id!).eq("status", "ativo")).data ?? [],
  });
  const { data: recentSubUse = [] } = useQuery({
    queryKey: ["recent-subuse", id],
    enabled: !!id,
    queryFn: async () => {
      const t = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
      return (await supabase.from("substance_use_logs").select("*").eq("patient_id", id!).gte("used_at", t).order("used_at", { ascending: false })).data ?? [];
    },
  });
  const { data: substancesCatalog = [] } = useQuery({
    queryKey: ["substances"],
    queryFn: async () => (await supabase.from("substances").select("*")).data ?? [],
  });
  const { data: checkins = [] } = useQuery({
    queryKey: ["dose-checkins", id],
    enabled: !!id,
    queryFn: async () => {
      const t = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
      return (await (supabase as any).from("session_checkins").select("*").eq("patient_id", id!).gte("checkin_at", t).order("checkin_at", { ascending: false })).data ?? [];
    },
  });
  const { data: responseProfiles = [] } = useQuery({
    queryKey: ["resp-profiles", id],
    enabled: !!id,
    queryFn: async () => (await (supabase as any).from("patient_substance_response_profiles").select("*").eq("patient_id", id!)).data ?? [],
  });
  const { data: inventory = [] } = useQuery({
    queryKey: ["patient-inventory", id],
    enabled: !!id,
    queryFn: async () => (await (supabase as any).from("medication_inventory").select("*, patient_medications(*, substances(name))").eq("patient_id", id!)).data ?? [],
  });
  const { data: longSessions = [] } = useQuery({
    queryKey: ["long-sessions", id],
    enabled: !!id,
    queryFn: async () => (await supabase.from("clinical_sessions").select("session_at, sleep_hours, sleep_quality").eq("patient_id", id!).not("sleep_hours", "is", null).order("session_at", { ascending: true }).limit(30)).data ?? [],
  });
  const { data: longSubUse = [] } = useQuery({
    queryKey: ["long-subuse", id],
    enabled: !!id,
    queryFn: async () => {
      const t = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
      return (await supabase.from("substance_use_logs").select("used_at, craving_before, craving_after, substance_name").eq("patient_id", id!).gte("used_at", t).order("used_at", { ascending: true })).data ?? [];
    },
  });

  if (!p) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  const doseEvents = recentDoses.map((d: any) => ({
    substanceName: d.substance_name,
    actualTime: d.actual_time,
    doseAmount: d.dose_amount,
    stomach: d.stomach,
    caffeineAmount: d.caffeine_amount,
    pk: d.substances?.pk ?? null,
    releaseType: d.substances?.release_curve_type ?? null,
  }));
  const curve = computeCurve(doseEvents, { windowHours: 24 });
  const chartData = curve.points.map((pt) => ({ t: new Date(pt.t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), v: pt.value }));
  const audit = runAudit({ patient: p, session: openSession, doses: recentDoses, targetSymptoms, medications: meds });
  const interactions = runInteractionEngine({
    activeMedications: meds.map((m: any) => ({ name: m.substances?.name ?? m.free_text_name ?? "" })),
    recentDoses: recentDoses.map((d: any) => ({ substanceName: d.substance_name, actualTime: d.actual_time })),
    recentSubstanceUse: recentSubUse.map((s: any) => ({ substanceName: s.substance_name, usedAt: s.used_at })),
    sessionContext: { sleepHours: openSession?.sleep_hours },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={p.full_name}
        description={`${age(p.birth_date) ?? "—"} anos • ${p.biological_sex ?? "—"} • ${p.status}`}
        actions={
          <div className="flex gap-2">
            <Link to={`/pacientes/${p.id}/editar`}><Button variant="outline"><Pencil className="h-4 w-4 mr-1.5" />Editar</Button></Link>
            <Link to={`/sessoes?patient=${p.id}`}><Button><Plus className="h-4 w-4 mr-1.5" />Nova sessão</Button></Link>
          </div>
        }
      />
      <ReviewNote />
      <PredictabilityPanel
        doses={recentDoses as any}
        substances={substancesCatalog as any}
        session={openSession ? {
          sleepHours: openSession.sleep_hours,
          sleepDeprivation0_10: (openSession as any).sleep_deprivation_level_0_10,
          caffeineTotalMg: (openSession as any).caffeine_total_mg,
          alcoholUseToday: (openSession as any).alcohol_use_today,
        } : undefined}
        recentSubstanceUse={recentSubUse.map((s: any) => ({ substanceName: s.substance_name, usedAt: s.used_at }))}
      />
      <MedicationForecastPanel
        patient={p}
        session={openSession}
        medications={meds}
        doses={recentDoses as any}
        substances={substancesCatalog as any}
        checkins={checkins}
        responseProfiles={responseProfiles}
        inventory={inventory}
      />
      <ClinicalHypothesisPanel
        patient={p}
        session={openSession}
        medications={meds as any}
        doses={recentDoses as any}
        checkins={checkins as any}
        substanceUse={recentSubUse as any}
      />
      <PhenomenologyPanel
        patient={p}
        medications={meds as any}
        doses={recentDoses as any}
        checkins={checkins as any}
        sessions={openSession ? [openSession] : []}
        substanceUse={recentSubUse as any}
        periodDays={7}
      />
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-medium">Curva relativa 0–100 — últimas 24 h</div>
              <div className="text-xs text-muted-foreground">{curve.notes[0] ?? "Sobreposição de doses ativas combinadas, com cap em 100."}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Agora</span>
              <span className="font-mono text-sm">{curve.now.value.toFixed(0)}</span>
              <PhaseBadge phase={curve.now.phase} />
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="t" stroke="hsl(var(--muted-foreground))" fontSize={11} interval={Math.floor(chartData.length / 8)} />
                <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <ReferenceLine x={chartData[Math.floor(chartData.length * (22 / 26))]?.t} stroke="hsl(var(--primary))" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium mb-2 flex items-center justify-between">
            <span>Auditoria clínica</span>
            <span className="font-mono">{audit.score}/100</span>
          </div>
          <div className="text-xs text-muted-foreground mb-2">Pendências antes de interpretação sofisticada.</div>
          <ul className="space-y-1 max-h-44 overflow-auto">
            {audit.findings.slice(0, 8).map((f, i) => (
              <li key={i} className="text-xs flex items-start gap-1.5">
                <AlertTriangle className={`h-3 w-3 mt-0.5 ${f.severity === "high" ? "text-destructive" : f.severity === "warn" ? "text-warning" : "text-muted-foreground"}`} />
                <span className="capitalize text-muted-foreground">{f.domain}:</span> <span>{f.message}</span>
              </li>
            ))}
            {audit.findings.length === 0 && <li className="text-xs text-success">Sem pendências relevantes.</li>}
          </ul>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm font-medium mb-2 flex items-center justify-between gap-1.5"><span className="flex items-center gap-1.5"><Pill className="h-4 w-4" /> Medicações ativas</span><Link to="/estoque-medicamentos"><Button size="sm" variant="outline">Estoque</Button></Link></div>
          {meds.length === 0 ? <div className="text-xs text-muted-foreground">Nenhuma medicação ativa.</div> : (
            <ul className="space-y-2">
              {meds.map((m: any) => (
                <li key={m.id} className="text-sm">
                  <div className="font-medium">{m.substances?.name ?? m.free_text_name}</div>
                  <div className="text-xs text-muted-foreground">{m.current_dose} {m.dose_unit} • {m.frequency ?? "—"}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium mb-2 flex items-center gap-1.5"><Activity className="h-4 w-4" /> Sintomas-alvo</div>
          {targetSymptoms.length === 0 ? <div className="text-xs text-muted-foreground">Sem sintomas-alvo.</div> : (
            <ul className="space-y-2">
              {targetSymptoms.map((s: any) => (
                <li key={s.id} className="text-sm flex justify-between">
                  <span>{s.symptom_name}</span>
                  <span className="text-xs text-muted-foreground">{s.baseline ?? "—"} → {s.therapeutic_goal ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium mb-2">Uso de substâncias (7d)</div>
          {recentSubUse.length === 0 ? <div className="text-xs text-muted-foreground">Sem registros recentes.</div> : (
            <ul className="space-y-2 max-h-40 overflow-auto">
              {recentSubUse.slice(0, 8).map((s: any) => (
                <li key={s.id} className="text-sm flex justify-between">
                  <span>{s.substance_name}</span>
                  <span className="text-xs text-muted-foreground">{fmtDate(s.used_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <div className="text-sm font-medium mb-2">Interações contextuais</div>
        {interactions.length === 0 ? (
          <div className="text-xs text-muted-foreground">Nenhuma interação contextual relevante no momento.</div>
        ) : (
          <ul className="space-y-3">
            {interactions.map((it, i) => (
              <li key={i} className="border-l-2 border-warning pl-3">
                <div className="text-sm font-medium">{it.summary}</div>
                <div className="text-xs text-muted-foreground capitalize">{it.relevance} • {it.category} • confiança {it.confidence}</div>
                {it.monitor && <div className="text-xs mt-1">Monitorar: {it.monitor.join(", ")}</div>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-sm font-medium mb-1">Sono — sessões recentes</div>
          <div className="text-xs text-muted-foreground mb-2">Horas dormidas e qualidade autorrelatada (0–10).</div>
          {longSessions.length === 0 ? (
            <div className="text-xs text-muted-foreground">Sem registros de sono ainda.</div>
          ) : (
            <div className="h-44">
              <ResponsiveContainer>
                <LineChart data={longSessions.map((s: any) => ({
                  d: new Date(s.session_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
                  horas: Number(s.sleep_hours ?? 0),
                  qualidade: s.sleep_quality ?? null,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="d" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="horas" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                  <Line type="monotone" dataKey="qualidade" stroke="hsl(var(--success))" strokeWidth={2} dot strokeDasharray="4 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium mb-1">Craving — uso de substâncias (30 d)</div>
          <div className="text-xs text-muted-foreground mb-2">Antes e depois do episódio (0–10).</div>
          {longSubUse.length === 0 ? (
            <div className="text-xs text-muted-foreground">Sem registros nos últimos 30 dias.</div>
          ) : (
            <div className="h-44">
              <ResponsiveContainer>
                <BarChart data={longSubUse.map((s: any) => ({
                  d: new Date(s.used_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
                  antes: s.craving_before ?? 0,
                  depois: s.craving_after ?? 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="d" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="antes" fill="hsl(var(--warning))" />
                  <Bar dataKey="depois" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {openSession && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Sessão aberta: {openSession.name}</div>
              <div className="text-xs text-muted-foreground">{fmtDate(openSession.session_at)} • {openSession.session_type}</div>
            </div>
            <Link to={`/sessoes/${openSession.id}`}><Button size="sm">Abrir sessão</Button></Link>
          </div>
        </Card>
      )}

      <SessionCheckin patientId={p.id} sessionId={openSession?.id} />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2" />
        <MedxCard patientId={p.id} />
      </div>

      {p.suicide_risk && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 text-sm">
          <Badge variant="destructive">Risco</Badge> <span className="ml-2">{p.suicide_risk}</span>
        </div>
      )}
    </div>
  );
}
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/clinical/PageHeader";
import { ReviewNote } from "@/components/clinical/ReviewNote";
import { Users, Activity, FlaskConical, CalendarClock, AlertTriangle, Moon } from "lucide-react";
import { Link } from "react-router-dom";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

function KPI({ icon: Icon, label, value, sub, tone = "default" }: any) {
  const tones: Record<string, string> = {
    default: "text-foreground",
    warn: "text-warning",
    risk: "text-destructive",
    ok: "text-success",
    info: "text-info",
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wide">
        <span>{label}</span>
        <Icon className={`h-4 w-4 ${tones[tone]}`} />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

export default function Dashboard() {
  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => (await supabase.from("patients").select("id,full_name,status")).data ?? [],
  });
  const { data: sessionsToday = [] } = useQuery({
    queryKey: ["sessions-today"],
    queryFn: async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      return (await supabase.from("clinical_sessions").select("id,name,status").gte("session_at", start.toISOString())).data ?? [];
    },
  });
  const { data: doses24 = [] } = useQuery({
    queryKey: ["doses-24"],
    queryFn: async () => {
      const t = new Date(Date.now() - 24 * 3600_000).toISOString();
      return (await supabase.from("medication_dose_logs").select("id,substance_name,actual_time").gte("actual_time", t)).data ?? [];
    },
  });
  const { data: subuse24 = [] } = useQuery({
    queryKey: ["subuse-24"],
    queryFn: async () => {
      const t = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
      return (await supabase.from("substance_use_logs").select("id,substance_name,used_at,craving_after").gte("used_at", t)).data ?? [];
    },
  });
  const { data: badSleep = [] } = useQuery({
    queryKey: ["bad-sleep"],
    queryFn: async () => {
      return (await supabase.from("clinical_sessions").select("id,patient_id,sleep_quality").lt("sleep_quality", 5).limit(10)).data ?? [];
    },
  });

  const activePatients = patients.filter((p: any) => p.status === "ativo").length;
  const openSessions = sessionsToday.filter((s: any) => s.status === "aberta").length;

  // tendência: doses por dia últimos 7 dias
  const trend = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayKey = d.toISOString().slice(0, 10);
    return {
      dia: d.toLocaleDateString("pt-BR", { weekday: "short" }),
      doses: doses24.filter((x: any) => x.actual_time?.slice(0, 10) === dayKey).length,
      uso: subuse24.filter((x: any) => x.used_at?.slice(0, 10) === dayKey).length,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard clínico"
        description="Visão geral dos pacientes em monitoramento, doses, sessões e eventos de risco recentes."
      />
      <ReviewNote />

      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="grid md:grid-cols-[1fr_auto] gap-3 items-center">
          <div>
            <div className="font-semibold">Abrir cockpit integrado</div>
            <div className="text-sm text-muted-foreground">Use esta rota como tela principal: dose editável, curva viva, interações, fenomenologia, ações clínicas e qualidade do dado no mesmo lugar.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link to="/inteligencia-clinica">Inteligência clínica</Link></Button>
            <Button asChild variant="outline"><Link to="/curvas">Curvas</Link></Button>
            <Button asChild variant="outline"><Link to="/conhecimento-farmacologico">Conhecimento</Link></Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <KPI icon={Users} label="Pacientes ativos" value={activePatients} sub={`${patients.length} no total`} />
        <KPI icon={CalendarClock} label="Sessões hoje" value={sessionsToday.length} sub={`${openSessions} abertas`} tone="info" />
        <KPI icon={Activity} label="Doses 24h" value={doses24.length} tone="info" />
        <KPI icon={FlaskConical} label="Uso subst. 7d" value={subuse24.length} tone={subuse24.length > 0 ? "warn" : "ok"} />
        <KPI icon={Moon} label="Sono ruim" value={badSleep.length} tone={badSleep.length ? "warn" : "ok"} />
        <KPI icon={AlertTriangle} label="Alertas seg." value={0} tone="ok" sub="Sem urgência ativa" />
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-medium">Tendência — 7 dias</div>
            <div className="text-xs text-muted-foreground">Doses registradas e episódios de uso de substâncias por dia</div>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="doses" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="uso" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-sm font-medium mb-2">Pacientes</div>
          {patients.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum paciente cadastrado. <Link to="/pacientes/novo" className="text-primary hover:underline">Cadastrar primeiro paciente →</Link></div>
          ) : (
            <ul className="divide-y">
              {patients.slice(0, 8).map((p: any) => (
                <li key={p.id} className="py-2 flex justify-between text-sm">
                  <Link to={`/pacientes/${p.id}`} className="hover:underline">{p.full_name}</Link>
                  <span className="text-xs text-muted-foreground capitalize">{p.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium mb-2">Sessões abertas hoje</div>
          {sessionsToday.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma sessão aberta hoje.</div>
          ) : (
            <ul className="divide-y">
              {sessionsToday.slice(0, 8).map((s: any) => (
                <li key={s.id} className="py-2 flex justify-between text-sm">
                  <Link to={`/sessoes/${s.id}`} className="hover:underline">{s.name}</Link>
                  <span className="text-xs text-muted-foreground capitalize">{s.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
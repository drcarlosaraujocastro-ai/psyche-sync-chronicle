import { useMemo, useState } from "react";
import { buildAdvancedCurve, type AdvancedDoseInput, type AdvancedCurveSeries } from "@/domain/advancedCurveEngine";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PhaseBadge } from "@/components/clinical/PhaseBadge";
import { Maximize2, Minimize2, MousePointer2, Activity, Eye, EyeOff } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Brush, ReferenceLine, Legend } from "recharts";

const windows = [12, 24, 48, 72, 168];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload ?? {};
  const visible = payload.filter((p: any) => !String(p.dataKey).includes("__"));
  return (
    <div className="rounded-lg border bg-card p-3 shadow-lg text-xs min-w-[240px]">
      <div className="font-medium mb-1">{label}</div>
      <div className="flex justify-between gap-4 border-b pb-1 mb-1">
        <span className="text-muted-foreground">Carga total</span>
        <span className="font-mono font-semibold">{Number(row.total ?? 0).toFixed(0)}/100 · {row.total__phase}</span>
      </div>
      <div className="space-y-1">
        {visible.map((p: any) => {
          if (p.dataKey === "total") return null;
          const phase = row[`${p.dataKey}__phase`] ?? "—";
          return (
            <div key={p.dataKey} className="grid grid-cols-[10px_1fr_auto] items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
              <span className="truncate">{p.name}</span>
              <span className="font-mono">{Number(p.value ?? 0).toFixed(0)}/100 · {phase}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground">Arraste no gráfico/brush para navegar. Curva relativa, não sérica.</div>
    </div>
  );
}

function ChartBlock({ doses, height = 360, expanded = false }: { doses: AdvancedDoseInput[]; height?: number; expanded?: boolean }) {
  const [windowHours, setWindowHours] = useState(48);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const result = useMemo(() => buildAdvancedCurve(doses, { windowHours, stepMin: windowHours > 72 ? 30 : 15 }), [doses, windowHours]);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const visible = (s: AdvancedCurveSeries) => enabled[s.key] !== false;
  const toggle = (key: string) => setEnabled((x) => ({ ...x, [key]: x[key] === false ? true : false }));
  const toggleOnly = (key: string) => setEnabled(Object.fromEntries(result.series.map((s) => [s.key, s.key === key])));
  const showAll = () => setEnabled({});

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1"><Activity className="h-3 w-3" /> Total agora {result.now.total.toFixed(0)}/100 · {result.now.phase}</Badge>
        <select className="h-8 px-2 rounded-md border border-input bg-background text-xs" value={windowHours} onChange={(e) => setWindowHours(Number(e.target.value))}>
          {windows.map((w) => <option key={w} value={w}>{w <= 72 ? `${w} h` : "7 dias"}</option>)}
        </select>
        <Button type="button" variant="outline" size="sm" onClick={showAll}>Todas</Button>
        <span className="text-xs text-muted-foreground flex items-center gap-1"><MousePointer2 className="h-3 w-3" /> Segure/arraste no brush e passe o dedo na curva para ler o horário.</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {result.series.map((s) => (
          <button key={s.key} type="button" onClick={() => toggle(s.key)} onDoubleClick={() => toggleOnly(s.key)}
            className={visible(s) ? "rounded-md border px-2 py-1 text-xs bg-background" : "rounded-md border px-2 py-1 text-xs bg-muted text-muted-foreground"}>
            <span className="inline-block h-2.5 w-2.5 rounded-full mr-1" style={{ background: s.color }} />
            {visible(s) ? <Eye className="inline h-3 w-3 mr-1" /> : <EyeOff className="inline h-3 w-3 mr-1" />}
            {s.label} · agora {s.nowValue.toFixed(0)}/100 · {s.nowPhase}
          </button>
        ))}
      </div>
      {result.notes.length > 0 && (
        <div className="rounded-md border border-warning/30 bg-warning/5 p-2 text-xs space-y-1">
          {result.notes.map((n) => <div key={n}>{n}</div>)}
        </div>
      )}
      <div className="overflow-x-auto rounded-md border bg-card">
        <div style={{ minWidth: expanded ? 1400 : 920, height }} className="p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={result.points} margin={{ top: 10, right: 24, bottom: 10, left: 0 }} onClick={(state: any) => state?.activePayload?.[0]?.payload && setSelectedRow(state.activePayload[0].payload)} onMouseMove={(state: any) => state?.activePayload?.[0]?.payload && setSelectedRow(state.activePayload[0].payload)}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} minTickGap={28} />
              <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={100} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <ReferenceLine y={50} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="total" name="Carga total" stroke="hsl(var(--foreground))" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              {result.series.filter(visible).map((s) => (
                <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              ))}
              <Brush dataKey="label" height={28} travellerWidth={14} stroke="hsl(var(--primary))" />
              <Legend verticalAlign="top" height={28} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      {selectedRow && (
        <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">Leitura fixa: {selectedRow.label}</div>
            <Badge variant="outline">Total {Number(selectedRow.total ?? 0).toFixed(0)}/100 · {selectedRow.total__phase}</Badge>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
            {result.series.filter(visible).map((s) => (
              <div key={s.key} className="rounded-md border bg-background p-2">
                <div className="font-medium flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.label}</div>
                <div className="text-muted-foreground">Intensidade: <span className="font-mono text-foreground">{Number(selectedRow[s.key] ?? 0).toFixed(0)}/100</span></div>
                <div className="text-muted-foreground">Fase: <span className="text-foreground">{selectedRow[`${s.key}__phase`] ?? "—"}</span></div>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground">Esta leitura fica fixa ao tocar/clicar/arrastar no gráfico. Use para discutir exatamente o horário da queixa, pico, platô, descida ou cauda residual.</div>
        </div>
      )}
      <div className="grid md:grid-cols-3 gap-2 text-xs">
        {result.series.map((s) => (
          <div key={s.key} className="rounded-md border p-2">
            <div className="font-medium flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.label}</div>
            <div className="text-muted-foreground">Doses: {s.doseCount}{s.totalDose ? ` · total ${s.totalDose} ${s.unit ?? ""}` : ""}</div>
            <div className="flex items-center gap-1 mt-1"><span>Agora {s.nowValue.toFixed(0)}/100</span><PhaseBadge phase={s.nowPhase as any} /></div>
            {s.notes.slice(0, 2).map((n) => <div key={n} className="text-[10px] text-muted-foreground mt-1">{n}</div>)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdvancedCurveExplorer({ doses, title = "Curva PK/PD relativa", description }: { doses: AdvancedDoseInput[]; title?: string; description?: string }) {
  const [open, setOpen] = useState(false);
  if (!doses?.length) {
    return <Card className="p-4 text-sm text-muted-foreground">Sem doses para construir curva. Registre dose com horário real e, idealmente, formulação.</Card>;
  }
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{description ?? "Intensidade relativa 0–100: 100 = pico relativo daquela substância; total = carga combinada saturada."}</div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Maximize2 className="h-4 w-4 mr-1" />Expandir</Button>
      </div>
      <ChartBlock doses={doses} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[96vw] max-h-[94vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Minimize2 className="h-4 w-4" />Curva expandida</DialogTitle></DialogHeader>
          <ChartBlock doses={doses} height={560} expanded />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

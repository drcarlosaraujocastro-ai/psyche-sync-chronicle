import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, ReferenceLine, Tooltip } from "recharts";
import { computeCurve } from "@/domain/curveEngine";
import type { DoseEvent } from "@/domain/types";
import { PhaseBadge } from "./PhaseBadge";

export function CurvePreview({
  doses,
  windowHours = 12,
  height = 120,
  caption,
}: {
  doses: DoseEvent[];
  windowHours?: number;
  height?: number;
  caption?: string;
}) {
  if (!doses.length || !doses.some((d) => d.actualTime)) {
    return (
      <div className="text-[11px] text-muted-foreground border border-dashed border-border rounded-md p-3 text-center">
        Preencha substância e horário para visualizar a curva relativa estimada.
      </div>
    );
  }
  const curve = computeCurve(doses, { windowHours, stepMin: 10 });
  const data = curve.points.map((p) => ({
    t: new Date(p.t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    v: Number(p.value.toFixed(1)),
  }));
  const nowLabel = data[Math.floor(data.length * ((windowHours) / (windowHours + 2)))]?.t;
  return (
    <div className="rounded-md border border-border bg-muted/30 p-2">
      <div className="flex items-center justify-between px-1 pb-1">
        <div className="text-[11px] text-muted-foreground">
          {caption ?? "Curva relativa 0–100 (estimativa, não é concentração sérica)"}
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-muted-foreground">agora</span>
          <span className="font-mono">{curve.now.value.toFixed(0)}</span>
          <PhaseBadge phase={curve.now.phase} />
        </div>
      </div>
      <div style={{ height }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={9} width={28} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11, padding: 6 }}
              labelFormatter={(l) => `Horário ${l}`}
              formatter={(v: any) => [v, "relativo"]}
            />
            {nowLabel && <ReferenceLine x={nowLabel} stroke="hsl(var(--primary))" strokeDasharray="3 3" />}
            <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {curve.notes.length > 0 && (
        <div className="px-1 pt-1 text-[10px] text-muted-foreground">{curve.notes.join(" • ")}</div>
      )}
    </div>
  );
}
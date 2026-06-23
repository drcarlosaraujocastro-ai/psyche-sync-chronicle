import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Brain, Package, TrendingUp, Info } from "lucide-react";
import { buildMedicationEffectForecast } from "@/lib/clinical/effectProjection";

function severityClass(sev: string) {
  if (sev === "high") return "border-destructive/30 bg-destructive/10";
  if (sev === "warn") return "border-warning/30 bg-warning/10";
  return "border-border bg-muted/30";
}

export function MedicationForecastPanel(props: {
  patient?: any;
  session?: any;
  medications?: any[];
  doses?: any[];
  substances?: any[];
  checkins?: any[];
  responseProfiles?: any[];
  inventory?: any[];
  compact?: boolean;
}) {
  const r = buildMedicationEffectForecast(props as any);
  const hasAnything = r.axes.length || r.warnings.length || r.learning.length || r.stockAlerts.length;
  if (!hasAnything) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2"><Info className="h-4 w-4" /> Sem dados suficientes para projeção clínica. Registre dose + sono + check-in.</div>
      </Card>
    );
  }
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium"><Brain className="h-4 w-4 text-primary" /> Evolução prevista por medicação</div>
        <Badge variant="outline" className="text-[10px]">confiança {r.confidence}</Badge>
      </div>

      {r.axes.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {r.axes.slice(0, props.compact ? 4 : 8).map((a) => (
            <div key={a.axis} className="rounded-md border border-border p-2 bg-card">
              <div className="flex justify-between items-center gap-2">
                <div className="text-xs font-medium truncate" title={a.axis}>{a.axis}</div>
                <Badge variant="secondary" className="text-[9px]">{a.direction}</Badge>
              </div>
              <Progress value={a.now} className="h-1.5 my-2" />
              <div className="text-[11px] text-muted-foreground">agora {a.now}/100 • 6h {a.next6h}/100</div>
            </div>
          ))}
        </div>
      )}

      {r.warnings.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Alertas preditivos</div>
          {r.warnings.slice(0, props.compact ? 2 : 6).map((w, i) => (
            <div key={i} className={`rounded-md border p-2 text-xs space-y-1 ${severityClass(w.severity)}`}>
              <div className="flex items-center justify-between gap-2"><div className="font-medium">{w.title}</div><Badge variant="outline" className="text-[9px]">{w.severity}</Badge></div>
              <div className="text-muted-foreground">{w.message}</div>
              {w.action && <div className="text-primary">{w.action}</div>}
            </div>
          ))}
        </div>
      )}

      {r.learning.length > 0 && !props.compact && (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Histórico individual</div>
          {r.learning.slice(0, 4).map((l, i) => (
            <div key={i} className={`rounded-md border p-2 text-xs ${severityClass(l.severity)}`}>
              <div className="font-medium">{l.title}</div>
              <div className="text-muted-foreground">{l.message}</div>
            </div>
          ))}
        </div>
      )}

      {r.stockAlerts.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><Package className="h-3.5 w-3.5" /> Estoque</div>
          {r.stockAlerts.slice(0, props.compact ? 2 : 5).map((s, i) => (
            <div key={i} className={`rounded-md border p-2 text-xs ${severityClass(s.severity)}`}>
              <div className="font-medium">{s.medicationName}</div>
              <div className="text-muted-foreground">{s.message} Restante: {s.remaining ?? "—"} {s.unit}.</div>
            </div>
          ))}
        </div>
      )}

      {r.missingData.length > 0 && (
        <div className="text-[11px] text-muted-foreground border-t border-border/60 pt-2">
          <span className="uppercase tracking-wide">Dados que reduzem confiança:</span> {r.missingData.join(", ")}
        </div>
      )}
      <div className="text-[10px] text-muted-foreground">Curva relativa 0–100; projeção clínica de apoio, não concentração sérica nem prescrição automática.</div>
    </Card>
  );
}

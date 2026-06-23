import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhaseBadge } from "./PhaseBadge";
import { buildPredictability } from "@/lib/predictability";
import type { AdvDoseLog, AdvSubstance } from "@/lib/curveEngine";
import { AlertTriangle, Activity, Brain, Info } from "lucide-react";

export function PredictabilityPanel({
  doses, substances, session, recentSubstanceUse,
}: {
  doses: AdvDoseLog[];
  substances: AdvSubstance[];
  session?: any;
  recentSubstanceUse?: { substanceName: string; usedAt: string | Date }[];
}) {
  const r = buildPredictability({ doses, substances, session, recentSubstanceUse });
  if (!r.actives.length) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2"><Info className="h-4 w-4" /> Sem doses recentes para previsão. Registre uma dose para começar.</div>
      </Card>
    );
  }
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium"><Brain className="h-4 w-4 text-primary" /> Previsibilidade clínica</div>
        <Badge variant="outline" className="text-[10px]">confiança {r.confidence}</Badge>
      </div>
      <div className="space-y-2">
        {r.actives.map((a) => (
          <div key={a.name} className="flex items-center justify-between text-sm border-b border-border/60 pb-2 last:border-0">
            <div className="min-w-0">
              <div className="font-medium truncate">{a.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {a.substance?.default_curve_model ?? "modelo conservador"} • {a.doses.length} dose(s) recentes
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">agora</span>
              <span className="font-mono text-sm">{a.curve?.now.value.toFixed(0)}</span>
              <PhaseBadge phase={a.curve?.now.phase ?? "pre-onset"} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {r.topBenefit && (
          <div className="rounded-md bg-primary/10 border border-primary/20 p-2">
            <div className="text-[10px] uppercase text-muted-foreground">Maior benefício esperado</div>
            <div className="font-medium">{r.topBenefit.axis}</div>
            <div className="text-[11px] text-muted-foreground">{r.topBenefit.from} • intensidade ponderada {r.topBenefit.score.toFixed(0)}</div>
          </div>
        )}
        {r.topRisk && (
          <div className="rounded-md bg-warning/10 border border-warning/30 p-2">
            <div className="text-[10px] uppercase text-muted-foreground">Maior risco atual</div>
            <div className="font-medium">{r.topRisk.axis}</div>
            <div className="text-[11px] text-muted-foreground">{r.topRisk.from} • intensidade ponderada {r.topRisk.score.toFixed(0)}</div>
          </div>
        )}
      </div>
      {r.interactions.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Interações contextuais</div>
          {r.interactions.map((i, idx) => (
            <div key={idx} className="rounded-md border border-border bg-muted/30 p-2 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <div className="font-medium">{i.title}</div>
                <Badge variant="outline" className="text-[9px]">{i.severity} • {i.confidence}</Badge>
              </div>
              <div className="text-muted-foreground">{i.interpretation}</div>
              {i.monitor && i.monitor.length > 0 && (
                <div className="text-[11px]"><span className="text-muted-foreground">monitorar:</span> {i.monitor.join(", ")}</div>
              )}
              {i.action && <div className="text-[11px] text-primary">{i.action}</div>}
            </div>
          ))}
        </div>
      )}
      {r.missingData.length > 0 && (
        <div className="text-[11px] text-muted-foreground border-t border-border/60 pt-2">
          <span className="uppercase tracking-wide">Dados faltantes:</span> {r.missingData.join(", ")}
        </div>
      )}
      <div className="text-[10px] text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> Curva relativa, não é concentração sérica. Toda previsão tem incerteza.</div>
    </Card>
  );
}
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Activity, AlertTriangle } from "lucide-react";
import { buildPhenomenologyInsights, type PhenomenologyInsight } from "@/lib/clinical/phenomenologyEngine";

const severityVariant = (s: PhenomenologyInsight["severity"]) => s === "high" ? "destructive" : "outline";
const severityClass = (s: PhenomenologyInsight["severity"]) =>
  s === "high" ? "border-destructive/40 bg-destructive/5" : s === "warn" ? "border-warning/40 bg-warning/5" : "";

export function PhenomenologyPanel({ patient, medications, doses, checkins, sessions, substanceUse, periodDays = 30 }: any) {
  const insights = buildPhenomenologyInsights({ patient, medications, doses, checkins, sessions, substanceUse, periodDays });
  return (
    <Card className="p-4 space-y-3 border-primary/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium flex items-center gap-2"><Brain className="h-4 w-4 text-primary" />Fenomenologia PK/PD</div>
          <div className="text-xs text-muted-foreground mt-1">Correlação entre dose, curva, contexto e experiência subjetiva. Não é concentração sérica.</div>
        </div>
        <Badge variant="secondary" className="shrink-0">{insights.length} achado(s)</Badge>
      </div>
      {insights.length === 0 ? (
        <div className="text-sm text-muted-foreground">Sem achados fenomenológicos suficientes. Registre dose + horário + sono + cafeína + check-in pós-dose.</div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-3">
          {insights.slice(0, 8).map((it) => (
            <div key={it.id} className={`rounded-lg border p-3 space-y-2 ${severityClass(it.severity)}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-medium flex items-center gap-1.5">{it.severity === "high" ? <AlertTriangle className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}{it.title}</div>
                <Badge variant={severityVariant(it.severity)} className="text-[10px]">{it.severity}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">{it.summary}</div>
              {it.rationale?.length ? <ul className="list-disc pl-4 text-xs space-y-0.5">{it.rationale.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}</ul> : null}
              {it.management && <div className="text-xs"><span className="text-muted-foreground">Manejo:</span> {it.management}</div>}
              <div className="flex flex-wrap gap-1 pt-1">
                <Badge variant="outline" className="text-[10px]">{it.domain}</Badge>
                <Badge variant="outline" className="text-[10px]">conf. {it.confidence}</Badge>
                {(it.involved ?? []).slice(0, 3).map((x) => <Badge key={x} variant="secondary" className="text-[10px]">{x}</Badge>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

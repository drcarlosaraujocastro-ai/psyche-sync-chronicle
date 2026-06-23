import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, FlaskConical } from "lucide-react";
import { buildClinicalHypotheses } from "@/lib/clinical/hypothesisEngine";

function severityClass(sev: string) {
  if (sev === "high") return "border-destructive/30 bg-destructive/10";
  if (sev === "warn") return "border-warning/30 bg-warning/10";
  return "border-border bg-muted/30";
}

export function ClinicalHypothesisPanel(props: { patient?: any; session?: any; medications?: any[]; doses?: any[]; checkins?: any[]; substanceUse?: any[]; compact?: boolean }) {
  const r = buildClinicalHypotheses(props);
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium"><BrainCircuit className="h-4 w-4 text-primary" /> Hipóteses clínicas derivadas dos registros</div>
        <Badge variant="outline" className="text-[10px]">apoio decisório</Badge>
      </div>
      <div className="grid md:grid-cols-2 gap-2">
        {r.hypotheses.slice(0, props.compact ? 3 : 6).map((h, i) => (
          <div key={i} className={`rounded-md border p-3 text-xs space-y-1 ${severityClass(h.severity)}`}>
            <div className="flex items-center justify-between gap-2"><div className="font-medium text-sm">{h.title}</div><Badge variant="outline" className="text-[9px]">{h.probability}</Badge></div>
            <div className="text-muted-foreground">{h.rationale}</div>
            <div className="text-primary">Manejo: {h.management}</div>
            {!!h.dataNeeded?.length && <div className="text-muted-foreground">Faltam: {h.dataNeeded.join(", ")}</div>}
          </div>
        ))}
      </div>
      {!!r.medicationSignals.length && !props.compact && (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><FlaskConical className="h-3.5 w-3.5" /> Sinais por medicação</div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
            {r.medicationSignals.slice(0, 6).map((m, i) => <div key={i} className="rounded-md border border-border p-2 text-xs"><div className="flex items-center justify-between gap-2"><span className="font-medium">{m.medication}</span><Badge variant="secondary" className="text-[9px]">{m.direction}</Badge></div><div className="text-muted-foreground mt-1">{m.signal}</div></div>)}
          </div>
        </div>
      )}
      <div className="text-[10px] text-muted-foreground">Hipóteses geradas por correlação temporal e textual. Não provam causalidade e não geram prescrição automática.</div>
    </Card>
  );
}

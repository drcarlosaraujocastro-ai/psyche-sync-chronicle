import { useMemo } from "react";
import { AlertTriangle, BrainCircuit, ClipboardList, ListChecks, Pill, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildLocalClinicalGuidance, type LocalGuidanceItem } from "@/domain/localClinicalGuidanceEngine";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function severityClass(sev: string) {
  if (sev === "urgente") return "border-destructive/50 bg-destructive/5";
  if (sev === "relevante") return "border-warning/60 bg-warning/5";
  if (sev === "cautela") return "border-warning/30 bg-warning/5";
  return "border-border bg-card";
}

function ItemCard({ item }: { item: LocalGuidanceItem }) {
  return (
    <div className={cn("rounded-xl border p-3 space-y-2", severityClass(item.severity))}>
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm">{item.title}</div>
        <div className="flex gap-1 shrink-0"><Badge variant="outline">{item.severity}</Badge><Badge variant="secondary">{item.confidence}</Badge></div>
      </div>
      <div className="text-xs text-muted-foreground">{item.axis}</div>
      <p className="text-sm">{item.rationale}</p>
      <p className="text-sm"><span className="font-medium">Ação:</span> {item.action}</p>
      {item.validation?.length ? <div className="text-xs text-muted-foreground">Validar: {item.validation.join(" • ")}</div> : null}
    </div>
  );
}

function copyText(text: string) {
  navigator.clipboard?.writeText(text);
  toast.success("Copiado");
}

export function LocalClinicalCopilotPanel({ patient, medications = [], doses = [], checkins = [], sessions = [], substanceUse = [], inventory = [], periodDays = 30 }: {
  patient?: any;
  medications?: any[];
  doses?: any[];
  checkins?: any[];
  sessions?: any[];
  substanceUse?: any[];
  inventory?: any[];
  periodDays?: number;
}) {
  const guidance = useMemo(() => buildLocalClinicalGuidance({ patient, medications, doses, checkins, sessions, substanceUse, inventory, periodDays }), [patient, medications, doses, checkins, sessions, substanceUse, inventory, periodDays]);
  const markdown = useMemo(() => {
    return [
      `# Copiloto clínico local — ${patient?.full_name ?? "paciente"}`,
      "",
      `**Síntese:** ${guidance.executiveSummary}`,
      `**Risco:** ${guidance.riskLevel}`,
      `**Qualidade dos dados:** ${guidance.dataQuality}/100`,
      "",
      "## Ações prioritárias",
      ...guidance.primaryActions.map((a) => `- **${a.title}** (${a.severity}, confiança ${a.confidence}): ${a.action}`),
      "",
      "## Perguntas para próxima sessão",
      ...guidance.sessionQuestions.map((q) => `- ${q}`),
      "",
      "## Monitorização",
      ...guidance.monitoringPlan.map((m) => `- ${m}`),
      "",
      "## Dados faltantes",
      ...(guidance.missingData.length ? guidance.missingData.map((m) => `- ${m}`) : ["- Sem lacunas críticas adicionais."]),
    ].join("\n");
  }, [guidance, patient?.full_name]);

  return (
    <Card className="p-4 space-y-4 border-primary/20 bg-primary/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-primary" /> Copiloto clínico local</div>
          <div className="text-xs text-muted-foreground">Sem API externa e sem custo. Motor local: curva + dose + contexto + interações + fenomenologia + auditoria.</div>
        </div>
        <Button variant="outline" size="sm" onClick={() => copyText(markdown)}>Copiar resumo</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Mini label="Risco" value={guidance.riskLevel} icon={<AlertTriangle className="h-4 w-4" />} />
        <Mini label="Qualidade" value={`${guidance.dataQuality}/100`} icon={<ShieldCheck className="h-4 w-4" />} />
        <Mini label="Ações" value={String(guidance.primaryActions.length)} icon={<ListChecks className="h-4 w-4" />} />
        <Mini label="Medicações" value={String(guidance.medicationSignals.length)} icon={<Pill className="h-4 w-4" />} />
      </div>

      <div className="rounded-lg border bg-background/70 p-3 text-sm">{guidance.executiveSummary}</div>

      <Tabs defaultValue="acoes">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="acoes">Ações</TabsTrigger>
          <TabsTrigger value="meds">Medicações</TabsTrigger>
          <TabsTrigger value="planos">Planos</TabsTrigger>
          <TabsTrigger value="perguntas">Perguntas</TabsTrigger>
          <TabsTrigger value="faltantes">Dados faltantes</TabsTrigger>
        </TabsList>
        <TabsContent value="acoes" className="pt-3 grid lg:grid-cols-2 gap-3">
          {guidance.primaryActions.length ? guidance.primaryActions.map((item) => <ItemCard key={item.id} item={item} />) : <div className="text-sm text-muted-foreground">Sem ação crítica. Continue registrando dose, formulação e check-ins.</div>}
        </TabsContent>
        <TabsContent value="meds" className="pt-3 grid lg:grid-cols-2 gap-3">
          {guidance.medicationSignals.map((m) => (
            <div key={m.key} className="rounded-xl border bg-card p-3 space-y-1">
              <div className="font-medium text-sm">{m.label}</div>
              <Badge variant="secondary" className="text-[10px]">{m.role}</Badge>
              <p className="text-sm"><span className="font-medium">Benefício:</span> {m.benefit}</p>
              <p className="text-sm"><span className="font-medium">Risco:</span> {m.risk}</p>
              <p className="text-xs text-muted-foreground">Próximo dado: {m.nextData}</p>
            </div>
          ))}
          {!guidance.medicationSignals.length && <div className="text-sm text-muted-foreground">Sem dose suficiente para sinal por medicação.</div>}
        </TabsContent>
        <TabsContent value="planos" className="pt-3 grid lg:grid-cols-3 gap-3">
          <Plan title="Conservador" items={guidance.conservativePlan} />
          <Plan title="Intermediário" items={guidance.intermediatePlan} />
          <Plan title="Ousado / alta precisão" items={guidance.boldPlan} />
        </TabsContent>
        <TabsContent value="perguntas" className="pt-3"><BulletList items={guidance.sessionQuestions} /></TabsContent>
        <TabsContent value="faltantes" className="pt-3"><BulletList items={guidance.missingData.length ? guidance.missingData : ["Sem lacunas críticas adicionais."]} /></TabsContent>
      </Tabs>
    </Card>
  );
}

function Mini({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-lg border bg-background/70 p-3"><div className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</div><div className="font-semibold mt-1">{value}</div></div>;
}
function Plan({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-xl border bg-card p-3"><div className="font-medium text-sm mb-2 flex items-center gap-2"><ClipboardList className="h-4 w-4" />{title}</div><BulletList items={items} /></div>;
}
function BulletList({ items }: { items: string[] }) {
  return <ul className="text-sm list-disc pl-5 space-y-1">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>;
}

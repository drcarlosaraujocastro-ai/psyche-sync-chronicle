import { Badge } from "@/components/ui/badge";
import type { Phase } from "@/domain/types";
import { cn } from "@/lib/utils";

const MAP: Record<Phase, { label: string; cls: string }> = {
  "pre-onset": { label: "Pré-onset", cls: "bg-muted text-muted-foreground" },
  subida: { label: "Subida", cls: "bg-info/15 text-info border-info/30" },
  pico: { label: "Pico", cls: "bg-warning/15 text-warning border-warning/30" },
  "platô": { label: "Platô", cls: "bg-success/15 text-success border-success/30" },
  descida: { label: "Descida", cls: "bg-secondary text-secondary-foreground" },
  residual: { label: "Residual", cls: "bg-muted text-muted-foreground" },
  washout: { label: "Washout", cls: "bg-muted text-muted-foreground" },
  "steady-state": { label: "Steady-state", cls: "bg-primary/15 text-primary border-primary/30" },
};

export function PhaseBadge({ phase }: { phase: Phase }) {
  const m = MAP[phase];
  return <Badge variant="outline" className={cn("font-medium", m.cls)}>{m.label}</Badge>;
}

const RELEVANCE: Record<string, string> = {
  informativa: "bg-muted text-muted-foreground",
  monitorar: "bg-info/15 text-info border-info/30",
  cautela: "bg-warning/15 text-warning border-warning/30",
  relevante: "bg-destructive/15 text-destructive border-destructive/30",
  urgente: "bg-destructive text-destructive-foreground border-destructive",
};

export function RelevanceBadge({ relevance }: { relevance: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium capitalize", RELEVANCE[relevance] ?? RELEVANCE.informativa)}>
      {relevance}
    </Badge>
  );
}
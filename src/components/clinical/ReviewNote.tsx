import { ShieldAlert } from "lucide-react";

export function ReviewNote({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-xs text-warning bg-warning/10 border border-warning/30 rounded-md px-3 py-2">
      <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>{children ?? "Revisão médica obrigatória. Curva relativa, não sérica. Dados insuficientes quando aplicável."}</span>
    </div>
  );
}
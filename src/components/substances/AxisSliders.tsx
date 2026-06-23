import { Slider } from "@/components/ui/slider";

export function AxisSliders({
  axes, value, onChange,
}: {
  axes: string[];
  value: Record<string, number> | null | undefined;
  onChange: (v: Record<string, number>) => void;
}) {
  const v = value ?? {};
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {axes.map((a) => {
        const n = Math.max(0, Math.min(100, Number(v[a] ?? 0)));
        return (
          <div key={a} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>{a}</span>
              <span className="font-mono text-muted-foreground">{n}</span>
            </div>
            <Slider
              value={[n]}
              min={0} max={100} step={5}
              onValueChange={(arr) => onChange({ ...v, [a]: arr[0] })}
            />
          </div>
        );
      })}
    </div>
  );
}
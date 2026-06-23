import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export function ChipInput({
  value, onChange, placeholder, suggestions,
}: {
  value: string[] | null | undefined;
  onChange: (v: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [text, setText] = useState("");
  const list = value ?? [];
  function add(v: string) {
    const t = v.trim();
    if (!t) return;
    if (!list.includes(t)) onChange([...list, t]);
    setText("");
  }
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {list.map((c) => (
          <Badge key={c} variant="secondary" className="text-[11px] gap-1 pr-1">
            {c}
            <button type="button" onClick={() => onChange(list.filter((x) => x !== c))} className="hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(text); } }}
        onBlur={() => text && add(text)}
        placeholder={placeholder ?? "digite e pressione Enter"}
      />
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions.filter((s) => !list.includes(s)).slice(0, 12).map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:bg-muted">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
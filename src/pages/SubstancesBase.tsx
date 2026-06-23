import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSubstances } from "@/lib/usePatients";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/clinical/PageHeader";
import { ReviewNote } from "@/components/clinical/ReviewNote";
import { SubstanceEditor } from "@/components/substances/SubstanceEditor";
import { SubstanceWizard } from "@/components/substances/SubstanceWizard";
import { PharmacologyExplainer } from "@/components/substances/PharmacologyExplainer";
import { withOwner } from "@/lib/supabase/withOwner";
import { KNOWLEDGE_BASE } from "@/lib/pharmacologyKnowledgeBase";
import { toFormulationInserts, toSubstanceInsert } from "@/lib/pharmacology/templateImport";
import { formatRange } from "@/lib/units";
import { Plus, Copy, Pencil, Trash2, Sparkles, FlaskConical, BookOpen, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function SubstancesBase() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useSubstances();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [explainer, setExplainer] = useState<any | null>(null);
  const [showKnowledgeImports, setShowKnowledgeImports] = useState(false);

  const isKnowledgeImport = (s: any) => {
    const src = String(s.source_notes ?? "").toLowerCase();
    const status = String(s.review_status ?? "").toLowerCase();
    return src.includes("template farmacológico") || src.includes("template farmacologico") || (status.includes("não revisada") && src.includes("revisão clínica obrigatória"));
  };

  const visibleData = showKnowledgeImports ? data : data.filter((s: any) => !isKnowledgeImport(s));
  const hiddenCount = data.length - visibleData.length;
  const aliasWarnings = visibleData
    .map((s: any) => {
      const name = String(s.name ?? "");
      const n = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (["lyberdia", "venvanse", "juneve", "vyvanse", "elvanse"].includes(n)) return `${name} parece ser produto/marca de Lisdexanfetamina; prefira cadastrar no paciente como produto e vincular ao canônico.`;
      if (["rivotril", "klonopin"].includes(n)) return `${name} parece ser produto/marca de Clonazepam; prefira vincular ao canônico.`;
      if (["vurtuoso", "brintellix", "trintellix"].includes(n)) return `${name} parece ser produto/marca de Vortioxetina; prefira vincular ao canônico.`;
      if (["atentah", "strattera"].includes(n)) return `${name} parece ser produto/marca de Atomoxetina; prefira vincular ao canônico.`;
      return null;
    })
    .filter(Boolean);

  const filtered = visibleData.filter((s: any) =>
    s.name?.toLowerCase().includes(q.toLowerCase()) ||
    s.clinical_category?.toLowerCase().includes(q.toLowerCase()) ||
    s.pharmacological_class?.toLowerCase().includes(q.toLowerCase()),
  );

  async function seedKB() {
    if (!user) return;
    if (!confirm("Importar templates da base local? Substâncias já existentes (mesmo nome) serão preservadas e ignoradas — nada será apagado.")) return;
    const existing = new Set(data.map((s: any) => s.name?.toLowerCase()));
    let imported = 0;
    let formulations = 0;
    for (const t of KNOWLEDGE_BASE) {
      if (existing.has(t.name.toLowerCase())) continue;
      const row = withOwner(toSubstanceInsert(t), user);
      const { data: created, error } = await supabase.from("substances").insert(row as any).select().single();
      if (error) {
        toast.error(`${t.name}: ${error.message}`);
        continue;
      }
      imported++;
      const forms = toFormulationInserts(t).map((fm) => withOwner({ ...fm, substance_id: created.id }, user));
      if (forms.length) {
        const { error: fmError } = await (supabase as any).from("substance_formulations").insert(forms);
        if (!fmError) formulations += forms.length;
        else toast.warning(`${t.name}: substância criada, mas formulação falhou (${fmError.message})`);
      }
    }
    if (!imported) return toast.message("Nada a importar.");
    toast.success(`Importadas ${imported} substâncias e ${formulations} formulações.`);
    qc.invalidateQueries({ queryKey: ["substances"] });
  }

  async function remove(id: string) {
    if (!confirm("Excluir substância?")) return;
    const { error } = await supabase.from("substances").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluída.");
    qc.invalidateQueries({ queryKey: ["substances"] });
  }

  function duplicate(s: any) {
    const { id, created_at, updated_at, ...rest } = s;
    setEditing({ ...rest, name: `${s.name} (cópia)` });
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Base farmacológica"
        description="Substâncias revisadas do usuário. A base de conhecimento fica separada e serve para reconhecer aliases e importar canônicos."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/conhecimento-farmacologico"><Button variant="outline"><BookOpen className="h-4 w-4 mr-1.5" />Conhecimento</Button></Link>
            <Button variant="outline" onClick={() => setShowKnowledgeImports((v) => !v)}>{showKnowledgeImports ? <EyeOff className="h-4 w-4 mr-1.5" /> : <Eye className="h-4 w-4 mr-1.5" />}{showKnowledgeImports ? "Ocultar templates" : "Mostrar templates importados"}</Button>
            <Button variant="outline" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1.5" />Editor avançado</Button>
            <Button onClick={() => setWizardOpen(true)}><Sparkles className="h-4 w-4 mr-1.5" />Adicionar substância</Button>
          </div>
        }
      />
      <ReviewNote>Esta tela mostra apenas substâncias revisadas/criadas pelo usuário por padrão. A biblioteca grande de conhecimento fica em “Conhecimento” e não deve poluir esta lista. Marcas como Lyberdia devem ser produto do paciente vinculado ao canônico Lisdexanfetamina, não outra substância.</ReviewNote>
      {hiddenCount > 0 && !showKnowledgeImports && <div className="text-xs text-muted-foreground">{hiddenCount} template(s) importado(s) foram ocultados para não poluir a base clínica. Use “Mostrar templates importados” apenas para manutenção.</div>}
      {aliasWarnings.length > 0 && (
        <Card className="p-3 border-warning/40 bg-warning/5 text-sm space-y-1">
          <div className="font-medium flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" />Possíveis duplicatas por marca/produto</div>
          <ul className="list-disc pl-5 text-xs text-muted-foreground">{aliasWarnings.slice(0, 4).map((w: any, i: number) => <li key={i}>{w}</li>)}</ul>
        </Card>
      )}
      <Input placeholder="Buscar por nome, classe ou categoria…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((s: any) => (
          <Card key={s.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{s.name}</div>
                <div className="text-xs text-muted-foreground truncate">{s.clinical_category ?? s.pharmacological_class ?? "—"}</div>
              </div>
              <Badge variant="outline" className="text-[9px] shrink-0">{s.review_status ?? "não revisada"}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
              <div>onset: {formatRange(s.onset_min_value, s.onset_max_value, s.onset_unit)}</div>
              <div>pico: {formatRange(s.peak_min_value, s.peak_max_value, s.peak_unit)}</div>
              <div>duração: {formatRange(s.total_duration_min_value, s.total_duration_max_value, s.total_duration_unit)}</div>
              <div>t½: {formatRange(s.half_life_min_value, s.half_life_max_value, s.half_life_unit)}</div>
            </div>
            <div className="flex flex-wrap gap-1">
              {s.default_curve_model && <Badge variant="secondary" className="text-[10px]">{s.default_curve_model}</Badge>}
              {(s.cyp_substrate ?? []).slice(0, 3).map((c: string) => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
              {s.abuse_risk_level && <Badge variant="outline" className="text-[10px] border-warning/40 text-warning">abuso: {s.abuse_risk_level}</Badge>}
              {s.sedation_risk_level && <Badge variant="outline" className="text-[10px]">sedação: {s.sedation_risk_level}</Badge>}
            </div>
            <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/50">
              <Button size="sm" variant="ghost" title="Explicar farmacologia" onClick={() => setExplainer(s)}><FlaskConical className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="ghost" onClick={() => duplicate(s)}><Copy className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>
      <SubstanceEditor open={open} onOpenChange={setOpen} initial={editing} onSaved={() => qc.invalidateQueries({ queryKey: ["substances"] })} />
      <SubstanceWizard open={wizardOpen} onOpenChange={setWizardOpen} onCreated={() => qc.invalidateQueries({ queryKey: ["substances"] })} />
      <PharmacologyExplainer open={!!explainer} onOpenChange={(b) => !b && setExplainer(null)} substance={explainer} />
    </div>
  );
}
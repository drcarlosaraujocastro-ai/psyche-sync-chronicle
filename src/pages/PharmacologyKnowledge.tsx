import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { resolveAlias } from "@/lib/pharmacology/aliasResolver";
import { ensureCanonicalSubstanceFromTemplate, templateSummary } from "@/lib/pharmacology/smartSubstance";
import { useSubstances } from "@/lib/usePatients";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/clinical/PageHeader";
import { ReviewNote } from "@/components/clinical/ReviewNote";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Download, Sparkles, ShieldAlert, Trash2, Upload, Wand2 } from "lucide-react";
import { KnowledgeDatabaseSync } from "@/components/substances/KnowledgeDatabaseSync";
import { toast } from "sonner";
import {
  appendImportedTemplates,
  buildExportableKnowledgePack,
  clearImportedKnowledgePack,
  getImportedKnowledgePack,
  getRuntimeKnowledgeBase,
  knowledgeDiagnostics,
  validateKnowledgePack,
} from "@/lib/pharmacology/runtimeKnowledge";

function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PharmacologyKnowledge() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: substances = [] } = useSubstances();
  const [q, setQ] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [version, setVersion] = useState(0);
  const knowledge = useMemo(() => getRuntimeKnowledgeBase(), [version]);
  const diagnostics = useMemo(() => knowledgeDiagnostics(knowledge), [knowledge]);
  const imported = useMemo(() => getImportedKnowledgePack(), [version]);
  const matches = useMemo(() => resolveAlias(q, 12), [q, version]);
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return knowledge.slice(0, 120);
    const matchKeys = new Set(matches.map((m) => m.template.normalized_key ?? m.template.name));
    return knowledge.filter((t) => matchKeys.has(t.normalized_key ?? t.name) || [t.name, t.generic_name, t.clinical_category, t.pharmacological_class, t.source_type].some((v) => String(v ?? "").toLowerCase().includes(query)));
  }, [q, matches, knowledge]);

  async function importTemplate(t: any) {
    if (!user) return;
    try {
      const r = await ensureCanonicalSubstanceFromTemplate(t, user, substances as any[]);
      toast.success(r.created ? `${t.name} importada com ${r.formulationsCreated} formulação(ões).` : `${t.name} já existia como substância canônica.`);
      qc.invalidateQueries({ queryKey: ["substances"] });
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao importar template.");
    }
  }

  function importJson() {
    try {
      const parsed = JSON.parse(jsonText);
      const pack = validateKnowledgePack(Array.isArray(parsed) ? { templates: parsed } : parsed);
      appendImportedTemplates(pack.templates ?? []);
      setJsonText("");
      setVersion((x) => x + 1);
      toast.success(`${pack.templates?.length ?? 0} template(s) importado(s) para conhecimento local.`);
    } catch (e: any) {
      toast.error(e.message ?? "JSON inválido.");
    }
  }

  function exportPack() {
    downloadJson(`psiconorte-knowledge-pack-${new Date().toISOString().slice(0, 10)}.json`, buildExportableKnowledgePack());
  }

  function clearImported() {
    if (!confirm("Limpar conhecimento importado localmente? A base interna permanece.")) return;
    clearImportedKnowledgePack();
    setVersion((x) => x + 1);
    toast.success("Conhecimento importado localmente foi limpo.");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Conhecimento farmacológico" description="Biblioteca não deletável + pacotes JSON importáveis: aliases, marcas, vias, PK/PD, formulações, interações, efeitos 0–100 e harm reduction." />
      <ReviewNote>Conhecimento não é prontuário e não é substância do usuário. Ele serve para reconhecer nomes, sugerir estrutura, importar canônicos e alimentar motores de interação/fenomenologia. Fontes de harm reduction não orientam uso recreativo.</ReviewNote>

      <div className="grid md:grid-cols-5 gap-3">
        <Metric label="templates" value={diagnostics.total} />
        <Metric label="aliases" value={diagnostics.aliases} />
        <Metric label="harm reduction" value={diagnostics.harmReduction} />
        <Metric label="com formulação" value={diagnostics.withFormulations} />
        <Metric label="importados locais" value={diagnostics.imported} />
      </div>

      <Tabs defaultValue="buscar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="buscar">Buscar/importar</TabsTrigger>
          <TabsTrigger value="json">Pacote JSON</TabsTrigger>
          <TabsTrigger value="arquitetura">Arquitetura</TabsTrigger>
        </TabsList>

        <TabsContent value="buscar" className="space-y-4">
          <Card className="p-4 space-y-3">
            <div className="text-sm font-medium flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Resolver nome, marca, erro comum, substância lícita/ilícita</div>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ex.: Lyberdia, Venvanse, Atentah, Rivotril, codeína, MDMA, THC, ketamina, vape…" />
            {!!q && (
              <div className="flex flex-wrap gap-2">
                {matches.length === 0 ? <Badge variant="outline">sem match</Badge> : matches.map((m) => <Badge key={`${m.template.name}-${m.matchedAlias}`} variant="secondary">{m.matchedAlias} → {m.template.name} ({Math.round(m.score*100)}%)</Badge>)}
              </div>
            )}
          </Card>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((t: any) => {
              const s = templateSummary(t);
              const exists = (substances as any[]).some((x) => String(x.name).toLowerCase() === String(t.name).toLowerCase());
              return (
                <Card key={t.normalized_key ?? t.name} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><div className="font-medium truncate">{t.name}</div><div className="text-xs text-muted-foreground truncate">{t.pharmacological_class ?? t.clinical_category ?? "—"}</div></div>
                    <Badge variant={exists ? "default" : "outline"} className="text-[10px]">{exists ? "importada" : t.source_type ?? "template"}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-3">{t.mechanism_summary ?? t.short_description ?? "Template estrutural."}</div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px]">{s.curve}</Badge>
                    {t.substance_type && <Badge variant="outline" className="text-[10px]">{t.substance_type}</Badge>}
                    {t.abuse_risk_level && <Badge variant="outline" className="text-[10px] border-warning/40 text-warning">abuso {t.abuse_risk_level}</Badge>}
                    {t.cyp_substrate?.slice?.(0,2)?.map?.((c: string) => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                  </div>
                  <div className="text-[11px] text-muted-foreground"><span className="font-medium">Aliases:</span> {s.aliases || "—"}</div>
                  {t.source_type === "harm reduction" && <div className="text-[11px] text-warning flex gap-1"><ShieldAlert className="h-3.5 w-3.5 shrink-0" /> Monitoramento/redução de danos; sem orientação de uso.</div>}
                  <Button size="sm" variant={exists ? "outline" : "default"} onClick={() => importTemplate(t)}><Database className="h-3.5 w-3.5 mr-1" />{exists ? "Garantir formulação" : "Importar canônico"}</Button>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="json" className="space-y-4">
          <KnowledgeDatabaseSync onSynced={() => setVersion((x) => x + 1)} />
          <Card className="p-4 space-y-3">
            <div className="font-medium flex items-center gap-2"><Upload className="h-4 w-4 text-primary" /> Importar conhecimento por JSON</div>
            <div className="text-xs text-muted-foreground">Cole um objeto com <code>{`{ templates: [...] }`}</code> ou um array de templates. Isso fica no navegador e passa a alimentar alias resolver, criação de substâncias, interações e fenomenologia — sem Git, sem Lovable, sem migration.</div>
            <Textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)} rows={10} placeholder='{"name":"Knowledge Pack", "templates":[{"name":"...", "match":["..."], "formulations":[...]}]}' />
            <div className="flex flex-wrap gap-2">
              <Button onClick={importJson} disabled={!jsonText.trim()}><Upload className="h-4 w-4 mr-1.5" />Importar JSON</Button>
              <Button variant="outline" onClick={exportPack}><Download className="h-4 w-4 mr-1.5" />Exportar pack atual</Button>
              <Button variant="outline" onClick={clearImported} disabled={!imported.templates?.length}><Trash2 className="h-4 w-4 mr-1.5" />Limpar importados</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="arquitetura">
          <Card className="p-4 space-y-3 text-sm">
            <div className="font-medium flex items-center gap-2"><Wand2 className="h-4 w-4 text-primary" /> Separação correta</div>
            <div className="grid md:grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div><b>Conhecimento:</b> biblioteca não deletável; aliases; Psychonaut/Erowid/harm reduction como fonte observacional; não aparece como substância clínica.</div>
              <div><b>Substância:</b> item revisado pelo médico, criado a partir de template ou manualmente.</div>
              <div><b>Formulação:</b> curva real usada no cálculo: onset, come-up, pico, platô, offset, cauda, steady-state.</div>
              <div><b>Medicamento do paciente:</b> produto/marca + canônico + dose + racional + tolerância individual.</div>
              <div><b>Dose:</b> evento temporal dentro da sessão/diário: horário, alimento, cafeína, sono, redose, efeito percebido.</div>
              <div><b>Fenomenologia:</b> interpretação longitudinal da experiência subjetiva contra a curva teórica.</div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card className="p-3"><div className="text-2xl font-semibold">{value}</div><div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div></Card>;
}

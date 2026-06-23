import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, UploadCloud, DatabaseZap } from "lucide-react";
import { toast } from "sonner";
import { appendImportedTemplates, buildExportableKnowledgePack, getImportedKnowledgePack, getRuntimeKnowledgeBase } from "@/lib/pharmacology/runtimeKnowledge";

type Props = { onSynced?: () => void };

function normalizeKey(t: any) {
  return String(t.normalized_key ?? t.name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function KnowledgeDatabaseSync({ onSynced }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const importedLocal = getImportedKnowledgePack().templates ?? [];
  const runtime = useMemo(() => getRuntimeKnowledgeBase(), []);
  const { data: remote = [], refetch, isFetching } = useQuery({
    queryKey: ["pharmacology-knowledge-db"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pharmacology_knowledge_templates")
        .select("id, normalized_key, canonical_name, source_type, confidence, data, updated_at")
        .order("canonical_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function pushToSupabase() {
    if (!user) return toast.error("Não autenticado.");
    const templates = runtime.map((t: any) => ({
      owner_id: user.id,
      normalized_key: normalizeKey(t),
      canonical_name: t.name,
      source_type: t.source_type ?? t.sourceType ?? "runtime",
      confidence: t.confidence ?? t.confidence_level ?? "média",
      data: { ...t, normalized_key: normalizeKey(t), requires_clinical_review: true, needs_review: true },
    }));
    const { error } = await (supabase as any)
      .from("pharmacology_knowledge_templates")
      .upsert(templates, { onConflict: "owner_id,normalized_key" });
    if (error) return toast.error(error.message);
    toast.success(`${templates.length} template(s) sincronizados para o Supabase.`);
    qc.invalidateQueries({ queryKey: ["pharmacology-knowledge-db"] });
    await refetch();
  }

  async function pullFromSupabase() {
    const rows = remote as any[];
    if (!rows.length) return toast.message("Nenhum template remoto encontrado.");
    appendImportedTemplates(rows.map((r) => r.data).filter(Boolean));
    toast.success(`${rows.length} template(s) puxados do Supabase para a base runtime local.`);
    onSynced?.();
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(buildExportableKnowledgePack(), null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `psiconorte-knowledge-pack-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="p-4 space-y-3 border-primary/20 bg-primary/5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="font-medium flex items-center gap-2"><DatabaseZap className="h-4 w-4 text-primary" /> Banco de conhecimento sincronizável</div>
          <div className="text-xs text-muted-foreground mt-1">A base runtime deixa de ficar presa ao código: exporte/importa JSON e sincronize no Supabase para alimentar aliases, PK/PD, interações e fenomenologia.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">runtime {runtime.length}</Badge>
          <Badge variant="outline">local {importedLocal.length}</Badge>
          <Badge variant="outline">Supabase {remote.length}</Badge>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={pushToSupabase}><UploadCloud className="h-4 w-4 mr-1.5" />Salvar runtime no Supabase</Button>
        <Button size="sm" variant="outline" onClick={pullFromSupabase} disabled={!remote.length}><RefreshCw className="h-4 w-4 mr-1.5" />Puxar do Supabase</Button>
        <Button size="sm" variant="outline" onClick={exportJson}><Download className="h-4 w-4 mr-1.5" />Exportar JSON</Button>
        <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>Atualizar contagem</Button>
      </div>
      <div className="text-[11px] text-muted-foreground">Se a tabela ainda não existir, rode a migration `runtime_knowledge_database`. A UI continua funcionando localmente mesmo sem banco remoto.</div>
    </Card>
  );
}

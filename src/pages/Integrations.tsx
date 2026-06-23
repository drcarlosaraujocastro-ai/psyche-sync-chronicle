import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/clinical/PageHeader";
import { ReviewNote } from "@/components/clinical/ReviewNote";
import { useAuth } from "@/lib/auth";
import {
  getMedxSettings, upsertMedxSettings, copyPreCadastroLink, openPreCadastroLink,
  logIntegration, listIntegrationLogs,
} from "@/lib/integrations/medx/preCadastro";
import { Copy, ExternalLink, Save, FlaskConical, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

function maskKey(k?: string | null) {
  if (!k) return "";
  if (k.length <= 6) return "••••";
  return k.slice(0, 3) + "••••••" + k.slice(-3);
}

export default function Integrations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showFull, setShowFull] = useState(false);
  const [url, setUrl] = useState("");
  const [keyInput, setKeyInput] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["medx-settings", user?.id],
    enabled: !!user,
    queryFn: async () => getMedxSettings(user!),
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["medx-logs", user?.id],
    enabled: !!user,
    queryFn: async () => listIntegrationLogs(user!),
  });

  const status = settings?.status ?? "not_configured";
  const currentUrl = settings?.public_config?.precadastro_url ?? "";
  const currentMask = settings?.public_config?.key_masked ?? "";

  async function save() {
    if (!user) return;
    try {
      await upsertMedxSettings(user, {
        precadastro_url: (url || currentUrl) || undefined,
        key_masked: keyInput ? maskKey(keyInput) : (currentMask || undefined),
        status: (url || currentUrl) ? "link_mode" : "not_configured",
      });
      await logIntegration(user, { action: "save_settings", status: "ok",
        request_summary: { has_url: !!(url || currentUrl), has_key_mask: !!keyInput } });
      toast.success("Integração MedX salva (modo link).");
      setKeyInput("");
      qc.invalidateQueries({ queryKey: ["medx-settings"] });
      qc.invalidateQueries({ queryKey: ["medx-logs"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar.");
    }
  }

  async function copyLink() {
    try { await copyPreCadastroLink(settings ?? null); toast.success("Link copiado."); }
    catch (e: any) { toast.error(e?.message ?? "Falha ao copiar."); }
  }
  function openLink() {
    try { openPreCadastroLink(settings ?? null); }
    catch (e: any) { toast.error(e?.message ?? "URL não configurada."); }
  }
  async function testIntegration() {
    if (!user) return;
    const ok = !!currentUrl;
    await logIntegration(user, { action: "test_integration", status: ok ? "ok" : "fail",
      error_message: ok ? null : "URL de pré-cadastro ausente." });
    qc.invalidateQueries({ queryKey: ["medx-logs"] });
    toast[ok ? "success" : "error"](ok ? "Integração em modo link OK (sem chamada de API real)." : "Configure a URL primeiro.");
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Integrações" description="Token MedX é tratado como segredo server-side. Modo atual: somente link/preparado." />
      <ReviewNote />

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">MedX</div>
          <Badge variant="outline" className="text-[10px] uppercase">{status.replace("_", " ")}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Esta integração não envia dados clínicos automaticamente. Apenas pré-cadastro administrativo via link.
          O token nunca aparece no frontend nem no backup.
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase text-muted-foreground">URL de pré-cadastro (MEDX_PRECADASTRO_URL)</Label>
            <Input placeholder={currentUrl || "https://medx.exemplo/pre-cadastro?ref=..."} value={url} onChange={(e) => setUrl(e.target.value)} />
            {currentUrl && <div className="text-[11px] text-muted-foreground truncate">atual: {currentUrl}</div>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase text-muted-foreground">Chave de pré-cadastro (mascarada)</Label>
            <div className="flex gap-2">
              <Input type={showFull ? "text" : "password"} placeholder="cole para mascarar e salvar" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} />
              <Button type="button" variant="outline" size="icon" onClick={() => setShowFull((v) => !v)}>
                {showFull ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <div className="text-[11px] text-muted-foreground">salva: {currentMask || "—"} • placeholder server-side: <code>MEDX_API_TOKEN</code></div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button onClick={save}><Save className="h-4 w-4 mr-1.5" />Salvar configuração</Button>
          <Button variant="outline" onClick={openLink} disabled={!currentUrl}><ExternalLink className="h-4 w-4 mr-1.5" />Abrir pré-cadastro</Button>
          <Button variant="outline" onClick={copyLink} disabled={!currentUrl}><Copy className="h-4 w-4 mr-1.5" />Copiar link</Button>
          <Button variant="outline" onClick={testIntegration}><FlaskConical className="h-4 w-4 mr-1.5" />Testar integração</Button>
        </div>

        <div className="text-[11px] text-muted-foreground">
          Última verificação: {settings?.last_checked_at ? new Date(settings.last_checked_at).toLocaleString("pt-BR") : "—"} •
          Último sucesso: {settings?.last_success_at ? new Date(settings.last_success_at).toLocaleString("pt-BR") : "—"} •
          Último erro: {settings?.last_error ?? "—"}
        </div>
      </Card>

      <Card className="p-4 space-y-2">
        <div className="text-sm font-medium">Logs de integração</div>
        {logs.length === 0 ? (
          <div className="text-xs text-muted-foreground">Nenhum log ainda.</div>
        ) : (
          <ul className="text-xs space-y-1 max-h-60 overflow-auto">
            {logs.map((l: any) => (
              <li key={l.id} className="flex items-center justify-between gap-2 border-b border-border/40 pb-1">
                <span className="font-mono text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
                <span className="flex-1 truncate">{l.action}</span>
                <Badge variant="outline" className="text-[9px]">{l.status ?? "—"}</Badge>
                {l.error_message && <span className="text-destructive truncate max-w-[200px]">{l.error_message}</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
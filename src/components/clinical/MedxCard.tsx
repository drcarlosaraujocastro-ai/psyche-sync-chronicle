import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  getMedxSettings, getMedxPatientLink, upsertMedxPatientLink,
  copyPreCadastroLink, openPreCadastroLink, logIntegration,
} from "@/lib/integrations/medx/preCadastro";
import { Copy, ExternalLink, CheckCircle2, RefreshCw, Settings } from "lucide-react";
import { toast } from "sonner";

export function MedxCard({ patientId }: { patientId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["medx-settings", user?.id], enabled: !!user, queryFn: () => getMedxSettings(user!) });
  const { data: link } = useQuery({ queryKey: ["medx-link", patientId], enabled: !!user && !!patientId, queryFn: () => getMedxPatientLink(user!, patientId) });

  async function copy() { try { await copyPreCadastroLink(settings ?? null); toast.success("Link copiado."); } catch (e: any) { toast.error(e.message); } }
  function open() { try { openPreCadastroLink(settings ?? null); } catch (e: any) { toast.error(e.message); } }
  async function markSent() {
    if (!user) return;
    await upsertMedxPatientLink(user, patientId, {
      medx_status: "sent",
      medx_precadastro_url: settings?.public_config?.precadastro_url ?? null,
      last_sent_at: new Date().toISOString(), last_error: null,
    });
    await logIntegration(user, { action: "mark_precadastro_sent", status: "ok", patient_id: patientId });
    qc.invalidateQueries({ queryKey: ["medx-link", patientId] });
    toast.success("Marcado como enviado.");
  }
  async function refreshStatus() {
    if (!user) return;
    await upsertMedxPatientLink(user, patientId, { medx_status: link?.medx_status ?? "not_sent" });
    await logIntegration(user, { action: "refresh_status", status: "ok", patient_id: patientId });
    qc.invalidateQueries({ queryKey: ["medx-link", patientId] });
    toast.success("Status atualizado (modo link).");
  }

  const integrationStatus = settings?.status ?? "not_configured";
  const linkStatus = link?.medx_status ?? "not_sent";
  const url = settings?.public_config?.precadastro_url;

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">MedX / Pré-cadastro</div>
        <Badge variant="outline" className="text-[10px] uppercase">{integrationStatus.replace("_"," ")}</Badge>
      </div>
      <div className="text-[11px] text-muted-foreground">
        Vínculo deste paciente: <span className="font-medium">{linkStatus.replace("_"," ")}</span>
        {link?.last_sent_at && <> • enviado em {new Date(link.last_sent_at).toLocaleString("pt-BR")}</>}
      </div>
      {url ? (
        <div className="text-[11px] text-muted-foreground truncate">link: {url}</div>
      ) : (
        <div className="text-[11px] text-muted-foreground">URL de pré-cadastro não configurada. <Link to="/configuracoes/integracoes" className="underline">Configurar</Link>.</div>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={open} disabled={!url}><ExternalLink className="h-3.5 w-3.5 mr-1" />Abrir</Button>
        <Button size="sm" variant="outline" onClick={copy} disabled={!url}><Copy className="h-3.5 w-3.5 mr-1" />Copiar</Button>
        <Button size="sm" variant="outline" onClick={markSent}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Marcar enviado</Button>
        <Button size="sm" variant="outline" onClick={refreshStatus}><RefreshCw className="h-3.5 w-3.5 mr-1" />Atualizar</Button>
        <Link to="/configuracoes/integracoes"><Button size="sm" variant="ghost"><Settings className="h-3.5 w-3.5 mr-1" />Logs</Button></Link>
      </div>
      {link?.last_error && <div className="text-[11px] text-destructive">erro: {link.last_error}</div>}
      <div className="text-[10px] text-muted-foreground border-t border-border/50 pt-1">
        Não enviamos dados clínicos sensíveis automaticamente.
      </div>
    </Card>
  );
}
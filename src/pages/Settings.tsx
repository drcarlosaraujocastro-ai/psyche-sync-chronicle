import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/clinical/PageHeader";
import { ReviewNote } from "@/components/clinical/ReviewNote";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Trash2, UserPlus, Plug } from "lucide-react";
import { Link } from "react-router-dom";
import { DataPersistenceBanner } from "@/components/clinical/DataPersistenceBanner";
import { withOwner } from "@/lib/supabase/withOwner";

export default function SettingsPage() {
  const { user } = useAuth();
  async function deleteAll() {
    if (!confirm("Excluir TODOS os seus pacientes e dados clínicos? Esta ação é irreversível.")) return;
    if (!confirm("Confirmar exclusão definitiva?")) return;
    const { error } = await supabase.from("patients").delete().eq("owner_id", user!.id);
    if (error) return toast.error(error.message);
    toast.success("Dados clínicos excluídos");
  }
  async function createDemo() {
    if (!user) return;
    const { data: pat, error } = await supabase.from("patients").insert(withOwner({
      full_name: "Paciente Demo (fictício)",
      social_name: "Demo",
      birth_date: "1990-05-12",
      biological_sex: "feminino",
      status: "ativo",
      primary_diagnoses: ["TDAH", "TAG"],
      current_complaint: "Dificuldade de foco, ansiedade vespertina e insônia inicial.",
      tags: ["demo"],
    }, user)).select().single();
    if (error || !pat) return toast.error(error?.message ?? "Erro");
    await supabase.from("patient_target_symptoms").insert([
      withOwner({ patient_id: pat.id, symptom_name: "foco", baseline: 3, therapeutic_goal: 7, priority: 1, status: "ativo" }, user),
      withOwner({ patient_id: pat.id, symptom_name: "ansiedade", baseline: 7, therapeutic_goal: 3, priority: 2, status: "ativo" }, user),
      withOwner({ patient_id: pat.id, symptom_name: "insônia inicial", baseline: 6, therapeutic_goal: 2, priority: 3, status: "ativo" }, user),
    ]);
    await supabase.from("medication_dose_logs").insert([
      withOwner({ patient_id: pat.id, substance_name: "Lisdexanfetamina", dose_amount: 50, dose_unit: "mg", actual_time: new Date(Date.now() - 6*3600_000).toISOString(), stomach: "leve", log_type: "manutencao" }, user),
      withOwner({ patient_id: pat.id, substance_name: "Cafeína", dose_amount: 150, dose_unit: "mg", actual_time: new Date(Date.now() - 4*3600_000).toISOString(), stomach: "vazio", log_type: "manutencao", caffeine_amount: 150 }, user),
    ]);
    toast.success("Paciente demo criado");
  }
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Configurações" description="Conta, persistência, exportação e exclusão de dados." />
      <ReviewNote />
      <DataPersistenceBanner />
      <Card className="p-4 space-y-2">
        <div className="text-sm font-medium">Integrações</div>
        <p className="text-xs text-muted-foreground">MedX em modo somente link/preparado. Token tratado como segredo server-side.</p>
        <Link to="/configuracoes/integracoes"><Button variant="outline"><Plug className="h-4 w-4 mr-1.5" />Abrir integrações</Button></Link>
      </Card>
      <Card className="p-4 space-y-3">
        <div className="text-sm font-medium">Conta</div>
        <div className="text-xs text-muted-foreground">Conectado como <b>{user?.email}</b></div>
      </Card>
      <Card className="p-4 space-y-3">
        <div className="text-sm font-medium">Dados de demonstração</div>
        <p className="text-xs text-muted-foreground">Cria um paciente fictício com sintomas-alvo e doses recentes para explorar curvas, auditoria e interações.</p>
        <Button variant="outline" onClick={createDemo}><UserPlus className="h-4 w-4 mr-1.5" />Criar paciente demo fictício</Button>
      </Card>
      <Card className="p-4 space-y-3 border-destructive/30">
        <div className="text-sm font-medium text-destructive">Zona de risco</div>
        <p className="text-xs text-muted-foreground">Exclui todos os pacientes e dados vinculados desta conta.</p>
        <Button variant="destructive" onClick={deleteAll}><Trash2 className="h-4 w-4 mr-1.5" />Excluir todos os dados clínicos</Button>
      </Card>
    </div>
  );
}
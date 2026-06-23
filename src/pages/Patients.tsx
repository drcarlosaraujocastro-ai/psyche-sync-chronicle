import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/clinical/PageHeader";
import { EmptyState } from "@/components/clinical/EmptyState";
import { usePatients } from "@/lib/usePatients";
import { Plus, Users } from "lucide-react";
import { useState } from "react";
import { age } from "@/lib/format";

export default function Patients() {
  const { data = [], isLoading } = usePatients();
  const [q, setQ] = useState("");
  const filtered = data.filter((p: any) =>
    p.full_name?.toLowerCase().includes(q.toLowerCase()) || p.social_name?.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pacientes"
        description="Lista de pacientes em acompanhamento. Cada conta vê apenas seus próprios pacientes."
        actions={
          <Link to="/pacientes/novo">
            <Button><Plus className="h-4 w-4 mr-1.5" />Novo paciente</Button>
          </Link>
        }
      />
      <div className="flex gap-2">
        <Input placeholder="Buscar por nome…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="Nenhum paciente"
          description="Cadastre o primeiro paciente para começar o monitoramento."
          action={<Link to="/pacientes/novo"><Button>Cadastrar paciente</Button></Link>}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p: any) => (
            <Link key={p.id} to={`/pacientes/${p.id}`}>
              <Card className="p-4 hover:border-primary/50 transition-colors h-full">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.full_name}</div>
                    {p.social_name && <div className="text-xs text-muted-foreground">({p.social_name})</div>}
                    <div className="text-xs text-muted-foreground mt-1">
                      {age(p.birth_date) ?? "—"} anos • {p.biological_sex ?? "—"}
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize text-xs">{p.status}</Badge>
                </div>
                {p.primary_diagnoses?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.primary_diagnoses.slice(0, 3).map((d: string) => (
                      <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>
                    ))}
                  </div>
                )}
                {p.current_complaint && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{p.current_complaint}</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
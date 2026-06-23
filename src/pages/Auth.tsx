import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    if (session) nav("/", { replace: true });
  }, [session, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name },
          },
        });
        if (error) throw error;
        toast.success("Cadastro realizado. Verifique seu e-mail se necessário.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav("/", { replace: true });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro de autenticação");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center font-bold">PN</div>
            <div>
              <div className="text-base font-semibold">PsicoNorte Clínico</div>
              <div className="text-xs uppercase tracking-wider text-sidebar-foreground/60">Clinical Sync</div>
            </div>
          </div>
          <h2 className="mt-16 text-3xl font-semibold leading-tight max-w-md">
            Monitoramento clínico longitudinal, com contexto e segurança.
          </h2>
          <p className="mt-4 text-sm text-sidebar-foreground/70 max-w-md">
            Sessões clínicas, doses interpretáveis, curvas relativas 0–100, uso de substâncias e
            interações contextuais — sem alarmismo, sem prescrição automática.
          </p>
        </div>
        <div className="text-xs text-sidebar-foreground/50">
          Ferramenta de apoio clínico. Não substitui avaliação médica, exame físico, diretrizes, bula ou julgamento profissional.
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <h1 className="text-xl font-semibold">{mode === "signin" ? "Entrar" : "Criar conta"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acesso profissional restrito. Cada conta vê apenas seus próprios pacientes.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome do profissional</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
            </Button>
          </form>
          <div className="mt-4 text-sm text-center text-muted-foreground">
            {mode === "signin" ? (
              <button className="hover:underline" onClick={() => setMode("signup")}>
                Ainda não tem conta? Cadastre-se
              </button>
            ) : (
              <button className="hover:underline" onClick={() => setMode("signin")}>
                Já tem conta? Entrar
              </button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
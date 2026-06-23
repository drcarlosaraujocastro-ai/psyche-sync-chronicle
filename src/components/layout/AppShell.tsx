import { ReactNode, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, CalendarClock, Pill, Activity, LineChart, Target,
  Zap, FileText, FlaskConical, Settings, Stethoscope, LogOut, Moon, Sun,
  Menu, ShieldCheck, Home,
  BrainCircuit,
  Package, BookOpen, NotebookPen, Wrench,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pacientes", label: "Pacientes", icon: Users },
  { to: "/sessoes", label: "Sessões", icon: CalendarClock },
  { to: "/medicamentos", label: "Medicamentos", icon: Pill },
  { to: "/diario-paciente", label: "Diário", icon: NotebookPen },
  { to: "/estoque-medicamentos", label: "Estoque", icon: Package },
  { to: "/doses", label: "Doses", icon: Activity },
  { to: "/uso-substancias", label: "Uso de substâncias", icon: FlaskConical },
  { to: "/curvas", label: "Curvas PK/PD", icon: LineChart },
  { to: "/inteligencia-clinica", label: "Inteligência clínica", icon: BrainCircuit },
  { to: "/sintomas", label: "Sintomas-alvo", icon: Target },
  { to: "/interacoes", label: "Interações", icon: Zap },
  { to: "/auditoria", label: "Auditoria clínica", icon: ShieldCheck },
  { to: "/relatorios", label: "Relatórios", icon: FileText },
  { to: "/base-farmacologica", label: "Substâncias", icon: Stethoscope },
  { to: "/conhecimento-farmacologico", label: "Conhecimento", icon: BookOpen },
  { to: "/diagnostico-sistema", label: "Diagnóstico", icon: Wrench },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

const BOTTOM_NAV = [
  { to: "/", label: "Início", icon: Home },
  { to: "/pacientes", label: "Pacientes", icon: Users },
  { to: "/diario-paciente", label: "Diário", icon: NotebookPen },
  { to: "/sessoes", label: "Sessões", icon: CalendarClock },
];

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("pn-theme") as any) ||
      (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("pn-theme", theme);
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}

function Brand() {
  return (
    <div className="px-5 py-5 border-b border-sidebar-border">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-md bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center font-bold">PN</div>
        <div>
          <div className="text-sm font-semibold leading-tight">PsicoNorte</div>
          <div className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60">Clinical Sync</div>
        </div>
      </div>
    </div>
  );
}

function NavList({ pathname, onNav }: { pathname: string; onNav?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
      {NAV.map((n) => {
        const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
        return (
          <NavLink
            key={n.to}
            to={n.to}
            onClick={onNav}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <n.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{n.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <Brand />
        <NavList pathname={pathname} />
        <div className="px-3 py-3 border-t border-sidebar-border text-xs text-sidebar-foreground/70 space-y-2">
          <div className="truncate">{user?.email}</div>
          <Button size="sm" variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card/80 backdrop-blur sticky top-0 z-10 flex items-center px-3 sm:px-4 gap-2">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 bg-sidebar text-sidebar-foreground border-sidebar-border">
              <div className="flex flex-col h-full">
                <Brand />
                <NavList pathname={pathname} onNav={() => setMobileOpen(false)} />
                <div className="px-3 py-3 border-t border-sidebar-border text-xs text-sidebar-foreground/70 space-y-2">
                  <div className="truncate">{user?.email}</div>
                  <Button size="sm" variant="ghost" className="w-full justify-start" onClick={signOut}>
                    <LogOut className="h-4 w-4 mr-2" /> Sair
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <div className="md:hidden font-semibold text-sm">PsicoNorte</div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden lg:block text-xs text-muted-foreground max-w-md truncate">
              Ferramenta de apoio clínico — não substitui avaliação médica, exame, diretrizes ou bula.
            </div>
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-20 md:pb-6">{children}</main>
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t bg-card/95 backdrop-blur flex justify-around h-14">
          {BOTTOM_NAV.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <NavLink key={n.to} to={n.to} className={cn(
                "flex flex-col items-center justify-center flex-1 text-[10px] gap-0.5",
                active ? "text-primary font-medium" : "text-muted-foreground",
              )}>
                <n.icon className="h-5 w-5" />
                {n.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

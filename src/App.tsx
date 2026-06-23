import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import AuthPage from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import PatientEdit from "./pages/PatientEdit";
import PatientCockpit from "./pages/PatientCockpit";
import Sessions from "./pages/Sessions";
import SessionView from "./pages/SessionView";
import Medications from "./pages/Medications";
import MedicationInventory from "./pages/MedicationInventory";
import PatientDiary from "./pages/PatientDiary";
import PharmacologyKnowledge from "./pages/PharmacologyKnowledge";
import ClinicalIntelligence from "./pages/ClinicalIntelligence";
import Doses from "./pages/Doses";
import SubstanceUse from "./pages/SubstanceUse";
import Curves from "./pages/Curves";
import Symptoms from "./pages/Symptoms";
import Interactions from "./pages/Interactions";
import Reports from "./pages/Reports";
import SubstancesBase from "./pages/SubstancesBase";
import SettingsPage from "./pages/Settings";
import Audit from "./pages/Audit";
import SystemDiagnostics from "./pages/SystemDiagnostics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

function Protected({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Carregando…</div>;
  if (!session) return <Navigate to="/auth" replace state={{ from: loc.pathname }} />;
  return <AppShell>{children}</AppShell>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<Protected><Dashboard /></Protected>} />
            <Route path="/pacientes" element={<Protected><Patients /></Protected>} />
            <Route path="/pacientes/novo" element={<Protected><PatientEdit /></Protected>} />
            <Route path="/pacientes/:id" element={<Protected><PatientCockpit /></Protected>} />
            <Route path="/pacientes/:id/editar" element={<Protected><PatientEdit /></Protected>} />
            <Route path="/sessoes" element={<Protected><Sessions /></Protected>} />
            <Route path="/sessoes/:id" element={<Protected><SessionView /></Protected>} />
            <Route path="/medicamentos" element={<Protected><Medications /></Protected>} />
            <Route path="/diario-paciente" element={<Protected><PatientDiary /></Protected>} />
            <Route path="/estoque-medicamentos" element={<Protected><MedicationInventory /></Protected>} />
            <Route path="/doses" element={<Protected><Doses /></Protected>} />
            <Route path="/uso-substancias" element={<Protected><SubstanceUse /></Protected>} />
            <Route path="/curvas" element={<Protected><Curves /></Protected>} />
            <Route path="/inteligencia-clinica" element={<Protected><ClinicalIntelligence /></Protected>} />
            <Route path="/sintomas" element={<Protected><Symptoms /></Protected>} />
            <Route path="/interacoes" element={<Protected><Interactions /></Protected>} />
            <Route path="/relatorios" element={<Protected><Reports /></Protected>} />
            <Route path="/auditoria" element={<Protected><Audit /></Protected>} />
            <Route path="/base-farmacologica" element={<Protected><SubstancesBase /></Protected>} />
            <Route path="/conhecimento-farmacologico" element={<Protected><PharmacologyKnowledge /></Protected>} />
            <Route path="/diagnostico-sistema" element={<Protected><SystemDiagnostics /></Protected>} />
            <Route path="/configuracoes" element={<Protected><SettingsPage /></Protected>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

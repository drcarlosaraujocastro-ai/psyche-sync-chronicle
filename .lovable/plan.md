
# Iteração cirúrgica do PsicoNorte Clínico

Foco: **preservar dados, consertar auth/RLS, transformar substâncias em núcleo clínico vivo**. Sem recriar app, sem DROP, sem TRUNCATE, sem seed destrutivo. Tudo idempotente.

---

## 1. Persistência e auth (bloco fundacional)

- `src/lib/auth/ensureProfile.ts` — garante linha em `profiles` para `auth.uid()`; chamado no `AuthProvider` após login e ao montar `AppShell`. Nunca duplica, nunca sobrescreve.
- `src/lib/supabase/withOwner.ts` — `withOwner(payload, user)` injeta `owner_id = user.id`, bloqueia inserts sem usuário, retorna erro claro.
- Refatorar todos os `supabase.from(...).insert(...)` clínicos para usar `withOwner` (patients, sessões, doses, substâncias do usuário, check-ins, medicamentos, sintomas, perfis de resposta).
- `AuthProvider`: após login, navega para `/` (Dashboard) e dispara `ensureProfile`.
- Aviso visual quando `auth.uid()` muda entre sessões: "Conta diferente — dados anteriores ficam vinculados à conta antiga. Importe backup para migrar."

## 2. Migration idempotente (uma única migração nova)

Tudo com `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` / `CREATE POLICY IF NOT EXISTS` via `DO $$ ... $$`. Inclui:

- `substance_formulations` (nova tabela, RLS por `owner_id`, FK para `substances`, com curva min/max/unidade por fase, food_effect_profile jsonb, has_steady_state, has_tail).
- `session_checkins` (nova tabela, RLS por `owner_id`, FK para `clinical_sessions`, ~20 eixos 0–10 + texto livre + timestamp).
- `patient_substance_response_profiles`: garantir colunas `n_registros`, `confidence`, `axis_deltas jsonb`, `food_sensitivity`, `caffeine_sensitivity`, `sleep_sensitivity`, `redose_risk`, `paranoia_risk` se faltarem.
- `medication_dose_logs`: adicionar `formulation_id`, `meal_size`, `meal_fat_0_10`, `minutes_since_meal`, `sleep_hours_prior`, `sleep_deprivation_0_10`, `goal`, `perceived_effect`, `adverse_event` se faltarem.
- `clinical_sessions`: garantir `sleep_deprivation_0_10`, `caffeine_total_mg`, `alcohol_use_today`, `baseline_mood` se faltarem.
- Re-aplicar GRANTs e policies `auth.uid() = owner_id` (FOR ALL com CHECK) idempotentemente, para qualquer tabela que esteja sem.
- Trigger `handle_new_user` já existe — mantido.

## 3. Backup / Restore (`/configuracoes/dados`)

- `src/lib/backup/exportAll.ts` — exporta todas as tabelas do usuário em JSON versionado (`schema_version`, `exported_at`, `owner_id`).
- `src/lib/backup/importBackup.ts` — valida schema, mostra prévia (contagem por tabela), UPSERT por `id` com `ON CONFLICT DO UPDATE` (server-side via RPC ou client-side upsert), remapeia `owner_id` antigo com confirmação, registra `audit_logs`.
- `DataPersistenceBanner` em Configurações: email, owner_id, status conexão, contagens (pacientes/substâncias/sessões/doses), último export, botões export/import/backup-antes-de-atualizar.

## 4. Wizard "Adicionar substância" (4 passos)

Substitui o formulário gigante na entrada principal. Editor avançado de 12 abas continua acessível como "Editor avançado".

- **Passo 1 — Identificação**: nome + tipo + busca fuzzy no `KNOWLEDGE_BASE` local (Venvanse→lisdexanfetamina, Rivotril→clonazepam, etc.), botões "usar template", "criar do zero", "duplicar existente". Salva sinônimos/nomes comerciais.
- **Passo 2 — Curva e formulação**: onset/come-up/pico/platô/offset/duração/meia-vida/steady-state/cauda — cada um min/max/unidade (min/h/d/sem). `CurvePreview` ao lado atualizando ao vivo.
- **Passo 3 — Efeitos 0–100**: dois grupos de sliders (terapêuticos + adversos), conforme listas do briefing. Persistem em `clinical_effect_profile` / `adverse_effect_profile` jsonb.
- **Passo 4 — Metabolismo/segurança**: CYP/UGT/P-gp (ChipInput), food_effect_profile (atraso, gordura, vazio), cafeína, álcool, privação de sono, alertas, monitorização.
- Botões finais: Salvar / Salvar e adicionar dose / Salvar e vincular a paciente / Salvar e duplicar formulação.
- Após salvar → navega para `/base-farmacologica/:id` com curva preview e aviso de revisão.

## 5. Página de detalhe da substância `/base-farmacologica/:id`

Abas: Visão geral · Curva · Efeitos 0–100 · PK · PD · Enzimas · Interações · Segurança · Histórico no paciente · Revisão/fontes. Cada aba edita parcialmente e mostra indicador "salvo".

## 6. Editor avançado: melhorias UX (mantido)

Salvar parcial por aba, indicador "salvo", colapsar grupos, destacar campos críticos faltantes, botões "preencher pelo template" / "comparar com template" / "reverter campo" / "duplicar como nova formulação".

## 7. Formulações por substância

- Tabela `substance_formulations` (ver §2).
- No registro de dose: selects encadeados `substância → formulação` (default = `default_formulation_id`).
- Curva usa parâmetros da formulação, com fallback para substância.

## 8. Registro de dose inteligente

Form refatorado com: substância, formulação, dose, unidade, horário real, via, com alimento, estômago 0–10, horário última refeição (→ minutos automáticos), tamanho/gordura da refeição, cafeína próxima (mg), sono 24h, privação 0–10, objetivo, efeito percebido, evento adverso. Após salvar: curva, previsão, interações, gráficos atualizam. Resumo contextual (atraso esperado por alimento) — fallback conservador quando faltar dado estruturado.

## 9. Check-in clínico na sessão

Componente `SessionCheckin` com ~19 eixos 0–10 + textos. Persistência em `session_checkins`. Trigger client-side recalcula `patient_substance_response_profiles` (média móvel por eixo, n_registros, confidence baixa/média/alta) e atualiza gráficos + interactionEngine.

## 10. Aprendizado individual

`src/lib/individualResponse.ts` — função pura que, dado histórico de doses + check-ins, retorna deltas médios por eixo, sensibilidade a alimento/cafeína/sono, risco de redose/paranoia. Atualiza `patient_substance_response_profiles` via upsert. Sempre rotulado como "modelo clínico individual baseado em histórico".

## 11. Engine de interações contextuais (expansão)

Regras adicionais por classe + fase + contexto: BZD+anfetamina em pico/platô, estimulante+atomoxetina, estimulante+privação de sono (risco psicose↑ se histórico), clonidina+estimulante, clonidina+BZD+valproato, vortioxetina/vilazodona+estimulante, opioide+BZD/álcool. Cada regra: `severity`, `confidence`, `interpretation`, `monitor[]`, `action`. Sem alertas genéricos.

## 12. Conectar `PredictabilityPanel`

Renderizar em: Cockpit do paciente, Sessão aberta, página de Dose, página de Substância. Sempre com nota "Curva relativa, não sérica. Revisão médica obrigatória."

## 13. Gráficos integrados

Novos componentes em `src/components/charts/`:
- `SubstanceCurveChart`, `CombinedAxisCurveChart` (por eixo: foco/vigília/sedação/ansiedade/sono/paranoia/craving/CV), `MedicationOverlapChart`, `SessionDoseTimeline`, `FoodEffectOverlay`, `SleepRiskOverlay`, `SymptomCheckinOverlay`, `InteractionTimeline`, `PatientSubstanceResponseChart`.
- Cada um aceita marcadores (dose, refeição, cafeína, sono ruim, check-in, uso de substância), linha "agora", banda de incerteza, tooltip clínico, empty state útil.

## 14. Base local expandida

Acrescentar templates faltantes (estimulantes, antidepressivos, estabilizadores, antipsicóticos, sedativos, opioides/TUS, substâncias comuns) ao `KNOWLEDGE_BASE`. Todos com `requires_clinical_review=true`, `review_status="não revisada"`, `source_notes="Template estrutural local. Revisão médica obrigatória."` Sem posologia recreativa.

## 15. "Inteligência clínica integrada" no cockpit

Seção com 4 cards: Agora · Próximas 6h · Interações relevantes · Dados faltantes · Histórico individual.

## 16. QA manual roteirizado

Após implementar, executar o roteiro do briefing (importar base, criar 3 substâncias por template, sessão com sono 4h/privação 8/cafeína 200, doses lisdex+clonazepam, check-in com paranoia 3/ansiedade 6/foco 7, validar curvas/interações/cockpit, exportar backup). Corrigir o que quebrar antes de fechar.

---

## Detalhes técnicos resumidos

- **Migração única** chamada `20260618_persistence_and_pharmacology_integration.sql`, 100% idempotente.
- **Sem mudanças em** `src/integrations/supabase/client.ts` e `types.ts` (regenerados pela migração).
- **RLS**: padrão `FOR ALL TO authenticated USING (auth.uid()=owner_id) WITH CHECK (auth.uid()=owner_id)` em todas as tabelas clínicas. GRANTs `SELECT,INSERT,UPDATE,DELETE` para `authenticated`, `ALL` para `service_role`, **sem anon**.
- **Wizard** em `src/components/substances/SubstanceWizard.tsx`, abre via `SubstancesBase`. Editor avançado fica em rota `/base-farmacologica/:id`.
- **Recharts** para todos os gráficos. Banda de incerteza via `Area` min/max.
- **Sem prescrição automática, sem instruções de uso ilícito**, todo alerta é contextual com `monitor` e `action` clínicos.

---

## Fora de escopo desta iteração

- Edge functions de IA generativa (mantém engine local determinístico).
- Mudanças de design system / paleta.
- Mobile-only redesign — mantém responsividade atual.
- Remover qualquer feature existente.

Posso prosseguir com a implementação?


-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  professional_title TEXT,
  council_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles self read" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles self upsert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles self update" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- SUBSTANCES (catálogo compartilhado)
-- =========================================================
CREATE TABLE public.substances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_global BOOLEAN NOT NULL DEFAULT false,
  name TEXT NOT NULL,
  brands TEXT[] DEFAULT '{}',
  clinical_category TEXT,
  pharmacological_class TEXT,
  pharmacological_subclass TEXT,
  default_route TEXT,
  release_curve_type TEXT,
  presentations JSONB DEFAULT '[]'::jsonb,
  default_dose_unit TEXT,
  short_description TEXT,
  mechanism_summary TEXT,
  mechanism_expanded TEXT,
  targets_receptors TEXT[] DEFAULT '{}',
  pk JSONB DEFAULT '{}'::jsonb,
  metabolism TEXT,
  relevant_enzymes TEXT[] DEFAULT '{}',
  metabolic_role TEXT,
  food_influence TEXT,
  dose_low NUMERIC,
  dose_usual NUMERIC,
  dose_high NUMERIC,
  dose_default NUMERIC,
  tolerance_model TEXT,
  carry_over_d1 NUMERIC,
  safety_notes TEXT,
  evidence_level TEXT,
  "references" TEXT[] DEFAULT '{}',
  potentials JSONB DEFAULT '{}'::jsonb,
  requires_clinical_review BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.substances TO authenticated;
GRANT ALL ON public.substances TO service_role;
ALTER TABLE public.substances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Substances read all auth" ON public.substances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Substances insert own" ON public.substances FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id AND is_global = false);
CREATE POLICY "Substances update own" ON public.substances FOR UPDATE TO authenticated USING (auth.uid() = owner_id AND is_global = false) WITH CHECK (auth.uid() = owner_id AND is_global = false);
CREATE POLICY "Substances delete own" ON public.substances FOR DELETE TO authenticated USING (auth.uid() = owner_id AND is_global = false);
CREATE INDEX idx_substances_name ON public.substances(name);
CREATE INDEX idx_substances_owner ON public.substances(owner_id);
CREATE TRIGGER trg_substances_updated BEFORE UPDATE ON public.substances
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- PATIENTS
-- =========================================================
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  social_name TEXT,
  birth_date DATE,
  biological_sex TEXT,
  gender TEXT,
  weight_kg NUMERIC,
  height_cm NUMERIC,
  primary_diagnoses TEXT[] DEFAULT '{}',
  dsm5_codes TEXT[] DEFAULT '{}',
  cid11_codes TEXT[] DEFAULT '{}',
  diagnostic_hypotheses TEXT,
  current_complaint TEXT,
  clinical_history TEXT,
  dimensional_axes JSONB DEFAULT '{}'::jsonb,
  psychiatric_comorbidities TEXT[] DEFAULT '{}',
  clinical_comorbidities TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  medication_sensitivity TEXT,
  cardiovascular_history TEXT,
  seizure_history TEXT,
  mania_history TEXT,
  substance_use_history TEXT,
  suicide_risk TEXT,
  safety_notes TEXT,
  responsible_physician TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients owner all" ON public.patients FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX idx_patients_owner ON public.patients(owner_id);
CREATE TRIGGER trg_patients_updated BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- PATIENT_MEDICATIONS
-- =========================================================
CREATE TABLE public.patient_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  substance_id UUID REFERENCES public.substances(id) ON DELETE SET NULL,
  free_text_name TEXT,
  brand_name TEXT,
  indication TEXT,
  diagnostic_target TEXT,
  target_symptoms TEXT[] DEFAULT '{}',
  current_dose NUMERIC,
  dose_unit TEXT,
  usual_time TIME,
  frequency TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'ativo',
  individual_benefit INT,
  individual_cost INT,
  individual_sensitivity TEXT,
  individual_tolerance TEXT,
  individual_carry_over NUMERIC,
  expected_improvements TEXT[] DEFAULT '{}',
  potential_worsening TEXT[] DEFAULT '{}',
  patient_notes TEXT,
  physician_notes TEXT,
  response_history JSONB DEFAULT '[]'::jsonb,
  discontinuation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_medications TO authenticated;
GRANT ALL ON public.patient_medications TO service_role;
ALTER TABLE public.patient_medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "PatMed owner all" ON public.patient_medications FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX idx_patmed_patient ON public.patient_medications(patient_id);
CREATE INDEX idx_patmed_owner ON public.patient_medications(owner_id);
CREATE TRIGGER trg_patmed_updated BEFORE UPDATE ON public.patient_medications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- CLINICAL_SESSIONS
-- =========================================================
CREATE TABLE public.clinical_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'monitoramento',
  status TEXT NOT NULL DEFAULT 'aberta',
  session_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  complaint TEXT,
  therapeutic_goal TEXT,
  baseline_state TEXT,
  predominant_symptoms TEXT[] DEFAULT '{}',
  patient_narrative TEXT,
  physician_observation TEXT,
  clinical_summary TEXT,
  conduct TEXT,
  next_review DATE,
  recent_stressors TEXT,
  exercise_context TEXT,
  food_context TEXT,
  caffeine TEXT,
  sleep_hours NUMERIC,
  sleep_quality INT,
  restorative_sleep TEXT,
  med_induced_sleep BOOLEAN,
  residual_sedation BOOLEAN,
  nightmares BOOLEAN,
  night_awakenings INT,
  sleep_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_sessions TO authenticated;
GRANT ALL ON public.clinical_sessions TO service_role;
ALTER TABLE public.clinical_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sessions owner all" ON public.clinical_sessions FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX idx_sessions_patient ON public.clinical_sessions(patient_id);
CREATE INDEX idx_sessions_owner ON public.clinical_sessions(owner_id);
CREATE INDEX idx_sessions_at ON public.clinical_sessions(session_at DESC);
CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON public.clinical_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- MEDICATION_DOSE_LOGS
-- =========================================================
CREATE TABLE public.medication_dose_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.clinical_sessions(id) ON DELETE SET NULL,
  patient_medication_id UUID REFERENCES public.patient_medications(id) ON DELETE SET NULL,
  substance_id UUID REFERENCES public.substances(id) ON DELETE SET NULL,
  substance_name TEXT NOT NULL,
  dose_amount NUMERIC,
  dose_text TEXT,
  dose_unit TEXT,
  actual_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  planned_time TIMESTAMPTZ,
  route TEXT,
  formulation TEXT,
  log_type TEXT NOT NULL DEFAULT 'manutencao',
  stomach TEXT,
  time_since_meal_min INT,
  meal_type TEXT,
  caffeine_amount NUMERIC,
  caffeine_timing TEXT,
  expected_effect TEXT,
  perceived_effect TEXT,
  adverse_effects TEXT,
  patient_notes TEXT,
  physician_notes TEXT,
  food_impact TEXT,
  clinical_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medication_dose_logs TO authenticated;
GRANT ALL ON public.medication_dose_logs TO service_role;
ALTER TABLE public.medication_dose_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doses owner all" ON public.medication_dose_logs FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX idx_dose_patient ON public.medication_dose_logs(patient_id);
CREATE INDEX idx_dose_session ON public.medication_dose_logs(session_id);
CREATE INDEX idx_dose_time ON public.medication_dose_logs(actual_time DESC);
CREATE TRIGGER trg_dose_updated BEFORE UPDATE ON public.medication_dose_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- SUBSTANCE_USE_LOGS
-- =========================================================
CREATE TABLE public.substance_use_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.clinical_sessions(id) ON DELETE SET NULL,
  substance_id UUID REFERENCES public.substances(id) ON DELETE SET NULL,
  substance_name TEXT NOT NULL,
  route TEXT,
  amount NUMERIC,
  unit TEXT,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  context TEXT,
  trigger TEXT,
  craving_before INT,
  craving_after INT,
  withdrawal INT,
  fissure INT,
  reinforcement INT,
  compulsion INT,
  intent TEXT,
  consequence TEXT,
  associated_medications TEXT[] DEFAULT '{}',
  patient_notes TEXT,
  physician_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.substance_use_logs TO authenticated;
GRANT ALL ON public.substance_use_logs TO service_role;
ALTER TABLE public.substance_use_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SubUse owner all" ON public.substance_use_logs FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX idx_subuse_patient ON public.substance_use_logs(patient_id);
CREATE INDEX idx_subuse_time ON public.substance_use_logs(used_at DESC);
CREATE TRIGGER trg_subuse_updated BEFORE UPDATE ON public.substance_use_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- PATIENT_TARGET_SYMPTOMS
-- =========================================================
CREATE TABLE public.patient_target_symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  symptom_name TEXT NOT NULL,
  baseline INT,
  therapeutic_goal INT,
  priority INT DEFAULT 3,
  related_diagnosis TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_target_symptoms TO authenticated;
GRANT ALL ON public.patient_target_symptoms TO service_role;
ALTER TABLE public.patient_target_symptoms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TargetSym owner all" ON public.patient_target_symptoms FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX idx_tgsym_patient ON public.patient_target_symptoms(patient_id);
CREATE TRIGGER trg_tgsym_updated BEFORE UPDATE ON public.patient_target_symptoms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- SYMPTOM_MEASUREMENTS
-- =========================================================
CREATE TABLE public.symptom_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  target_symptom_id UUID REFERENCES public.patient_target_symptoms(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.clinical_sessions(id) ON DELETE SET NULL,
  symptom_name TEXT NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  intensity_0_10 INT,
  intensity_0_100 INT,
  duration_min INT,
  context TEXT,
  active_medications TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.symptom_measurements TO authenticated;
GRANT ALL ON public.symptom_measurements TO service_role;
ALTER TABLE public.symptom_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SymMeas owner all" ON public.symptom_measurements FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX idx_symmeas_patient ON public.symptom_measurements(patient_id);
CREATE INDEX idx_symmeas_time ON public.symptom_measurements(measured_at DESC);

-- =========================================================
-- CURVE_RESULTS
-- =========================================================
CREATE TABLE public.curve_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.clinical_sessions(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.curve_results TO authenticated;
GRANT ALL ON public.curve_results TO service_role;
ALTER TABLE public.curve_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Curve owner all" ON public.curve_results FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX idx_curve_patient ON public.curve_results(patient_id);

-- =========================================================
-- CLINICAL_INTERACTIONS
-- =========================================================
CREATE TABLE public.clinical_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.clinical_sessions(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  relevance TEXT NOT NULL,
  summary TEXT NOT NULL,
  detail TEXT,
  involved_substances TEXT[] DEFAULT '{}',
  mechanism TEXT,
  monitor TEXT[] DEFAULT '{}',
  action TEXT,
  confidence TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_interactions TO authenticated;
GRANT ALL ON public.clinical_interactions TO service_role;
ALTER TABLE public.clinical_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inter owner all" ON public.clinical_interactions FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX idx_inter_patient ON public.clinical_interactions(patient_id);

-- =========================================================
-- AXIS_AUDITS
-- =========================================================
CREATE TABLE public.axis_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.clinical_sessions(id) ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 0,
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.axis_audits TO authenticated;
GRANT ALL ON public.axis_audits TO service_role;
ALTER TABLE public.axis_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit owner all" ON public.axis_audits FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX idx_axisaudit_patient ON public.axis_audits(patient_id);

-- =========================================================
-- CLINICAL_AI_ANALYSES
-- =========================================================
CREATE TABLE public.clinical_ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.clinical_sessions(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'local',
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_ai_analyses TO authenticated;
GRANT ALL ON public.clinical_ai_analyses TO service_role;
ALTER TABLE public.clinical_ai_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AI owner all" ON public.clinical_ai_analyses FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- =========================================================
-- CLINICAL_REPORTS
-- =========================================================
CREATE TABLE public.clinical_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_reports TO authenticated;
GRANT ALL ON public.clinical_reports TO service_role;
ALTER TABLE public.clinical_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reports owner all" ON public.clinical_reports FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- =========================================================
-- AUDIT_LOGS
-- =========================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  diff JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AuditLog owner read" ON public.audit_logs FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "AuditLog owner insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

-- =========================================================
-- APP_SETTINGS
-- =========================================================
CREATE TABLE public.app_settings (
  owner_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'system',
  preferences JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings owner all" ON public.app_settings FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- SEED: Substâncias globais (revisão clínica obrigatória)
-- =========================================================
INSERT INTO public.substances (is_global, name, clinical_category, pharmacological_class, default_route, release_curve_type, default_dose_unit, short_description, mechanism_summary, pk, food_influence, safety_notes, requires_clinical_review) VALUES
(true,'Lisdexanfetamina','Estimulante TDAH','Pró-fármaco anfetamínico','oral','SR/longa','mg','Estimulante de longa ação para TDAH','Liberação gradual de d-anfetamina via clivagem por hemácias','{"onset_min":60,"peak_min":210,"half_life_h":11,"duration_h":12}','baixa influência alimentar','Risco cardiovascular, insônia, supressão de apetite. Cuidado com abuso/desvio.',true),
(true,'Metilfenidato IR','Estimulante TDAH','Inibidor da recaptação de DA/NA','oral','IR','mg','Estimulante de ação curta','Inibe DAT e NET','{"onset_min":20,"peak_min":90,"half_life_h":3,"duration_h":4}','alimento atrasa pico','Risco cardiovascular, ansiedade, insônia.',true),
(true,'Metilfenidato LA/OROS','Estimulante TDAH','Inibidor da recaptação de DA/NA','oral','XL/ER','mg','Liberação prolongada','Liberação bifásica','{"onset_min":45,"peak_min":300,"half_life_h":4,"duration_h":10}','alimento atrasa pico','Risco cardiovascular, ansiedade.',true),
(true,'Atomoxetina','Não-estimulante TDAH','Inibidor seletivo NET','oral','steady-state','mg','Não-estimulante para TDAH','Inibe NET','{"onset_days":14,"half_life_h":5,"duration_h":24}','sem influência relevante','Hepatotoxicidade rara, ideação suicida em jovens.',true),
(true,'Bupropiona XL','Antidepressivo/anti-tabagismo','NDRI','oral','XL/ER','mg','Antidepressivo ativador','Inibe DA/NA','{"onset_days":14,"half_life_h":21,"duration_h":24}','sem influência relevante','Reduz limiar convulsivo. Inibidor CYP2D6.',true),
(true,'Vortioxetina','Antidepressivo multimodal','Modulador serotoninérgico','oral','steady-state','mg','Antidepressivo com efeito cognitivo','5-HT3/7/1D antag, 5-HT1A agon, SERT inib','{"onset_days":14,"half_life_h":66,"duration_h":24}','sem influência relevante','Metabolizada por CYP2D6.',true),
(true,'Clonidina','Anti-hipertensivo / TDAH','Agonista alfa-2','oral','IR','mg','Reduz arousal noradrenérgico','Agonista alfa-2 pré-sináptico','{"onset_min":30,"peak_min":120,"half_life_h":12,"duration_h":8}','sem influência relevante','Hipotensão, sedação, rebote se suspensão abrupta.',true),
(true,'Guanfacina XR','TDAH / arousal','Agonista alfa-2A seletivo','oral','XL/ER','mg','Reduz hiperatividade noradrenérgica','Agonista alfa-2A','{"onset_days":7,"half_life_h":17,"duration_h":24}','refeição gordurosa eleva exposição','Hipotensão, sedação, bradicardia.',true),
(true,'Clonazepam','Ansiolítico/anticonvulsivante','Benzodiazepínico','oral','longa','mg','Benzodiazepínico de longa ação','Modula GABA-A','{"onset_min":40,"peak_min":120,"half_life_h":35,"duration_h":12}','sem influência relevante','Dependência, sedação, risco respiratório com opioides/álcool.',true),
(true,'Diazepam','Ansiolítico/anticonvulsivante','Benzodiazepínico','oral','longa','mg','Benzodiazepínico clássico','Modula GABA-A','{"onset_min":30,"peak_min":90,"half_life_h":48,"duration_h":12}','sem influência relevante','Dependência, acúmulo, idosos: cuidado.',true),
(true,'Quetiapina','Antipsicótico atípico','Antagonista D2/5-HT2A','oral','sedativa longa','mg','Antipsicótico com forte ação sedativa em doses baixas','Antagonismo D2, 5-HT2A, H1, alfa-1','{"onset_min":60,"peak_min":90,"half_life_h":7,"duration_h":10}','refeição gordurosa eleva Cmax','Sedação, ganho de peso, metabólico, QT.',true),
(true,'Aripiprazol','Antipsicótico atípico','Agonista parcial D2','oral','steady-state','mg','Estabilizador dopaminérgico','Agonista parcial D2/5-HT1A','{"onset_days":7,"half_life_h":75,"duration_h":24}','sem influência relevante','Acatisia, jogo patológico, hiperprolactinemia rara.',true),
(true,'Lamotrigina','Anticonvulsivante / estabilizador','Bloqueador canais de Na','oral','steady-state','mg','Estabilizador do humor','Inibe liberação de glutamato','{"onset_days":21,"half_life_h":29,"duration_h":24}','sem influência relevante','Rash / Stevens-Johnson na titulação.',true),
(true,'Valproato/Divalproato','Anticonvulsivante / estabilizador','Múltiplos mecanismos','oral','steady-state','mg','Estabilizador do humor','GABAérgico, bloq Na','{"onset_days":7,"half_life_h":14,"duration_h":12}','sem influência relevante','Teratogênico, hepatotox, pancreatite.',true),
(true,'Escitalopram','Antidepressivo ISRS','ISRS','oral','steady-state','mg','ISRS','Inibe SERT','{"onset_days":14,"half_life_h":30,"duration_h":24}','sem influência relevante','QT dose-dependente, hiponatremia em idosos.',true),
(true,'Sertralina','Antidepressivo ISRS','ISRS','oral','steady-state','mg','ISRS','Inibe SERT','{"onset_days":14,"half_life_h":26,"duration_h":24}','melhor com alimento','Disfunção sexual, GI inicial.',true),
(true,'Fluoxetina','Antidepressivo ISRS','ISRS','oral','steady-state','mg','ISRS de meia-vida longa','Inibe SERT','{"onset_days":14,"half_life_h":96,"duration_h":24}','sem influência relevante','Inibidor CYP2D6, longa meia-vida.',true),
(true,'Venlafaxina','Antidepressivo IRSN','IRSN','oral','steady-state','mg','IRSN','Inibe SERT/NET','{"onset_days":14,"half_life_h":11,"duration_h":24}','sem influência relevante','PA, sudorese, descontinuação difícil.',true),
(true,'Duloxetina','Antidepressivo IRSN','IRSN','oral','steady-state','mg','IRSN','Inibe SERT/NET','{"onset_days":14,"half_life_h":12,"duration_h":24}','sem influência relevante','Hepatotox, hipertensão.',true),
(true,'Mirtazapina','Antidepressivo atípico','NaSSA','oral','sedativa longa','mg','Antidepressivo sedativo / orexígeno','Alfa-2 antag, 5-HT2/3 antag, H1 antag','{"onset_min":60,"peak_min":120,"half_life_h":30,"duration_h":10}','sem influência relevante','Sedação, ganho de peso.',true),
(true,'Trazodona','Antidepressivo / sono','SARI','oral','sedativa longa','mg','Indutor de sono em doses baixas','5-HT2A antag, SERT inib fraco, H1 antag','{"onset_min":30,"peak_min":60,"half_life_h":7,"duration_h":8}','alimento atrasa pico','Priapismo raro, hipotensão.',true),
(true,'Melatonina','Cronobiótico','Hormônio pineal','oral','IR','mg','Cronobiótico','Agonista MT1/MT2','{"onset_min":30,"peak_min":60,"half_life_h":1,"duration_h":4}','sem influência relevante','Não-hipnótico clássico.',true),
(true,'Metadona','Opioide / TUS opioide','Agonista mu de longa ação','oral','longa','mg','Tratamento de TUS opioide','Agonista mu, antag NMDA','{"onset_min":30,"peak_min":180,"half_life_h":24,"duration_h":24}','sem influência relevante','QT longo, risco respiratório. Apoio especializado.',true),
(true,'Buprenorfina','Opioide parcial / TUS opioide','Agonista parcial mu','sublingual','longa','mg','Tratamento de TUS opioide','Agonista parcial mu, antag kappa','{"onset_min":30,"peak_min":120,"half_life_h":32,"duration_h":24}','sem influência relevante','Risco respiratório menor; precipita abstinência se mal indicado.',true),
(true,'Naltrexona','Antagonista opioide / TUS álcool','Antagonista mu','oral','steady-state','mg','Reduz reforço de opioides/álcool','Antagonista mu','{"onset_min":60,"peak_min":60,"half_life_h":4,"duration_h":24}','sem influência relevante','Hepatotox em altas doses.',true),
(true,'Naloxona','Antagonista opioide / emergência','Antagonista mu','intranasal','aguda','mg','Reversão de overdose opioide','Antagonista mu','{"onset_min":3,"peak_min":15,"half_life_h":1,"duration_h":1}','sem influência relevante','Uso emergencial.',true),
(true,'Cafeína','Estimulante leve','Antagonista adenosina','oral','IR','mg','Estimulante cotidiano','Antag A1/A2A','{"onset_min":15,"peak_min":45,"half_life_h":5,"duration_h":5}','sem influência relevante','Ansiedade, insônia, taquicardia.',true),
(true,'Álcool','Depressor SNC / substância de abuso','Modulador GABA/NMDA','oral','aguda','g','Substância de uso recreativo com alto potencial de dano','Potencializa GABA, inibe NMDA','{"onset_min":15,"peak_min":45,"half_life_h":4,"duration_h":4}','alimento atrasa pico','Risco respiratório com benzo/opioide. Sem orientação de uso.',true),
(true,'Nicotina','Estimulante / substância de dependência','Agonista nicotínico','inalatória','aguda','mg','Alta capacidade de dependência','Agonista nAChR','{"onset_min":1,"peak_min":5,"half_life_h":2,"duration_h":1}','sem influência relevante','Cardiovascular, dependência.',true),
(true,'Cocaína','Estimulante / substância de abuso','Inibidor DAT/NET/SERT','intranasal','aguda','mg','Alto risco cardiovascular e adictivo','Inibe recaptação monoaminas','{"onset_min":3,"peak_min":15,"half_life_h":1,"duration_h":1}','sem influência relevante','Cardiovascular grave. Sem orientação de uso.',true),
(true,'Cannabis/THC','Canabinoide','Agonista parcial CB1/CB2','inalatória','aguda','mg','Efeito psicoativo variável','Agonista CB1','{"onset_min":5,"peak_min":30,"half_life_h":30,"duration_h":4}','via oral muda perfil','Psicose em vulneráveis, taquicardia.',true),
(true,'Codeína','Opioide fraco','Pró-fármaco morfina','oral','IR','mg','Analgésico opioide fraco','Metabolizado por CYP2D6 a morfina','{"onset_min":30,"peak_min":60,"half_life_h":3,"duration_h":4}','sem influência relevante','Variabilidade CYP2D6, sedação.',true),
(true,'Morfina','Opioide','Agonista mu','oral','IR','mg','Analgésico opioide','Agonista mu','{"onset_min":30,"peak_min":60,"half_life_h":3,"duration_h":4}','sem influência relevante','Risco respiratório, dependência.',true),
(true,'Oxicodona','Opioide','Agonista mu','oral','IR','mg','Analgésico opioide','Agonista mu','{"onset_min":15,"peak_min":60,"half_life_h":4,"duration_h":4}','sem influência relevante','Alto potencial de abuso.',true),
(true,'Fentanil','Opioide potente','Agonista mu','transdérmica','transdérmica','mcg','Opioide altamente potente','Agonista mu','{"onset_h":12,"peak_h":24,"half_life_h":17,"duration_h":72}','sem influência relevante','Alto risco de overdose. Uso especializado.',true);

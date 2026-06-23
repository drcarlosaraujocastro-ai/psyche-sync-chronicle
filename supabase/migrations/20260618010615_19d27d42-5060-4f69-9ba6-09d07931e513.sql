
-- 1. substance_formulations
CREATE TABLE IF NOT EXISTS public.substance_formulations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  substance_id uuid not null references public.substances(id) on delete cascade,
  formulation_name text not null,
  formulation_type text,
  route text,
  curve_model text,
  onset_min_value numeric, onset_max_value numeric, onset_unit text,
  comeup_min_value numeric, comeup_max_value numeric, comeup_unit text,
  peak_min_value numeric, peak_max_value numeric, peak_unit text,
  plateau_min_value numeric, plateau_max_value numeric, plateau_unit text,
  offset_min_value numeric, offset_max_value numeric, offset_unit text,
  duration_min_value numeric, duration_max_value numeric, duration_unit text,
  half_life_min_value numeric, half_life_max_value numeric, half_life_unit text,
  has_steady_state boolean default false,
  steady_state_min_value numeric, steady_state_max_value numeric, steady_state_unit text,
  has_tail boolean default false,
  tail_min_value numeric, tail_max_value numeric, tail_unit text,
  food_effect_profile jsonb,
  notes text,
  is_default boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.substance_formulations TO authenticated;
GRANT ALL ON public.substance_formulations TO service_role;
ALTER TABLE public.substance_formulations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='substance_formulations' AND policyname='Formulations owner all') THEN
    CREATE POLICY "Formulations owner all" ON public.substance_formulations
      FOR ALL TO authenticated
      USING (auth.uid() = owner_id)
      WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_formulations_substance ON public.substance_formulations(substance_id);
CREATE INDEX IF NOT EXISTS idx_formulations_owner ON public.substance_formulations(owner_id);

DROP TRIGGER IF EXISTS trg_formulations_updated ON public.substance_formulations;
CREATE TRIGGER trg_formulations_updated BEFORE UPDATE ON public.substance_formulations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. session_checkins
CREATE TABLE IF NOT EXISTS public.session_checkins (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  session_id uuid references public.clinical_sessions(id) on delete set null,
  checkin_at timestamptz not null default now(),
  focus_0_10 integer, energy_0_10 integer, motivation_0_10 integer,
  anxiety_0_10 integer, irritability_0_10 integer, impulsivity_0_10 integer,
  rumination_0_10 integer, craving_0_10 integer, withdrawal_0_10 integer,
  sedation_0_10 integer, insomnia_0_10 integer, sleep_quality_0_10 integer,
  paranoia_0_10 integer, ideas_of_reference_0_10 integer, cognitive_overload_0_10 integer,
  mood_0_10 integer, anhedonia_0_10 integer, appetite_0_10 integer,
  cardiovascular_0_10 integer,
  patient_report text, physician_observation text,
  adverse_event text, trigger_text text, context_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_checkins TO authenticated;
GRANT ALL ON public.session_checkins TO service_role;
ALTER TABLE public.session_checkins ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_checkins' AND policyname='Checkins owner all') THEN
    CREATE POLICY "Checkins owner all" ON public.session_checkins
      FOR ALL TO authenticated
      USING (auth.uid() = owner_id)
      WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_checkins_patient ON public.session_checkins(patient_id);
CREATE INDEX IF NOT EXISTS idx_checkins_session ON public.session_checkins(session_id);
CREATE INDEX IF NOT EXISTS idx_checkins_owner_time ON public.session_checkins(owner_id, checkin_at DESC);

DROP TRIGGER IF EXISTS trg_checkins_updated ON public.session_checkins;
CREATE TRIGGER trg_checkins_updated BEFORE UPDATE ON public.session_checkins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. medication_dose_logs additions
ALTER TABLE public.medication_dose_logs
  ADD COLUMN IF NOT EXISTS formulation_id uuid REFERENCES public.substance_formulations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dose_goal text;

-- 4. response profile additions
ALTER TABLE public.patient_substance_response_profiles
  ADD COLUMN IF NOT EXISTS axis_deltas jsonb;

-- 5. unique index for upsert of response profile (one row per patient+substance_name+owner)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_respprof_owner_patient_subname
  ON public.patient_substance_response_profiles(owner_id, patient_id, lower(substance_name));

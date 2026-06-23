
-- 1. integration_settings
CREATE TABLE IF NOT EXISTS public.integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'not_configured',
  public_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_config_reference text,
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS integration_settings_owner_provider_idx
  ON public.integration_settings(owner_id, provider);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_settings TO authenticated;
GRANT ALL ON public.integration_settings TO service_role;
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='integration_settings' AND policyname='integration_settings_owner_all') THEN
    CREATE POLICY integration_settings_owner_all ON public.integration_settings
      FOR ALL TO authenticated
      USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;

-- 2. medx_patient_links
CREATE TABLE IF NOT EXISTS public.medx_patient_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  medx_patient_id text,
  medx_precadastro_url text,
  medx_status text NOT NULL DEFAULT 'not_sent',
  last_sent_at timestamptz,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS medx_patient_links_owner_patient_idx
  ON public.medx_patient_links(owner_id, patient_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medx_patient_links TO authenticated;
GRANT ALL ON public.medx_patient_links TO service_role;
ALTER TABLE public.medx_patient_links ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='medx_patient_links' AND policyname='medx_patient_links_owner_all') THEN
    CREATE POLICY medx_patient_links_owner_all ON public.medx_patient_links
      FOR ALL TO authenticated
      USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;

-- 3. integration_logs
CREATE TABLE IF NOT EXISTS public.integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  provider text NOT NULL,
  action text NOT NULL,
  patient_id uuid,
  status text,
  request_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS integration_logs_owner_provider_idx
  ON public.integration_logs(owner_id, provider, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_logs TO authenticated;
GRANT ALL ON public.integration_logs TO service_role;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='integration_logs' AND policyname='integration_logs_owner_all') THEN
    CREATE POLICY integration_logs_owner_all ON public.integration_logs
      FOR ALL TO authenticated
      USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;

-- 4. medication_dose_logs: ensure dose-formulation + modulator columns exist
ALTER TABLE public.medication_dose_logs
  ADD COLUMN IF NOT EXISTS substance_id uuid,
  ADD COLUMN IF NOT EXISTS formulation_name text,
  ADD COLUMN IF NOT EXISTS dose_text text,
  ADD COLUMN IF NOT EXISTS taken_with_food boolean,
  ADD COLUMN IF NOT EXISTS stomach_fullness_0_10 numeric,
  ADD COLUMN IF NOT EXISTS last_meal_time timestamptz,
  ADD COLUMN IF NOT EXISTS minutes_since_last_meal numeric,
  ADD COLUMN IF NOT EXISTS meal_size text,
  ADD COLUMN IF NOT EXISTS meal_fat_level_0_10 numeric,
  ADD COLUMN IF NOT EXISTS caffeine_near_dose_mg numeric,
  ADD COLUMN IF NOT EXISTS caffeine_timing text,
  ADD COLUMN IF NOT EXISTS sleep_deprivation_at_dose_0_10 numeric,
  ADD COLUMN IF NOT EXISTS expected_effect_text text,
  ADD COLUMN IF NOT EXISTS perceived_effect_text text,
  ADD COLUMN IF NOT EXISTS benefit_0_100 numeric,
  ADD COLUMN IF NOT EXISTS adverse_0_100 numeric,
  ADD COLUMN IF NOT EXISTS sedation_0_100 numeric,
  ADD COLUMN IF NOT EXISTS stimulation_0_100 numeric,
  ADD COLUMN IF NOT EXISTS anxiety_0_100 numeric,
  ADD COLUMN IF NOT EXISTS focus_0_100 numeric,
  ADD COLUMN IF NOT EXISTS impulsivity_0_100 numeric,
  ADD COLUMN IF NOT EXISTS craving_0_100 numeric,
  ADD COLUMN IF NOT EXISTS notes_patient text,
  ADD COLUMN IF NOT EXISTS notes_clinician text;

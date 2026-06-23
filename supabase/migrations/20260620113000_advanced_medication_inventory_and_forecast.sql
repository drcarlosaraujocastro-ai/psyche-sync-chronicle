-- Advanced medication inventory + pharmacological forecasting support
-- Idempotent migration. Does not delete or overwrite data.

CREATE TABLE IF NOT EXISTS public.medication_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_medication_id uuid REFERENCES public.patient_medications(id) ON DELETE SET NULL,
  substance_id uuid REFERENCES public.substances(id) ON DELETE SET NULL,
  formulation_id uuid REFERENCES public.substance_formulations(id) ON DELETE SET NULL,
  medication_name text NOT NULL,
  current_quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'un',
  low_stock_threshold numeric NOT NULL DEFAULT 7,
  daily_consumption_estimate numeric,
  package_description text,
  lot_number text,
  expiration_date date,
  location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medication_inventory TO authenticated;
GRANT ALL ON public.medication_inventory TO service_role;
ALTER TABLE public.medication_inventory ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='medication_inventory' AND policyname='medication_inventory_owner_all') THEN
    CREATE POLICY medication_inventory_owner_all ON public.medication_inventory
      FOR ALL TO authenticated
      USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_med_inventory_owner ON public.medication_inventory(owner_id);
CREATE INDEX IF NOT EXISTS idx_med_inventory_patient ON public.medication_inventory(patient_id);
CREATE INDEX IF NOT EXISTS idx_med_inventory_med ON public.medication_inventory(patient_medication_id);
DROP TRIGGER IF EXISTS trg_med_inventory_updated ON public.medication_inventory;
CREATE TRIGGER trg_med_inventory_updated BEFORE UPDATE ON public.medication_inventory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.medication_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inventory_id uuid NOT NULL REFERENCES public.medication_inventory(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  movement_type text NOT NULL DEFAULT 'ajuste',
  amount numeric NOT NULL,
  unit text NOT NULL DEFAULT 'un',
  reason text,
  quantity_before numeric,
  quantity_after numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medication_inventory_movements TO authenticated;
GRANT ALL ON public.medication_inventory_movements TO service_role;
ALTER TABLE public.medication_inventory_movements ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='medication_inventory_movements' AND policyname='medication_inventory_movements_owner_all') THEN
    CREATE POLICY medication_inventory_movements_owner_all ON public.medication_inventory_movements
      FOR ALL TO authenticated
      USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_med_inventory_movements_inventory ON public.medication_inventory_movements(inventory_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_med_inventory_movements_owner ON public.medication_inventory_movements(owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.clinical_effect_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.clinical_sessions(id) ON DELETE SET NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  horizon_hours numeric NOT NULL DEFAULT 6,
  confidence text NOT NULL DEFAULT 'baixa',
  forecast jsonb NOT NULL DEFAULT '{}'::jsonb,
  missing_data text[] NOT NULL DEFAULT '{}',
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_effect_forecasts TO authenticated;
GRANT ALL ON public.clinical_effect_forecasts TO service_role;
ALTER TABLE public.clinical_effect_forecasts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='clinical_effect_forecasts' AND policyname='clinical_effect_forecasts_owner_all') THEN
    CREATE POLICY clinical_effect_forecasts_owner_all ON public.clinical_effect_forecasts
      FOR ALL TO authenticated
      USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_effect_forecasts_patient ON public.clinical_effect_forecasts(patient_id, generated_at DESC);

ALTER TABLE public.patient_medications
  ADD COLUMN IF NOT EXISTS formulation_id uuid REFERENCES public.substance_formulations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expected_benefit_0_100 numeric,
  ADD COLUMN IF NOT EXISTS expected_cost_0_100 numeric,
  ADD COLUMN IF NOT EXISTS individual_sensitivity_0_100 numeric,
  ADD COLUMN IF NOT EXISTS individual_tolerance_0_100 numeric,
  ADD COLUMN IF NOT EXISTS abuse_risk_individual_0_100 numeric,
  ADD COLUMN IF NOT EXISTS redose_risk_individual_0_100 numeric,
  ADD COLUMN IF NOT EXISTS withdrawal_risk_individual_0_100 numeric,
  ADD COLUMN IF NOT EXISTS psychosis_activation_risk_individual_0_100 numeric,
  ADD COLUMN IF NOT EXISTS sedation_sensitivity_0_100 numeric,
  ADD COLUMN IF NOT EXISTS insomnia_sensitivity_0_100 numeric,
  ADD COLUMN IF NOT EXISTS autonomic_sensitivity_0_100 numeric,
  ADD COLUMN IF NOT EXISTS clinical_rationale text,
  ADD COLUMN IF NOT EXISTS monitoring_plan text,
  ADD COLUMN IF NOT EXISTS stop_or_reduce_criteria text,
  ADD COLUMN IF NOT EXISTS warning_signs text;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS neurobiological_profile jsonb NOT NULL DEFAULT '{}'::jsonb;

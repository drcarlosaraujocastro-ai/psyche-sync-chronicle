-- Clinical pharmacology reports support
-- Idempotent. Does not delete or overwrite data.

CREATE TABLE IF NOT EXISTS public.clinical_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_reports TO authenticated;
GRANT ALL ON public.clinical_reports TO service_role;

ALTER TABLE public.clinical_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clinical_reports'
      AND policyname = 'clinical_reports_owner_all'
  ) THEN
    CREATE POLICY clinical_reports_owner_all
    ON public.clinical_reports
    FOR ALL TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clinical_reports_patient_created
ON public.clinical_reports(patient_id, created_at DESC);

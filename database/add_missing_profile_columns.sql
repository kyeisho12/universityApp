-- Add missing columns to public.profiles required by the current frontend.
-- Safe to run multiple times.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS student_number TEXT,
  ADD COLUMN IF NOT EXISTS student_id TEXT,
  ADD COLUMN IF NOT EXISTS year_level INTEGER,
  ADD COLUMN IF NOT EXISTS skills_entries JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS education_entries JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS work_experience_entries JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_job_types TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS preferred_industries TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS preferred_locations TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS expected_salary_range TEXT,
  ADD COLUMN IF NOT EXISTS preferred_job_type TEXT,
  ADD COLUMN IF NOT EXISTS preferred_location TEXT,
  ADD COLUMN IF NOT EXISTS preferred_category TEXT,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Keep year level values within a practical student range.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_year_level_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_year_level_check
      CHECK (year_level IS NULL OR year_level BETWEEN 1 AND 10);
  END IF;
END $$;

-- Helpful indexes for frequent filters/lookups.
CREATE INDEX IF NOT EXISTS idx_profiles_student_number ON public.profiles(student_number);
CREATE INDEX IF NOT EXISTS idx_profiles_year_level ON public.profiles(year_level);

-- Backfill null JSON/array values for existing rows.
UPDATE public.profiles
SET
  skills_entries = COALESCE(skills_entries, '[]'::jsonb),
  education_entries = COALESCE(education_entries, '[]'::jsonb),
  work_experience_entries = COALESCE(work_experience_entries, '[]'::jsonb),
  preferred_job_types = COALESCE(preferred_job_types, '{}'::text[]),
  preferred_industries = COALESCE(preferred_industries, '{}'::text[]),
  preferred_locations = COALESCE(preferred_locations, '{}'::text[]),
  is_verified = COALESCE(is_verified, FALSE);

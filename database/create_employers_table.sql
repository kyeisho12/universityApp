-- Create Employers/Employer Partners Table
-- Run this SQL in your Supabase SQL Editor

-- =============================================================================
-- 1. CREATE EMPLOYERS TABLE
-- This table stores information about employer partners
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.employers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  website TEXT,
  industry TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  job_listings_count INTEGER DEFAULT 0,
  description TEXT,
  logo_url TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 2. CREATE UPDATED_AT TRIGGER FUNCTION (if not already exists)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. APPLY UPDATED_AT TRIGGER TO EMPLOYERS TABLE
-- =============================================================================

DROP TRIGGER IF EXISTS set_updated_at_employers ON public.employers;

CREATE TRIGGER set_updated_at_employers
  BEFORE UPDATE ON public.employers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.employers ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 5. CREATE RLS POLICIES
-- =============================================================================

-- Policy: Anyone can view verified employers
DROP POLICY IF EXISTS "Anyone can view verified employers" ON public.employers;
CREATE POLICY "Anyone can view verified employers"
  ON public.employers
  FOR SELECT
  USING (verified = TRUE);

-- Policy: Admins can view all employers (verified and unverified)
DROP POLICY IF EXISTS "Admins can view all employers" ON public.employers;
CREATE POLICY "Admins can view all employers"
  ON public.employers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can insert employers
DROP POLICY IF EXISTS "Admins can insert employers" ON public.employers;
CREATE POLICY "Admins can insert employers"
  ON public.employers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can update employers
DROP POLICY IF EXISTS "Admins can update employers" ON public.employers;
CREATE POLICY "Admins can update employers"
  ON public.employers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can delete employers
DROP POLICY IF EXISTS "Admins can delete employers" ON public.employers;
CREATE POLICY "Admins can delete employers"
  ON public.employers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_employers_verified ON public.employers(verified);
CREATE INDEX IF NOT EXISTS idx_employers_industry ON public.employers(industry);
CREATE INDEX IF NOT EXISTS idx_employers_name ON public.employers(name);
CREATE INDEX IF NOT EXISTS idx_employers_created_at ON public.employers(created_at DESC);

-- =============================================================================
-- END OF EMPLOYERS TABLE SETUP
-- =============================================================================

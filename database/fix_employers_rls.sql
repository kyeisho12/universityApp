-- Fix RLS Policies for Employers Table
-- This allows service role (backend API) to access all employer data

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view verified employers" ON public.employers;
DROP POLICY IF EXISTS "Admins can view all employers" ON public.employers;
DROP POLICY IF EXISTS "Admins can insert employers" ON public.employers;
DROP POLICY IF EXISTS "Admins can update employers" ON public.employers;
DROP POLICY IF EXISTS "Admins can delete employers" ON public.employers;

-- New policies that work with both authenticated users and service role

-- Policy: Service role (backend) can do everything, users can view verified
-- For SELECT: Service role always allowed, authenticated users see verified or their own
CREATE POLICY "View employers"
  ON public.employers
  FOR SELECT
  USING (
    -- Service role (no auth.uid) always has access
    auth.uid() IS NULL
    OR
    -- Verified employers visible to everyone
    verified = TRUE
    OR
    -- Admin users can see all
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins or service role can insert
CREATE POLICY "Insert employers"
  ON public.employers
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins or service role can update
CREATE POLICY "Update employers"
  ON public.employers
  FOR UPDATE
  USING (
    auth.uid() IS NULL
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins or service role can delete
CREATE POLICY "Delete employers"
  ON public.employers
  FOR DELETE
  USING (
    auth.uid() IS NULL
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

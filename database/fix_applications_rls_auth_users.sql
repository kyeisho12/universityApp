-- Fix applications RLS policies that incorrectly reference auth.users.
-- Run this in Supabase SQL Editor (production project) to resolve 403 on apply/select.

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view their own applications" ON public.applications;
DROP POLICY IF EXISTS "Students can create applications" ON public.applications;
DROP POLICY IF EXISTS "Students can update their pending applications" ON public.applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.applications;
DROP POLICY IF EXISTS "Admins can update application status" ON public.applications;

CREATE POLICY "Students can view their own applications"
  ON public.applications FOR SELECT
  USING (
    auth.uid() = student_id
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Students can create applications"
  ON public.applications FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their pending applications"
  ON public.applications FOR UPDATE
  USING (auth.uid() = student_id AND status = 'pending')
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admins can view all applications"
  ON public.applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins can update application status"
  ON public.applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.applications TO authenticated;

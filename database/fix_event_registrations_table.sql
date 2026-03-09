-- Fix missing event_registrations table used by student event registration.
-- Run in Supabase SQL Editor (production) to resolve:
-- "Could not find the table 'public.event_registrations' in the schema cache"

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.career_events(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (event_id, student_id)
);

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view registrations" ON public.event_registrations;
CREATE POLICY "Authenticated users can view registrations"
  ON public.event_registrations
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can register for events" ON public.event_registrations;
CREATE POLICY "Users can register for events"
  ON public.event_registrations
  FOR INSERT
  WITH CHECK (
    auth.uid() = student_id
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Users can unregister for events" ON public.event_registrations;
CREATE POLICY "Users can unregister for events"
  ON public.event_registrations
  FOR DELETE
  USING (
    auth.uid() = student_id
    OR public.is_admin()
  );

GRANT SELECT, INSERT, DELETE ON public.event_registrations TO authenticated;

CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_student_id ON public.event_registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_registered_at ON public.event_registrations(registered_at DESC);

DO $$
BEGIN
  RAISE NOTICE 'event_registrations table and policies are ready.';
END $$;

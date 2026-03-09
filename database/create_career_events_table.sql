-- Create Career Events Table
-- Run this SQL in your Supabase SQL Editor

-- =============================================================================
-- CREATE CAREER_EVENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.career_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('Job Fair', 'Workshop', 'Seminar', 'Webinar', 'Announcement')),
  date DATE NOT NULL,
  time TEXT,
  location TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Keep registration rows in a normalized table so students can register/unregister safely.
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.career_events(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (event_id, student_id)
);

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.career_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- CREATE RLS POLICIES
-- =============================================================================

-- Policy: Anyone can view events
DROP POLICY IF EXISTS "Anyone can view events" ON public.career_events;
CREATE POLICY "Anyone can view events"
  ON public.career_events
  FOR SELECT
  USING (TRUE);

-- Policy: Only admins can create events
DROP POLICY IF EXISTS "Admins can create events" ON public.career_events;
CREATE POLICY "Admins can create events"
  ON public.career_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can update events
DROP POLICY IF EXISTS "Admins can update events" ON public.career_events;
CREATE POLICY "Admins can update events"
  ON public.career_events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can delete events
DROP POLICY IF EXISTS "Admins can delete events" ON public.career_events;
CREATE POLICY "Admins can delete events"
  ON public.career_events
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Authenticated users can read registrations (used for event registration counts)
DROP POLICY IF EXISTS "Authenticated users can view registrations" ON public.event_registrations;
CREATE POLICY "Authenticated users can view registrations"
  ON public.event_registrations
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Students can register themselves; admins can register users when needed
DROP POLICY IF EXISTS "Users can register for events" ON public.event_registrations;
CREATE POLICY "Users can register for events"
  ON public.event_registrations
  FOR INSERT
  WITH CHECK (
    auth.uid() = student_id
    OR public.is_admin()
  );

-- Policy: Students can unregister themselves; admins can remove registrations
DROP POLICY IF EXISTS "Users can unregister for events" ON public.event_registrations;
CREATE POLICY "Users can unregister for events"
  ON public.event_registrations
  FOR DELETE
  USING (
    auth.uid() = student_id
    OR public.is_admin()
  );

-- =============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_career_events_date ON public.career_events(date DESC);
CREATE INDEX IF NOT EXISTS idx_career_events_type ON public.career_events(event_type);
CREATE INDEX IF NOT EXISTS idx_career_events_created_at ON public.career_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_student_id ON public.event_registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_registered_at ON public.event_registrations(registered_at DESC);

-- =============================================================================
-- SUCCESS
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Career Events table created successfully!';
END $$;

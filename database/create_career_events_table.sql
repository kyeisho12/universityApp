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

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.career_events ENABLE ROW LEVEL SECURITY;

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

-- =============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_career_events_date ON public.career_events(date DESC);
CREATE INDEX IF NOT EXISTS idx_career_events_type ON public.career_events(event_type);
CREATE INDEX IF NOT EXISTS idx_career_events_created_at ON public.career_events(created_at DESC);

-- =============================================================================
-- SUCCESS
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Career Events table created successfully!';
END $$;

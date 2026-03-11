-- Allow custom event types in career_events.event_type
-- Run this in Supabase SQL Editor before using "Other (Specify)" custom values.

ALTER TABLE public.career_events
  DROP CONSTRAINT IF EXISTS career_events_event_type_check;

ALTER TABLE public.career_events
  ADD CONSTRAINT career_events_event_type_nonempty_check
  CHECK (length(trim(event_type)) > 0);

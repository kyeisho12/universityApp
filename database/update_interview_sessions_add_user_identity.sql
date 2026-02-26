-- Add user_name and user_email to interview_sessions for easier identification in Supabase table editor

ALTER TABLE public.interview_sessions
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS user_name TEXT;

CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_email
  ON public.interview_sessions(user_email);

-- Backfill from profiles table for existing rows
UPDATE public.interview_sessions s
SET
  user_email = COALESCE(s.user_email, p.email),
  user_name = COALESCE(s.user_name, p.full_name)
FROM public.profiles p
WHERE p.id = s.user_id
  AND (s.user_email IS NULL OR s.user_name IS NULL);

-- Auto-populate identity fields on insert/update if omitted
CREATE OR REPLACE FUNCTION public.populate_interview_session_identity()
RETURNS TRIGGER AS $$
DECLARE
  v_email TEXT;
  v_full_name TEXT;
BEGIN
  IF NEW.user_email IS NOT NULL AND NEW.user_name IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT email, full_name
  INTO v_email, v_full_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  NEW.user_email := COALESCE(NEW.user_email, v_email);
  NEW.user_name := COALESCE(NEW.user_name, v_full_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_interview_session_identity ON public.interview_sessions;

CREATE TRIGGER set_interview_session_identity
  BEFORE INSERT OR UPDATE OF user_id, user_email, user_name
  ON public.interview_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_interview_session_identity();

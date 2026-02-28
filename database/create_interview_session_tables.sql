-- Interview Session + Recording Segments Setup for Supabase
-- Purpose: Keep one logical interview session while storing multiple short video segments.

-- =============================================================================
-- 0. SHARED UPDATED_AT FUNCTION (SAFE)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. INTERVIEW SESSIONS TABLE (ONE ROW PER WHOLE SESSION)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  user_name TEXT,
  status TEXT NOT NULL DEFAULT 'ready'
    CHECK (status IN ('ready', 'in_progress', 'paused', 'completed', 'cancelled')),
  total_questions INTEGER NOT NULL DEFAULT 5 CHECK (total_questions > 0),
  current_question_index INTEGER NOT NULL DEFAULT 0 CHECK (current_question_index >= 0),
  storage_prefix TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  resumed_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON public.interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_email ON public.interview_sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_status ON public.interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_created_at_desc ON public.interview_sessions(created_at DESC);

DROP TRIGGER IF EXISTS set_updated_at_interview_sessions ON public.interview_sessions;
CREATE TRIGGER set_updated_at_interview_sessions
  BEFORE UPDATE ON public.interview_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 2. RECORDING SEGMENTS TABLE (ONE ROW PER CUT CLIP)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.interview_recording_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.interview_question_bank(id) ON DELETE SET NULL,
  question_index INTEGER NOT NULL CHECK (question_index >= 0),
  segment_order INTEGER NOT NULL CHECK (segment_order >= 1),
  status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('recording', 'uploaded', 'transcribing', 'transcribed', 'failed')),
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'video/webm',
  duration_seconds NUMERIC(10,2),
  file_size_bytes BIGINT,
  transcript_text TEXT,
  whisper_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (whisper_status IN ('pending', 'in_progress', 'completed', 'failed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_interview_segment_order UNIQUE (session_id, question_index, segment_order)
);

CREATE INDEX IF NOT EXISTS idx_irs_session_id ON public.interview_recording_segments(session_id);
CREATE INDEX IF NOT EXISTS idx_irs_question_index ON public.interview_recording_segments(question_index);
CREATE INDEX IF NOT EXISTS idx_irs_status ON public.interview_recording_segments(status);
CREATE INDEX IF NOT EXISTS idx_irs_whisper_status ON public.interview_recording_segments(whisper_status);
CREATE INDEX IF NOT EXISTS idx_irs_created_at_desc ON public.interview_recording_segments(created_at DESC);

DROP TRIGGER IF EXISTS set_updated_at_interview_recording_segments ON public.interview_recording_segments;
CREATE TRIGGER set_updated_at_interview_recording_segments
  BEFORE UPDATE ON public.interview_recording_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 3. ENABLE RLS
-- =============================================================================

ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_recording_segments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 4. RLS FOR interview_sessions
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own interview sessions" ON public.interview_sessions;
CREATE POLICY "Users can view own interview sessions"
  ON public.interview_sessions
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can insert own interview sessions" ON public.interview_sessions;
CREATE POLICY "Users can insert own interview sessions"
  ON public.interview_sessions
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can update own interview sessions" ON public.interview_sessions;
CREATE POLICY "Users can update own interview sessions"
  ON public.interview_sessions
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can delete own interview sessions" ON public.interview_sessions;
CREATE POLICY "Users can delete own interview sessions"
  ON public.interview_sessions
  FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- =============================================================================
-- 5. RLS FOR interview_recording_segments
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own recording segments" ON public.interview_recording_segments;
CREATE POLICY "Users can view own recording segments"
  ON public.interview_recording_segments
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.interview_sessions s
      WHERE s.id = session_id
        AND (
          s.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can insert own recording segments" ON public.interview_recording_segments;
CREATE POLICY "Users can insert own recording segments"
  ON public.interview_recording_segments
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.interview_sessions s
      WHERE s.id = session_id
        AND (
          s.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can update own recording segments" ON public.interview_recording_segments;
CREATE POLICY "Users can update own recording segments"
  ON public.interview_recording_segments
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.interview_sessions s
      WHERE s.id = session_id
        AND (
          s.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
          )
        )
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.interview_sessions s
      WHERE s.id = session_id
        AND (
          s.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can delete own recording segments" ON public.interview_recording_segments;
CREATE POLICY "Users can delete own recording segments"
  ON public.interview_recording_segments
  FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.interview_sessions s
      WHERE s.id = session_id
        AND (
          s.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
          )
        )
    )
  );

-- =============================================================================
-- 6. SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Interview session tables created successfully!';
  RAISE NOTICE 'Tables: public.interview_sessions, public.interview_recording_segments';
  RAISE NOTICE 'Design: one session with multiple segment clips';
END $$;

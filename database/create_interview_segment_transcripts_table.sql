-- Whisper transcript records for each recording segment
-- This table supports downstream evaluation/scoring pipelines.

CREATE TABLE IF NOT EXISTS public.interview_segment_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES public.interview_recording_segments(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.interview_question_bank(id) ON DELETE SET NULL,
  question_index INTEGER NOT NULL DEFAULT 0,
  transcript_text TEXT,
  language_code TEXT NOT NULL DEFAULT 'en',
  source_model TEXT NOT NULL DEFAULT 'whisper-1',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_transcript_segment UNIQUE (segment_id)
);

CREATE INDEX IF NOT EXISTS idx_ist_session_id ON public.interview_segment_transcripts(session_id);
CREATE INDEX IF NOT EXISTS idx_ist_question_index ON public.interview_segment_transcripts(question_index);
CREATE INDEX IF NOT EXISTS idx_ist_status ON public.interview_segment_transcripts(status);
CREATE INDEX IF NOT EXISTS idx_ist_created_at_desc ON public.interview_segment_transcripts(created_at DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_interview_segment_transcripts ON public.interview_segment_transcripts;
CREATE TRIGGER set_updated_at_interview_segment_transcripts
  BEFORE UPDATE ON public.interview_segment_transcripts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.interview_segment_transcripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own interview transcripts" ON public.interview_segment_transcripts;
CREATE POLICY "Users can view own interview transcripts"
  ON public.interview_segment_transcripts
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.interview_sessions s
      WHERE s.id = session_id
        AND (
          s.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can insert own interview transcripts" ON public.interview_segment_transcripts;
CREATE POLICY "Users can insert own interview transcripts"
  ON public.interview_segment_transcripts
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.interview_sessions s
      WHERE s.id = session_id
        AND (
          s.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can update own interview transcripts" ON public.interview_segment_transcripts;
CREATE POLICY "Users can update own interview transcripts"
  ON public.interview_segment_transcripts
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.interview_sessions s
      WHERE s.id = session_id
        AND (
          s.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
          )
        )
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.interview_sessions s
      WHERE s.id = session_id
        AND (
          s.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can delete own interview transcripts" ON public.interview_segment_transcripts;
CREATE POLICY "Users can delete own interview transcripts"
  ON public.interview_segment_transcripts
  FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.interview_sessions s
      WHERE s.id = session_id
        AND (
          s.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
          )
        )
    )
  );

DO $$
BEGIN
  RAISE NOTICE 'Interview transcript table ready: public.interview_segment_transcripts';
END $$;

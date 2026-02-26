-- Interview Question Bank Setup for Supabase
-- Supports: university preset questions + Phi-3 generated adaptive questions

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
-- 1. CREATE INTERVIEW QUESTION BANK TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.interview_question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  question_normalized TEXT GENERATED ALWAYS AS (
    lower(regexp_replace(trim(question_text), '\\s+', ' ', 'g'))
  ) STORED,
  category TEXT NOT NULL DEFAULT 'general',
  difficulty_level SMALLINT NOT NULL DEFAULT 2 CHECK (difficulty_level BETWEEN 1 AND 5),
  source_type TEXT NOT NULL DEFAULT 'preset'
    CHECK (source_type IN ('preset', 'generated', 'manual')),
  source_model TEXT,
  language_code TEXT NOT NULL DEFAULT 'en',
  star_focus TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  parent_question_id UUID REFERENCES public.interview_question_bank(id) ON DELETE SET NULL,
  generation_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  usage_count INTEGER NOT NULL DEFAULT 0,
  quality_score NUMERIC(3,2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_interview_question_bank_normalized UNIQUE (question_normalized)
);

-- =============================================================================
-- 2. INDEXES FOR SCALABILITY
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_iqb_active ON public.interview_question_bank(is_active);
CREATE INDEX IF NOT EXISTS idx_iqb_category ON public.interview_question_bank(category);
CREATE INDEX IF NOT EXISTS idx_iqb_source_type ON public.interview_question_bank(source_type);
CREATE INDEX IF NOT EXISTS idx_iqb_language ON public.interview_question_bank(language_code);
CREATE INDEX IF NOT EXISTS idx_iqb_parent_question_id ON public.interview_question_bank(parent_question_id);
CREATE INDEX IF NOT EXISTS idx_iqb_usage_count_desc ON public.interview_question_bank(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_iqb_created_at_desc ON public.interview_question_bank(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_iqb_generation_context_gin
  ON public.interview_question_bank USING gin(generation_context);

-- =============================================================================
-- 3. UPDATED_AT TRIGGER
-- =============================================================================

DROP TRIGGER IF EXISTS set_updated_at_interview_question_bank ON public.interview_question_bank;

CREATE TRIGGER set_updated_at_interview_question_bank
  BEFORE UPDATE ON public.interview_question_bank
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 4. ENABLE RLS + POLICIES
-- =============================================================================

ALTER TABLE public.interview_question_bank ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view active interview questions" ON public.interview_question_bank;
CREATE POLICY "Authenticated users can view active interview questions"
  ON public.interview_question_bank
  FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins and service role can insert interview questions" ON public.interview_question_bank;
CREATE POLICY "Admins and service role can insert interview questions"
  ON public.interview_question_bank
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins and service role can update interview questions" ON public.interview_question_bank;
CREATE POLICY "Admins and service role can update interview questions"
  ON public.interview_question_bank
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins and service role can delete interview questions" ON public.interview_question_bank;
CREATE POLICY "Admins and service role can delete interview questions"
  ON public.interview_question_bank
  FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- =============================================================================
-- 5. HELPER FUNCTION FOR PHI-3 UPSERTS (DE-DUP SAFE)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.add_generated_interview_question(
  p_question_text TEXT,
  p_category TEXT DEFAULT 'general',
  p_parent_question_id UUID DEFAULT NULL,
  p_source_model TEXT DEFAULT 'phi-3-mini',
  p_generation_context JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_question_id UUID;
BEGIN
  IF p_question_text IS NULL OR length(trim(p_question_text)) = 0 THEN
    RAISE EXCEPTION 'Question text cannot be empty';
  END IF;

  INSERT INTO public.interview_question_bank (
    question_text,
    category,
    source_type,
    source_model,
    parent_question_id,
    generation_context,
    created_by
  ) VALUES (
    trim(p_question_text),
    COALESCE(NULLIF(trim(p_category), ''), 'general'),
    'generated',
    p_source_model,
    p_parent_question_id,
    COALESCE(p_generation_context, '{}'::jsonb),
    auth.uid()
  )
  ON CONFLICT (question_normalized)
  DO UPDATE SET
    source_type = CASE
      WHEN public.interview_question_bank.source_type = 'preset' THEN public.interview_question_bank.source_type
      ELSE 'generated'
    END,
    source_model = COALESCE(EXCLUDED.source_model, public.interview_question_bank.source_model),
    generation_context = public.interview_question_bank.generation_context || EXCLUDED.generation_context,
    parent_question_id = COALESCE(public.interview_question_bank.parent_question_id, EXCLUDED.parent_question_id),
    updated_at = NOW()
  RETURNING id INTO v_question_id;

  RETURN v_question_id;
END;
$$;

-- =============================================================================
-- 6. SEED PRESET UNIVERSITY QUESTIONS
-- =============================================================================

INSERT INTO public.interview_question_bank (
  question_text,
  category,
  source_type,
  source_model,
  difficulty_level,
  star_focus,
  generation_context
)
VALUES
  ('Tell me something about yourself.', 'behavioral', 'preset', 'tsu-question-bank-v1', 1, ARRAY['Situation'], '{"origin":"TSU preset","version":"v1"}'::jsonb),
  ('What are your biggest strengths?', 'behavioral', 'preset', 'tsu-question-bank-v1', 2, ARRAY['Action'], '{"origin":"TSU preset","version":"v1"}'::jsonb),
  ('What is your biggest weakness?', 'behavioral', 'preset', 'tsu-question-bank-v1', 2, ARRAY['Action'], '{"origin":"TSU preset","version":"v1"}'::jsonb),
  ('Why should we hire you?', 'behavioral', 'preset', 'tsu-question-bank-v1', 2, ARRAY['Result'], '{"origin":"TSU preset","version":"v1"}'::jsonb),
  ('What is your professional achievement you''re most proud of?', 'behavioral', 'preset', 'tsu-question-bank-v1', 3, ARRAY['Situation','Task','Action','Result'], '{"origin":"TSU preset","version":"v1"}'::jsonb),
  ('What kind of work environment do you like best?', 'behavioral', 'preset', 'tsu-question-bank-v1', 2, ARRAY['Situation'], '{"origin":"TSU preset","version":"v1"}'::jsonb),
  ('Where do you see yourself in five years?', 'behavioral', 'preset', 'tsu-question-bank-v1', 2, ARRAY['Result'], '{"origin":"TSU preset","version":"v1"}'::jsonb),
  ('Give examples of ideas you''ve had or implemented.', 'behavioral', 'preset', 'tsu-question-bank-v1', 3, ARRAY['Action','Result'], '{"origin":"TSU preset","version":"v1"}'::jsonb),
  ('Who has impacted you most in your career and how?', 'behavioral', 'preset', 'tsu-question-bank-v1', 2, ARRAY['Situation','Result'], '{"origin":"TSU preset","version":"v1","secondary_category":"career_development"}'::jsonb),
  ('How do you feel about working weekends or late hours?', 'situational', 'preset', 'tsu-question-bank-v1', 2, ARRAY['Situation'], '{"origin":"TSU preset","version":"v1"}'::jsonb),
  ('What would your first 30, 60, or 90 days look like in this role?', 'situational', 'preset', 'tsu-question-bank-v1', 3, ARRAY['Task','Action','Result'], '{"origin":"TSU preset","version":"v1"}'::jsonb),
  ('Are you a team player?', 'situational', 'preset', 'tsu-question-bank-v1', 1, ARRAY['Action','Result'], '{"origin":"TSU preset","version":"v1"}'::jsonb),
  ('Are you a risk taker?', 'situational', 'preset', 'tsu-question-bank-v1', 2, ARRAY['Action'], '{"origin":"TSU preset","version":"v1"}'::jsonb),
  ('How do you deal with pressure or stressful situations?', 'situational', 'preset', 'tsu-question-bank-v1', 3, ARRAY['Situation','Action','Result'], '{"origin":"TSU preset","version":"v1"}'::jsonb),
  ('Do you prefer hard work or smart work?', 'situational', 'preset', 'tsu-question-bank-v1', 2, ARRAY['Action'], '{"origin":"TSU preset","version":"v1"}'::jsonb),
  ('How quickly do you adapt to new technology?', 'situational', 'preset', 'tsu-question-bank-v1', 2, ARRAY['Action','Result'], '{"origin":"TSU preset","version":"v1"}'::jsonb),
  ('What do you think our company/organization could do better?', 'situational', 'preset', 'tsu-question-bank-v1', 3, ARRAY['Task','Action'], '{"origin":"TSU preset","version":"v1"}'::jsonb),
  ('Give an example of how you have handled a challenge in school or workplace before.', 'situational', 'preset', 'tsu-question-bank-v1', 3, ARRAY['Situation','Task','Action','Result'], '{"origin":"TSU preset","version":"v1"}'::jsonb),
  ('Give an example of when you performed well under pressure.', 'situational', 'preset', 'tsu-question-bank-v1', 3, ARRAY['Situation','Action','Result'], '{"origin":"TSU preset","version":"v1"}'::jsonb),
  ('Give an example of when you showed leadership qualities.', 'situational', 'preset', 'tsu-question-bank-v1', 3, ARRAY['Situation','Action','Result'], '{"origin":"TSU preset","version":"v1"}'::jsonb),
  ('Tell me about a time when you had to give someone difficult feedback. How did you handle it?', 'situational', 'preset', 'tsu-question-bank-v1', 4, ARRAY['Situation','Action','Result'], '{"origin":"TSU preset","version":"v1"}'::jsonb),
  ('What is your greatest failure and what did you learn from it?', 'situational', 'preset', 'tsu-question-bank-v1', 3, ARRAY['Situation','Result'], '{"origin":"TSU preset","version":"v1"}'::jsonb),
  ('What are you looking for in terms of career development?', 'career_development', 'preset', 'tsu-question-bank-v1', 2, ARRAY['Task','Result'], '{"origin":"TSU preset","version":"v1"}'::jsonb),
  ('How do you want to improve yourself in the next year?', 'career_development', 'preset', 'tsu-question-bank-v1', 2, ARRAY['Action','Result'], '{"origin":"TSU preset","version":"v1"}'::jsonb),
  ('What kind of goals would you have in mind if you got this job?', 'career_development', 'preset', 'tsu-question-bank-v1', 2, ARRAY['Task','Result'], '{"origin":"TSU preset","version":"v1"}'::jsonb)
ON CONFLICT (question_normalized) DO NOTHING;

-- =============================================================================
-- 7. SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Interview question bank setup completed successfully!';
  RAISE NOTICE 'Table: public.interview_question_bank';
  RAISE NOTICE 'Seeded preset + generated-ready schema with de-dup and RLS';
END $$;

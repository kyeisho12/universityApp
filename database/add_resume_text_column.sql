-- Add resume_text column to store extracted plain text from uploaded resume files.
-- Used by the TF-IDF job recommendation algorithm to match resume content against job descriptions.

ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS resume_text TEXT;

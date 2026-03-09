-- Fix missing RPC used after successful job application submit.
-- Run in Supabase SQL Editor (production) to remove the console error:
-- "Could not find function public.increment_job_listing_count(job_id_input)"

CREATE OR REPLACE FUNCTION public.increment_job_listing_count(job_id_input UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.jobs
  SET applications_count = COALESCE(applications_count, 0) + 1,
      updated_at = NOW()
  WHERE id = job_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_job_listing_count(UUID) TO authenticated;

-- Simpler fix: Disable RLS on employers table for service role access
-- The backend API uses service role key which should have full access

-- Option 1: Disable RLS completely on employers table
ALTER TABLE public.employers DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'employers';

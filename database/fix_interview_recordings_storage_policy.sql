-- Fix admin playback access for interview recording videos in private storage bucket.
-- Run this in Supabase SQL Editor for existing projects.

DROP POLICY IF EXISTS "Admins can view all interview recordings" ON storage.objects;
CREATE POLICY "Admins can view all interview recordings"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'interview-recordings'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

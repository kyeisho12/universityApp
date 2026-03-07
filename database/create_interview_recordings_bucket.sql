-- Supabase Storage setup for interview recording segments
-- Bucket contains per-user folders: {user_id}/{session_identifier}/qXX_segYY.webm

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'interview-recordings',
  'interview-recordings',
  false,
  104857600,
  ARRAY['video/webm', 'video/mp4']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own interview recordings" ON storage.objects;
CREATE POLICY "Users can upload own interview recordings"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'interview-recordings'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Users can view own interview recordings" ON storage.objects;
CREATE POLICY "Users can view own interview recordings"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'interview-recordings'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

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

DROP POLICY IF EXISTS "Users can update own interview recordings" ON storage.objects;
CREATE POLICY "Users can update own interview recordings"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'interview-recordings'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
  )
)
WITH CHECK (
  bucket_id = 'interview-recordings'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Users can delete own interview recordings" ON storage.objects;
CREATE POLICY "Users can delete own interview recordings"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'interview-recordings'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

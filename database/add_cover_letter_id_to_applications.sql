-- Add cover_letter_id column to applications table
-- This allows students to attach cover letter PDF files to their job applications

ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS cover_letter_id UUID REFERENCES resumes(id) ON DELETE SET NULL;

-- Create index for better query performance on cover_letter_id
CREATE INDEX IF NOT EXISTS idx_applications_cover_letter_id ON applications(cover_letter_id);

-- Update RLS policy to allow students to view their own cover letter attachments
-- (Already covered by existing policies since it's a reference to resumes table)

COMMENT ON COLUMN applications.cover_letter_id IS 'UUID reference to the cover letter document stored in resumes table';


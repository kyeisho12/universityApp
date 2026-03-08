-- Add year_level column to profiles table
-- This allows students to specify their year level (1st year, 2nd year, etc.)

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS year_level INTEGER;

COMMENT ON COLUMN profiles.year_level IS 'Student year level (1-5)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_year_level ON profiles(year_level);



-- Clean SQL for Job Applications - Run this if you get constraint errors

-- First, drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_applications_updated_at_trigger ON applications CASCADE;
DROP TRIGGER IF EXISTS check_duplicate_application_trigger ON applications CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_applications_updated_at() CASCADE;
DROP FUNCTION IF EXISTS check_duplicate_application() CASCADE;

-- Drop existing policies
DROP POLICY IF EXISTS "Students can view their own applications" ON applications CASCADE;
DROP POLICY IF EXISTS "Students can create applications" ON applications CASCADE;
DROP POLICY IF EXISTS "Students can update their pending applications" ON applications CASCADE;
DROP POLICY IF EXISTS "Admins can view all applications" ON applications CASCADE;
DROP POLICY IF EXISTS "Admins can update application status" ON applications CASCADE;

-- Drop the table if it exists (this will cascade to everything)
DROP TABLE IF EXISTS applications CASCADE;

-- Now create the fresh table
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    cover_letter TEXT,
    resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
    application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_job_application UNIQUE(student_id, job_id)
);

-- Create indexes
CREATE INDEX idx_applications_student_id ON applications(student_id);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_employer_id ON applications(employer_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_created_at ON applications(created_at DESC);
CREATE INDEX idx_applications_student_job ON applications(student_id, job_id);

-- Enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Students can view their own applications"
    ON applications FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "Admins can view all applications"
    ON applications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Students can create applications"
    ON applications FOR INSERT
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their pending applications"
    ON applications FOR UPDATE
    USING (auth.uid() = student_id AND status = 'pending')
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admins can update application status"
    ON applications FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Functions and Triggers
CREATE FUNCTION check_duplicate_application()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM applications 
        WHERE student_id = NEW.student_id 
        AND job_id = NEW.job_id 
        AND id != NEW.id
        AND status != 'withdrawn'
    ) THEN
        RAISE EXCEPTION 'Student has already applied to this job';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_duplicate_application_trigger
    BEFORE INSERT OR UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION check_duplicate_application();

CREATE FUNCTION update_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_applications_updated_at_trigger
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION update_applications_updated_at();

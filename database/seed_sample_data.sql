-- Sample Data for Testing Dashboard
-- Run this SQL in your Supabase SQL Editor to populate sample data

-- =============================================================================
-- 1. ADD SAMPLE EMPLOYERS
-- =============================================================================

INSERT INTO public.employers (name, email, location, website, industry, contact_person, phone_number)
VALUES 
  ('Tech Corp', 'careers@techcorp.com', 'San Francisco, CA', 'https://techcorp.com', 'Technology', 'John Smith', '(555) 123-4567'),
  ('Finance Plus', 'hr@financeplus.com', 'New York, NY', 'https://financeplus.com', 'Finance', 'Sarah Johnson', '(555) 234-5678'),
  ('Creative Agency', 'jobs@creativeagency.com', 'Los Angeles, CA', 'https://creativeagency.com', 'Marketing', 'Mike Davis', '(555) 345-6789')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 2. ADD SAMPLE JOBS
-- =============================================================================

-- Get employer IDs (you may need to adjust these based on your actual IDs)
INSERT INTO public.jobs (employer_id, title, description, requirements, category, job_type, location, salary_range, deadline, status)
SELECT 
  e.id,
  'Senior Software Engineer',
  'We are looking for an experienced software engineer to join our team. You will work on cutting-edge technology and have the opportunity to lead projects.',
  ARRAY['5+ years of experience', 'Node.js', 'React', 'PostgreSQL', 'Docker', 'AWS'],
  'Engineering',
  'Full-time',
  'San Francisco, CA',
  '$120,000 - $160,000',
  CURRENT_DATE + INTERVAL '30 days',
  'active'
FROM public.employers e WHERE e.name = 'Tech Corp'
ON CONFLICT DO NOTHING;

INSERT INTO public.jobs (employer_id, title, description, requirements, category, job_type, location, salary_range, deadline, status)
SELECT 
  e.id,
  'Data Analyst Internship',
  'Join our analytics team as a Data Analyst Intern. Work with real-world datasets and gain valuable experience in data science.',
  ARRAY['Python or R', 'SQL', 'Excel', 'Data visualization', 'Statistical analysis'],
  'Analytics',
  'Internship',
  'New York, NY',
  '$18 - $22/hour',
  CURRENT_DATE + INTERVAL '45 days',
  'active'
FROM public.employers e WHERE e.name = 'Finance Plus'
ON CONFLICT DO NOTHING;

INSERT INTO public.jobs (employer_id, title, description, requirements, category, job_type, location, salary_range, deadline, status)
SELECT 
  e.id,
  'UX/UI Designer',
  'Create beautiful and intuitive user interfaces. Work with cross-functional teams to design amazing digital experiences.',
  ARRAY['3+ years of UX/UI design', 'Figma', 'Adobe Creative Suite', 'Prototyping', 'User research'],
  'Design',
  'Full-time',
  'Los Angeles, CA',
  '$90,000 - $130,000',
  CURRENT_DATE + INTERVAL '25 days',
  'active'
FROM public.employers e WHERE e.name = 'Creative Agency'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 3. ADD SAMPLE CAREER EVENTS
-- =============================================================================

INSERT INTO public.career_events (title, description, event_type, location, start_date, end_date, max_attendees, registered_students)
VALUES 
  (
    'Tech Career Fair 2026',
    'Join us for a career fair featuring top tech companies. Meet recruiters and explore exciting opportunities.',
    'Job Fair',
    'Convention Center, San Francisco',
    CURRENT_TIMESTAMP + INTERVAL '7 days',
    CURRENT_TIMESTAMP + INTERVAL '7 days 4 hours',
    500,
    ARRAY[]::text[]
  ),
  (
    'Data Science Workshop',
    'Learn practical data science skills from industry experts. Hands-on workshop covering machine learning and data analysis.',
    'Workshop',
    'Virtual',
    CURRENT_TIMESTAMP + INTERVAL '14 days',
    CURRENT_TIMESTAMP + INTERVAL '14 days 2 hours',
    100,
    ARRAY[]::text[]
  ),
  (
    'Interview Preparation Seminar',
    'Get tips and tricks for acing your interviews. Q&A session with hiring managers.',
    'Seminar',
    'Student Center, Room 201',
    CURRENT_TIMESTAMP + INTERVAL '21 days',
    CURRENT_TIMESTAMP + INTERVAL '21 days 1.5 hours',
    50,
    ARRAY[]::text[]
  ),
  (
    'Product Management 101',
    'Introduction to product management career path. Learn about PM roles and responsibilities.',
    'Webinar',
    'Virtual',
    CURRENT_TIMESTAMP + INTERVAL '10 days',
    CURRENT_TIMESTAMP + INTERVAL '10 days 1 hour',
    200,
    ARRAY[]::text[]
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 4. SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Sample data inserted successfully!';
  RAISE NOTICE 'Sample employers: 3';
  RAISE NOTICE 'Sample jobs: 3';
  RAISE NOTICE 'Sample events: 4';
END $$;

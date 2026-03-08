-- Enforce student approval flow.
-- After this, new student registrations are blocked from login
-- until an admin sets is_verified = true.

-- 1) New profiles default to unverified.
ALTER TABLE public.profiles
ALTER COLUMN is_verified SET DEFAULT FALSE;

-- 2) Ensure existing admins remain verified.
UPDATE public.profiles
SET is_verified = TRUE
WHERE role = 'admin';

-- 3) Update signup trigger behavior:
--    admin/recruiter accounts can be verified immediately,
--    students require admin approval.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'student') IN ('admin', 'recruiter') THEN TRUE
      ELSE FALSE
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: if you want to force current student accounts back to pending,
-- run this manually:
-- UPDATE public.profiles SET is_verified = FALSE WHERE role = 'student';

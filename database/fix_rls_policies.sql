-- Fix RLS Policies for Admin Access
-- Run this if you're getting 500 errors when accessing admin features

-- First, temporarily disable RLS to test
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Or, fix the policies with simpler logic:

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Recreate with simpler, more efficient policies

-- Policy: Admins can view all profiles (simplified)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Policy: Admins can update all profiles (simplified)
CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Policy: Admins can delete profiles (simplified)
CREATE POLICY "Admins can delete profiles"
  ON public.profiles
  FOR DELETE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Verify your admin status
SELECT id, email, role FROM public.profiles WHERE role = 'admin';

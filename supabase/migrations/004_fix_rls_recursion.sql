-- Fix infinite recursion in hr_profiles RLS policies
-- The admin policies query hr_profiles from within hr_profiles RLS, causing recursion.
-- Solution: Use a SECURITY DEFINER function that bypasses RLS to check admin role.

-- Step 1: Create a helper function that bypasses RLS
CREATE OR REPLACE FUNCTION hr_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM hr_profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION hr_is_manager_of(employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM hr_profiles WHERE id = employee_id AND reporting_manager_id = auth.uid()
  );
$$;

-- Step 2: Drop old policies that cause recursion
DROP POLICY IF EXISTS "Users can view own profile" ON hr_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON hr_profiles;
DROP POLICY IF EXISTS "Managers can view reports" ON hr_profiles;
DROP POLICY IF EXISTS "Admins full access profiles" ON hr_profiles;

-- Step 3: Create new non-recursive policies
-- Users can see their own profile
CREATE POLICY "Users can view own profile" ON hr_profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON hr_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Managers can see their direct reports
CREATE POLICY "Managers can view reports" ON hr_profiles
  FOR SELECT USING (reporting_manager_id = auth.uid());

-- Admins can read all profiles (using SECURITY DEFINER function to avoid recursion)
CREATE POLICY "Admins can read all profiles" ON hr_profiles
  FOR SELECT USING (hr_is_admin());

-- Admins can modify all profiles
CREATE POLICY "Admins can modify all profiles" ON hr_profiles
  FOR ALL USING (hr_is_admin());

-- Step 4: Fix attendance policies (same recursion issue)
DROP POLICY IF EXISTS "Admins full access attendance" ON hr_attendance;
CREATE POLICY "Admins full access attendance" ON hr_attendance
  FOR ALL USING (hr_is_admin());

-- Managers can view their team's attendance
CREATE POLICY "Managers can view team attendance" ON hr_attendance
  FOR SELECT USING (hr_is_manager_of(user_id));

-- Step 5: Fix leave balance policies
DROP POLICY IF EXISTS "Admins full access leave balances" ON hr_leave_balances;
CREATE POLICY "Admins full access leave balances" ON hr_leave_balances
  FOR ALL USING (hr_is_admin());

-- Users can update their own leave balance (needed for leave submission)
CREATE POLICY "Users can update own leave balance" ON hr_leave_balances
  FOR UPDATE USING (auth.uid() = user_id);

-- Step 6: Fix leave request policies
DROP POLICY IF EXISTS "Managers can view team leave requests" ON hr_leave_requests;
DROP POLICY IF EXISTS "Managers can update team leave requests" ON hr_leave_requests;
DROP POLICY IF EXISTS "Admins full access leave requests" ON hr_leave_requests;

CREATE POLICY "Managers can view team leave requests" ON hr_leave_requests
  FOR SELECT USING (hr_is_manager_of(user_id));

CREATE POLICY "Managers can update team leave requests" ON hr_leave_requests
  FOR UPDATE USING (hr_is_manager_of(user_id));

CREATE POLICY "Admins full access leave requests" ON hr_leave_requests
  FOR ALL USING (hr_is_admin());

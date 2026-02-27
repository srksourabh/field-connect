-- UDS HR System - Database Schema
-- Added to existing Supabase database alongside POS tables
-- All tables prefixed with hr_ to avoid conflicts

-- 1. HR Profiles
CREATE TABLE IF NOT EXISTS hr_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  designation TEXT,
  reporting_manager_id UUID REFERENCES hr_profiles(id),
  project_id TEXT,
  department TEXT,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'manager', 'admin')),
  avatar_url TEXT,
  phone TEXT,
  email TEXT,
  date_of_joining DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HR Attendance
CREATE TABLE IF NOT EXISTS hr_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hr_profiles(id) ON DELETE CASCADE,
  punch_in_at TIMESTAMPTZ,
  punch_out_at TIMESTAMPTZ,
  punch_in_lat DOUBLE PRECISION,
  punch_in_long DOUBLE PRECISION,
  punch_out_lat DOUBLE PRECISION,
  punch_out_long DOUBLE PRECISION,
  total_distance_km DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half-day')),
  synced BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. HR Leave Balances
CREATE TABLE IF NOT EXISTS hr_leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hr_profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  sick_leave_total INTEGER DEFAULT 10,
  sick_leave_used INTEGER DEFAULT 0,
  casual_leave_total INTEGER DEFAULT 5,
  casual_leave_used INTEGER DEFAULT 0,
  compoff_total INTEGER DEFAULT 0,
  compoff_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year)
);

-- 4. HR Leave Requests
CREATE TABLE IF NOT EXISTS hr_leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hr_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sick', 'casual', 'compoff')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES hr_profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hr_attendance_user_date ON hr_attendance(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_user ON hr_leave_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_profiles_manager ON hr_profiles(reporting_manager_id);

-- Row Level Security
ALTER TABLE hr_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_leave_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can read their own data
CREATE POLICY "Users can view own profile" ON hr_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON hr_profiles FOR UPDATE USING (auth.uid() = id);

-- Managers can see their reports
CREATE POLICY "Managers can view reports" ON hr_profiles FOR SELECT
  USING (auth.uid() = reporting_manager_id);

-- Admins can do everything
CREATE POLICY "Admins full access profiles" ON hr_profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM hr_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Attendance policies
CREATE POLICY "Users can view own attendance" ON hr_attendance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own attendance" ON hr_attendance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own attendance" ON hr_attendance FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins full access attendance" ON hr_attendance FOR ALL
  USING (EXISTS (SELECT 1 FROM hr_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Leave balance policies
CREATE POLICY "Users can view own leave balance" ON hr_leave_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins full access leave balances" ON hr_leave_balances FOR ALL
  USING (EXISTS (SELECT 1 FROM hr_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Leave request policies
CREATE POLICY "Users can view own leave requests" ON hr_leave_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own leave requests" ON hr_leave_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Managers can view team leave requests" ON hr_leave_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM hr_profiles WHERE id = hr_leave_requests.user_id AND reporting_manager_id = auth.uid()
  ));
CREATE POLICY "Managers can update team leave requests" ON hr_leave_requests FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM hr_profiles WHERE id = hr_leave_requests.user_id AND reporting_manager_id = auth.uid()
  ));
CREATE POLICY "Admins full access leave requests" ON hr_leave_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM hr_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION hr_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hr_profiles_updated_at BEFORE UPDATE ON hr_profiles
  FOR EACH ROW EXECUTE FUNCTION hr_update_updated_at();

CREATE TRIGGER hr_leave_balances_updated_at BEFORE UPDATE ON hr_leave_balances
  FOR EACH ROW EXECUTE FUNCTION hr_update_updated_at();

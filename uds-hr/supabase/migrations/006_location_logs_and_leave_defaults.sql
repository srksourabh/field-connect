-- Migration 006: Location logs table + fix leave balance defaults
-- hr_location_logs: stores GPS captures for punch-in, punch-out, scheduled, and manual sources

CREATE TABLE IF NOT EXISTS hr_location_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hr_profiles(id) ON DELETE CASCADE,
  attendance_id UUID REFERENCES hr_attendance(id) ON DELETE SET NULL,
  lat DOUBLE PRECISION NOT NULL,
  long DOUBLE PRECISION NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL CHECK (source IN ('punch_in', 'punch_out', 'scheduled', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX idx_location_logs_user_captured ON hr_location_logs (user_id, captured_at);
CREATE INDEX idx_location_logs_attendance ON hr_location_logs (attendance_id);

-- RLS
ALTER TABLE hr_location_logs ENABLE ROW LEVEL SECURITY;

-- Users can insert their own location logs
CREATE POLICY location_logs_insert_own ON hr_location_logs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Users can view their own location logs
CREATE POLICY location_logs_select_own ON hr_location_logs
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- Managers can view their team's location logs
CREATE POLICY location_logs_select_manager ON hr_location_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hr_profiles
      WHERE hr_profiles.id = hr_location_logs.user_id
        AND hr_profiles.reporting_manager_id = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY location_logs_admin_all ON hr_location_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM hr_profiles
      WHERE hr_profiles.id = auth.uid()
        AND hr_profiles.role = 'admin'
    )
  );

-- Fix leave balance defaults (should be 5 sick + 10 casual, not swapped)
ALTER TABLE hr_leave_balances ALTER COLUMN sick_leave_total SET DEFAULT 5;
ALTER TABLE hr_leave_balances ALTER COLUMN casual_leave_total SET DEFAULT 10;

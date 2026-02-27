-- UDS HR System - Rectification Requests
-- Allows employees to request corrections to attendance records

-- 5. HR Rectification Requests
CREATE TABLE IF NOT EXISTS hr_rectification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hr_profiles(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  attendance_id UUID REFERENCES hr_attendance(id) ON DELETE SET NULL,
  rectification_type TEXT NOT NULL CHECK (rectification_type IN ('missed_punch_in', 'missed_punch_out', 'wrong_time', 'other')),
  original_punch_in TIMESTAMPTZ,
  original_punch_out TIMESTAMPTZ,
  corrected_punch_in TIMESTAMPTZ,
  corrected_punch_out TIMESTAMPTZ,
  corrected_status TEXT CHECK (corrected_status IN ('present', 'late', 'half-day')),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES hr_profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hr_rectification_user ON hr_rectification_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_rectification_date ON hr_rectification_requests(attendance_date);

-- Row Level Security
ALTER TABLE hr_rectification_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies: same pattern as leave_requests
CREATE POLICY "Users can view own rectification requests" ON hr_rectification_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rectification requests" ON hr_rectification_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can view team rectification requests" ON hr_rectification_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM hr_profiles WHERE id = hr_rectification_requests.user_id AND reporting_manager_id = auth.uid()
  ));

CREATE POLICY "Managers can update team rectification requests" ON hr_rectification_requests FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM hr_profiles WHERE id = hr_rectification_requests.user_id AND reporting_manager_id = auth.uid()
  ));

CREATE POLICY "Admins full access rectification requests" ON hr_rectification_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM hr_profiles WHERE id = auth.uid() AND role = 'admin'));

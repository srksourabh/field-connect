-- Phase 7: Expand attendance status, add privilege leave, create hr_config

-- 7.1 Expand hr_attendance.status to include on-leave, holiday, lwp
ALTER TABLE hr_attendance DROP CONSTRAINT IF EXISTS hr_attendance_status_check;
ALTER TABLE hr_attendance ADD CONSTRAINT hr_attendance_status_check
  CHECK (status IN ('present', 'absent', 'late', 'half-day', 'on-leave', 'holiday', 'lwp'));

-- 7.2 Add privilege leave columns to hr_leave_balances
ALTER TABLE hr_leave_balances
  ADD COLUMN IF NOT EXISTS privilege_leave_total INT NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS privilege_leave_used INT NOT NULL DEFAULT 0;

-- Expand hr_leave_requests.type to include 'privilege'
ALTER TABLE hr_leave_requests DROP CONSTRAINT IF EXISTS hr_leave_requests_type_check;
ALTER TABLE hr_leave_requests ADD CONSTRAINT hr_leave_requests_type_check
  CHECK (type IN ('sick', 'casual', 'compoff', 'privilege'));

-- 7.3 Create hr_config table for key-value settings (e.g. leave policy PDF URL)
CREATE TABLE IF NOT EXISTS hr_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for hr_config
ALTER TABLE hr_config ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read config
CREATE POLICY "Authenticated can read config"
ON hr_config FOR SELECT TO authenticated
USING (true);

-- Only admins can insert/update config
CREATE POLICY "Admins can insert config"
ON hr_config FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM hr_profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can update config"
ON hr_config FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM hr_profiles WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM hr_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Storage bucket for policy documents (create via API; this adds RLS policies)
-- Allow authenticated users to upload policy files
CREATE POLICY "Authenticated can upload policy docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'policy-documents');

-- Allow anyone to read policy files
CREATE POLICY "Anyone can read policy docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'policy-documents');

-- Allow authenticated to delete policy docs
CREATE POLICY "Authenticated can delete policy docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'policy-documents');

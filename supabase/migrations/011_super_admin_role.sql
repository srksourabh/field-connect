-- 011: Add super_admin role, deactivated_at column, announcement notification type

-- 1. Add super_admin to hr_profiles.role CHECK constraint
ALTER TABLE hr_profiles DROP CONSTRAINT IF EXISTS hr_profiles_role_check;
ALTER TABLE hr_profiles ADD CONSTRAINT hr_profiles_role_check
  CHECK (role IN ('employee', 'manager', 'admin', 'super_admin'));

-- 2. Add deactivated_at column for soft-delete
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Update hr_is_admin() to include super_admin
CREATE OR REPLACE FUNCTION hr_is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM hr_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. Add announcement to hr_notifications.type CHECK (if constraint exists)
ALTER TABLE hr_notifications DROP CONSTRAINT IF EXISTS hr_notifications_type_check;
ALTER TABLE hr_notifications ADD CONSTRAINT hr_notifications_type_check
  CHECK (type IN (
    'leave_request', 'leave_approved', 'leave_rejected',
    'rectification_request', 'rectification_approved', 'rectification_rejected',
    'system', 'announcement'
  ));

-- 5. Set Sourabh Bhaumik and Suman Mukherjee as super_admin
-- (match by name since UUIDs may vary)
UPDATE hr_profiles SET role = 'super_admin'
WHERE full_name IN ('Sourabh Bhaumik', 'Suman Mukherjee');

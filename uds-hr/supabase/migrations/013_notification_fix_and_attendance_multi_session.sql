-- 013: Fix notification type constraint + ensure leave withdrawn status

-- 1. Update notification type CHECK to include all types used in the app
ALTER TABLE hr_notifications DROP CONSTRAINT IF EXISTS hr_notifications_type_check;
ALTER TABLE hr_notifications ADD CONSTRAINT hr_notifications_type_check
  CHECK (type IN (
    'leave_request', 'leave_approved', 'leave_rejected', 'leave_withdrawn',
    'rectification_request', 'rectification_approved', 'rectification_rejected',
    'system', 'announcement'
  ));

-- 2. Ensure withdrawn status exists on leave requests
ALTER TABLE hr_leave_requests DROP CONSTRAINT IF EXISTS hr_leave_requests_status_check;
ALTER TABLE hr_leave_requests ADD CONSTRAINT hr_leave_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn'));

-- 3. Ensure user can update own pending leave requests (for withdraw)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own pending leave requests'
  ) THEN
    CREATE POLICY "Users can update own pending leave requests"
    ON hr_leave_requests FOR UPDATE TO authenticated
    USING (user_id = auth.uid() AND status = 'pending')
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 4. Ensure RLS for onboarding tokens uses hr_is_admin()
DROP POLICY IF EXISTS "Admins can create onboarding tokens" ON hr_onboarding_tokens;
CREATE POLICY "Admins can create onboarding tokens"
ON hr_onboarding_tokens FOR INSERT TO authenticated
WITH CHECK (hr_is_admin());

DROP POLICY IF EXISTS "Admins can view onboarding tokens" ON hr_onboarding_tokens;
CREATE POLICY "Admins can view onboarding tokens"
ON hr_onboarding_tokens FOR SELECT TO authenticated
USING (hr_is_admin());

DROP POLICY IF EXISTS "Admins can delete onboarding tokens" ON hr_onboarding_tokens;
CREATE POLICY "Admins can delete onboarding tokens"
ON hr_onboarding_tokens FOR DELETE TO authenticated
USING (hr_is_admin());

-- 012: Beta 2.2 — Onboarding RLS fix, withdrawn leave status, self-update leave RLS

-- 1. Fix onboarding token RLS: replace role='admin' with hr_is_admin() (includes super_admin)
DROP POLICY IF EXISTS "Admins can create onboarding tokens" ON hr_onboarding_tokens;
CREATE POLICY "Admins can create onboarding tokens"
ON hr_onboarding_tokens FOR INSERT TO authenticated
WITH CHECK (hr_is_admin());

DROP POLICY IF EXISTS "Admins can view onboarding tokens" ON hr_onboarding_tokens;
CREATE POLICY "Admins can view onboarding tokens"
ON hr_onboarding_tokens FOR SELECT TO authenticated
USING (hr_is_admin());

-- 2. Add 'withdrawn' to leave request status CHECK
ALTER TABLE hr_leave_requests DROP CONSTRAINT IF EXISTS hr_leave_requests_status_check;
ALTER TABLE hr_leave_requests ADD CONSTRAINT hr_leave_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn'));

-- 3. Add 'leave_withdrawn' to notification type CHECK
ALTER TABLE hr_notifications DROP CONSTRAINT IF EXISTS hr_notifications_type_check;
ALTER TABLE hr_notifications ADD CONSTRAINT hr_notifications_type_check
  CHECK (type IN (
    'leave_request', 'leave_approved', 'leave_rejected', 'leave_withdrawn',
    'rectification_request', 'rectification_approved', 'rectification_rejected',
    'system', 'announcement'
  ));

-- 4. Allow users to update their own pending leave requests (for withdraw)
CREATE POLICY "Users can update own pending leave requests"
ON hr_leave_requests FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND status = 'pending')
WITH CHECK (user_id = auth.uid());

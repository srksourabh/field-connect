-- 005: Notifications table + leave/rectification reviewer_comment + leave balance RLS for managers

-- 1. Create hr_notifications table
CREATE TABLE IF NOT EXISTS hr_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES hr_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL CHECK (type IN (
    'leave_request', 'leave_approved', 'leave_rejected',
    'rectification_request', 'rectification_approved', 'rectification_rejected',
    'system'
  )),
  reference_id UUID,
  reference_type TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for notifications
ALTER TABLE hr_notifications ENABLE ROW LEVEL SECURITY;

-- Users can see their own notifications
CREATE POLICY "Users can view own notifications" ON hr_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update (mark read) their own notifications
CREATE POLICY "Users can update own notifications" ON hr_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Authenticated users can insert notifications for anyone (cross-user notifications)
CREATE POLICY "Authenticated can insert notifications" ON hr_notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Admins see all notifications
CREATE POLICY "Admins full access notifications" ON hr_notifications
  FOR ALL USING (hr_is_admin());

-- 2. Add reviewer_comment to leave requests
ALTER TABLE hr_leave_requests ADD COLUMN IF NOT EXISTS reviewer_comment TEXT;

-- 3. Add reviewer_comment to rectification requests
ALTER TABLE hr_rectification_requests ADD COLUMN IF NOT EXISTS reviewer_comment TEXT;

-- 4. Managers can update team leave balances (for deducting on approval)
CREATE POLICY "Managers can update team leave balances" ON hr_leave_balances
  FOR UPDATE USING (hr_is_manager_of(user_id));

-- 5. Managers can view team leave balances
CREATE POLICY "Managers can view team leave balances" ON hr_leave_balances
  FOR SELECT USING (hr_is_manager_of(user_id));

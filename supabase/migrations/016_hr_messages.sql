-- 016: Anonymous messages to HR
-- Employees can send complaints, suggestions, feedback to HR.
-- Only super_admin and HR-designated admins can view them.

CREATE TABLE IF NOT EXISTS hr_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  category TEXT NOT NULL CHECK (category IN ('complaint', 'suggestion', 'feedback', 'other')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT true,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE hr_messages ENABLE ROW LEVEL SECURITY;

-- Employees can insert their own messages
CREATE POLICY "Users can insert own messages"
ON hr_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid());

-- Only admins can read all messages (further filtered in app by super_admin/HR)
CREATE POLICY "Admins can read messages"
ON hr_messages FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM hr_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Users can read their own messages
CREATE POLICY "Users can read own messages"
ON hr_messages FOR SELECT TO authenticated
USING (sender_id = auth.uid());

-- Admins can update (mark as read)
CREATE POLICY "Admins can update messages"
ON hr_messages FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM hr_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

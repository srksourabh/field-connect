-- Onboarding tokens for public onboarding links
CREATE TABLE IF NOT EXISTS hr_onboarding_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE hr_onboarding_tokens ENABLE ROW LEVEL SECURITY;

-- Admins can insert tokens
CREATE POLICY "Admins can create onboarding tokens"
ON hr_onboarding_tokens FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM hr_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Admins can view all tokens
CREATE POLICY "Admins can view onboarding tokens"
ON hr_onboarding_tokens FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM hr_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Allow anonymous reads for token validation (public onboarding form)
CREATE POLICY "Anyone can validate onboarding tokens"
ON hr_onboarding_tokens FOR SELECT TO anon
USING (true);

-- Allow anonymous updates to mark token as used
CREATE POLICY "Anyone can mark token as used"
ON hr_onboarding_tokens FOR UPDATE TO anon
USING (true)
WITH CHECK (true);

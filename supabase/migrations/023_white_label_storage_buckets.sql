-- 023: Ensure storage buckets exist for fresh white-label projects
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('leave-attachments', 'leave-attachments', true),
  ('policy-documents', 'policy-documents', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

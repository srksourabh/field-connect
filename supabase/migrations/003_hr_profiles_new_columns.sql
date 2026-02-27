-- Add employee data columns to hr_profiles
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS employee_code TEXT UNIQUE;
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS pincode TEXT;

-- Create avatars storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access to avatars
CREATE POLICY "Public avatar read access" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- Allow users to update/delete their own avatar
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

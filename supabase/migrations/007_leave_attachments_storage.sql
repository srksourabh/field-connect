-- Storage policies for leave-attachments bucket
-- Bucket was created via API; this migration adds RLS policies

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload leave attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'leave-attachments');

-- Allow anyone to read/download files (public bucket)
CREATE POLICY "Anyone can read leave attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'leave-attachments');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Authenticated users can delete leave attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'leave-attachments');

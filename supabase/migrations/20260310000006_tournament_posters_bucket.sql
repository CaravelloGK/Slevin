-- Create public storage bucket for tournament posters.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tournament-posters',
  'tournament-posters',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users (admin) to upload/manage objects
CREATE POLICY "Admins can upload tournament posters"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'tournament-posters');

CREATE POLICY "Admins can update tournament posters"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'tournament-posters');

-- Public read access (bucket is public, but policy layer still needed)
CREATE POLICY "Public can read tournament posters"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'tournament-posters');

-- Create storage bucket for property photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for property-photos bucket

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload property photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-photos');

-- Allow everyone to view property photos (public bucket)
CREATE POLICY "Anyone can view property photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'property-photos');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Users can delete their own property photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-photos');

-- Allow authenticated users to update their own uploads
CREATE POLICY "Users can update their own property photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'property-photos');

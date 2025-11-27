-- Add INSERT policy for notifications
-- Allow authenticated users to create notifications for any user
-- This is needed for system-generated notifications (e.g., when submitting customers/properties)

CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

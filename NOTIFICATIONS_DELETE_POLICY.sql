-- Enable DELETE policy for notifications
-- Users can delete their own notifications

CREATE POLICY "Users can delete their own notifications"
ON notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

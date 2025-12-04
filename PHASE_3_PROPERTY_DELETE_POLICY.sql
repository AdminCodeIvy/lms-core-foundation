-- Add DELETE policy for properties table
-- This allows INPUTTER users to delete their own DRAFT properties
-- and ADMINISTRATOR users to delete any property

CREATE POLICY "Users can delete own draft properties or admins can delete any"
  ON public.properties
  FOR DELETE
  TO authenticated
  USING (
    -- INPUTTER can delete their own DRAFT properties
    (created_by = auth.uid() AND status = 'DRAFT')
    OR 
    -- ADMINISTRATOR can delete any property
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'ADMINISTRATOR'
      AND is_active = true
    )
  );

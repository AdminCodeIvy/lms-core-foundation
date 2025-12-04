-- ============================================
-- LMS Phase 2C: RLS policy for customer delete
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- This allows INPUTTER users to delete their own DRAFT customers
-- and ADMINISTRATOR users to delete any customer

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can delete own draft customers or admins can delete any" ON public.customers;

-- Create DELETE policy for customers table
CREATE POLICY "Users can delete own draft customers or admins can delete any"
  ON public.customers
  FOR DELETE
  TO authenticated
  USING (
    -- INPUTTER can delete their own DRAFT customers
    (created_by = auth.uid() AND status = 'DRAFT')
    OR 
    -- ADMINISTRATOR can delete any customer
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'ADMINISTRATOR'
      AND is_active = true
    )
  );

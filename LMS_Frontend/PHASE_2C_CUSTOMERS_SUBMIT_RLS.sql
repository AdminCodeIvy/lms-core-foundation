-- ============================================
-- LMS Phase 2C: RLS fix for customer submit
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- This allows INPUTTER users to submit their own DRAFT customers
-- without allowing them to edit SUBMITTED customers.

-- Ensure RLS is enabled (it already should be)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Allow creators to transition their own customers from DRAFT -> SUBMITTED
-- While keeping the original update policy (Phase 2B) intact.
DROP POLICY IF EXISTS "Users can submit their own customers" ON public.customers;

CREATE POLICY "Users can submit their own customers"
  ON public.customers
  FOR UPDATE
  TO authenticated
  USING (
    -- Existing row (before update) must be a DRAFT created by the current user
    auth.uid() = created_by
    AND status = 'DRAFT'
  )
  WITH CHECK (
    -- New row (after update) must still belong to the same user
    -- and must be in SUBMITTED status
    auth.uid() = created_by
    AND status = 'SUBMITTED'
  );

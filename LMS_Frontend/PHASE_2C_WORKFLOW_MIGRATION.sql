-- ============================================
-- LMS Phase 2C: Submit Workflow Enhancement
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Add submitted_at and rejection_feedback fields to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_feedback TEXT;

-- Create index for submitted_at for faster queries
CREATE INDEX IF NOT EXISTS idx_customers_submitted_at ON public.customers(submitted_at DESC) 
WHERE status = 'SUBMITTED';

-- Add RLS policy for activity_logs INSERT
DROP POLICY IF EXISTS "Users can insert activity logs" ON public.activity_logs;
CREATE POLICY "Users can insert activity logs"
  ON public.activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (performed_by = auth.uid());

-- Update trigger to manage timestamps
CREATE OR REPLACE FUNCTION update_customer_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customer_updated_at_trigger ON public.customers;
CREATE TRIGGER customer_updated_at_trigger
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION update_customer_updated_at();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.activity_logs TO authenticated;
GRANT ALL ON public.customers TO authenticated;

COMMENT ON COLUMN public.customers.submitted_at IS 'Timestamp when customer was submitted for approval';
COMMENT ON COLUMN public.customers.rejection_feedback IS 'Feedback provided when customer was rejected';

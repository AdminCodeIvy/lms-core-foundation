-- ============================================
-- LMS Phase 2A: Customer Reference ID Generation
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Create sequence for customer reference IDs
CREATE SEQUENCE IF NOT EXISTS customer_ref_seq START 1;

-- Function to generate customer reference ID: CUS-{YEAR}-{SEQUENCE}
CREATE OR REPLACE FUNCTION generate_customer_ref()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year TEXT := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  seq TEXT;
BEGIN
  SELECT LPAD(NEXTVAL('customer_ref_seq')::TEXT, 5, '0') INTO seq;
  RETURN 'CUS-' || year || '-' || seq;
END;
$$;

-- Trigger function to auto-generate reference_id on customer insert
CREATE OR REPLACE FUNCTION set_customer_reference_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.reference_id IS NULL OR NEW.reference_id = '' THEN
    NEW.reference_id := generate_customer_ref();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on customers table
DROP TRIGGER IF EXISTS customer_reference_id_trigger ON public.customers;
CREATE TRIGGER customer_reference_id_trigger
BEFORE INSERT ON public.customers
FOR EACH ROW
EXECUTE FUNCTION set_customer_reference_id();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_customer_ref() TO authenticated;
GRANT EXECUTE ON FUNCTION set_customer_reference_id() TO authenticated;

-- ============================================
-- Verification: Test the function
-- ============================================
-- Uncomment the lines below to test:
-- SELECT generate_customer_ref();
-- This should return something like: CUS-2025-00001

-- =====================================================
-- PHASE 4: TAX MODULE DATABASE SCHEMA
-- =====================================================
-- This migration creates the tax assessment and payment system
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. CREATE ENUMS
-- =====================================================

-- Tax status enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_status') THEN
    CREATE TYPE tax_status AS ENUM (
      'NOT_ASSESSED',
      'ASSESSED',
      'PAID',
      'PARTIAL',
      'OVERDUE'
    );
  END IF;
END $$;

-- Occupancy type enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'occupancy_type') THEN
    CREATE TYPE occupancy_type AS ENUM (
      'OWNER_OCCUPIED',
      'RENTED',
      'VACANT',
      'MIXED_USE'
    );
  END IF;
END $$;

-- Construction status enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'construction_status') THEN
    CREATE TYPE construction_status AS ENUM (
      'COMPLETED',
      'UNDER_CONSTRUCTION',
      'PLANNED'
    );
  END IF;
END $$;

-- Payment method enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM (
      'CASH',
      'BANK_TRANSFER',
      'CHECK',
      'MOBILE_MONEY',
      'CREDIT_CARD'
    );
  END IF;
END $$;

-- =====================================================
-- 2. CREATE SEQUENCES
-- =====================================================

-- Sequence for receipt numbers
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

-- =====================================================
-- 3. CREATE TABLES
-- =====================================================

-- Tax Assessments Table
CREATE TABLE IF NOT EXISTS public.tax_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id TEXT UNIQUE NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL,
  
  -- Occupancy Details
  occupancy_type occupancy_type NOT NULL DEFAULT 'OWNER_OCCUPIED',
  
  -- Renter Details (when occupancy_type = RENTED)
  renter_name TEXT,
  renter_contact TEXT,
  renter_national_id TEXT,
  monthly_rent_amount DECIMAL(15,2),
  rental_start_date DATE,
  has_rental_agreement BOOLEAN DEFAULT false,
  
  -- Property Details
  property_type TEXT,
  land_size DECIMAL(15,2) NOT NULL,
  built_up_area DECIMAL(15,2),
  number_of_units INTEGER,
  number_of_floors INTEGER,
  
  -- Utilities & Services
  has_water BOOLEAN DEFAULT false,
  has_electricity BOOLEAN DEFAULT false,
  has_sewer BOOLEAN DEFAULT false,
  has_waste_collection BOOLEAN DEFAULT false,
  
  -- Construction & Legal Status
  construction_status construction_status NOT NULL DEFAULT 'COMPLETED',
  property_registered BOOLEAN DEFAULT false,
  title_deed_number TEXT,
  
  -- Tax Calculation
  base_assessment DECIMAL(15,2) NOT NULL,
  exemption_amount DECIMAL(15,2) DEFAULT 0,
  assessed_amount DECIMAL(15,2) NOT NULL,
  paid_amount DECIMAL(15,2) DEFAULT 0,
  outstanding_amount DECIMAL(15,2) DEFAULT 0,
  penalty_amount DECIMAL(15,2) DEFAULT 0,
  
  -- Dates
  assessment_date DATE NOT NULL,
  due_date DATE NOT NULL,
  
  -- Status
  status tax_status NOT NULL DEFAULT 'NOT_ASSESSED',
  
  -- Metadata
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_property_year UNIQUE(property_id, tax_year),
  CONSTRAINT valid_assessment CHECK (base_assessment > 0),
  CONSTRAINT valid_exemption CHECK (exemption_amount >= 0 AND exemption_amount <= base_assessment),
  CONSTRAINT valid_assessed_amount CHECK (assessed_amount = base_assessment - exemption_amount),
  CONSTRAINT valid_dates CHECK (due_date > assessment_date)
);

-- Ensure reference_id column exists for existing tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tax_assessments'
      AND column_name = 'reference_id'
  ) THEN
    ALTER TABLE public.tax_assessments ADD COLUMN reference_id TEXT;
  END IF;
END $$;

-- Ensure has_rental_agreement column exists for existing tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tax_assessments'
      AND column_name = 'has_rental_agreement'
  ) THEN
    ALTER TABLE public.tax_assessments ADD COLUMN has_rental_agreement BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create unique index for reference_id if not exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_assessments_reference_id ON public.tax_assessments(reference_id);

-- Tax Payments Table
CREATE TABLE IF NOT EXISTS public.tax_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.tax_assessments(id) ON DELETE CASCADE,
  
  -- Payment Details
  payment_date DATE NOT NULL,
  amount_paid DECIMAL(15,2) NOT NULL,
  payment_method payment_method NOT NULL,
  receipt_number TEXT UNIQUE NOT NULL,
  notes TEXT,
  
  -- Metadata
  collected_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_amount CHECK (amount_paid > 0),
  CONSTRAINT valid_payment_date CHECK (payment_date <= CURRENT_DATE)
);

-- =====================================================
-- 4. CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tax_assessments_property ON public.tax_assessments(property_id);
CREATE INDEX IF NOT EXISTS idx_tax_assessments_year ON public.tax_assessments(tax_year);
CREATE INDEX IF NOT EXISTS idx_tax_assessments_status ON public.tax_assessments(status);
CREATE INDEX IF NOT EXISTS idx_tax_assessments_due_date ON public.tax_assessments(due_date);
CREATE INDEX IF NOT EXISTS idx_tax_payments_assessment ON public.tax_payments(assessment_id);
CREATE INDEX IF NOT EXISTS idx_tax_payments_date ON public.tax_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_tax_payments_receipt ON public.tax_payments(receipt_number);

-- =====================================================
-- 5. CREATE FUNCTIONS
-- =====================================================

-- Create sequence for tax reference IDs
CREATE SEQUENCE IF NOT EXISTS tax_reference_seq START 1;

-- Function to generate reference ID string
CREATE OR REPLACE FUNCTION generate_tax_reference_id_string()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year TEXT := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  seq TEXT;
BEGIN
  SELECT LPAD(NEXTVAL('tax_reference_seq')::TEXT, 6, '0') INTO seq;
  RETURN 'TAX-' || year || '-' || seq;
END;
$$;

-- Trigger function to auto-generate reference ID
CREATE OR REPLACE FUNCTION generate_tax_reference_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.reference_id IS NULL OR NEW.reference_id = '' THEN
    NEW.reference_id := generate_tax_reference_id_string();
  END IF;
  RETURN NEW;
END;
$$;

-- Function to generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year TEXT := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  seq TEXT;
BEGIN
  SELECT LPAD(NEXTVAL('receipt_number_seq')::TEXT, 5, '0') INTO seq;
  RETURN 'RCP-' || year || '-' || seq;
END;
$$;

-- Function to calculate and update tax status
CREATE OR REPLACE FUNCTION update_tax_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  outstanding DECIMAL;
  is_past_due BOOLEAN;
  new_status tax_status;
BEGIN
  -- Calculate outstanding amount
  outstanding := NEW.assessed_amount - NEW.paid_amount;
  NEW.outstanding_amount := outstanding;
  
  -- Check if past due date
  is_past_due := CURRENT_DATE > NEW.due_date;
  
  -- Calculate status
  IF NEW.paid_amount = 0 THEN
    new_status := 'ASSESSED';
  ELSIF outstanding <= 0 THEN
    new_status := 'PAID';
  ELSIF outstanding > 0 AND NEW.paid_amount > 0 THEN
    IF is_past_due THEN
      new_status := 'OVERDUE';
    ELSE
      new_status := 'PARTIAL';
    END IF;
  ELSE
    new_status := 'NOT_ASSESSED';
  END IF;
  
  NEW.status := new_status;
  
  RETURN NEW;
END;
$$;

-- Function to update assessment paid_amount when payment is added
CREATE OR REPLACE FUNCTION update_assessment_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the assessment's paid_amount
  UPDATE public.tax_assessments
  SET paid_amount = paid_amount + NEW.amount_paid,
      updated_at = NOW()
  WHERE id = NEW.assessment_id;
  
  RETURN NEW;
END;
$$;

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =====================================================
-- 6. CREATE TRIGGERS
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS tax_reference_id_trigger ON public.tax_assessments;
DROP TRIGGER IF EXISTS tax_status_trigger ON public.tax_assessments;
DROP TRIGGER IF EXISTS payment_update_assessment_trigger ON public.tax_payments;
DROP TRIGGER IF EXISTS tax_assessments_updated_at ON public.tax_assessments;

-- Trigger to auto-generate reference ID
CREATE TRIGGER tax_reference_id_trigger
BEFORE INSERT ON public.tax_assessments
FOR EACH ROW
EXECUTE FUNCTION generate_tax_reference_id();

-- Trigger to calculate tax status
CREATE TRIGGER tax_status_trigger
BEFORE INSERT OR UPDATE ON public.tax_assessments
FOR EACH ROW
EXECUTE FUNCTION update_tax_status();

-- Trigger to update assessment when payment is added
CREATE TRIGGER payment_update_assessment_trigger
AFTER INSERT ON public.tax_payments
FOR EACH ROW
EXECUTE FUNCTION update_assessment_on_payment();

-- Trigger to update updated_at timestamp
CREATE TRIGGER tax_assessments_updated_at
BEFORE UPDATE ON public.tax_assessments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 7. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.tax_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_payments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. CREATE RLS POLICIES
-- =====================================================

-- Tax Assessments Policies

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view tax assessments" ON public.tax_assessments;
DROP POLICY IF EXISTS "Inputters can create tax assessments" ON public.tax_assessments;
DROP POLICY IF EXISTS "Inputters and Approvers can update tax assessments" ON public.tax_assessments;
DROP POLICY IF EXISTS "Only Administrators can delete tax assessments" ON public.tax_assessments;
DROP POLICY IF EXISTS "Users can view tax payments" ON public.tax_payments;
DROP POLICY IF EXISTS "Inputters can record tax payments" ON public.tax_payments;
DROP POLICY IF EXISTS "Only Administrators can delete tax payments" ON public.tax_payments;

-- Everyone can view tax assessments (authenticated users)
CREATE POLICY "Users can view tax assessments"
ON public.tax_assessments FOR SELECT
TO authenticated
USING (true);

-- Inputters can create tax assessments
CREATE POLICY "Inputters can create tax assessments"
ON public.tax_assessments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('INPUTTER', 'APPROVER', 'ADMINISTRATOR')
    AND is_active = true
  )
);

-- Inputters and Approvers can update tax assessments
CREATE POLICY "Inputters and Approvers can update tax assessments"
ON public.tax_assessments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('INPUTTER', 'APPROVER', 'ADMINISTRATOR')
    AND is_active = true
  )
);

-- Only Administrators can delete tax assessments
CREATE POLICY "Only Administrators can delete tax assessments"
ON public.tax_assessments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'ADMINISTRATOR'
    AND is_active = true
  )
);

-- Tax Payments Policies

-- Everyone can view tax payments
CREATE POLICY "Users can view tax payments"
ON public.tax_payments FOR SELECT
TO authenticated
USING (true);

-- Inputters can record tax payments
CREATE POLICY "Inputters can record tax payments"
ON public.tax_payments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('INPUTTER', 'APPROVER', 'ADMINISTRATOR')
    AND is_active = true
  )
);

-- Only Administrators can delete tax payments
CREATE POLICY "Only Administrators can delete tax payments"
ON public.tax_payments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'ADMINISTRATOR'
    AND is_active = true
  )
);

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON public.tax_assessments TO authenticated;
GRANT ALL ON public.tax_payments TO authenticated;
GRANT USAGE ON SEQUENCE receipt_number_seq TO authenticated;
GRANT USAGE ON SEQUENCE tax_reference_seq TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify tables created
SELECT 'tax_assessments table created' as status
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tax_assessments');

SELECT 'tax_payments table created' as status
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tax_payments');

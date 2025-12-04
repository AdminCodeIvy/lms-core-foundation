-- ============================================
-- LMS Phase 2B: Customer RLS Policies
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete customers" ON public.customers;

-- SELECT Policy: All authenticated users can view customers
CREATE POLICY "Authenticated users can view customers"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT Policy: Users can insert customers with their own ID as created_by
CREATE POLICY "Users can create customers"
  ON public.customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
  );

-- UPDATE Policy: 
-- - Users can update their own DRAFT customers
-- - Users with APPROVER or ADMINISTRATOR role can update any customer
CREATE POLICY "Users can update customers based on role"
  ON public.customers
  FOR UPDATE
  TO authenticated
  USING (
    -- User is updating their own DRAFT customer
    (auth.uid() = created_by AND status = 'DRAFT')
    OR
    -- User is APPROVER or ADMINISTRATOR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('APPROVER', 'ADMINISTRATOR')
      AND is_active = true
    )
  )
  WITH CHECK (
    -- Same conditions for the updated row
    (auth.uid() = created_by AND status = 'DRAFT')
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('APPROVER', 'ADMINISTRATOR')
      AND is_active = true
    )
  );

-- DELETE Policy: Only ADMINISTRATOR can delete customers
CREATE POLICY "Only administrators can delete customers"
  ON public.customers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'ADMINISTRATOR'
      AND is_active = true
    )
  );

-- ============================================
-- RLS Policies for Customer Type Tables
-- ============================================

-- customer_person
ALTER TABLE public.customer_person ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view person customers" ON public.customer_person;
DROP POLICY IF EXISTS "Users can insert person customers" ON public.customer_person;
DROP POLICY IF EXISTS "Users can update person customers" ON public.customer_person;
DROP POLICY IF EXISTS "Users can delete person customers" ON public.customer_person;

CREATE POLICY "Authenticated users can view person customers"
  ON public.customer_person FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert person customers"
  ON public.customer_person FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE id = customer_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update person customers"
  ON public.customer_person FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_id
      AND (
        (c.created_by = auth.uid() AND c.status = 'DRAFT')
        OR EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
          AND u.role IN ('APPROVER', 'ADMINISTRATOR')
          AND u.is_active = true
        )
      )
    )
  );

CREATE POLICY "Administrators can delete person customers"
  ON public.customer_person FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'ADMINISTRATOR'
      AND is_active = true
    )
  );

-- customer_business
ALTER TABLE public.customer_business ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view business customers" ON public.customer_business;
DROP POLICY IF EXISTS "Users can insert business customers" ON public.customer_business;
DROP POLICY IF EXISTS "Users can update business customers" ON public.customer_business;
DROP POLICY IF EXISTS "Users can delete business customers" ON public.customer_business;

CREATE POLICY "Authenticated users can view business customers"
  ON public.customer_business FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert business customers"
  ON public.customer_business FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE id = customer_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update business customers"
  ON public.customer_business FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_id
      AND (
        (c.created_by = auth.uid() AND c.status = 'DRAFT')
        OR EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
          AND u.role IN ('APPROVER', 'ADMINISTRATOR')
          AND u.is_active = true
        )
      )
    )
  );

CREATE POLICY "Administrators can delete business customers"
  ON public.customer_business FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'ADMINISTRATOR'
      AND is_active = true
    )
  );

-- customer_government
ALTER TABLE public.customer_government ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view government customers" ON public.customer_government;
DROP POLICY IF EXISTS "Users can insert government customers" ON public.customer_government;
DROP POLICY IF EXISTS "Users can update government customers" ON public.customer_government;
DROP POLICY IF EXISTS "Users can delete government customers" ON public.customer_government;

CREATE POLICY "Authenticated users can view government customers"
  ON public.customer_government FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert government customers"
  ON public.customer_government FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE id = customer_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update government customers"
  ON public.customer_government FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_id
      AND (
        (c.created_by = auth.uid() AND c.status = 'DRAFT')
        OR EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
          AND u.role IN ('APPROVER', 'ADMINISTRATOR')
          AND u.is_active = true
        )
      )
    )
  );

CREATE POLICY "Administrators can delete government customers"
  ON public.customer_government FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'ADMINISTRATOR'
      AND is_active = true
    )
  );

-- customer_mosque_hospital
ALTER TABLE public.customer_mosque_hospital ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view mosque_hospital customers" ON public.customer_mosque_hospital;
DROP POLICY IF EXISTS "Users can insert mosque_hospital customers" ON public.customer_mosque_hospital;
DROP POLICY IF EXISTS "Users can update mosque_hospital customers" ON public.customer_mosque_hospital;
DROP POLICY IF EXISTS "Users can delete mosque_hospital customers" ON public.customer_mosque_hospital;

CREATE POLICY "Authenticated users can view mosque_hospital customers"
  ON public.customer_mosque_hospital FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert mosque_hospital customers"
  ON public.customer_mosque_hospital FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE id = customer_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update mosque_hospital customers"
  ON public.customer_mosque_hospital FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_id
      AND (
        (c.created_by = auth.uid() AND c.status = 'DRAFT')
        OR EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
          AND u.role IN ('APPROVER', 'ADMINISTRATOR')
          AND u.is_active = true
        )
      )
    )
  );

CREATE POLICY "Administrators can delete mosque_hospital customers"
  ON public.customer_mosque_hospital FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'ADMINISTRATOR'
      AND is_active = true
    )
  );

-- customer_non_profit
ALTER TABLE public.customer_non_profit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view non_profit customers" ON public.customer_non_profit;
DROP POLICY IF EXISTS "Users can insert non_profit customers" ON public.customer_non_profit;
DROP POLICY IF EXISTS "Users can update non_profit customers" ON public.customer_non_profit;
DROP POLICY IF EXISTS "Users can delete non_profit customers" ON public.customer_non_profit;

CREATE POLICY "Authenticated users can view non_profit customers"
  ON public.customer_non_profit FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert non_profit customers"
  ON public.customer_non_profit FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE id = customer_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update non_profit customers"
  ON public.customer_non_profit FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_id
      AND (
        (c.created_by = auth.uid() AND c.status = 'DRAFT')
        OR EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
          AND u.role IN ('APPROVER', 'ADMINISTRATOR')
          AND u.is_active = true
        )
      )
    )
  );

CREATE POLICY "Administrators can delete non_profit customers"
  ON public.customer_non_profit FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'ADMINISTRATOR'
      AND is_active = true
    )
  );

-- customer_contractor
ALTER TABLE public.customer_contractor ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view contractor customers" ON public.customer_contractor;
DROP POLICY IF EXISTS "Users can insert contractor customers" ON public.customer_contractor;
DROP POLICY IF EXISTS "Users can update contractor customers" ON public.customer_contractor;
DROP POLICY IF EXISTS "Users can delete contractor customers" ON public.customer_contractor;

CREATE POLICY "Authenticated users can view contractor customers"
  ON public.customer_contractor FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert contractor customers"
  ON public.customer_contractor FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE id = customer_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update contractor customers"
  ON public.customer_contractor FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_id
      AND (
        (c.created_by = auth.uid() AND c.status = 'DRAFT')
        OR EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
          AND u.role IN ('APPROVER', 'ADMINISTRATOR')
          AND u.is_active = true
        )
      )
    )
  );

CREATE POLICY "Administrators can delete contractor customers"
  ON public.customer_contractor FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'ADMINISTRATOR'
      AND is_active = true
    )
  );

-- ============================================
-- Verification
-- ============================================
-- Check that all policies are created:
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN (
  'customers', 
  'customer_person', 
  'customer_business', 
  'customer_government',
  'customer_mosque_hospital',
  'customer_non_profit',
  'customer_contractor'
)
ORDER BY tablename, cmd;

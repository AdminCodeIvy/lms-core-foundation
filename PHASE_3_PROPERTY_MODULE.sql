-- Phase 3: Property Module Migration
-- This migration creates the properties table, boundaries, photos, ownership linking, and supporting functions

-- =====================================================
-- 1. CREATE SEQUENCES FOR REFERENCE IDS
-- =====================================================

CREATE SEQUENCE IF NOT EXISTS property_ref_seq START 1;
CREATE SEQUENCE IF NOT EXISTS parcel_ref_seq START 1;

-- =====================================================
-- 2. CREATE PROPERTIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id TEXT UNIQUE NOT NULL,
  parcel_number TEXT UNIQUE NOT NULL,
  
  -- Location
  property_location TEXT,
  sub_location TEXT,
  district_id UUID REFERENCES public.districts(id) NOT NULL,
  sub_district_id UUID REFERENCES public.sub_districts(id),
  
  -- Property Characteristics
  is_downtown BOOLEAN NOT NULL DEFAULT false,
  is_building BOOLEAN NOT NULL DEFAULT true,
  has_built_area BOOLEAN NOT NULL DEFAULT false,
  number_of_floors INTEGER CHECK (number_of_floors >= 1 AND number_of_floors <= 14),
  size DECIMAL(10,2) NOT NULL CHECK (size > 0 AND size <= 100000),
  parcel_area DECIMAL(10,2) CHECK (parcel_area > 0),
  property_type_id UUID REFERENCES public.property_types(id),
  has_property_wall BOOLEAN NOT NULL DEFAULT false,
  
  -- Address
  door_number TEXT,
  road_name TEXT,
  postal_zip_code TEXT,
  section TEXT,
  block TEXT,
  
  -- Map & Coordinates
  map_url TEXT,
  coordinates TEXT,
  
  -- Workflow
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ARCHIVED')),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  approved_by UUID REFERENCES auth.users(id),
  rejection_feedback TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ
);

-- =====================================================
-- 3. CREATE PROPERTY BOUNDARIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.property_boundaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  
  -- North Boundary
  north_length DECIMAL(10,2) NOT NULL CHECK (north_length > 0),
  north_adjacent_type TEXT NOT NULL CHECK (north_adjacent_type IN ('BUILDING', 'EMPTY_LAND', 'ROAD')),
  
  -- South Boundary
  south_length DECIMAL(10,2) NOT NULL CHECK (south_length > 0),
  south_adjacent_type TEXT NOT NULL CHECK (south_adjacent_type IN ('BUILDING', 'EMPTY_LAND', 'ROAD')),
  
  -- East Boundary
  east_length DECIMAL(10,2) NOT NULL CHECK (east_length > 0),
  east_adjacent_type TEXT NOT NULL CHECK (east_adjacent_type IN ('BUILDING', 'EMPTY_LAND', 'ROAD')),
  
  -- West Boundary
  west_length DECIMAL(10,2) NOT NULL CHECK (west_length > 0),
  west_adjacent_type TEXT NOT NULL CHECK (west_adjacent_type IN ('BUILDING', 'EMPTY_LAND', 'ROAD')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(property_id)
);

-- =====================================================
-- 4. CREATE PROPERTY PHOTOS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.property_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 5. CREATE PROPERTY OWNERSHIP TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.property_ownership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  ownership_type TEXT NOT NULL CHECK (ownership_type IN ('OWNER', 'CO_OWNER', 'PREVIOUS_OWNER')),
  ownership_percentage DECIMAL(5,2) CHECK (ownership_percentage > 0 AND ownership_percentage <= 100),
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 6. CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_properties_reference_id ON public.properties(reference_id);
CREATE INDEX IF NOT EXISTS idx_properties_parcel_number ON public.properties(parcel_number);
CREATE INDEX IF NOT EXISTS idx_properties_district_id ON public.properties(district_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_created_by ON public.properties(created_by);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON public.properties(created_at);
CREATE INDEX IF NOT EXISTS idx_property_boundaries_property_id ON public.property_boundaries(property_id);
CREATE INDEX IF NOT EXISTS idx_property_photos_property_id ON public.property_photos(property_id);
CREATE INDEX IF NOT EXISTS idx_property_ownership_property_id ON public.property_ownership(property_id);
CREATE INDEX IF NOT EXISTS idx_property_ownership_customer_id ON public.property_ownership(customer_id);

-- =====================================================
-- 7. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_boundaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_ownership ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. CREATE RLS POLICIES FOR PROPERTIES
-- =====================================================

-- Allow authenticated users to view all properties
CREATE POLICY "Users can view all properties"
  ON public.properties
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow inputters to create properties
CREATE POLICY "Inputters can create properties"
  ON public.properties
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('INPUTTER', 'ADMINISTRATOR')
      AND is_active = true
    )
  );

-- Allow creators to update their own draft or rejected properties
CREATE POLICY "Users can update own properties"
  ON public.properties
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('APPROVER', 'ADMINISTRATOR')
      AND is_active = true
    )
  );

-- =====================================================
-- 9. CREATE RLS POLICIES FOR BOUNDARIES
-- =====================================================

CREATE POLICY "Users can view all boundaries"
  ON public.property_boundaries
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert boundaries"
  ON public.property_boundaries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_id
      AND (created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('APPROVER', 'ADMINISTRATOR')
      ))
    )
  );

CREATE POLICY "Users can update boundaries"
  ON public.property_boundaries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_id
      AND (created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('APPROVER', 'ADMINISTRATOR')
      ))
    )
  );

-- =====================================================
-- 10. CREATE RLS POLICIES FOR PHOTOS
-- =====================================================

CREATE POLICY "Users can view all photos"
  ON public.property_photos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can upload photos"
  ON public.property_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can delete own photos or admins can delete"
  ON public.property_photos
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'ADMINISTRATOR'
      AND is_active = true
    )
  );

-- =====================================================
-- 11. CREATE RLS POLICIES FOR OWNERSHIP
-- =====================================================

CREATE POLICY "Users can view all ownership records"
  ON public.property_ownership
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create ownership records"
  ON public.property_ownership
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('INPUTTER', 'APPROVER', 'ADMINISTRATOR')
      AND is_active = true
    )
  );

CREATE POLICY "Users can update ownership records"
  ON public.property_ownership
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('INPUTTER', 'APPROVER', 'ADMINISTRATOR')
      AND is_active = true
    )
  );

CREATE POLICY "Users can delete ownership records"
  ON public.property_ownership
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('APPROVER', 'ADMINISTRATOR')
      AND is_active = true
    )
  );

-- =====================================================
-- 12. CREATE REFERENCE ID GENERATION FUNCTIONS
-- =====================================================

-- Function to generate property reference ID: {DISTRICT_CODE}-{YEAR}-{SEQUENCE}
CREATE OR REPLACE FUNCTION generate_property_ref(district_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year TEXT := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  seq TEXT;
BEGIN
  SELECT LPAD(NEXTVAL('property_ref_seq')::TEXT, 5, '0') INTO seq;
  RETURN district_code || '-' || year || '-' || seq;
END;
$$;

-- Function to generate parcel number: PARCEL-{YEAR}-{SEQUENCE}
CREATE OR REPLACE FUNCTION generate_parcel_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year TEXT := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  seq TEXT;
BEGIN
  SELECT LPAD(NEXTVAL('parcel_ref_seq')::TEXT, 5, '0') INTO seq;
  RETURN 'PARCEL-' || year || '-' || seq;
END;
$$;

-- =====================================================
-- 13. CREATE TRIGGER FOR REFERENCE ID AUTO-GENERATION
-- =====================================================

CREATE OR REPLACE FUNCTION set_property_reference_ids()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  district_code TEXT;
BEGIN
  -- Get district code
  SELECT code INTO district_code
  FROM public.districts
  WHERE id = NEW.district_id;
  
  -- Generate reference_id if not provided
  IF NEW.reference_id IS NULL OR NEW.reference_id = '' THEN
    NEW.reference_id := generate_property_ref(district_code);
  END IF;
  
  -- Generate parcel_number if not provided
  IF NEW.parcel_number IS NULL OR NEW.parcel_number = '' THEN
    NEW.parcel_number := generate_parcel_number();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER property_reference_ids_trigger
BEFORE INSERT ON public.properties
FOR EACH ROW
EXECUTE FUNCTION set_property_reference_ids();

-- =====================================================
-- 14. CREATE RE-APPROVAL TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_property_reapproval()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If status was APPROVED and record is being updated (not just status change)
  IF OLD.status = 'APPROVED' AND NEW.status = 'APPROVED' THEN
    -- Check if any field other than updated_at changed
    IF (OLD.property_location, OLD.sub_location, OLD.is_downtown, OLD.is_building, 
        OLD.has_built_area, OLD.number_of_floors, OLD.size, OLD.parcel_area,
        OLD.has_property_wall, OLD.door_number, OLD.road_name, OLD.postal_zip_code,
        OLD.section, OLD.block, OLD.map_url, OLD.coordinates) IS DISTINCT FROM
       (NEW.property_location, NEW.sub_location, NEW.is_downtown, NEW.is_building,
        NEW.has_built_area, NEW.number_of_floors, NEW.size, NEW.parcel_area,
        NEW.has_property_wall, NEW.door_number, NEW.road_name, NEW.postal_zip_code,
        NEW.section, NEW.block, NEW.map_url, NEW.coordinates) THEN
      
      -- Change status to SUBMITTED for re-approval
      NEW.status := 'SUBMITTED';
      NEW.approved_by := NULL;
      NEW.submitted_at := NOW();
      
      -- Log the re-approval trigger
      INSERT INTO public.activity_logs (
        entity_type, 
        entity_id, 
        action, 
        performed_by, 
        metadata
      )
      VALUES (
        'PROPERTY',
        NEW.id,
        'UPDATED',
        auth.uid(),
        jsonb_build_object('reason', 'Edited after approval, requires re-approval')
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER property_reapproval_trigger
BEFORE UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION trigger_property_reapproval();

-- =====================================================
-- 15. CREATE UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_property_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER property_updated_at_trigger
BEFORE UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION update_property_updated_at();

CREATE TRIGGER property_boundaries_updated_at_trigger
BEFORE UPDATE ON public.property_boundaries
FOR EACH ROW
EXECUTE FUNCTION update_property_updated_at();

CREATE TRIGGER property_ownership_updated_at_trigger
BEFORE UPDATE ON public.property_ownership
FOR EACH ROW
EXECUTE FUNCTION update_property_updated_at();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON TABLE public.properties IS 'Phase 3: Properties with workflow, boundaries, photos, and ownership';
COMMENT ON TABLE public.property_boundaries IS 'Phase 3: Property boundary measurements and adjacent land types';
COMMENT ON TABLE public.property_photos IS 'Phase 3: Property photo gallery';
COMMENT ON TABLE public.property_ownership IS 'Phase 3: Customer ownership of properties';

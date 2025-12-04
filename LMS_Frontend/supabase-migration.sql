-- ============================================
-- Land Management System (LMS) - Phase 1 Database Schema
-- Jigjiga City Administration
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================
-- 1. ENUMS & CUSTOM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('INPUTTER', 'APPROVER', 'VIEWER', 'ADMINISTRATOR');

CREATE TYPE customer_type AS ENUM ('PERSON', 'BUSINESS', 'GOVERNMENT', 'MOSQUE_HOSPITAL', 'NON_PROFIT', 'CONTRACTOR');

CREATE TYPE entity_status AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ARCHIVED');

CREATE TYPE gender_type AS ENUM ('MALE', 'FEMALE');

CREATE TYPE boundary_type AS ENUM ('BUILDING', 'EMPTY_LAND', 'ROAD');

CREATE TYPE occupancy_type AS ENUM ('OWNER_OCCUPIED', 'RENTED', 'VACANT', 'MIXED_USE');

CREATE TYPE construction_status AS ENUM ('COMPLETED', 'UNDER_CONSTRUCTION', 'PLANNED');

CREATE TYPE tax_status AS ENUM ('NOT_ASSESSED', 'ASSESSED', 'PAID', 'PARTIAL', 'OVERDUE');

CREATE TYPE ago_sync_status AS ENUM ('PENDING', 'SYNCED', 'ERROR');

CREATE TYPE ownership_type AS ENUM ('OWNER', 'CO_OWNER', 'PREVIOUS_OWNER');

CREATE TYPE activity_action AS ENUM ('CREATED', 'UPDATED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ARCHIVED', 'UNARCHIVED', 'SYNCED', 'SYNC_FAILED');

CREATE TYPE entity_type AS ENUM ('CUSTOMER', 'PROPERTY', 'TAX');

-- ============================================
-- 2. USERS TABLE (extends auth.users)
-- ============================================

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view all users" ON public.users
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert users" ON public.users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'ADMINISTRATOR'
    )
  );

CREATE POLICY "Only admins can update users" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'ADMINISTRATOR'
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role_value user_role;
BEGIN
  -- Safely cast the role from metadata
  BEGIN
    user_role_value := (NEW.raw_user_meta_data->>'role')::user_role;
  EXCEPTION
    WHEN invalid_text_representation THEN
      user_role_value := 'VIEWER'::user_role;
  END;
  
  INSERT INTO public.users (id, full_name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(user_role_value, 'VIEWER'::user_role),
    true
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 3. LOOKUP TABLES
-- ============================================

-- Districts
CREATE TABLE public.districts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL
);

ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active districts" ON public.districts
  FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can manage districts" ON public.districts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'ADMINISTRATOR'
    )
  );

-- Sub-Districts
CREATE TABLE public.sub_districts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_id UUID REFERENCES public.districts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL
);

ALTER TABLE public.sub_districts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active sub_districts" ON public.sub_districts
  FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can manage sub_districts" ON public.sub_districts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'ADMINISTRATOR'
    )
  );

-- Property Types
CREATE TABLE public.property_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL
);

ALTER TABLE public.property_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active property_types" ON public.property_types
  FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can manage property_types" ON public.property_types
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'ADMINISTRATOR'
    )
  );

-- Carriers
CREATE TABLE public.carriers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL
);

ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active carriers" ON public.carriers
  FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can manage carriers" ON public.carriers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'ADMINISTRATOR'
    )
  );

-- Countries
CREATE TABLE public.countries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL,
  name TEXT NOT NULL
);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view countries" ON public.countries
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage countries" ON public.countries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'ADMINISTRATOR'
    )
  );

-- ============================================
-- 4. CUSTOMERS
-- ============================================

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_id TEXT UNIQUE NOT NULL,
  customer_type customer_type NOT NULL,
  status entity_status DEFAULT 'DRAFT' NOT NULL,
  created_by UUID REFERENCES public.users(id) NOT NULL,
  approved_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Customer Person
CREATE TABLE public.customer_person (
  customer_id UUID PRIMARY KEY REFERENCES public.customers(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  father_name TEXT NOT NULL,
  grandfather_name TEXT NOT NULL,
  fourth_name TEXT,
  date_of_birth DATE NOT NULL,
  place_of_birth TEXT NOT NULL,
  gender gender_type NOT NULL,
  nationality TEXT NOT NULL,
  mobile_number_1 TEXT NOT NULL,
  carrier_mobile_1 TEXT NOT NULL,
  mobile_number_2 TEXT,
  carrier_mobile_2 TEXT,
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_number TEXT NOT NULL,
  email TEXT NOT NULL,
  id_type TEXT NOT NULL,
  id_number TEXT NOT NULL,
  place_of_issue TEXT NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL
);

ALTER TABLE public.customer_person ENABLE ROW LEVEL SECURITY;

-- Customer Business
CREATE TABLE public.customer_business (
  customer_id UUID PRIMARY KEY REFERENCES public.customers(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_registration_number TEXT NOT NULL,
  business_address TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  mobile_number_1 TEXT NOT NULL,
  mobile_number_2 TEXT,
  carrier_network TEXT NOT NULL,
  email TEXT NOT NULL,
  street TEXT NOT NULL,
  district_id UUID REFERENCES public.districts(id) NOT NULL,
  business_license_number TEXT NOT NULL,
  section TEXT,
  block TEXT
);

ALTER TABLE public.customer_business ENABLE ROW LEVEL SECURITY;

-- Customer Government
CREATE TABLE public.customer_government (
  customer_id UUID PRIMARY KEY REFERENCES public.customers(id) ON DELETE CASCADE,
  full_department_name TEXT NOT NULL,
  department_address TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  mobile_number_1 TEXT NOT NULL,
  carrier_mobile_1 TEXT NOT NULL,
  mobile_number_2 TEXT,
  carrier_mobile_2 TEXT,
  email TEXT NOT NULL,
  street TEXT NOT NULL,
  district_id UUID REFERENCES public.districts(id) NOT NULL,
  section TEXT,
  block TEXT
);

ALTER TABLE public.customer_government ENABLE ROW LEVEL SECURITY;

-- Customer Mosque/Hospital
CREATE TABLE public.customer_mosque_hospital (
  customer_id UUID PRIMARY KEY REFERENCES public.customers(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  address TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  mobile_number_1 TEXT NOT NULL,
  carrier_mobile_1 TEXT NOT NULL,
  mobile_number_2 TEXT,
  carrier_mobile_2 TEXT,
  email TEXT NOT NULL,
  district_id UUID REFERENCES public.districts(id) NOT NULL,
  section TEXT,
  block TEXT
);

ALTER TABLE public.customer_mosque_hospital ENABLE ROW LEVEL SECURITY;

-- Customer Non-Profit
CREATE TABLE public.customer_non_profit (
  customer_id UUID PRIMARY KEY REFERENCES public.customers(id) ON DELETE CASCADE,
  full_non_profit_name TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  address TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  mobile_number_1 TEXT NOT NULL,
  carrier_mobile_1 TEXT NOT NULL,
  mobile_number_2 TEXT,
  carrier_mobile_2 TEXT,
  email TEXT NOT NULL,
  district_id UUID REFERENCES public.districts(id) NOT NULL,
  license_number TEXT NOT NULL,
  section TEXT,
  block TEXT
);

ALTER TABLE public.customer_non_profit ENABLE ROW LEVEL SECURITY;

-- Customer Contractor
CREATE TABLE public.customer_contractor (
  customer_id UUID PRIMARY KEY REFERENCES public.customers(id) ON DELETE CASCADE,
  full_contractor_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  mobile_number_1 TEXT NOT NULL,
  carrier_mobile_1 TEXT NOT NULL,
  mobile_number_2 TEXT,
  carrier_mobile_2 TEXT,
  email TEXT NOT NULL
);

ALTER TABLE public.customer_contractor ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers (basic - will be enhanced in Phase 2)
CREATE POLICY "Users can view customers" ON public.customers
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================
-- 5. PROPERTIES
-- ============================================

CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_id TEXT UNIQUE NOT NULL,
  parcel_number TEXT UNIQUE NOT NULL,
  global_id TEXT,
  property_location TEXT,
  sub_location TEXT,
  district_id UUID REFERENCES public.districts(id) NOT NULL,
  sub_district_id UUID REFERENCES public.sub_districts(id),
  is_downtown BOOLEAN DEFAULT false NOT NULL,
  is_building BOOLEAN DEFAULT false NOT NULL,
  has_built_area BOOLEAN DEFAULT false NOT NULL,
  number_of_floors INTEGER,
  size DECIMAL(10, 2) NOT NULL,
  parcel_area DECIMAL(10, 2),
  property_type_id UUID REFERENCES public.property_types(id),
  has_property_wall BOOLEAN DEFAULT false NOT NULL,
  door_number TEXT,
  road_name TEXT,
  postal_zip_code TEXT,
  section TEXT,
  block TEXT,
  map_url TEXT,
  coordinates GEOGRAPHY(Point),
  status entity_status DEFAULT 'DRAFT' NOT NULL,
  ago_sync_status ago_sync_status,
  ago_sync_error TEXT,
  last_sync_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) NOT NULL,
  approved_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Property Boundaries
CREATE TABLE public.property_boundaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  north_length DECIMAL(10, 2) NOT NULL,
  north_type boundary_type NOT NULL,
  south_length DECIMAL(10, 2) NOT NULL,
  south_type boundary_type NOT NULL,
  east_length DECIMAL(10, 2) NOT NULL,
  east_type boundary_type NOT NULL,
  west_length DECIMAL(10, 2) NOT NULL,
  west_type boundary_type NOT NULL
);

ALTER TABLE public.property_boundaries ENABLE ROW LEVEL SECURITY;

-- Property Photos
CREATE TABLE public.property_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.users(id) NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.property_photos ENABLE ROW LEVEL SECURITY;

-- Property Ownership
CREATE TABLE public.property_ownership (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  ownership_type ownership_type NOT NULL,
  ownership_percentage DECIMAL(5, 2),
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT true NOT NULL
);

ALTER TABLE public.property_ownership ENABLE ROW LEVEL SECURITY;

-- RLS Policies for properties (basic - will be enhanced in Phase 3)
CREATE POLICY "Users can view properties" ON public.properties
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================
-- 6. TAX ASSESSMENTS & PAYMENTS
-- ============================================

CREATE TABLE public.tax_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  tax_year INTEGER NOT NULL,
  occupancy_type occupancy_type NOT NULL,
  owner_id UUID REFERENCES public.customers(id) NOT NULL,
  property_type TEXT NOT NULL,
  land_size DECIMAL(10, 2) NOT NULL,
  built_up_area DECIMAL(10, 2),
  number_of_units INTEGER,
  number_of_floors INTEGER,
  has_water BOOLEAN DEFAULT false NOT NULL,
  has_electricity BOOLEAN DEFAULT false NOT NULL,
  has_sewer BOOLEAN DEFAULT false NOT NULL,
  has_waste_collection BOOLEAN DEFAULT false NOT NULL,
  construction_status construction_status NOT NULL,
  is_registered BOOLEAN DEFAULT false NOT NULL,
  title_deed_number TEXT,
  base_assessment DECIMAL(12, 2) NOT NULL,
  exemption_amount DECIMAL(12, 2) DEFAULT 0 NOT NULL,
  assessed_amount DECIMAL(12, 2) NOT NULL,
  paid_amount DECIMAL(12, 2) DEFAULT 0 NOT NULL,
  outstanding_amount DECIMAL(12, 2) NOT NULL,
  penalty_amount DECIMAL(12, 2) DEFAULT 0 NOT NULL,
  status tax_status DEFAULT 'NOT_ASSESSED' NOT NULL,
  assessment_date DATE NOT NULL,
  due_date DATE NOT NULL,
  created_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(property_id, tax_year)
);

ALTER TABLE public.tax_assessments ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_tax_assessments_updated_at BEFORE UPDATE ON public.tax_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tax Payments
CREATE TABLE public.tax_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID REFERENCES public.tax_assessments(id) ON DELETE CASCADE NOT NULL,
  payment_date DATE NOT NULL,
  amount_paid DECIMAL(12, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  receipt_number TEXT UNIQUE NOT NULL,
  collected_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.tax_payments ENABLE ROW LEVEL SECURITY;

-- Tax Renter Details
CREATE TABLE public.tax_renter_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID REFERENCES public.tax_assessments(id) ON DELETE CASCADE NOT NULL,
  renter_name TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  national_id TEXT NOT NULL,
  monthly_rent_amount DECIMAL(12, 2) NOT NULL,
  rental_start_date DATE NOT NULL,
  has_rental_agreement BOOLEAN DEFAULT false NOT NULL
);

ALTER TABLE public.tax_renter_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tax (basic - will be enhanced in Phase 4)
CREATE POLICY "Users can view tax assessments" ON public.tax_assessments
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================
-- 7. ACTIVITY LOGS (AUDIT TRAIL)
-- ============================================

CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type entity_type NOT NULL,
  entity_id UUID NOT NULL,
  action activity_action NOT NULL,
  performed_by UUID REFERENCES public.users(id) NOT NULL,
  changes JSONB,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity logs" ON public.activity_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);

-- ============================================
-- 8. NOTIFICATIONS
-- ============================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);

-- ============================================
-- 9. SEED DATA
-- ============================================

-- Insert sample districts
INSERT INTO public.districts (code, name) VALUES
  ('JJG', 'Jigjiga'),
  ('HRG', 'Hargeisa'),
  ('DRD', 'Dire Dawa'),
  ('ADD', 'Addis Ababa');

-- Insert sample carriers
INSERT INTO public.carriers (name) VALUES
  ('Ethio Telecom'),
  ('Safaricom'),
  ('Telesom'),
  ('Hormuud');

-- Insert sample property types
INSERT INTO public.property_types (name, category) VALUES
  ('Single Family Home', 'Residential'),
  ('Apartment', 'Residential'),
  ('Villa', 'Residential'),
  ('Office Building', 'Commercial'),
  ('Retail Store', 'Commercial'),
  ('Warehouse', 'Industrial'),
  ('Government Building', 'Government'),
  ('School', 'Educational'),
  ('Hospital', 'Healthcare'),
  ('Mosque', 'Religious'),
  ('Vacant Land', 'Land');

-- Insert sample countries
INSERT INTO public.countries (code, name) VALUES
  ('ET', 'Ethiopia'),
  ('SO', 'Somalia'),
  ('DJ', 'Djibouti'),
  ('KE', 'Kenya'),
  ('US', 'United States'),
  ('UK', 'United Kingdom');

-- ============================================
-- 10. FUNCTIONS FOR REFERENCE ID GENERATION
-- ============================================

-- Function to generate customer reference ID
CREATE OR REPLACE FUNCTION generate_customer_reference_id()
RETURNS TEXT AS $$
DECLARE
  year TEXT := TO_CHAR(CURRENT_DATE, 'YYYY');
  sequence_num INTEGER;
  ref_id TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_id FROM 'CUS-\d{4}-(\d+)') AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.customers
  WHERE reference_id LIKE 'CUS-' || year || '-%';
  
  ref_id := 'CUS-' || year || '-' || LPAD(sequence_num::TEXT, 6, '0');
  RETURN ref_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate property reference ID
CREATE OR REPLACE FUNCTION generate_property_reference_id(district_code TEXT)
RETURNS TEXT AS $$
DECLARE
  year TEXT := TO_CHAR(CURRENT_DATE, 'YYYY');
  sequence_num INTEGER;
  ref_id TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_id FROM district_code || '-\d{4}-(\d+)') AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.properties
  WHERE reference_id LIKE district_code || '-' || year || '-%';
  
  ref_id := district_code || '-' || year || '-' || LPAD(sequence_num::TEXT, 6, '0');
  RETURN ref_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate parcel number
CREATE OR REPLACE FUNCTION generate_parcel_number()
RETURNS TEXT AS $$
DECLARE
  year TEXT := TO_CHAR(CURRENT_DATE, 'YYYY');
  sequence_num INTEGER;
  parcel_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(parcel_number FROM 'PARCEL-\d{4}-(\d+)') AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.properties
  WHERE parcel_number LIKE 'PARCEL-' || year || '-%';
  
  parcel_num := 'PARCEL-' || year || '-' || LPAD(sequence_num::TEXT, 8, '0');
  RETURN parcel_num;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SETUP COMPLETE
-- ============================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

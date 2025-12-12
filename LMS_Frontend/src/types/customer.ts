import { UserRole } from '@/lib/supabase';

export type CustomerType = 
  | 'PERSON' 
  | 'BUSINESS' 
  | 'GOVERNMENT' 
  | 'MOSQUE_HOSPITAL' 
  | 'NON_PROFIT' 
  | 'RESIDENTIAL'
  | 'RENTAL';

export type CustomerStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';

export interface Customer {
  id: string;
  reference_id: string;
  customer_type: CustomerType;
  status: CustomerStatus;
  created_by: string;
  approved_by: string | null;
  submitted_at: string | null;
  rejection_feedback: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerPerson {
  customer_id: string;
  // Required fields (10)
  pr_id: string;
  full_name: string;
  mothers_name: string;
  date_of_birth: string;
  place_of_birth: string;
  gender: 'MALE' | 'FEMALE';
  nationality: string;
  mobile_number_1: string;
  email: string;
  id_type: string;
  // Optional fields (4)
  id_number?: string | null;
  place_of_issue?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  // Legacy fields (may still exist in database but not used in forms)
  first_name?: string | null;
  father_name?: string | null;
  grandfather_name?: string | null;
  fourth_name?: string | null;
  carrier_mobile_1?: string | null;
  carrier_mobile_2?: string | null;
  mobile_number_2?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_number?: string | null;
}

export interface CustomerBusiness {
  customer_id: string;
  business_name: string;
  business_registration_number: string;
  business_address: string;
  contact_name: string;
  mobile_number_1: string;
  mobile_number_2: string | null;
  carrier_network: string;
  email: string;
  street: string;
  district_id: string;
  business_license_number: string;
  section: string | null;
  block: string | null;
  districts?: {
    name: string;
  };
}

export interface CustomerGovernment {
  customer_id: string;
  full_department_name: string;
  department_address: string;
  contact_name: string;
  mobile_number_1: string;
  carrier_mobile_1: string;
  mobile_number_2: string | null;
  carrier_mobile_2: string | null;
  email: string;
  street: string;
  district_id: string;
  section: string | null;
  block: string | null;
  districts?: {
    name: string;
  };
}

export interface CustomerMosqueHospital {
  customer_id: string;
  full_name: string;
  registration_number: string;
  address: string;
  contact_name: string;
  mobile_number_1: string;
  carrier_mobile_1: string;
  mobile_number_2: string | null;
  carrier_mobile_2: string | null;
  email: string;
  district_id: string;
  section: string | null;
  block: string | null;
  districts?: {
    name: string;
  };
}

export interface CustomerNonProfit {
  customer_id: string;
  full_non_profit_name: string;
  registration_number: string;
  address: string;
  contact_name: string;
  mobile_number_1: string;
  carrier_mobile_1: string;
  mobile_number_2: string | null;
  carrier_mobile_2: string | null;
  email: string;
  district_id: string;
  license_number: string;
  section: string | null;
  block: string | null;
  districts?: {
    name: string;
  };
}

export interface CustomerResidential {
  customer_id: string;
  pr_id: string;
  size: string | null;
  floor: string | null;
  file_number: string | null;
  address: string | null;
}

export interface CustomerRental {
  customer_id: string;
  pr_id: string;
  rental_name: string;
  rental_mothers_name: string;
  date_of_birth: string;
  place_of_birth: string;
  gender: 'MALE' | 'FEMALE';
  nationality: string;
  mobile_number_1: string;
  mobile_number_2: string;
  email: string;
  id_type: string;
  id_number: string | null;
  place_of_issue: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  carrier_mobile_1: string | null;
  carrier_mobile_2: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
}

export interface CustomerWithDetails extends Customer {
  person_data?: CustomerPerson;
  business_data?: CustomerBusiness;
  government_data?: CustomerGovernment;
  mosque_hospital_data?: CustomerMosqueHospital;
  non_profit_data?: CustomerNonProfit;
  residential_data?: CustomerResidential;
  rental_data?: CustomerRental;
  created_by_user?: {
    full_name: string;
  };
  approved_by_user?: {
    full_name: string;
  } | null;
  district?: {
    name: string;
  };
}

export interface CustomerListItem {
  id: string;
  reference_id: string;
  customer_type: CustomerType;
  status: CustomerStatus;
  name: string;
  district_name?: string;
  updated_at: string;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type CustomerType = 'PERSON' | 'BUSINESS' | 'GOVERNMENT' | 'MOSQUE_HOSPITAL' | 'NON_PROFIT' | 'RESIDENTIAL' | 'RENTAL';

export interface CustomerTypeOption {
  type: CustomerType;
  title: string;
  description: string;
  icon: string;
}

export interface PersonFormData {
  // Required fields (10)
  pr_id: string;
  full_name: string;
  mothers_name: string;
  date_of_birth: Date;
  place_of_birth: string;
  gender: 'MALE' | 'FEMALE';
  nationality: string;
  mobile_number_1: string;
  email: string;
  id_type: string;
  
  // Optional fields (4)
  id_number?: string;
  place_of_issue?: string;
  issue_date?: Date;
  expiry_date?: Date;
}

export interface BusinessFormData {
  business_name: string;
  business_registration_number: string;
  business_license_number: string;
  business_address: string;
  contact_name: string;
  mobile_number_1: string;
  mobile_number_2?: string;
  carrier_network: string;
  email: string;
  street: string;
  district_id: string;
  section?: string;
  block?: string;
}

export interface GovernmentFormData {
  full_department_name: string;
  department_address: string;
  contact_name: string;
  mobile_number_1: string;
  carrier_mobile_1: string;
  mobile_number_2?: string;
  carrier_mobile_2?: string;
  email: string;
  street: string;
  district_id: string;
  section?: string;
  block?: string;
}

export interface MosqueHospitalFormData {
  full_name: string;
  registration_number: string;
  address: string;
  contact_name: string;
  mobile_number_1: string;
  carrier_mobile_1: string;
  mobile_number_2?: string;
  carrier_mobile_2?: string;
  email: string;
  district_id: string;
  section?: string;
  block?: string;
}

export interface NonProfitFormData {
  full_non_profit_name: string;
  registration_number: string;
  license_number: string;
  address: string;
  contact_name: string;
  mobile_number_1: string;
  carrier_mobile_1: string;
  mobile_number_2?: string;
  carrier_mobile_2?: string;
  email: string;
  district_id: string;
  section?: string;
  block?: string;
}

export interface ResidentialFormData {
  pr_id: string;
  size?: string;
  floor?: string;
  file_number?: string;
  address?: string;
}

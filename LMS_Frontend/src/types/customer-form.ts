export type CustomerType = 'PERSON' | 'BUSINESS' | 'GOVERNMENT' | 'MOSQUE_HOSPITAL' | 'NON_PROFIT' | 'CONTRACTOR' | 'RENTAL';

export interface CustomerTypeOption {
  type: CustomerType;
  title: string;
  description: string;
  icon: string;
}

export interface PersonFormData {
  first_name: string;
  father_name: string;
  grandfather_name: string;
  fourth_name?: string;
  date_of_birth: Date;
  place_of_birth: string;
  gender: 'MALE' | 'FEMALE';
  nationality: string;
  mobile_number_1: string;
  carrier_mobile_1: string;
  mobile_number_2?: string;
  carrier_mobile_2?: string;
  emergency_contact_name: string;
  emergency_contact_number: string;
  email: string;
  id_type: string;
  id_number: string;
  place_of_issue: string;
  issue_date: Date;
  expiry_date: Date;
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

export interface ContractorFormData {
  full_contractor_name: string;
  contact_name: string;
  mobile_number_1: string;
  carrier_mobile_1: string;
  mobile_number_2?: string;
  carrier_mobile_2?: string;
  email: string;
}

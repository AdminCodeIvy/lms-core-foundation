import { z } from 'zod';

const mobileNumberRegex = /^\+\d{1,3}-?\d{3,4}-?\d{3,4}-?\d{3,4}$/;

const calculateAge = (birthDate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const personSchema = z.object({
  // Required core fields (10 fields)
  pr_id: z.string().trim().min(1, "PR-ID is required").max(50),
  full_name: z.string().trim().min(2, "Full name must be at least 2 characters").max(200),
  mothers_name: z.string().trim().min(2, "Mother's name must be at least 2 characters").max(100),
  date_of_birth: z.date({
    required_error: "Date of birth is required",
  }).refine((date) => calculateAge(date) >= 18, "Person must be at least 18 years old"),
  place_of_birth: z.string().trim().min(1, "Place of birth is required").max(200),
  gender: z.enum(["MALE", "FEMALE"], { required_error: "Gender is required" }),
  nationality: z.string().min(1, "Nationality is required"),
  mobile_number_1: z.string().trim().regex(mobileNumberRegex, "Invalid mobile number format (e.g., +251-912-345-678)"),
  email: z.string().trim().email("Invalid email format").max(255),
  id_type: z.string().min(1, "Type of ID is required"),
  
  // Optional additional fields
  id_number: z.string().trim().max(100).optional().or(z.literal("")),
  place_of_issue: z.string().optional().or(z.literal("")),
  issue_date: z.date().optional().refine((date) => !date || date <= new Date(), "Issue date cannot be in the future"),
  expiry_date: z.date().optional(),
  carrier_mobile_1: z.string().optional().or(z.literal("")),
  mobile_number_2: z.string().trim().regex(mobileNumberRegex, "Invalid mobile number format").optional().or(z.literal("")),
  carrier_mobile_2: z.string().optional().or(z.literal("")),
  emergency_contact_name: z.string().trim().max(200).optional().or(z.literal("")),
  emergency_contact_number: z.string().trim().regex(mobileNumberRegex, "Invalid mobile number format").optional().or(z.literal("")),
}).refine((data) => {
  // Only validate expiry > issue if both dates are provided
  if (data.expiry_date && data.issue_date) {
    return data.expiry_date > data.issue_date;
  }
  return true;
}, {
  message: "Expiry date must be after issue date",
  path: ["expiry_date"],
});

export const businessSchema = z.object({
  // All fields are now optional
  pr_id: z.string().trim().max(50).optional().or(z.literal("")),
  business_name: z.string().trim().max(200).optional().or(z.literal("")),
  business_license_number: z.string().trim().max(100).optional().or(z.literal("")),
  business_address: z.string().trim().max(500).optional().or(z.literal("")),
  rental_name: z.string().trim().max(200).optional().or(z.literal("")),
  mobile_number_1: z.string().trim().regex(mobileNumberRegex, "Invalid mobile number format (e.g., +252-612-345-678)").optional().or(z.literal("")),
  mobile_number_2: z.string().trim().regex(mobileNumberRegex, "Invalid mobile number format (e.g., +252-612-345-678)").optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email format").max(255).optional().or(z.literal("")),
  size: z.string().trim().max(100).optional().or(z.literal("")),
  floor: z.string().trim().max(50).optional().or(z.literal("")),
  file_number: z.string().trim().max(100).optional().or(z.literal("")),
  business_registration_number: z.string().trim().max(100).optional().or(z.literal("")),
  contact_name: z.string().trim().max(200).optional().or(z.literal("")),
  carrier_network: z.string().optional().or(z.literal("")),
  street: z.string().trim().max(200).optional().or(z.literal("")),
  district_id: z.string().optional().or(z.literal("")),
  section: z.string().trim().max(100).optional().or(z.literal("")),
  block: z.string().trim().max(100).optional().or(z.literal("")),
});

export const governmentSchema = z.object({
  // Required fields (3 most important fields)
  pr_id: z.string().trim().min(1, "PR-ID is required").max(50),
  full_department_name: z.string().trim().min(3, "Full Government / Department Name must be at least 3 characters").max(200),
  contact_name: z.string().trim().min(1, "Contact Name is required").max(200),
  
  // Optional fields (all others)
  department_address: z.string().trim().max(500).optional().or(z.literal("")),
  mobile_number_1: z.string().trim().regex(mobileNumberRegex, "Invalid mobile number format").optional().or(z.literal("")),
  mobile_number_2: z.string().trim().regex(mobileNumberRegex, "Invalid mobile number format").optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email format").max(255).optional().or(z.literal("")),
  file_number: z.string().trim().max(100).optional().or(z.literal("")),
  size: z.string().trim().max(100).optional().or(z.literal("")),
  
  // Legacy optional fields (for backward compatibility)
  carrier_mobile_1: z.string().optional().or(z.literal("")),
  carrier_mobile_2: z.string().optional().or(z.literal("")),
  street: z.string().trim().max(200).optional().or(z.literal("")),
  district_id: z.string().optional().or(z.literal("")),
  section: z.string().trim().max(100).optional().or(z.literal("")),
  block: z.string().trim().max(100).optional().or(z.literal("")),
});

export const mosqueHospitalSchema = z.object({
  full_name: z.string().trim().min(3, "Name must be at least 3 characters").max(200),
  registration_number: z.string().trim().min(1, "Registration number is required").max(100),
  address: z.string().trim().min(1, "Address is required").max(500),
  contact_name: z.string().trim().min(1, "Contact name is required").max(200),
  mobile_number_1: z.string().trim().regex(mobileNumberRegex, "Invalid mobile number format"),
  carrier_mobile_1: z.string().min(1, "Carrier is required"),
  mobile_number_2: z.string().trim().regex(mobileNumberRegex, "Invalid mobile number format").optional().or(z.literal("")),
  carrier_mobile_2: z.string().optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email format").max(255),
  district_id: z.string().min(1, "District is required"),
  section: z.string().trim().max(100).optional().or(z.literal("")),
  block: z.string().trim().max(100).optional().or(z.literal("")),
});

export const nonProfitSchema = z.object({
  full_non_profit_name: z.string().trim().min(3, "Organization name must be at least 3 characters").max(200),
  registration_number: z.string().trim().min(1, "Registration number is required").max(100),
  license_number: z.string().trim().min(1, "License number is required").max(100),
  address: z.string().trim().min(1, "Address is required").max(500),
  contact_name: z.string().trim().min(1, "Contact name is required").max(200),
  mobile_number_1: z.string().trim().regex(mobileNumberRegex, "Invalid mobile number format"),
  carrier_mobile_1: z.string().min(1, "Carrier is required"),
  mobile_number_2: z.string().trim().regex(mobileNumberRegex, "Invalid mobile number format").optional().or(z.literal("")),
  carrier_mobile_2: z.string().optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email format").max(255),
  district_id: z.string().min(1, "District is required"),
  section: z.string().trim().max(100).optional().or(z.literal("")),
  block: z.string().trim().max(100).optional().or(z.literal("")),
});

export const contractorSchema = z.object({
  full_contractor_name: z.string().trim().min(3, "Contractor name must be at least 3 characters").max(200),
  contact_name: z.string().trim().min(1, "Contact name is required").max(200),
  mobile_number_1: z.string().trim().regex(mobileNumberRegex, "Invalid mobile number format"),
  carrier_mobile_1: z.string().min(1, "Carrier is required"),
  mobile_number_2: z.string().trim().regex(mobileNumberRegex, "Invalid mobile number format").optional().or(z.literal("")),
  carrier_mobile_2: z.string().optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email format").max(255),
});

export const rentalSchema = z.object({
  // Required core fields (11 fields)
  pr_id: z.string().trim().min(1, "PR-ID is required").max(50),
  rental_name: z.string().trim().min(2, "Rental name must be at least 2 characters").max(200),
  rental_mothers_name: z.string().trim().min(2, "Rental mother's name must be at least 2 characters").max(100),
  date_of_birth: z.date({
    required_error: "Date of birth is required",
  }).refine((date) => calculateAge(date) >= 18, "Person must be at least 18 years old"),
  place_of_birth: z.string().trim().min(1, "Place of birth is required").max(200),
  gender: z.enum(["MALE", "FEMALE"], { required_error: "Gender is required" }),
  nationality: z.string().min(1, "Nationality is required"),
  mobile_number_1: z.string().trim().regex(mobileNumberRegex, "Invalid mobile number format (e.g., +251-912-345-678)"),
  mobile_number_2: z.string().trim().regex(mobileNumberRegex, "Invalid mobile number format (e.g., +251-912-345-678)"),
  email: z.string().trim().email("Invalid email format").max(255),
  id_type: z.string().min(1, "Type of ID is required"),
  
  // Optional additional fields
  id_number: z.string().trim().max(100).optional().or(z.literal("")),
  place_of_issue: z.string().optional().or(z.literal("")),
  issue_date: z.date().optional().refine((date) => !date || date <= new Date(), "Issue date cannot be in the future"),
  expiry_date: z.date().optional(),
  carrier_mobile_1: z.string().optional().or(z.literal("")),
  carrier_mobile_2: z.string().optional().or(z.literal("")),
  emergency_contact_name: z.string().trim().max(200).optional().or(z.literal("")),
  emergency_contact_number: z.string().trim().regex(mobileNumberRegex, "Invalid mobile number format").optional().or(z.literal("")),
}).refine((data) => {
  // Only validate expiry > issue if both dates are provided
  if (data.expiry_date && data.issue_date) {
    return data.expiry_date > data.issue_date;
  }
  return true;
}, {
  message: "Expiry date must be after issue date",
  path: ["expiry_date"],
});

export type PersonFormData = z.infer<typeof personSchema>;
export type BusinessFormData = z.infer<typeof businessSchema>;
export type GovernmentFormData = z.infer<typeof governmentSchema>;
export type MosqueHospitalFormData = z.infer<typeof mosqueHospitalSchema>;
export type NonProfitFormData = z.infer<typeof nonProfitSchema>;
export type ContractorFormData = z.infer<typeof contractorSchema>;
export type RentalFormData = z.infer<typeof rentalSchema>;

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
  first_name: z.string().trim().min(2, "First name must be at least 2 characters").max(100),
  father_name: z.string().trim().min(2, "Father name must be at least 2 characters").max(100),
  grandfather_name: z.string().trim().min(2, "Grandfather name must be at least 2 characters").max(100),
  fourth_name: z.string().trim().max(100).optional().or(z.literal("")),
  date_of_birth: z.date({
    required_error: "Date of birth is required",
  }).refine((date) => calculateAge(date) >= 18, "Person must be at least 18 years old"),
  place_of_birth: z.string().trim().min(1, "Place of birth is required").max(200),
  gender: z.enum(["MALE", "FEMALE"], { required_error: "Gender is required" }),
  nationality: z.string().min(1, "Nationality is required"),
  mobile_number_1: z.string().trim().regex(mobileNumberRegex, "Invalid mobile number format (e.g., +251-912-345-678)"),
  carrier_mobile_1: z.string().min(1, "Carrier is required"),
  mobile_number_2: z.string().trim().regex(mobileNumberRegex, "Invalid mobile number format").optional().or(z.literal("")),
  carrier_mobile_2: z.string().optional().or(z.literal("")),
  emergency_contact_name: z.string().trim().min(1, "Emergency contact name is required").max(200),
  emergency_contact_number: z.string().trim().regex(mobileNumberRegex, "Invalid mobile number format"),
  email: z.string().trim().email("Invalid email format").max(255),
  id_type: z.string().min(1, "ID type is required"),
  id_number: z.string().trim().min(1, "ID number is required").max(100),
  place_of_issue: z.string().min(1, "Place of issue is required"),
  issue_date: z.date({ required_error: "Issue date is required" })
    .refine((date) => date <= new Date(), "Issue date cannot be in the future"),
  expiry_date: z.date({ required_error: "Expiry date is required" }),
}).refine((data) => data.expiry_date > data.issue_date, {
  message: "Expiry date must be after issue date",
  path: ["expiry_date"],
});

export const businessSchema = z.object({
  business_name: z.string().trim().min(3, "Business name must be at least 3 characters").max(200),
  business_registration_number: z.string().trim().min(1, "Registration number is required").max(100),
  business_license_number: z.string().trim().min(1, "License number is required").max(100),
  business_address: z.string().trim().min(1, "Business address is required").max(500),
  contact_name: z.string().trim().min(1, "Contact name is required").max(200),
  mobile_number_1: z.string().trim().regex(mobileNumberRegex, "Invalid mobile number format"),
  mobile_number_2: z.string().trim().regex(mobileNumberRegex, "Invalid mobile number format").optional().or(z.literal("")),
  carrier_network: z.string().min(1, "Carrier network is required"),
  email: z.string().trim().email("Invalid email format").max(255),
  street: z.string().trim().min(1, "Street is required").max(200),
  district_id: z.string().min(1, "District is required"),
  section: z.string().trim().max(100).optional().or(z.literal("")),
  block: z.string().trim().max(100).optional().or(z.literal("")),
});

export const governmentSchema = z.object({
  full_department_name: z.string().trim().min(3, "Department name must be at least 3 characters").max(200),
  department_address: z.string().trim().min(1, "Department address is required").max(500),
  contact_name: z.string().trim().min(1, "Contact name is required").max(200),
  mobile_number_1: z.string().trim().regex(mobileNumberRegex, "Invalid mobile number format"),
  carrier_mobile_1: z.string().min(1, "Carrier is required"),
  mobile_number_2: z.string().trim().regex(mobileNumberRegex, "Invalid mobile number format").optional().or(z.literal("")),
  carrier_mobile_2: z.string().optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email format").max(255),
  street: z.string().trim().min(1, "Street is required").max(200),
  district_id: z.string().min(1, "District is required"),
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

export type PersonFormData = z.infer<typeof personSchema>;
export type BusinessFormData = z.infer<typeof businessSchema>;
export type GovernmentFormData = z.infer<typeof governmentSchema>;
export type MosqueHospitalFormData = z.infer<typeof mosqueHospitalSchema>;
export type NonProfitFormData = z.infer<typeof nonProfitSchema>;
export type ContractorFormData = z.infer<typeof contractorSchema>;

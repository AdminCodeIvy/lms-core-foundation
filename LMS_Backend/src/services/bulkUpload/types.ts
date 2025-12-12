/**
 * Common types and interfaces for bulk upload functionality
 */

export interface BulkUploadData {
  entityType: 'customer' | 'property' | 'tax';
  data: any[];
}

export interface ValidationResult {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  errors: ValidationError[];
  canCommit: boolean;
  validData: any[];
}

export interface ValidationError {
  row: number;
  errors: string[];
  data: any;
}

export interface CommitResult {
  successful: number;
  failed: number;
  errors: CommitError[];
}

export interface CommitError {
  row: number;
  error: string;
  data: any;
}

export interface TemplateData {
  headers: string[];
  example: Record<string, any>;
}

export type CustomerType = 'PERSON' | 'BUSINESS' | 'GOVERNMENT' | 'MOSQUE_HOSPITAL' | 'NON_PROFIT' | 'RESIDENTIAL' | 'RENTAL';

export type TaxType = 'TAX_ASSESSMENT' | 'TAX_PAYMENT';

export interface CustomerData {
  customer_type: CustomerType;
  [key: string]: any;
}

export interface PropertyData {
  district_id: string;
  size: string;
  [key: string]: any;
}

export interface TaxAssessmentData {
  property_id: string;
  tax_year: number;
  assessed_amount: number;
  exemption_amount?: number;
  due_date: string;
  status: string;
  [key: string]: any;
}

export interface TaxPaymentData {
  payment_date: string;
  payment_method: string;
  receipt_number?: string;
  notes?: string;
  [key: string]: any;
}
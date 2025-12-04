export type TaxStatus = 'NOT_ASSESSED' | 'ASSESSED' | 'PAID' | 'PARTIAL' | 'OVERDUE';
export type OccupancyType = 'OWNER_OCCUPIED' | 'RENTED' | 'VACANT' | 'MIXED_USE';
export type ConstructionStatus = 'COMPLETED' | 'UNDER_CONSTRUCTION' | 'PLANNED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHECK' | 'MOBILE_MONEY' | 'CREDIT_CARD';

export interface TaxAssessment {
  id: string;
  reference_id: string;
  property_id: string;
  tax_year: number;
  
  // Occupancy
  occupancy_type: OccupancyType;
  
  // Renter details (when occupancy_type = RENTED)
  renter_name?: string;
  renter_contact?: string;
  renter_national_id?: string;
  monthly_rent_amount?: number;
  rental_start_date?: string;
  has_rental_agreement?: boolean;
  
  // Property details
  property_type?: string;
  land_size: number;
  built_up_area?: number;
  number_of_units?: number;
  number_of_floors?: number;
  
  // Utilities
  has_water: boolean;
  has_electricity: boolean;
  has_sewer: boolean;
  has_waste_collection: boolean;
  
  // Construction & Legal
  construction_status: ConstructionStatus;
  property_registered: boolean;
  title_deed_number?: string;
  
  // Tax calculation
  base_assessment: number;
  exemption_amount: number;
  assessed_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  penalty_amount: number;
  
  // Dates
  assessment_date: string;
  due_date: string;
  
  // Status
  status: TaxStatus;
  
  // Metadata
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Relations (populated by joins)
  property?: any;
  creator?: any;
  days_overdue?: number;
}

export interface TaxPayment {
  id: string;
  assessment_id: string;
  payment_date: string;
  amount_paid: number;
  payment_method: PaymentMethod;
  receipt_number: string;
  notes?: string;
  collected_by?: string;
  created_at: string;
  
  // Relations
  collector?: any;
}

export interface TaxStats {
  tax_year: number;
  total_assessed: number;
  total_collected: number;
  total_outstanding: number;
  collection_rate: number;
  status_counts: {
    not_assessed: number;
    assessed: number;
    paid: number;
    partial: number;
    overdue: number;
  };
  properties_with_arrears: number;
  total_assessments: number;
}

/**
 * Tax Assessment Bulk Upload Handler
 * Based on actual Supabase table structure
 */

import { supabase } from '../../../config/database';
import { getValue, isEmpty, isValidUUID, cleanUUID } from '../utils';

export class TaxAssessmentHandler {
  /**
   * Validate tax assessment fields based on actual database structure
   */
  static validate(record: any, errors: string[]): void {
    // Helper function to get value with flexible column names
    const getTaxValue = (data: any, ...possibleKeys: string[]) => {
      return getValue(data, ...possibleKeys);
    };

    // REQUIRED FIELDS (based on actual database structure)
    
    // Property ID (required)
    const propertyId = getTaxValue(record, 'property_id', 'Property ID', 'Property-ID', 'property-id', 'PROPERTY_ID');
    if (isEmpty(propertyId)) {
      errors.push('Property ID is required for tax assessments');
    } else if (!isValidUUID(propertyId)) {
      errors.push('Property ID must be a valid UUID');
    }

    // Tax Year (required)
    const taxYear = getTaxValue(record, 'tax_year', 'Tax Year', 'Year');
    if (isEmpty(taxYear)) {
      errors.push('Tax Year is required for tax assessments');
    } else {
      const year = parseInt(taxYear);
      if (isNaN(year) || year < 2020 || year > 2030) {
        errors.push('Tax Year must be a valid year between 2020 and 2030');
      }
    }

    // Assessed Amount (required)
    const assessedAmount = getTaxValue(record, 'assessed_amount', 'Assessed Amount', 'Assessment Amount', 'Amount');
    if (isEmpty(assessedAmount)) {
      errors.push('Assessed Amount is required for tax assessments');
    } else {
      const amount = parseFloat(assessedAmount);
      if (isNaN(amount) || amount < 0) {
        errors.push('Assessed Amount must be a valid positive number');
      }
    }

    // Due Date (required)
    const dueDate = getTaxValue(record, 'due_date', 'Due Date', 'Payment Due Date');
    if (isEmpty(dueDate)) {
      errors.push('Due Date is required for tax assessments');
    } else {
      // Basic date format validation
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dueDate)) {
        errors.push('Due Date must be in YYYY-MM-DD format');
      }
    }

    // Status (required)
    const status = getTaxValue(record, 'status', 'Status', 'Assessment Status');
    if (isEmpty(status)) {
      errors.push('Status is required for tax assessments');
    } else {
      const validStatuses = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAID', 'OVERDUE'];
      if (!validStatuses.includes(status.toUpperCase())) {
        errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
      }
    }

    // OPTIONAL FIELDS (based on actual database structure)
    
    // Exemption Amount (optional)
    const exemptionAmount = getTaxValue(record, 'exemption_amount', 'Exemption Amount', 'Exemption');
    if (!isEmpty(exemptionAmount)) {
      const amount = parseFloat(exemptionAmount);
      if (isNaN(amount) || amount < 0) {
        errors.push('Exemption Amount must be a valid positive number if provided');
      }
    }

    // Assessment Date (optional)
    const assessmentDate = getTaxValue(record, 'assessment_date', 'Assessment Date');
    if (!isEmpty(assessmentDate)) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(assessmentDate)) {
        errors.push('Assessment Date must be in YYYY-MM-DD format if provided');
      }
    }

    // Property Type (optional)
    const propertyType = getTaxValue(record, 'property_type', 'Property Type', 'Type');
    if (!isEmpty(propertyType)) {
      const validTypes = ['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'AGRICULTURAL', 'GOVERNMENT', 'RELIGIOUS'];
      if (!validTypes.includes(propertyType.toUpperCase())) {
        errors.push(`Property Type must be one of: ${validTypes.join(', ')} if provided`);
      }
    }

    // Penalty Amount (optional)
    const penaltyAmount = getTaxValue(record, 'penalty_amount', 'Penalty Amount', 'Penalty');
    if (!isEmpty(penaltyAmount)) {
      const amount = parseFloat(penaltyAmount);
      if (isNaN(amount) || amount < 0) {
        errors.push('Penalty Amount must be a valid positive number if provided');
      }
    }
  }

  /**
   * Map Excel data to database fields (based on actual database structure)
   */
  static mapData(data: any): any {
    const assessedAmount = parseFloat(getValue(data, 'assessed_amount', 'Assessed Amount', 'Assessment Amount', 'Amount') || '0');
    const exemptionAmount = parseFloat(getValue(data, 'exemption_amount', 'Exemption Amount', 'Exemption') || '0');
    const penaltyAmount = parseFloat(getValue(data, 'penalty_amount', 'Penalty Amount', 'Penalty') || '0');
    
    return {
      // Required fields
      property_id: cleanUUID(getValue(data, 'property_id', 'Property ID', 'Property-ID', 'property-id', 'PROPERTY_ID')),
      tax_year: parseInt(getValue(data, 'tax_year', 'Tax Year', 'Year') || '2025'),
      assessed_amount: assessedAmount,
      due_date: getValue(data, 'due_date', 'Due Date', 'Payment Due Date'),
      status: (getValue(data, 'status', 'Status', 'Assessment Status') || 'DRAFT').toUpperCase(),
      
      // Optional fields (based on actual database structure)
      exemption_amount: exemptionAmount,
      assessment_date: getValue(data, 'assessment_date', 'Assessment Date') || new Date().toISOString().split('T')[0],
      property_type: (getValue(data, 'property_type', 'Property Type', 'Type') || 'RESIDENTIAL').toUpperCase(),
      penalty_amount: penaltyAmount,
    };
  }

  /**
   * Transform and clean data before database insertion
   */
  static transformData(typeData: any, userId: string): any {
    // Set defaults for required fields based on actual database structure
    const transformed = {
      ...typeData,
      property_id: typeData.property_id || null, // Will be validated as required
      tax_year: typeData.tax_year || new Date().getFullYear(),
      assessed_amount: typeData.assessed_amount || 0,
      due_date: typeData.due_date || new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0], // Dec 31st
      status: typeData.status || 'DRAFT',
      
      // Optional fields with defaults
      exemption_amount: typeData.exemption_amount || 0,
      assessment_date: typeData.assessment_date || new Date().toISOString().split('T')[0],
      property_type: typeData.property_type || 'RESIDENTIAL',
      penalty_amount: typeData.penalty_amount || 0,
    };

    return transformed;
  }

  /**
   * Create tax assessment in database
   */
  static async create(data: any, userId: string): Promise<any> {
    try {
      // Map and transform data
      const mappedData = this.mapData(data);
      const transformedData = this.transformData(mappedData, userId);

      // Validate that property exists
      if (transformedData.property_id) {
        const { data: property, error: propertyError } = await supabase
          .from('properties')
          .select('id')
          .eq('id', transformedData.property_id)
          .single();

        if (propertyError || !property) {
          throw new Error(`Property with ID ${transformedData.property_id} not found`);
        }
      }

      // Check for duplicate assessment (same property + tax year)
      const { data: existingAssessment } = await supabase
        .from('tax_assessments')
        .select('id')
        .eq('property_id', transformedData.property_id)
        .eq('tax_year', transformedData.tax_year)
        .maybeSingle();

      if (existingAssessment) {
        throw new Error(`Tax assessment already exists for property ${transformedData.property_id} in year ${transformedData.tax_year}`);
      }

      // Insert tax assessment
      const { data: assessment, error } = await supabase
        .from('tax_assessments')
        .insert(transformedData)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return assessment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get template data for tax assessments (based on actual database structure)
   */
  static getTemplate(): { headers: string[]; example: Record<string, any> } {
    return {
      headers: [
        'property_id',
        'tax_year',
        'assessed_amount',
        'exemption_amount',
        'due_date',
        'status',
        'assessment_date',
        'property_type',
        'penalty_amount',
      ],
      example: {
        property_id: 'uuid-property-id-here',
        tax_year: 2025,
        assessed_amount: 10000.00,
        exemption_amount: 1000.00,
        due_date: '2025-12-31',
        status: 'DRAFT',
        assessment_date: '2025-01-15',
        property_type: 'RESIDENTIAL',
        penalty_amount: 0.00,
      },
    };
  }
}
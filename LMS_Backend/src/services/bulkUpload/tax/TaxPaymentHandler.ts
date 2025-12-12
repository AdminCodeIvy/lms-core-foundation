/**
 * Tax Payment Bulk Upload Handler
 * Based on actual Supabase table structure
 */

import { supabase } from '../../../config/database';
import { getValue, isEmpty, isValidUUID, cleanUUID } from '../utils';

export class TaxPaymentHandler {
  /**
   * Validate tax payment fields based on actual database structure
   */
  static validate(record: any, errors: string[]): void {
    // Helper function to get value with flexible column names
    const getPaymentValue = (data: any, ...possibleKeys: string[]) => {
      return getValue(data, ...possibleKeys);
    };

    // REQUIRED FIELDS (based on actual database structure)
    
    // Payment Date (required - exists in database)
    const paymentDate = getPaymentValue(record, 'payment_date', 'Payment Date', 'Date Paid');
    if (isEmpty(paymentDate)) {
      errors.push('Payment Date is required for tax payments');
    } else {
      // Basic date format validation
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(paymentDate)) {
        errors.push('Payment Date must be in YYYY-MM-DD format');
      }
    }

    // Payment Method (required - exists in database)
    const paymentMethod = getPaymentValue(record, 'payment_method', 'Payment Method', 'Method');
    if (isEmpty(paymentMethod)) {
      errors.push('Payment Method is required for tax payments');
    } else {
      const validMethods = ['CASH', 'BANK_TRANSFER', 'CHECK', 'CREDIT_CARD', 'MOBILE_MONEY', 'ONLINE'];
      if (!validMethods.includes(paymentMethod.toUpperCase())) {
        errors.push(`Payment Method must be one of: ${validMethods.join(', ')}`);
      }
    }

    // OPTIONAL FIELDS (based on actual database structure)
    
    // Receipt Number (optional - exists in database)
    const receiptNumber = getPaymentValue(record, 'receipt_number', 'Receipt Number', 'Receipt No', 'Receipt');
    if (!isEmpty(receiptNumber) && receiptNumber.length > 100) {
      errors.push('Receipt Number must be 100 characters or less if provided');
    }

    // Notes (optional - exists in database)
    const notes = getPaymentValue(record, 'notes', 'Notes', 'Comments');
    if (!isEmpty(notes) && notes.length > 1000) {
      errors.push('Notes must be 1000 characters or less if provided');
    }

    // Additional validation for fields that might be added later
    // These fields don't exist in current database but might be useful for validation
    
    // Payment Amount (logical requirement even if not in current schema)
    const paymentAmount = getPaymentValue(record, 'payment_amount', 'Payment Amount', 'Amount', 'Paid Amount');
    if (!isEmpty(paymentAmount)) {
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) {
        errors.push('Payment Amount must be a valid positive number if provided');
      }
    }

    // Property ID or Tax Assessment ID (logical requirement)
    const taxAssessmentId = getPaymentValue(record, 'tax_assessment_id', 'Tax Assessment ID', 'Assessment ID');
    const propertyId = getPaymentValue(record, 'property_id', 'Property ID', 'Property-ID', 'property-id', 'PROPERTY_ID');
    
    if (isEmpty(taxAssessmentId) && isEmpty(propertyId)) {
      errors.push('Either Tax Assessment ID or Property ID should be provided for proper linking');
    }
    
    if (!isEmpty(taxAssessmentId) && !isValidUUID(taxAssessmentId)) {
      errors.push('Tax Assessment ID must be a valid UUID if provided');
    }
    
    if (!isEmpty(propertyId) && !isValidUUID(propertyId)) {
      errors.push('Property ID must be a valid UUID if provided');
    }
  }

  /**
   * Map Excel data to database fields (based on actual database structure)
   */
  static mapData(data: any): any {
    return {
      // Fields that exist in the actual database
      payment_date: getValue(data, 'payment_date', 'Payment Date', 'Date Paid'),
      payment_method: (getValue(data, 'payment_method', 'Payment Method', 'Method') || 'CASH').toUpperCase(),
      receipt_number: getValue(data, 'receipt_number', 'Receipt Number', 'Receipt No', 'Receipt'),
      notes: getValue(data, 'notes', 'Notes', 'Comments'),
      
      // Additional fields for future use (stored as metadata or for validation)
      _tax_assessment_id: cleanUUID(getValue(data, 'tax_assessment_id', 'Tax Assessment ID', 'Assessment ID')),
      _property_id: cleanUUID(getValue(data, 'property_id', 'Property ID', 'Property-ID', 'property-id', 'PROPERTY_ID')),
      _payment_amount: parseFloat(getValue(data, 'payment_amount', 'Payment Amount', 'Amount', 'Paid Amount') || '0'),
    };
  }

  /**
   * Transform and clean data before database insertion
   */
  static transformData(typeData: any, userId: string): any {
    // Set defaults for fields that exist in the actual database
    const transformed = {
      payment_date: typeData.payment_date || new Date().toISOString().split('T')[0],
      payment_method: typeData.payment_method || 'CASH',
      receipt_number: typeData.receipt_number || `RCP-${Date.now()}`,
      notes: typeData.notes || null,
    };

    // Store additional metadata in notes if provided
    const additionalInfo = [];
    if (typeData._tax_assessment_id) {
      additionalInfo.push(`Tax Assessment ID: ${typeData._tax_assessment_id}`);
    }
    if (typeData._property_id) {
      additionalInfo.push(`Property ID: ${typeData._property_id}`);
    }
    if (typeData._payment_amount) {
      additionalInfo.push(`Payment Amount: ${typeData._payment_amount}`);
    }

    if (additionalInfo.length > 0) {
      const existingNotes = transformed.notes || '';
      const separator = existingNotes ? ' | ' : '';
      transformed.notes = existingNotes + separator + additionalInfo.join(' | ');
    }

    return transformed;
  }

  /**
   * Create tax payment in database
   */
  static async create(data: any, userId: string): Promise<any> {
    try {
      // Map and transform data
      const mappedData = this.mapData(data);
      const transformedData = this.transformData(mappedData, userId);

      // Optional validation for tax assessment if ID is provided in metadata
      if (mappedData._tax_assessment_id) {
        const { data: assessment, error: assessmentError } = await supabase
          .from('tax_assessments')
          .select('id, property_id')
          .eq('id', mappedData._tax_assessment_id)
          .maybeSingle();

        if (assessmentError) {
          console.warn(`Could not validate tax assessment ${mappedData._tax_assessment_id}: ${assessmentError.message}`);
        } else if (!assessment) {
          console.warn(`Tax assessment with ID ${mappedData._tax_assessment_id} not found`);
        }
      }

      // Optional validation for property if ID is provided in metadata
      if (mappedData._property_id) {
        const { data: property, error: propertyError } = await supabase
          .from('properties')
          .select('id')
          .eq('id', mappedData._property_id)
          .maybeSingle();

        if (propertyError) {
          console.warn(`Could not validate property ${mappedData._property_id}: ${propertyError.message}`);
        } else if (!property) {
          console.warn(`Property with ID ${mappedData._property_id} not found`);
        }
      }

      // Insert tax payment with only the fields that exist in the database
      const { data: payment, error } = await supabase
        .from('tax_payments')
        .insert(transformedData)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return payment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get template data for tax payments (based on actual database structure)
   */
  static getTemplate(): { headers: string[]; example: Record<string, any> } {
    return {
      headers: [
        'payment_date',
        'payment_method',
        'receipt_number',
        'notes',
        'tax_assessment_id',
        'property_id',
        'payment_amount',
      ],
      example: {
        payment_date: '2025-06-15',
        payment_method: 'BANK_TRANSFER',
        receipt_number: 'RCP-2025-001234',
        notes: 'Property tax payment for 2025',
        tax_assessment_id: 'uuid-assessment-id-here',
        property_id: 'uuid-property-id-here',
        payment_amount: 9000.00,
      },
    };
  }
}
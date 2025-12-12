/**
 * Residential Customer Bulk Upload Handler
 */

import { supabase } from '../../../config/database';
import { getValue, isEmpty } from '../utils';

export class ResidentialCustomerHandler {
  /**
   * Validate residential customer fields
   */
  static validate(record: any, errors: string[]): void {
    // Helper function to get value with flexible column names
    const getResidentialValue = (data: any, ...possibleKeys: string[]) => {
      return getValue(data, ...possibleKeys);
    };

    // REQUIRED FIELDS (1 field - Property ID only)
    
    // Property ID (required)
    const propertyId = getResidentialValue(record, 'property_id', 'Property ID', 'Property-ID', 'property-id', 'PROPERTY_ID', 'pr_id', 'PR-ID');
    if (isEmpty(propertyId)) {
      errors.push('Property ID is required for residential customers');
    } else if (typeof propertyId !== 'string' || propertyId.trim().length < 1) {
      errors.push('Property ID must be a valid string');
    } else if (propertyId.trim().length > 50) {
      errors.push('Property ID must be 50 characters or less');
    }

    // OPTIONAL FIELDS - Only validate format if provided
    
    // Size (optional)
    const size = getResidentialValue(record, 'size', 'Size');
    if (!isEmpty(size) && size.trim().length > 100) {
      errors.push('Size must be 100 characters or less if provided');
    }

    // Floor (optional)
    const floor = getResidentialValue(record, 'floor', 'Floor');
    if (!isEmpty(floor) && floor.trim().length > 50) {
      errors.push('Floor must be 50 characters or less if provided');
    }

    // File Number (optional)
    const fileNumber = getResidentialValue(record, 'file_number', 'File Number');
    if (!isEmpty(fileNumber) && fileNumber.trim().length > 100) {
      errors.push('File Number must be 100 characters or less if provided');
    }

    // Address (optional)
    const address = getResidentialValue(record, 'address', 'Address');
    if (!isEmpty(address) && address.trim().length > 500) {
      errors.push('Address must be 500 characters or less if provided');
    }
  }

  /**
   * Map Excel data to database fields
   */
  static mapData(data: any, customerId: string): any {
    return {
      customer_id: customerId,
      property_id: getValue(data, 'property_id', 'Property ID', 'Property-ID', 'property-id', 'PROPERTY_ID', 'pr_id', 'PR-ID'),
      size: getValue(data, 'size', 'Size'),
      floor: getValue(data, 'floor', 'Floor'),
      file_number: getValue(data, 'file_number', 'File Number'),
      address: getValue(data, 'address', 'Address'),
    };
  }

  /**
   * Transform and clean data before database insertion
   */
  static transformData(typeData: any): any {
    // Ensure the 1 required field has a value, set default if empty
    const transformed = {
      ...typeData,
      property_id: typeData.property_id || `PR-RES-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      
      // All other fields are optional (can be null)
      size: typeData.size || null,
      floor: typeData.floor || null,
      file_number: typeData.file_number || null,
      address: typeData.address || null,
    };

    return transformed;
  }

  /**
   * Create residential customer in database
   */
  static async create(data: any, userId: string): Promise<any> {
    // Generate unique reference ID
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const uniqueSuffix = `${timestamp}${random}`.slice(-8);
    const referenceId = `CUS-2025-${uniqueSuffix}`;
    
    // Create main customer record
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        reference_id: referenceId,
        customer_type: 'RESIDENTIAL',
        status: 'DRAFT',
        created_by: userId,
      })
      .select()
      .single();

    if (customerError) throw new Error(customerError.message);

    try {
      // Map and transform data
      const mappedData = this.mapData(data, customer.id);
      const transformedData = this.transformData(mappedData);

      // Insert residential-specific details
      const { error: detailsError } = await supabase
        .from('customer_residential')
        .insert(transformedData);

      if (detailsError) {
        // Rollback customer creation
        await supabase.from('customers').delete().eq('id', customer.id);
        throw new Error(detailsError.message);
      }

      return customer;
    } catch (error) {
      // Cleanup on error
      await supabase.from('customers').delete().eq('id', customer.id);
      throw error;
    }
  }

  /**
   * Get template data for residential customers
   */
  static getTemplate(): { headers: string[]; example: Record<string, any> } {
    return {
      headers: [
        'customer_type',
        'property_id',
        'size',
        'floor',
        'file_number',
        'address',
      ],
      example: {
        customer_type: 'RESIDENTIAL',
        property_id: 'PR-RES-001',
        size: '150 sqm',
        floor: '2nd Floor',
        file_number: 'RES-FILE-001',
        address: '789 Residential Street, Mogadishu',
      },
    };
  }
}
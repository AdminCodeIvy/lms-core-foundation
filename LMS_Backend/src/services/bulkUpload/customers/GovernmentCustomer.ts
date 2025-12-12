/**
 * Government Customer Bulk Upload Handler
 */

import { supabase } from '../../../config/database';
import { getValue, isEmpty, isValidEmail, isValidMobileNumber } from '../utils';

export class GovernmentCustomerHandler {
  /**
   * Validate government customer fields
   */
  static validate(record: any, errors: string[]): void {
    // Helper function to get value with flexible column names
    const getGovValue = (data: any, ...possibleKeys: string[]) => {
      return getValue(data, ...possibleKeys);
    };

    // REQUIRED FIELDS (3 most important fields)
    
    // Property ID (required)
    const propertyId = getGovValue(record, 'property_id', 'Property ID', 'Property-ID', 'property-id', 'PROPERTY_ID', 'pr_id', 'PR-ID');
    if (isEmpty(propertyId)) {
      errors.push('Property ID is required for government customers');
    } else if (propertyId.trim().length > 50) {
      errors.push('Property ID must be 50 characters or less');
    }

    // Full Department Name (required)
    const departmentName = getGovValue(record, 'full_department_name', 'Full Government / Department Name', 'Full Department Name', 'Department Name', 'Government Department');
    if (isEmpty(departmentName)) {
      errors.push('Full Government / Department Name is required for government customers');
    } else if (departmentName.trim().length < 3) {
      errors.push('Full Government / Department Name must be at least 3 characters');
    } else if (departmentName.trim().length > 200) {
      errors.push('Full Government / Department Name must be 200 characters or less');
    }

    // Contact Name (required)
    const contactName = getGovValue(record, 'contact_name', 'Contact Name', 'Contact Person');
    if (isEmpty(contactName)) {
      errors.push('Contact Name is required for government customers');
    } else if (contactName.trim().length > 200) {
      errors.push('Contact Name must be 200 characters or less');
    }

    // OPTIONAL FIELDS - Only validate format if provided
    
    // Department Address (optional)
    const departmentAddress = getGovValue(record, 'department_address', 'Department Address', 'Address', 'Government Address');
    if (!isEmpty(departmentAddress) && departmentAddress.trim().length > 500) {
      errors.push('Department Address must be 500 characters or less if provided');
    }

    // Mobile Number 1 (optional)
    const mobile1 = getGovValue(record, 'mobile_number_1', 'Mobile Number 1', 'Contact Number', 'Phone 1');
    if (!isEmpty(mobile1) && !isValidMobileNumber(mobile1)) {
      errors.push('Contact Number must be in format +XXX-XXX-XXX-XXX if provided (e.g., +252-612-345-678)');
    }

    // Mobile Number 2 (optional)
    const mobile2 = getGovValue(record, 'mobile_number_2', 'Mobile Number 2', 'Contact Number 2', 'Phone 2');
    if (!isEmpty(mobile2) && !isValidMobileNumber(mobile2)) {
      errors.push('Contact Number 2 must be in format +XXX-XXX-XXX-XXX if provided (e.g., +252-612-345-679)');
    }

    // Email (optional)
    const email = getGovValue(record, 'email', 'Email', 'E-mail');
    if (!isEmpty(email)) {
      if (!isValidEmail(email)) {
        errors.push('Email must be a valid email address if provided');
      } else if (email.length > 255) {
        errors.push('Email must be 255 characters or less if provided');
      }
    }

    // File Number (optional)
    const fileNumber = getGovValue(record, 'file_number', 'File Number');
    if (!isEmpty(fileNumber) && fileNumber.trim().length > 100) {
      errors.push('File Number must be 100 characters or less if provided');
    }

    // Size (optional)
    const size = getGovValue(record, 'size', 'Size');
    if (!isEmpty(size) && size.trim().length > 100) {
      errors.push('Size must be 100 characters or less if provided');
    }
  }

  /**
   * Map Excel data to database fields
   */
  static mapData(data: any, customerId: string): any {
    return {
      customer_id: customerId,
      property_id: getValue(data, 'property_id', 'Property ID', 'Property-ID', 'property-id', 'PROPERTY_ID', 'pr_id', 'PR-ID'),
      full_department_name: getValue(data, 'full_department_name', 'Full Government / Department Name', 'Full Department Name', 'Department Name', 'Government Department'),
      contact_name: getValue(data, 'contact_name', 'Contact Name', 'Contact Person'),
      department_address: getValue(data, 'department_address', 'Department Address', 'Address', 'Government Address'),
      mobile_number_1: getValue(data, 'mobile_number_1', 'Mobile Number 1', 'Contact Number', 'Phone 1'),
      mobile_number_2: getValue(data, 'mobile_number_2', 'Mobile Number 2', 'Contact Number 2', 'Phone 2'),
      email: getValue(data, 'email', 'Email', 'E-mail'),
      file_number: getValue(data, 'file_number', 'File Number'),
      size: getValue(data, 'size', 'Size'),
    };
  }

  /**
   * Transform and clean data before database insertion
   */
  static transformData(typeData: any): any {
    // Ensure the 3 required fields have values, set defaults if empty
    const transformed = {
      ...typeData,
      property_id: typeData.property_id || `PR-GOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      full_department_name: typeData.full_department_name || 'Government Department',
      contact_name: typeData.contact_name || 'Contact Person',
      
      // All other fields are optional (can be null)
      department_address: typeData.department_address || null,
      mobile_number_1: typeData.mobile_number_1 || null,
      mobile_number_2: typeData.mobile_number_2 || null,
      email: typeData.email || null,
      file_number: typeData.file_number || null,
      size: typeData.size || null,
    };

    return transformed;
  }

  /**
   * Create government customer in database
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
        customer_type: 'GOVERNMENT',
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

      // Insert government-specific details
      const { error: detailsError } = await supabase
        .from('customer_government')
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
   * Get template data for government customers
   */
  static getTemplate(): { headers: string[]; example: Record<string, any> } {
    return {
      headers: [
        'customer_type',
        'property_id',
        'full_department_name',
        'contact_name',
        'department_address',
        'mobile_number_1',
        'mobile_number_2',
        'email',
        'file_number',
        'size',
      ],
      example: {
        customer_type: 'GOVERNMENT',
        property_id: 'PR-GOV-001',
        full_department_name: 'Ministry of Finance',
        contact_name: 'Ahmed Hassan Director',
        department_address: '123 Government Street, Mogadishu',
        mobile_number_1: '+252-612-345-678',
        mobile_number_2: '+252-612-345-679',
        email: 'info@finance.gov.so',
        file_number: 'GOV-FILE-001',
        size: '1000 sqm',
      },
    };
  }
}
/**
 * Non-Profit Customer Bulk Upload Handler
 */

import { supabase } from '../../../config/database';
import { getValue, isEmpty, isValidEmail, isValidMobileNumber } from '../utils';

export class NonProfitCustomerHandler {
  /**
   * Validate non-profit customer fields
   */
  static validate(record: any, errors: string[]): void {
    // Helper function to get value with flexible column names
    const getNonProfitValue = (data: any, ...possibleKeys: string[]) => {
      return getValue(data, ...possibleKeys);
    };

    // REQUIRED FIELDS (5 most important fields)
    
    // Property ID (required)
    const propertyId = getNonProfitValue(record, 'property_id', 'Property ID', 'Property-ID', 'property-id', 'PROPERTY_ID', 'pr_id', 'PR-ID');
    if (isEmpty(propertyId)) {
      errors.push('Property ID is required for non-profit customers');
    } else if (propertyId.trim().length > 50) {
      errors.push('Property ID must be 50 characters or less');
    }

    // NGO Name (required)
    const ngoName = getNonProfitValue(record, 'ngo_name', 'NGO Name', 'full_non_profit_name', 'Full Non-Profit Name', 'Organization Name');
    if (isEmpty(ngoName)) {
      errors.push('NGO Name is required for non-profit customers');
    } else if (ngoName.trim().length < 2) {
      errors.push('NGO Name must be at least 2 characters');
    } else if (ngoName.trim().length > 200) {
      errors.push('NGO Name must be 200 characters or less');
    }

    // NGO Registration Number (required)
    const registrationNumber = getNonProfitValue(record, 'ngo_registration_number', 'NGO Registration Number', 'Registration Number', 'Reg Number');
    if (isEmpty(registrationNumber)) {
      errors.push('NGO Registration Number is required for non-profit customers');
    } else if (registrationNumber.trim().length > 100) {
      errors.push('NGO Registration Number must be 100 characters or less');
    }

    // Contact Name (required)
    const contactName = getNonProfitValue(record, 'contact_name', 'Contact Name', 'Contact Person');
    if (isEmpty(contactName)) {
      errors.push('Contact Name is required for non-profit customers');
    } else if (contactName.trim().length > 200) {
      errors.push('Contact Name must be 200 characters or less');
    }

    // Mobile Number 1 (required)
    const mobile1 = getNonProfitValue(record, 'mobile_number_1', 'Mobile Number 1', 'Contact Number', 'Phone 1');
    if (isEmpty(mobile1)) {
      errors.push('Contact Number is required for non-profit customers');
    } else if (!isValidMobileNumber(mobile1)) {
      errors.push('Contact Number must be in format +XXX-XXX-XXX-XXX (e.g., +252-612-345-678)');
    }

    // OPTIONAL FIELDS - Only validate format if provided
    
    // Mobile Number 2 (optional)
    const mobile2 = getNonProfitValue(record, 'mobile_number_2', 'Mobile Number 2', 'Contact Number 2', 'Phone 2');
    if (!isEmpty(mobile2) && !isValidMobileNumber(mobile2)) {
      errors.push('Contact Number 2 must be in format +XXX-XXX-XXX-XXX if provided (e.g., +252-612-345-679)');
    }

    // Email (optional)
    const email = getNonProfitValue(record, 'email', 'Email', 'E-mail');
    if (!isEmpty(email)) {
      if (!isValidEmail(email)) {
        errors.push('Email must be a valid email address if provided');
      } else if (email.length > 255) {
        errors.push('Email must be 255 characters or less if provided');
      }
    }

    // Size (optional)
    const size = getNonProfitValue(record, 'size', 'Size');
    if (!isEmpty(size) && size.trim().length > 100) {
      errors.push('Size must be 100 characters or less if provided');
    }

    // Floor (optional)
    const floor = getNonProfitValue(record, 'floor', 'Floor');
    if (!isEmpty(floor) && floor.trim().length > 50) {
      errors.push('Floor must be 50 characters or less if provided');
    }

    // Address (optional)
    const address = getNonProfitValue(record, 'address', 'Address');
    if (!isEmpty(address) && address.trim().length > 500) {
      errors.push('Address must be 500 characters or less if provided');
    }

    // File Number (optional)
    const fileNumber = getNonProfitValue(record, 'file_number', 'File Number');
    if (!isEmpty(fileNumber) && fileNumber.trim().length > 100) {
      errors.push('File Number must be 100 characters or less if provided');
    }
  }

  /**
   * Map Excel data to database fields
   */
  static mapData(data: any, customerId: string): any {
    return {
      customer_id: customerId,
      property_id: getValue(data, 'property_id', 'Property ID', 'Property-ID', 'property-id', 'PROPERTY_ID', 'pr_id', 'PR-ID'),
      ngo_name: getValue(data, 'ngo_name', 'NGO Name', 'full_non_profit_name', 'Full Non-Profit Name', 'Organization Name'),
      ngo_registration_number: getValue(data, 'ngo_registration_number', 'NGO Registration Number', 'Registration Number', 'Reg Number'),
      contact_name: getValue(data, 'contact_name', 'Contact Name', 'Contact Person'),
      mobile_number_1: getValue(data, 'mobile_number_1', 'Mobile Number 1', 'Contact Number', 'Phone 1'),
      mobile_number_2: getValue(data, 'mobile_number_2', 'Mobile Number 2', 'Contact Number 2', 'Phone 2'),
      email: getValue(data, 'email', 'Email', 'E-mail'),
      size: getValue(data, 'size', 'Size'),
      floor: getValue(data, 'floor', 'Floor'),
      address: getValue(data, 'address', 'Address'),
      file_number: getValue(data, 'file_number', 'File Number'),
    };
  }

  /**
   * Transform and clean data before database insertion
   */
  static transformData(typeData: any): any {
    // Ensure the 5 required fields have values, set defaults if empty
    const transformed = {
      ...typeData,
      property_id: typeData.property_id || `PR-NGO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ngo_name: typeData.ngo_name || 'NGO Organization',
      ngo_registration_number: typeData.ngo_registration_number || `NGO-REG-${Date.now()}`,
      contact_name: typeData.contact_name || 'Contact Person',
      mobile_number_1: typeData.mobile_number_1 || '+252612345678',
      
      // All other fields are optional (can be null)
      mobile_number_2: typeData.mobile_number_2 || null,
      email: typeData.email || null,
      size: typeData.size || null,
      floor: typeData.floor || null,
      address: typeData.address || null,
      file_number: typeData.file_number || null,
    };

    return transformed;
  }

  /**
   * Create non-profit customer in database
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
        customer_type: 'NON_PROFIT',
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

      // Insert non-profit-specific details
      const { error: detailsError } = await supabase
        .from('customer_non_profit')
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
   * Get template data for non-profit customers
   */
  static getTemplate(): { headers: string[]; example: Record<string, any> } {
    return {
      headers: [
        'customer_type',
        'property_id',
        'ngo_name',
        'ngo_registration_number',
        'contact_name',
        'mobile_number_1',
        'mobile_number_2',
        'email',
        'size',
        'floor',
        'address',
        'file_number',
      ],
      example: {
        customer_type: 'NON_PROFIT',
        property_id: 'PR-NGO-001',
        ngo_name: 'Hope Foundation Somalia',
        ngo_registration_number: 'NGO-REG-2025-001',
        contact_name: 'Amina Hassan Director',
        mobile_number_1: '+252-612-345-678',
        mobile_number_2: '+252-612-345-679',
        email: 'info@hopefoundation.org',
        size: '300 sqm',
        floor: '1st Floor',
        address: '456 NGO Street, Mogadishu',
        file_number: 'NGO-FILE-001',
      },
    };
  }
}
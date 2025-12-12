/**
 * Business Customer Bulk Upload Handler
 */

import { supabase } from '../../../config/database';
import { getValue, isEmpty, isValidEmail, isValidMobileNumber } from '../utils';
import { CustomerData } from '../types';

export class BusinessCustomerHandler {
  /**
   * Validate business customer fields
   */
  static validate(record: any, errors: string[]): void {
    // REQUIRED FIELDS
    
    // Property ID (required)
    const propertyId = getValue(record, 'property_id', 'Property ID', 'Property-ID', 'property-id', 'PROPERTY_ID', 'pr_id', 'PR-ID');
    if (isEmpty(propertyId)) {
      errors.push('Property ID is required for business customers');
    } else if (propertyId.trim().length > 50) {
      errors.push('Property ID must be 50 characters or less');
    }

    // Business Name (required)
    const businessName = getValue(record, 'business_name', 'Business Name', 'Full Business Name', 'business-name', 'Business_Name');
    if (isEmpty(businessName)) {
      errors.push('Business Name is required for business customers');
    } else if (businessName.trim().length > 200) {
      errors.push('Business Name must be 200 characters or less');
    }

    // OPTIONAL FIELDS - Only validate format if provided

    // Business License Number (optional)
    const licenseNumber = getValue(record, 'business_license_number', 'Business License Number', 'License Number', 'Commercial License Number');
    if (!isEmpty(licenseNumber) && licenseNumber.trim().length > 100) {
      errors.push('Business License Number must be 100 characters or less if provided');
    }

    // Business Address (optional)
    const businessAddress = getValue(record, 'business_address', 'Business Address', 'Address');
    if (!isEmpty(businessAddress) && businessAddress.trim().length > 500) {
      errors.push('Business Address must be 500 characters or less if provided');
    }

    // Rental Name (optional)
    const rentalName = getValue(record, 'rental_name', 'Rental Name');
    if (!isEmpty(rentalName) && rentalName.trim().length > 200) {
      errors.push('Rental Name must be 200 characters or less if provided');
    }

    // Mobile Number 1 (optional)
    const mobile1 = getValue(record, 'mobile_number_1', 'Mobile Number 1', 'Contact Number', 'Phone 1');
    if (!isEmpty(mobile1) && !isValidMobileNumber(mobile1)) {
      errors.push('Contact Number must be in format +XXX-XXX-XXX-XXX if provided (e.g., +252-612-345-678)');
    }

    // Mobile Number 2 (optional)
    const mobile2 = getValue(record, 'mobile_number_2', 'Mobile Number 2', 'Contact Number 2', 'Phone 2');
    if (!isEmpty(mobile2) && !isValidMobileNumber(mobile2)) {
      errors.push('Contact Number 2 must be in format +XXX-XXX-XXX-XXX if provided (e.g., +252-612-345-679)');
    }

    // Email (optional)
    const email = getValue(record, 'email', 'Email', 'E-mail');
    if (!isEmpty(email)) {
      if (!isValidEmail(email)) {
        errors.push('Email must be a valid email address if provided');
      } else if (email.length > 255) {
        errors.push('Email must be 255 characters or less if provided');
      }
    }

    // Size (optional)
    const size = getValue(record, 'size', 'Size');
    if (!isEmpty(size) && size.trim().length > 100) {
      errors.push('Size must be 100 characters or less if provided');
    }

    // Floor (optional)
    const floor = getValue(record, 'floor', 'Floor');
    if (!isEmpty(floor) && floor.trim().length > 50) {
      errors.push('Floor must be 50 characters or less if provided');
    }

    // File Number (optional)
    const fileNumber = getValue(record, 'file_number', 'File Number');
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
      business_name: getValue(data, 'business_name', 'Business Name', 'Full Business Name', 'business-name', 'Business_Name'),
      business_license_number: getValue(data, 'business_license_number', 'Business License Number', 'License Number', 'Commercial License Number'),
      business_address: getValue(data, 'business_address', 'Business Address', 'Address'),
      rental_name: getValue(data, 'rental_name', 'Rental Name'),
      mobile_number_1: getValue(data, 'mobile_number_1', 'Mobile Number 1', 'Contact Number', 'Phone 1'),
      mobile_number_2: getValue(data, 'mobile_number_2', 'Mobile Number 2', 'Contact Number 2', 'Phone 2'),
      email: getValue(data, 'email', 'Email', 'E-mail'),
      size: getValue(data, 'size', 'Size'),
      floor: getValue(data, 'floor', 'Floor'),
      file_number: getValue(data, 'file_number', 'File Number'),
    };
  }

  /**
   * Transform and clean data before database insertion
   */
  static transformData(typeData: any): any {
    // Set defaults for empty values (convert empty strings to null)
    return {
      ...typeData,
      property_id: typeData.property_id || null,
      business_name: typeData.business_name || null,
      business_license_number: typeData.business_license_number || null,
      business_address: typeData.business_address || null,
      rental_name: typeData.rental_name || null,
      mobile_number_1: typeData.mobile_number_1 || null,
      mobile_number_2: typeData.mobile_number_2 || null,
      email: typeData.email || null,
      size: typeData.size || null,
      floor: typeData.floor || null,
      file_number: typeData.file_number || null,
    };
  }

  /**
   * Create business customer in database
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
        customer_type: 'BUSINESS',
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

      // Insert business-specific details
      const { error: detailsError } = await supabase
        .from('customer_business')
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
   * Get template data for business customers
   */
  static getTemplate(): { headers: string[]; example: Record<string, any> } {
    return {
      headers: [
        'customer_type',
        'property_id',
        'business_name',
        'business_license_number',
        'business_address',
        'rental_name',
        'mobile_number_1',
        'mobile_number_2',
        'email',
        'size',
        'floor',
        'file_number',
      ],
      example: {
        customer_type: 'BUSINESS',
        property_id: 'PR-BUS-001',
        business_name: 'ABC Trading Company',
        business_license_number: 'BL-2025-001',
        business_address: '123 Business Street, Mogadishu',
        rental_name: 'ABC Rental Services',
        mobile_number_1: '+252-612-345-678',
        mobile_number_2: '+252-612-345-679',
        email: 'info@abctrading.com',
        size: '500 sqm',
        floor: '2nd Floor',
        file_number: 'FILE-2025-001',
      },
    };
  }
}
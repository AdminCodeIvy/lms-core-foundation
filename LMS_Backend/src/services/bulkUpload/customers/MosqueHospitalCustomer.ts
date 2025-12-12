/**
 * Mosque Hospital Customer Bulk Upload Handler
 */

import { supabase } from '../../../config/database';
import { getValue, isEmpty, isValidEmail, isValidMobileNumber } from '../utils';

export class MosqueHospitalCustomerHandler {
  /**
   * Validate mosque hospital customer fields
   */
  static validate(record: any, errors: string[]): void {
    // Helper function to get value with flexible column names
    const getMosqueValue = (data: any, ...possibleKeys: string[]) => {
      return getValue(data, ...possibleKeys);
    };

    // REQUIRED FIELDS
    
    // Property ID (required)
    const propertyId = getMosqueValue(record, 'property_id', 'Property ID', 'Property-ID', 'property-id', 'PROPERTY_ID', 'pr_id', 'PR-ID');
    if (isEmpty(propertyId)) {
      errors.push('Property ID is required for mosque/hospital customers');
    } else if (propertyId.trim().length > 50) {
      errors.push('Property ID must be 50 characters or less');
    }

    // Full Mosque/Hospital Name (required)
    const fullName = getMosqueValue(record, 'full_mosque_hospital_name', 'Full Mosque or Hospital Name', 'Full Mosque Hospital Name', 'Mosque Hospital Name', 'full_name', 'Full Name');
    if (isEmpty(fullName)) {
      errors.push('Full Mosque or Hospital Name is required');
    } else if (fullName.trim().length > 200) {
      errors.push('Full Mosque or Hospital Name must be 200 characters or less');
    }

    // Mosque Registration Number (required)
    const registrationNumber = getMosqueValue(record, 'mosque_registration_number', 'Mosque Registration Number', 'Registration Number', 'registration_number');
    if (isEmpty(registrationNumber)) {
      errors.push('Mosque Registration Number is required');
    } else if (registrationNumber.trim().length > 100) {
      errors.push('Mosque Registration Number must be 100 characters or less');
    }

    // Contact Name (required)
    const contactName = getMosqueValue(record, 'contact_name', 'Contact Name', 'Contact Person');
    if (isEmpty(contactName)) {
      errors.push('Contact Name is required for mosque/hospital customers');
    } else if (contactName.trim().length > 200) {
      errors.push('Contact Name must be 200 characters or less');
    }

    // Mobile Number 1 (required)
    const mobile1 = getMosqueValue(record, 'mobile_number_1', 'Mobile Number 1', 'Contact Number', 'Phone 1');
    if (isEmpty(mobile1)) {
      errors.push('Contact Number is required for mosque/hospital customers');
    } else if (!isValidMobileNumber(mobile1)) {
      errors.push('Contact Number must be in format +XXX-XXX-XXX-XXX (e.g., +252-612-345-678)');
    }

    // OPTIONAL FIELDS - Only validate format if provided

    // Mobile Number 2 (optional)
    const mobile2 = getMosqueValue(record, 'mobile_number_2', 'Mobile Number 2', 'Contact Number 2', 'Phone 2');
    if (!isEmpty(mobile2) && !isValidMobileNumber(mobile2)) {
      errors.push('Contact Number 2 must be in format +XXX-XXX-XXX-XXX if provided (e.g., +252-612-345-679)');
    }

    // Email (optional)
    const email = getMosqueValue(record, 'email', 'Email', 'E-mail');
    if (!isEmpty(email)) {
      if (!isValidEmail(email)) {
        errors.push('Email must be a valid email address if provided');
      } else if (email.length > 255) {
        errors.push('Email must be 255 characters or less if provided');
      }
    }

    // Address (optional)
    const address = getMosqueValue(record, 'address', 'Address');
    if (!isEmpty(address) && address.trim().length > 500) {
      errors.push('Address must be 500 characters or less if provided');
    }

    // Size (optional)
    const size = getMosqueValue(record, 'size', 'Size');
    if (!isEmpty(size) && size.trim().length > 100) {
      errors.push('Size must be 100 characters or less if provided');
    }

    // Floor (optional)
    const floor = getMosqueValue(record, 'floor', 'Floor');
    if (!isEmpty(floor) && floor.trim().length > 50) {
      errors.push('Floor must be 50 characters or less if provided');
    }

    // File Number (optional)
    const fileNumber = getMosqueValue(record, 'file_number', 'File Number');
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
      full_mosque_hospital_name: getValue(data, 'full_mosque_hospital_name', 'Full Mosque or Hospital Name', 'Full Mosque Hospital Name', 'Mosque Hospital Name', 'full_name', 'Full Name'),
      mosque_registration_number: getValue(data, 'mosque_registration_number', 'Mosque Registration Number', 'Registration Number', 'registration_number'),
      contact_name: getValue(data, 'contact_name', 'Contact Name', 'Contact Person'),
      mobile_number_1: getValue(data, 'mobile_number_1', 'Mobile Number 1', 'Contact Number', 'Phone 1'),
      mobile_number_2: getValue(data, 'mobile_number_2', 'Mobile Number 2', 'Contact Number 2', 'Phone 2'),
      email: getValue(data, 'email', 'Email', 'E-mail'),
      address: getValue(data, 'address', 'Address'),
      size: getValue(data, 'size', 'Size'),
      floor: getValue(data, 'floor', 'Floor'),
      file_number: getValue(data, 'file_number', 'File Number'),
    };
  }

  /**
   * Transform and clean data before database insertion
   */
  static transformData(typeData: any): any {
    // Ensure required fields have values, set defaults if empty
    const transformed = {
      ...typeData,
      property_id: typeData.property_id || `PR-MOS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      full_mosque_hospital_name: typeData.full_mosque_hospital_name || 'Mosque/Hospital',
      mosque_registration_number: typeData.mosque_registration_number || `MOS-REG-${Date.now()}`,
      contact_name: typeData.contact_name || 'Contact Person',
      mobile_number_1: typeData.mobile_number_1 || '+252612345678',
      
      // Optional fields (can be null)
      mobile_number_2: typeData.mobile_number_2 || null,
      email: typeData.email || null,
      address: typeData.address || null,
      size: typeData.size || null,
      floor: typeData.floor || null,
      file_number: typeData.file_number || null,
    };

    return transformed;
  }

  /**
   * Create mosque hospital customer in database
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
        customer_type: 'MOSQUE_HOSPITAL',
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

      // Insert mosque hospital-specific details
      const { error: detailsError } = await supabase
        .from('customer_mosque_hospital')
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
   * Get template data for mosque hospital customers
   */
  static getTemplate(): { headers: string[]; example: Record<string, any> } {
    return {
      headers: [
        'customer_type',
        'property_id',
        'full_mosque_hospital_name',
        'mosque_registration_number',
        'contact_name',
        'mobile_number_1',
        'mobile_number_2',
        'email',
        'address',
        'size',
        'floor',
        'file_number',
      ],
      example: {
        customer_type: 'MOSQUE_HOSPITAL',
        property_id: 'PR-MOS-001',
        full_mosque_hospital_name: 'Al-Noor Mosque',
        mosque_registration_number: 'MOS-REG-2025-001',
        contact_name: 'Sheikh Ahmed Hassan',
        mobile_number_1: '+252-612-345-678',
        mobile_number_2: '+252-612-345-679',
        email: 'info@alnoor-mosque.com',
        address: '123 Mosque Street, Mogadishu',
        size: '300 sqm',
        floor: 'Ground Floor',
        file_number: 'MOS-FILE-001',
      },
    };
  }
}
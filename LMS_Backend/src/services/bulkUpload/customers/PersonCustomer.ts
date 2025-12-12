/**
 * Person Customer Bulk Upload Handler
 */

import { supabase } from '../../../config/database';
import { getValue, isEmpty, isValidEmail, isValidMobileNumber, convertExcelDate, normalizeGender } from '../utils';

export class PersonCustomerHandler {
  /**
   * Validate person customer fields
   */
  static validate(record: any, errors: string[]): void {
    // Helper function to get value with flexible column names
    const getPersonValue = (data: any, ...possibleKeys: string[]) => {
      return getValue(data, ...possibleKeys);
    };

    // REQUIRED FIELDS (Only 3 fields - customer_id is auto-generated)
    
    // PROPERTY ID (required) - Updated to match your Excel format
    const propertyId = getPersonValue(record, 'PROPERTY ID', 'Property ID', 'pr_id', 'PR-ID', 'PR_ID', 'property_id', 'Property-ID', 'property-id', 'PROPERTY_ID');
    if (isEmpty(propertyId)) {
      errors.push('PROPERTY ID is required (column: PROPERTY ID, Property ID, or pr_id)');
    } else if (propertyId.trim().length > 50) {
      errors.push('PROPERTY ID must be 50 characters or less');
    }

    // Full Name (required)
    const fullName = getPersonValue(record, 'Full Name', 'full_name', 'Name');
    if (isEmpty(fullName) || fullName === 'Not found') {
      errors.push('Full Name is required (column: Full Name, full_name, or Name)');
    } else if (fullName.trim().length > 200) {
      errors.push('Full Name must be 200 characters or less');
    }

    // Mothers Name (required) - Updated to match your Excel format
    const mothersName = getPersonValue(record, 'Mothers Name', 'mothers_name', 'Mother Name');
    if (isEmpty(mothersName) || mothersName === 'Not found') {
      errors.push('Mothers Name is required (column: Mothers Name, mothers_name, or Mother Name)');
    } else if (mothersName.trim().length > 200) {
      errors.push('Mothers Name must be 200 characters or less');
    }

    // OPTIONAL FIELDS - Only validate format if provided
    
    // Date of brith (optional) - Updated to match your Excel format
    const dateOfBirth = getPersonValue(record, 'Date of brith', 'date_of_birth', 'Date of Birth', 'DOB');
    if (!isEmpty(dateOfBirth) && dateOfBirth !== 'Not found') {
      // Basic date validation - just check it's not empty
      // The convertExcelDate function will handle the conversion
    }

    // POB (optional) - Updated to match your Excel format
    const placeOfBirth = getPersonValue(record, 'POB', 'place_of_birth', 'Place of Birth');
    if (!isEmpty(placeOfBirth) && placeOfBirth !== 'Not found' && placeOfBirth.trim().length > 200) {
      errors.push('POB must be 200 characters or less if provided');
    }

    // Gender (optional) - Updated to match your Excel format
    const gender = getPersonValue(record, 'Gender', 'gender');
    if (!isEmpty(gender) && gender !== 'Not found') {
      const validGenders = ['MALE', 'FEMALE', 'Male', 'Female', 'M', 'F'];
      if (!validGenders.includes(gender)) {
        errors.push('Gender must be MALE or FEMALE if provided');
      }
    }

    // Nationality (optional) - Updated to match your Excel format
    const nationality = getPersonValue(record, 'Nationality', 'nationality');
    if (!isEmpty(nationality) && nationality !== 'Not found' && nationality.trim().length > 100) {
      errors.push('Nationality must be 100 characters or less if provided');
    }

    // Mobile Number 1 (optional) - Updated to match your Excel format
    const mobile1 = getPersonValue(record, 'Mobile Number 1', 'mobile_number_1', 'Contact Number', 'Phone 1');
    if (!isEmpty(mobile1) && mobile1 !== 'Not found') {
      // Simple validation: 8-15 digits with optional formatting
      const cleanMobile = mobile1.replace(/[\s\-\+]/g, '');
      if (!/^\d{8,15}$/.test(cleanMobile)) {
        errors.push('Mobile Number 1 should be 8-15 digits if provided');
      }
    }

    // Email (optional) - Updated to match your Excel format
    const email = getPersonValue(record, 'Email', 'email', 'E-mail');
    if (!isEmpty(email) && email !== 'Not found') {
      if (!isValidEmail(email)) {
        errors.push('Email must be a valid email address if provided');
      } else if (email.length > 255) {
        errors.push('Email must be 255 characters or less if provided');
      }
    }

    // Type of ID (optional) - Updated to match your Excel format
    const idType = getPersonValue(record, 'Type of ID', 'id_type', 'ID Type');
    if (!isEmpty(idType) && idType !== 'Not found' && idType.trim().length > 100) {
      errors.push('Type of ID must be 100 characters or less if provided');
    }

    // ID Number (optional)
    const idNumber = getPersonValue(record, 'id_number', 'ID Number');
    if (!isEmpty(idNumber) && idNumber !== 'Not found' && idNumber.trim().length > 100) {
      errors.push('ID Number must be 100 characters or less if provided');
    }

    // Mobile Number 2 (optional)
    const mobile2 = getPersonValue(record, 'mobile_number_2', 'Mobile Number 2', 'Contact Number 2', 'Phone 2');
    if (!isEmpty(mobile2) && mobile2 !== 'Not found') {
      // Simple validation: 8-15 digits with optional formatting
      const cleanMobile = mobile2.replace(/[\s\-\+]/g, '');
      if (!/^\d{8,15}$/.test(cleanMobile)) {
        errors.push('Mobile Number 2 should be 8-15 digits if provided');
      }
    }
  }

  /**
   * Map Excel data to database fields
   */
  static mapData(data: any, customerId: string): any {
    // Get the full name to split into first_name for backward compatibility
    const fullName = getValue(data, 'full_name', 'Full Name', 'Name') || 'Unknown';
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || 'Unknown';

    return {
      customer_id: customerId,
      property_id: getValue(data, 'PROPERTY ID', 'Property ID', 'pr_id', 'PR-ID', 'PR_ID', 'property_id', 'Property-ID', 'property-id', 'PROPERTY_ID'),
      full_name: fullName,
      mothers_name: getValue(data, 'Mothers Name', 'mothers_name', 'Mother Name'),
      date_of_birth: convertExcelDate(getValue(data, 'Date of brith', 'date_of_birth', 'Date of Birth', 'DOB')),
      place_of_birth: getValue(data, 'POB', 'place_of_birth', 'Place of Birth'),
      gender: normalizeGender(getValue(data, 'Gender', 'gender')),
      nationality: getValue(data, 'Nationality', 'nationality'),
      mobile_number_1: getValue(data, 'Mobile Number 1', 'mobile_number_1', 'Contact Number', 'Phone 1'),
      email: getValue(data, 'Email', 'email', 'E-mail'),
      id_type: getValue(data, 'Type of ID', 'id_type', 'ID Type'),
      
      // Optional fields
      id_number: getValue(data, 'id_number', 'ID Number'),
      place_of_issue: getValue(data, 'place_of_issue', 'Place of Issue'),
      issue_date: convertExcelDate(getValue(data, 'issue_date', 'Issue Date')),
      expiry_date: convertExcelDate(getValue(data, 'expiry_date', 'Expiry Date')),
      mobile_number_2: getValue(data, 'mobile_number_2', 'Mobile Number 2', 'Contact Number 2', 'Phone 2'),
      carrier_mobile_1: getValue(data, 'carrier_mobile_1', 'Carrier Mobile 1', 'Carrier 1'),
      carrier_mobile_2: getValue(data, 'carrier_mobile_2', 'Carrier Mobile 2', 'Carrier 2'),
      emergency_contact_name: getValue(data, 'emergency_contact_name', 'Emergency Contact Name'),
      emergency_contact_number: getValue(data, 'emergency_contact_number', 'Emergency Contact Number'),
    };
  }

  /**
   * Transform and clean data before database insertion
   */
  static transformData(typeData: any): any {
    // Only ensure required fields have values, make everything else optional
    const transformed = {
      ...typeData,
      // Required fields with fallbacks
      property_id: typeData.property_id || `PR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      full_name: typeData.full_name || 'Unknown',
      mothers_name: typeData.mothers_name || 'Unknown Mother',
      
      // Optional fields - use actual values or set to null
      date_of_birth: typeData.date_of_birth || null,
      place_of_birth: typeData.place_of_birth || null,
      gender: typeData.gender ? (typeData.gender || 'MALE').toUpperCase() : null,
      nationality: typeData.nationality || null,
      mobile_number_1: typeData.mobile_number_1 || null,
      email: typeData.email || null,
      id_type: typeData.id_type || null,
      id_number: typeData.id_number || null,
      place_of_issue: typeData.place_of_issue || null,
      issue_date: typeData.issue_date || null,
      expiry_date: typeData.expiry_date || null,
      mobile_number_2: typeData.mobile_number_2 || null,
      carrier_mobile_1: typeData.carrier_mobile_1 || null,
      carrier_mobile_2: typeData.carrier_mobile_2 || null,
      emergency_contact_name: typeData.emergency_contact_name || null,
      emergency_contact_number: typeData.emergency_contact_number || null,
    };

    return transformed;
  }

  /**
   * Create person customer in database
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
        customer_type: 'PERSON',
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

      // Insert person-specific details
      const { error: detailsError } = await supabase
        .from('customer_person')
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
   * Get template data for person customers
   */
  static getTemplate(): { headers: string[]; example: Record<string, any> } {
    return {
      headers: [
        'customer_type',
        'property_id',
        'full_name',
        'mothers_name',
        'date_of_birth',
        'place_of_birth',
        'gender',
        'nationality',
        'mobile_number_1',
        'email',
        'id_type',
        'id_number',
        'place_of_issue',
        'issue_date',
        'expiry_date',
      ],
      example: {
        customer_type: 'PERSON',
        property_id: 'PR-2025-001',
        full_name: 'John Doe Smith',
        mothers_name: 'Jane Smith',
        date_of_birth: '1990-01-01',
        place_of_birth: 'Mogadishu',
        gender: 'MALE',
        nationality: 'Somalia',
        mobile_number_1: '+252-612-345-678',
        email: 'john@example.com',
        id_type: 'National ID Card',
        id_number: '123456789',
        place_of_issue: 'Ethiopia',
        issue_date: '2020-01-01',
        expiry_date: '2030-01-01',
      },
    };
  }
}
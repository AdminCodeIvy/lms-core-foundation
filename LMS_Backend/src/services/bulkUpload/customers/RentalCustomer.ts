/**
 * Rental Customer Bulk Upload Handler
 */

import { supabase } from '../../../config/database';
import { getValue, isEmpty, isValidEmail, isValidMobileNumber, convertExcelDate, normalizeGender } from '../utils';

export class RentalCustomerHandler {
  /**
   * Validate rental customer fields
   */
  static validate(record: any, errors: string[]): void {
    // Helper function to get value with flexible column names
    const getRentalValue = (data: any, ...possibleKeys: string[]) => {
      return getValue(data, ...possibleKeys);
    };

    // REQUIRED FIELDS (11 fields - similar to PERSON but rental-specific)
    
    // Property ID (required)
    const propertyId = getRentalValue(record, 'property_id', 'Property ID', 'Property-ID', 'property-id', 'PROPERTY_ID', 'pr_id', 'PR-ID');
    if (isEmpty(propertyId)) {
      errors.push('Property ID is required for rental customers');
    } else if (propertyId.trim().length > 50) {
      errors.push('Property ID must be 50 characters or less');
    }

    // Rental Name (required)
    const rentalName = getRentalValue(record, 'rental_name', 'Rental Name', 'Full Name', 'Name');
    if (isEmpty(rentalName)) {
      errors.push('Rental Name is required for rental customers');
    } else if (rentalName.trim().length > 200) {
      errors.push('Rental Name must be 200 characters or less');
    }

    // Rental Mother's Name (required)
    const rentalMothersName = getRentalValue(record, 'rental_mothers_name', 'Rental Mothers Name', 'Mothers Name', 'Mother Name');
    if (isEmpty(rentalMothersName)) {
      errors.push('Rental Mother\'s Name is required for rental customers');
    } else if (rentalMothersName.trim().length > 200) {
      errors.push('Rental Mother\'s Name must be 200 characters or less');
    }

    // Date of Birth (required)
    const dateOfBirth = getRentalValue(record, 'date_of_birth', 'Date of Birth', 'DOB');
    if (isEmpty(dateOfBirth)) {
      errors.push('Date of Birth is required for rental customers');
    }

    // Place of Birth (required)
    const placeOfBirth = getRentalValue(record, 'place_of_birth', 'Place of Birth', 'POB');
    if (isEmpty(placeOfBirth)) {
      errors.push('Place of Birth is required for rental customers');
    } else if (placeOfBirth.trim().length > 200) {
      errors.push('Place of Birth must be 200 characters or less');
    }

    // Gender (required)
    const gender = getRentalValue(record, 'gender', 'Gender');
    if (isEmpty(gender)) {
      errors.push('Gender is required for rental customers');
    }

    // Nationality (required)
    const nationality = getRentalValue(record, 'nationality', 'Nationality');
    if (isEmpty(nationality)) {
      errors.push('Nationality is required for rental customers');
    } else if (nationality.trim().length > 100) {
      errors.push('Nationality must be 100 characters or less');
    }

    // Mobile Number 1 (required)
    const mobile1 = getRentalValue(record, 'mobile_number_1', 'Mobile Number 1', 'Contact Number', 'Phone 1');
    if (isEmpty(mobile1)) {
      errors.push('Contact Number is required for rental customers');
    } else if (!isValidMobileNumber(mobile1)) {
      errors.push('Contact Number must be in format +XXX-XXX-XXX-XXX (e.g., +252-612-345-678)');
    }

    // Mobile Number 2 (required)
    const mobile2 = getRentalValue(record, 'mobile_number_2', 'Mobile Number 2', 'Contact Number 2', 'Phone 2');
    if (isEmpty(mobile2)) {
      errors.push('Contact Number 2 is required for rental customers');
    } else if (!isValidMobileNumber(mobile2)) {
      errors.push('Contact Number 2 must be in format +XXX-XXX-XXX-XXX (e.g., +252-612-345-679)');
    }

    // Email (required)
    const email = getRentalValue(record, 'email', 'Email', 'E-mail');
    if (isEmpty(email)) {
      errors.push('Email is required for rental customers');
    } else if (!isValidEmail(email)) {
      errors.push('Email must be a valid email address');
    } else if (email.length > 255) {
      errors.push('Email must be 255 characters or less');
    }

    // ID Type (required)
    const idType = getRentalValue(record, 'id_type', 'ID Type', 'Type of ID');
    if (isEmpty(idType)) {
      errors.push('ID Type is required for rental customers');
    } else if (idType.trim().length > 100) {
      errors.push('ID Type must be 100 characters or less');
    }

    // Note: Other fields like id_number, place_of_issue, etc. are not in the database
    // so we don't validate them, but they might be in Excel templates for compatibility
  }

  /**
   * Map Excel data to database fields
   */
  static mapData(data: any, customerId: string): any {
    return {
      customer_id: customerId,
      property_id: getValue(data, 'property_id', 'Property ID', 'Property-ID', 'property-id', 'PROPERTY_ID', 'pr_id', 'PR-ID'),
      rental_name: getValue(data, 'rental_name', 'Rental Name', 'Full Name', 'Name'),
      rental_mothers_name: getValue(data, 'rental_mothers_name', 'Rental Mothers Name', 'Mothers Name', 'Mother Name'),
      date_of_birth: convertExcelDate(getValue(data, 'date_of_birth', 'Date of Birth', 'DOB')),
      place_of_birth: getValue(data, 'place_of_birth', 'Place of Birth', 'POB'),
      gender: normalizeGender(getValue(data, 'gender', 'Gender')),
      nationality: getValue(data, 'nationality', 'Nationality'),
      mobile_number_1: getValue(data, 'mobile_number_1', 'Mobile Number 1', 'Contact Number', 'Phone 1'),
      mobile_number_2: getValue(data, 'mobile_number_2', 'Mobile Number 2', 'Contact Number 2', 'Phone 2'),
      email: getValue(data, 'email', 'Email', 'E-mail'),
      id_type: getValue(data, 'id_type', 'ID Type', 'Type of ID'),
    };
  }

  /**
   * Transform and clean data before database insertion
   */
  static transformData(typeData: any): any {
    // Ensure all 11 required fields have values
    const transformed = {
      ...typeData,
      property_id: typeData.property_id || `PR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      rental_name: typeData.rental_name || 'Unknown Rental',
      rental_mothers_name: typeData.rental_mothers_name || 'Unknown Mother',
      date_of_birth: typeData.date_of_birth || '1990-01-01',
      place_of_birth: typeData.place_of_birth || 'Unknown',
      gender: (typeData.gender || 'MALE').toUpperCase(),
      nationality: typeData.nationality || 'Unknown',
      mobile_number_1: typeData.mobile_number_1 || '+252612345678',
      mobile_number_2: typeData.mobile_number_2 || '+252612345679',
      email: typeData.email || `${(typeData.rental_name || 'rental').toLowerCase().replace(/\s+/g, '.')}@example.com`,
      id_type: typeData.id_type || 'National ID Card',
    };

    // Handle ID number fallback for property_id
    const idNumber = getValue(typeData, 'id_number', 'ID Number');
    if (!transformed.property_id && idNumber && idNumber !== 'N/A') {
      transformed.property_id = idNumber;
    }

    return transformed;
  }

  /**
   * Create rental customer in database
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
        customer_type: 'RENTAL',
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

      // Insert rental-specific details
      const { error: detailsError } = await supabase
        .from('customer_rental')
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
   * Get template data for rental customers
   */
  static getTemplate(): { headers: string[]; example: Record<string, any> } {
    return {
      headers: [
        'customer_type',
        'property_id',
        'rental_name',
        'rental_mothers_name',
        'date_of_birth',
        'place_of_birth',
        'gender',
        'nationality',
        'mobile_number_1',
        'mobile_number_2',
        'email',
        'id_type',
      ],
      example: {
        customer_type: 'RENTAL',
        property_id: 'PR-RNT-001',
        rental_name: 'Mohamed Ali Hassan',
        rental_mothers_name: 'Fatima Ahmed',
        date_of_birth: '1985-05-15',
        place_of_birth: 'Hargeisa',
        gender: 'MALE',
        nationality: 'Somalia',
        mobile_number_1: '+252-612-345-678',
        mobile_number_2: '+252-612-345-679',
        email: 'mohamed@example.com',
        id_type: 'National ID Card',
      },
    };
  }
}
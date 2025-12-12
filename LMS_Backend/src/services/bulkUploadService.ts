/**
 * Bulk Upload Service
 * 
 * Handles bulk data import for customers, properties, and tax assessments.
 * Provides validation, data transformation, and batch creation functionality.
 * 
 * Key Features:
 * - Excel file parsing and validation
 * - Automatic reference ID generation
 * - Boundary data handling for properties
 * - UUID validation and cleaning
 * - Customer lookup by reference ID
 * - Comprehensive error reporting
 * 
 * @module BulkUploadService
 */

import { supabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export interface BulkUploadData {
  entityType: 'customer' | 'property' | 'tax';
  data: any[];
}

export class BulkUploadService {
  /**
   * Validates bulk upload data before committing to database
   * 
   * @param uploadData - The data to validate including entity type and records
   * @param userId - ID of the user performing the upload
   * @returns Validation results with valid/invalid record counts and error details
   */
  async validateUpload(uploadData: BulkUploadData, userId: string) {
    const { entityType, data } = uploadData;
    const errors: any[] = [];
    const validRecords: any[] = [];

    // Validate each record
    data.forEach((record, index) => {
      const recordErrors = this.validateRecord(entityType, record, index);
      
      if (recordErrors.length > 0) {
        errors.push({
          row: index + 1,
          errors: recordErrors,
          data: record,
        });
      } else {
        validRecords.push(record);
      }
    });

    return {
      totalRecords: data.length,
      validRecords: validRecords.length,
      invalidRecords: errors.length,
      errors,
      canCommit: validRecords.length > 0, // Allow commit if there are any valid records
      validData: validRecords, // Include valid records for commit
    };
  }

  /**
   * Commits validated bulk upload data to the database
   * Only processes valid records, skips invalid ones
   * 
   * @param uploadData - The data to commit (should include validData from validation)
   * @param userId - ID of the user performing the upload
   * @returns Results object with success/failure counts and error details
   */
  async commitUpload(uploadData: any, userId: string) {
    const { entityType, validData } = uploadData;

    if (!validData || validData.length === 0) {
      throw new AppError('No valid records to commit', 400);
    }

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as any[],
    };

    // Process each valid record
    for (let i = 0; i < validData.length; i++) {
      try {
        console.log(`Processing record ${i + 1}/${validData.length}:`, JSON.stringify(validData[i]).substring(0, 100));
        await this.createRecord(entityType, validData[i], userId);
        results.successful++;
        console.log(`✓ Record ${i + 1} created successfully`);
      } catch (error: any) {
        console.error(`✗ Record ${i + 1} failed:`, error.message);
        results.failed++;
        results.errors.push({
          row: i + 1,
          error: error.message,
          data: validData[i],
        });
      }
    }

    return results;
  }

  /**
   * Validates a single record based on entity type
   * 
   * @param entityType - Type of entity (customer, property, tax)
   * @param record - The record data to validate
   * @param index - Row index for error reporting
   * @returns Array of validation error messages
   */
  private validateRecord(entityType: string, record: any, index: number): string[] {
    const errors: string[] = [];

    switch (entityType) {
      case 'customer':
        // Detect customer type from data
        if (record.first_name || record.full_name || record.pr_id) {
          // PERSON type - validate the 10 required fields
          this.validatePersonFields(record, errors);
        } else if (record.business_name) {
          // BUSINESS type - all fields are optional, just validate format if provided
          this.validateBusinessFields(record, errors);
        } else if (record.full_department_name) {
          // GOVERNMENT type - validate the 3 required fields
          this.validateGovernmentFields(record, errors);
        } else if (record.full_name || record.full_mosque_hospital_name || record['Full Mosque or Hospital Name']) {
          // MOSQUE_HOSPITAL type - validate the 5 required fields
          this.validateMosqueHospitalFields(record, errors);
        } else if (record.full_non_profit_name || record.ngo_name || record['NGO Name']) {
          // NON_PROFIT type - validate the 5 required fields
          this.validateNonProfitFields(record, errors);
        } else if (record.pr_id && (record.size || record.floor || record.file_number || record.address) && !record.full_name && !record.ngo_name && !record.business_name) {
          // RESIDENTIAL type - validate the 1 required field
          this.validateResidentialFields(record, errors);
        } else if (record.rental_name) {
          // RENTAL type - validate the 11 required fields
          this.validateRentalFields(record, errors);
        } else {
          errors.push('Unable to determine customer type from data');
        }
        break;

      case 'property':
        // Only district_id and size are truly required for a draft
        if (!record.district_id) errors.push('district_id is required');
        if (!record.size) errors.push('size is required');
        // Validate boundary data if provided (all or nothing)
        const hasSomeBoundaries = record.north_length || record.south_length || record.east_length || record.west_length;
        const hasAllBoundaries = record.north_length && record.south_length && record.east_length && record.west_length;
        if (hasSomeBoundaries && !hasAllBoundaries) {
          errors.push('If providing boundaries, all four sides (north, south, east, west) must be provided');
        }
        break;

      case 'tax':
        if (!record.property_id) errors.push('property_id is required');
        if (!record.tax_year) errors.push('tax_year is required');
        if (!record.base_assessment) errors.push('base_assessment is required');
        if (!record.assessed_amount) errors.push('assessed_amount is required');
        if (!record.land_size) errors.push('land_size is required');
        if (!record.assessment_date) errors.push('assessment_date is required');
        if (!record.due_date) errors.push('due_date is required');
        if (!record.occupancy_type) errors.push('occupancy_type is required');
        if (!record.construction_status) errors.push('construction_status is required');
        break;
    }

    return errors;
  }

  /**
   * Validates PERSON customer fields with proper required/optional handling
   */
  private validatePersonFields(record: any, errors: string[]): void {
    // Helper functions
    const isEmpty = (value: any): boolean => {
      return value === null || value === undefined || value === '' || 
             (typeof value === 'string' && value.trim() === '');
    };

    const isValidEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    const isValidMobileNumber = (mobile: string): boolean => {
      const mobileRegex = /^\+\d{1,3}-?\d{3,4}-?\d{3,4}-?\d{3,4}$/;
      return mobileRegex.test(mobile);
    };

    const isValidDate = (dateStr: string): boolean => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
    };

    const calculateAge = (birthDate: string): number => {
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    };

    // 1. PR-ID (required)
    if (isEmpty(record.pr_id)) {
      errors.push('pr_id is required');
    } else if (typeof record.pr_id !== 'string' || record.pr_id.trim().length < 1) {
      errors.push('pr_id must be a valid string');
    } else if (record.pr_id.trim().length > 50) {
      errors.push('pr_id must be 50 characters or less');
    }

    // 2. Full Name (required)
    if (isEmpty(record.full_name)) {
      errors.push('full_name is required');
    } else if (typeof record.full_name !== 'string' || record.full_name.trim().length < 2) {
      errors.push('full_name must be at least 2 characters');
    } else if (record.full_name.trim().length > 200) {
      errors.push('full_name must be 200 characters or less');
    }

    // 3. Mother's Name (required)
    if (isEmpty(record.mothers_name)) {
      errors.push('mothers_name is required');
    } else if (typeof record.mothers_name !== 'string' || record.mothers_name.trim().length < 2) {
      errors.push('mothers_name must be at least 2 characters');
    } else if (record.mothers_name.trim().length > 100) {
      errors.push('mothers_name must be 100 characters or less');
    }

    // 4. Date of Birth (required)
    if (isEmpty(record.date_of_birth)) {
      errors.push('date_of_birth is required');
    } else if (!isValidDate(record.date_of_birth)) {
      errors.push('date_of_birth must be in YYYY-MM-DD format');
    } else if (calculateAge(record.date_of_birth) < 18) {
      errors.push('Person must be at least 18 years old');
    }

    // 5. Place of Birth (required)
    if (isEmpty(record.place_of_birth)) {
      errors.push('place_of_birth is required');
    } else if (typeof record.place_of_birth !== 'string' || record.place_of_birth.trim().length < 1) {
      errors.push('place_of_birth must be a valid string');
    } else if (record.place_of_birth.trim().length > 200) {
      errors.push('place_of_birth must be 200 characters or less');
    }

    // 6. Gender (required)
    if (isEmpty(record.gender)) {
      errors.push('gender is required');
    } else if (!['MALE', 'FEMALE', 'male', 'female'].includes(record.gender)) {
      errors.push('gender must be MALE or FEMALE');
    }

    // 7. Nationality (required)
    if (isEmpty(record.nationality)) {
      errors.push('nationality is required');
    } else if (typeof record.nationality !== 'string' || record.nationality.trim().length < 1) {
      errors.push('nationality must be a valid string');
    }

    // 8. Mobile Number 1 (required)
    if (isEmpty(record.mobile_number_1)) {
      errors.push('mobile_number_1 is required');
    } else if (!isValidMobileNumber(record.mobile_number_1)) {
      errors.push('mobile_number_1 must be in format +XXX-XXX-XXX-XXX (e.g., +252-612-345-678)');
    }

    // 9. Email (required)
    if (isEmpty(record.email)) {
      errors.push('email is required');
    } else if (!isValidEmail(record.email)) {
      errors.push('email must be a valid email address');
    } else if (record.email.length > 255) {
      errors.push('email must be 255 characters or less');
    }

    // 10. ID Type (required)
    if (isEmpty(record.id_type)) {
      errors.push('id_type is required');
    } else if (typeof record.id_type !== 'string' || record.id_type.trim().length < 1) {
      errors.push('id_type must be a valid string');
    }

    // OPTIONAL FIELDS - Only validate format if provided (not empty)
    
    // Mobile Number 2 (optional)
    if (!isEmpty(record.mobile_number_2) && !isValidMobileNumber(record.mobile_number_2)) {
      errors.push('mobile_number_2 must be in format +XXX-XXX-XXX-XXX if provided');
    }

    // Emergency Contact Number (optional)
    if (!isEmpty(record.emergency_contact_number) && !isValidMobileNumber(record.emergency_contact_number)) {
      errors.push('emergency_contact_number must be in format +XXX-XXX-XXX-XXX if provided');
    }

    // Emergency Contact Name (optional)
    if (!isEmpty(record.emergency_contact_name) && record.emergency_contact_name.trim().length > 200) {
      errors.push('emergency_contact_name must be 200 characters or less if provided');
    }

    // ID Number (optional)
    if (!isEmpty(record.id_number) && record.id_number.trim().length > 100) {
      errors.push('id_number must be 100 characters or less if provided');
    }

    // Issue Date (optional)
    if (!isEmpty(record.issue_date)) {
      if (!isValidDate(record.issue_date)) {
        errors.push('issue_date must be in YYYY-MM-DD format if provided');
      } else if (new Date(record.issue_date) > new Date()) {
        errors.push('issue_date cannot be in the future if provided');
      }
    }

    // Expiry Date (optional)
    if (!isEmpty(record.expiry_date)) {
      if (!isValidDate(record.expiry_date)) {
        errors.push('expiry_date must be in YYYY-MM-DD format if provided');
      } else if (!isEmpty(record.issue_date) && new Date(record.expiry_date) <= new Date(record.issue_date)) {
        errors.push('expiry_date must be after issue_date if both are provided');
      }
    }
  }

  /**
   * Validates RENTAL customer fields with proper required/optional handling
   */
  private validateRentalFields(record: any, errors: string[]): void {
    // Helper functions (same as person validation)
    const isEmpty = (value: any): boolean => {
      return value === null || value === undefined || value === '' || 
             (typeof value === 'string' && value.trim() === '');
    };

    const isValidEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    const isValidMobileNumber = (mobile: string): boolean => {
      const mobileRegex = /^\+\d{1,3}-?\d{3,4}-?\d{3,4}-?\d{3,4}$/;
      return mobileRegex.test(mobile);
    };

    const isValidDate = (dateStr: string): boolean => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
    };

    const calculateAge = (birthDate: string): number => {
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    };

    // 11 Required fields for RENTAL customers
    
    // 1. PR-ID (required)
    if (isEmpty(record.pr_id)) {
      errors.push('pr_id is required');
    } else if (typeof record.pr_id !== 'string' || record.pr_id.trim().length < 1) {
      errors.push('pr_id must be a valid string');
    } else if (record.pr_id.trim().length > 50) {
      errors.push('pr_id must be 50 characters or less');
    }

    // 2. Rental Name (required)
    if (isEmpty(record.rental_name)) {
      errors.push('rental_name is required');
    } else if (typeof record.rental_name !== 'string' || record.rental_name.trim().length < 2) {
      errors.push('rental_name must be at least 2 characters');
    } else if (record.rental_name.trim().length > 200) {
      errors.push('rental_name must be 200 characters or less');
    }

    // 3. Rental Mother's Name (required)
    if (isEmpty(record.rental_mothers_name)) {
      errors.push('rental_mothers_name is required');
    } else if (typeof record.rental_mothers_name !== 'string' || record.rental_mothers_name.trim().length < 2) {
      errors.push('rental_mothers_name must be at least 2 characters');
    } else if (record.rental_mothers_name.trim().length > 100) {
      errors.push('rental_mothers_name must be 100 characters or less');
    }

    // 4. Date of Birth (required)
    if (isEmpty(record.date_of_birth)) {
      errors.push('date_of_birth is required');
    } else if (!isValidDate(record.date_of_birth)) {
      errors.push('date_of_birth must be in YYYY-MM-DD format');
    } else if (calculateAge(record.date_of_birth) < 18) {
      errors.push('Person must be at least 18 years old');
    }

    // 5. Place of Birth (required)
    if (isEmpty(record.place_of_birth)) {
      errors.push('place_of_birth is required');
    } else if (typeof record.place_of_birth !== 'string' || record.place_of_birth.trim().length < 1) {
      errors.push('place_of_birth must be a valid string');
    } else if (record.place_of_birth.trim().length > 200) {
      errors.push('place_of_birth must be 200 characters or less');
    }

    // 6. Gender (required)
    if (isEmpty(record.gender)) {
      errors.push('gender is required');
    } else if (!['MALE', 'FEMALE', 'male', 'female'].includes(record.gender)) {
      errors.push('gender must be MALE or FEMALE');
    }

    // 7. Nationality (required)
    if (isEmpty(record.nationality)) {
      errors.push('nationality is required');
    } else if (typeof record.nationality !== 'string' || record.nationality.trim().length < 1) {
      errors.push('nationality must be a valid string');
    }

    // 8. Mobile Number 1 (required)
    if (isEmpty(record.mobile_number_1)) {
      errors.push('mobile_number_1 is required');
    } else if (!isValidMobileNumber(record.mobile_number_1)) {
      errors.push('mobile_number_1 must be in format +XXX-XXX-XXX-XXX (e.g., +252-612-345-678)');
    }

    // 9. Mobile Number 2 (required for RENTAL)
    if (isEmpty(record.mobile_number_2)) {
      errors.push('mobile_number_2 is required');
    } else if (!isValidMobileNumber(record.mobile_number_2)) {
      errors.push('mobile_number_2 must be in format +XXX-XXX-XXX-XXX (e.g., +252-612-345-679)');
    }

    // 10. Email (required)
    if (isEmpty(record.email)) {
      errors.push('email is required');
    } else if (!isValidEmail(record.email)) {
      errors.push('email must be a valid email address');
    } else if (record.email.length > 255) {
      errors.push('email must be 255 characters or less');
    }

    // 11. ID Type (required)
    if (isEmpty(record.id_type)) {
      errors.push('id_type is required');
    } else if (typeof record.id_type !== 'string' || record.id_type.trim().length < 1) {
      errors.push('id_type must be a valid string');
    }

    // OPTIONAL FIELDS - Only validate format if provided (not empty)
    
    // Emergency Contact Number (optional)
    if (!isEmpty(record.emergency_contact_number) && !isValidMobileNumber(record.emergency_contact_number)) {
      errors.push('emergency_contact_number must be in format +XXX-XXX-XXX-XXX if provided');
    }

    // Emergency Contact Name (optional)
    if (!isEmpty(record.emergency_contact_name) && record.emergency_contact_name.trim().length > 200) {
      errors.push('emergency_contact_name must be 200 characters or less if provided');
    }

    // ID Number (optional)
    if (!isEmpty(record.id_number) && record.id_number.trim().length > 100) {
      errors.push('id_number must be 100 characters or less if provided');
    }

    // Issue Date (optional)
    if (!isEmpty(record.issue_date)) {
      if (!isValidDate(record.issue_date)) {
        errors.push('issue_date must be in YYYY-MM-DD format if provided');
      } else if (new Date(record.issue_date) > new Date()) {
        errors.push('issue_date cannot be in the future if provided');
      }
    }

    // Expiry Date (optional)
    if (!isEmpty(record.expiry_date)) {
      if (!isValidDate(record.expiry_date)) {
        errors.push('expiry_date must be in YYYY-MM-DD format if provided');
      } else if (!isEmpty(record.issue_date) && new Date(record.expiry_date) <= new Date(record.issue_date)) {
        errors.push('expiry_date must be after issue_date if both are provided');
      }
    }
  }

  /**
   * Validates BUSINESS customer fields - all fields are optional, only validates format if provided
   */
  private validateBusinessFields(record: any, errors: string[]): void {
    // Helper functions
    const isEmpty = (value: any): boolean => {
      return value === null || value === undefined || value === '' || 
             (typeof value === 'string' && value.trim() === '');
    };

    const isValidEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    const isValidMobileNumber = (mobile: string): boolean => {
      const mobileRegex = /^\+\d{1,3}-?\d{3,4}-?\d{3,4}-?\d{3,4}$/;
      return mobileRegex.test(mobile);
    };

    // ALL FIELDS ARE OPTIONAL - Only validate format if provided
    
    // PR-ID (optional)
    if (!isEmpty(record.pr_id) && record.pr_id.trim().length > 50) {
      errors.push('pr_id must be 50 characters or less if provided');
    }

    // Business Name (optional)
    if (!isEmpty(record.business_name) && record.business_name.trim().length > 200) {
      errors.push('business_name must be 200 characters or less if provided');
    }

    // Business License Number (optional)
    if (!isEmpty(record.business_license_number) && record.business_license_number.trim().length > 100) {
      errors.push('business_license_number must be 100 characters or less if provided');
    }

    // Business Address (optional)
    if (!isEmpty(record.business_address) && record.business_address.trim().length > 500) {
      errors.push('business_address must be 500 characters or less if provided');
    }

    // Rental Name (optional)
    if (!isEmpty(record.rental_name) && record.rental_name.trim().length > 200) {
      errors.push('rental_name must be 200 characters or less if provided');
    }

    // Mobile Number 1 (optional)
    if (!isEmpty(record.mobile_number_1) && !isValidMobileNumber(record.mobile_number_1)) {
      errors.push('mobile_number_1 must be in format +XXX-XXX-XXX-XXX if provided (e.g., +252-612-345-678)');
    }

    // Mobile Number 2 (optional)
    if (!isEmpty(record.mobile_number_2) && !isValidMobileNumber(record.mobile_number_2)) {
      errors.push('mobile_number_2 must be in format +XXX-XXX-XXX-XXX if provided (e.g., +252-612-345-679)');
    }

    // Email (optional)
    if (!isEmpty(record.email)) {
      if (!isValidEmail(record.email)) {
        errors.push('email must be a valid email address if provided');
      } else if (record.email.length > 255) {
        errors.push('email must be 255 characters or less if provided');
      }
    }

    // Size (optional)
    if (!isEmpty(record.size) && record.size.trim().length > 100) {
      errors.push('size must be 100 characters or less if provided');
    }

    // Floor (optional)
    if (!isEmpty(record.floor) && record.floor.trim().length > 50) {
      errors.push('floor must be 50 characters or less if provided');
    }

    // File Number (optional)
    if (!isEmpty(record.file_number) && record.file_number.trim().length > 100) {
      errors.push('file_number must be 100 characters or less if provided');
    }

    // Business Registration Number (optional)
    if (!isEmpty(record.business_registration_number) && record.business_registration_number.trim().length > 100) {
      errors.push('business_registration_number must be 100 characters or less if provided');
    }

    // Contact Name (optional)
    if (!isEmpty(record.contact_name) && record.contact_name.trim().length > 200) {
      errors.push('contact_name must be 200 characters or less if provided');
    }

    // Carrier Network (optional)
    if (!isEmpty(record.carrier_network) && record.carrier_network.trim().length > 100) {
      errors.push('carrier_network must be 100 characters or less if provided');
    }

    // Street (optional)
    if (!isEmpty(record.street) && record.street.trim().length > 200) {
      errors.push('street must be 200 characters or less if provided');
    }

    // Section (optional)
    if (!isEmpty(record.section) && record.section.trim().length > 100) {
      errors.push('section must be 100 characters or less if provided');
    }

    // Block (optional)
    if (!isEmpty(record.block) && record.block.trim().length > 100) {
      errors.push('block must be 100 characters or less if provided');
    }
  }

  /**
   * Validates GOVERNMENT customer fields - only 3 required fields, rest optional
   */
  private validateGovernmentFields(record: any, errors: string[]): void {
    // Helper functions
    const isEmpty = (value: any): boolean => {
      return value === null || value === undefined || value === '' || 
             (typeof value === 'string' && value.trim() === '');
    };

    const isValidEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    const isValidMobileNumber = (mobile: string): boolean => {
      const mobileRegex = /^\+\d{1,3}-?\d{3,4}-?\d{3,4}-?\d{3,4}$/;
      return mobileRegex.test(mobile);
    };

    // Helper function to get value with flexible column names (supports both old and new headers)
    const getValue = (data: any, ...possibleKeys: string[]) => {
      for (const key of possibleKeys) {
        if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
          return data[key];
        }
      }
      return null;
    };

    // 3 Required fields for GOVERNMENT customers
    
    // 1. PR-ID (required) - check both new and old field names
    const prId = getValue(record, 'PR-ID', 'pr_id', 'PR-ID', 'pr-id', 'PR_ID');
    if (isEmpty(prId)) {
      errors.push('PR-ID is required for GOVERNMENT customers');
    } else if (typeof prId !== 'string' || prId.trim().length < 1) {
      errors.push('PR-ID must be a valid string');
    } else if (prId.trim().length > 50) {
      errors.push('PR-ID must be 50 characters or less');
    }

    // 2. Full Department Name (required) - check both new and old field names
    const fullDeptName = getValue(record, 'Full Government / Department Name', 'full_department_name', 'Full Department Name', 'Department Name');
    if (isEmpty(fullDeptName)) {
      errors.push('Full Government / Department Name is required for GOVERNMENT customers');
    } else if (typeof fullDeptName !== 'string' || fullDeptName.trim().length < 3) {
      errors.push('Full Government / Department Name must be at least 3 characters');
    } else if (fullDeptName.trim().length > 200) {
      errors.push('Full Government / Department Name must be 200 characters or less');
    }

    // 3. Contact Name (required) - check both new and old field names
    const contactName = getValue(record, 'Contact Name', 'contact_name', 'contact-name', 'Contact_Name');
    if (isEmpty(contactName)) {
      errors.push('Contact Name is required for GOVERNMENT customers');
    } else if (typeof contactName !== 'string' || contactName.trim().length < 1) {
      errors.push('Contact Name must be a valid string');
    } else if (contactName.trim().length > 200) {
      errors.push('Contact Name must be 200 characters or less');
    }

    // ALL OTHER FIELDS ARE OPTIONAL - Only validate format if provided
    
    // Department Address (optional)
    const deptAddress = getValue(record, 'Department Address', 'department_address', 'Address');
    if (!isEmpty(deptAddress) && deptAddress.trim().length > 500) {
      errors.push('Department Address must be 500 characters or less if provided');
    }

    // Contact Number (optional)
    const contactNumber = getValue(record, 'Contact Number', 'mobile_number_1', 'Mobile Number 1', 'Phone 1');
    if (!isEmpty(contactNumber) && !isValidMobileNumber(contactNumber)) {
      errors.push('Contact Number must be in format +XXX-XXX-XXX-XXX if provided (e.g., +252-612-345-678)');
    }

    // Contact Number 2 (optional)
    const contactNumber2 = getValue(record, 'Contact Number 2', 'mobile_number_2', 'Mobile Number 2', 'Phone 2');
    if (!isEmpty(contactNumber2) && !isValidMobileNumber(contactNumber2)) {
      errors.push('Contact Number 2 must be in format +XXX-XXX-XXX-XXX if provided (e.g., +252-612-345-679)');
    }

    // Email (optional)
    const email = getValue(record, 'Email', 'email', 'E-mail', 'e_mail');
    if (!isEmpty(email)) {
      if (!isValidEmail(email)) {
        errors.push('Email must be a valid email address if provided');
      } else if (email.length > 255) {
        errors.push('Email must be 255 characters or less if provided');
      }
    }

    // File Number (optional)
    const fileNumber = getValue(record, 'File Number', 'file_number', 'file-number', 'File_Number');
    if (!isEmpty(fileNumber) && fileNumber.trim().length > 100) {
      errors.push('File Number must be 100 characters or less if provided');
    }

    // Size (optional)
    const size = getValue(record, 'Size', 'size');
    if (!isEmpty(size) && size.trim().length > 100) {
      errors.push('Size must be 100 characters or less if provided');
    }

    // Legacy optional fields
    const carrierNetwork1 = getValue(record, 'Carrier Network 1', 'carrier_mobile_1', 'Carrier Mobile 1', 'Carrier 1');
    if (!isEmpty(carrierNetwork1) && carrierNetwork1.trim().length > 100) {
      errors.push('Carrier Network 1 must be 100 characters or less if provided');
    }

    const carrierNetwork2 = getValue(record, 'Carrier Network 2', 'carrier_mobile_2', 'Carrier Mobile 2', 'Carrier 2');
    if (!isEmpty(carrierNetwork2) && carrierNetwork2.trim().length > 100) {
      errors.push('Carrier Network 2 must be 100 characters or less if provided');
    }

    const street = getValue(record, 'Street', 'street');
    if (!isEmpty(street) && street.trim().length > 200) {
      errors.push('Street must be 200 characters or less if provided');
    }

    const section = getValue(record, 'Section', 'section');
    if (!isEmpty(section) && section.trim().length > 100) {
      errors.push('Section must be 100 characters or less if provided');
    }

    const block = getValue(record, 'Block', 'block');
    if (!isEmpty(block) && block.trim().length > 100) {
      errors.push('Block must be 100 characters or less if provided');
    }
  }

  /**
   * Validates MOSQUE_HOSPITAL customer fields - 5 required fields, rest optional
   */
  private validateMosqueHospitalFields(record: any, errors: string[]): void {
    // Helper functions
    const isEmpty = (value: any): boolean => {
      return value === null || value === undefined || value === '' || 
             (typeof value === 'string' && value.trim() === '');
    };

    const isValidEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    const isValidMobileNumber = (mobile: string): boolean => {
      const mobileRegex = /^\+\d{1,3}-?\d{3,4}-?\d{3,4}-?\d{3,4}$/;
      return mobileRegex.test(mobile);
    };

    // Helper function to get value with flexible column names (supports both old and new headers)
    const getValue = (data: any, ...possibleKeys: string[]) => {
      for (const key of possibleKeys) {
        if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
          return data[key];
        }
      }
      return null;
    };

    // 5 Required fields for MOSQUE_HOSPITAL customers
    
    // 1. PR-ID (required) - check both new and old field names
    const prId = getValue(record, 'PR-ID', 'pr_id', 'PR-ID', 'pr-id', 'PR_ID');
    if (isEmpty(prId)) {
      errors.push('PR-ID is required for MOSQUE_HOSPITAL customers');
    } else if (typeof prId !== 'string' || prId.trim().length < 1) {
      errors.push('PR-ID must be a valid string');
    } else if (prId.trim().length > 50) {
      errors.push('PR-ID must be 50 characters or less');
    }

    // 2. Full Mosque or Hospital Name (required) - check both new and old field names
    const fullName = getValue(record, 'Full Mosque or Hospital Name', 'full_mosque_hospital_name', 'full_name', 'Full Name');
    if (isEmpty(fullName)) {
      errors.push('Full Mosque or Hospital Name is required for MOSQUE_HOSPITAL customers');
    } else if (typeof fullName !== 'string' || fullName.trim().length < 3) {
      errors.push('Full Mosque or Hospital Name must be at least 3 characters');
    } else if (fullName.trim().length > 200) {
      errors.push('Full Mosque or Hospital Name must be 200 characters or less');
    }

    // 3. Mosque Registration Number (required) - check both new and old field names
    const regNumber = getValue(record, 'Mosque Registration Number', 'mosque_registration_number', 'registration_number', 'Registration Number');
    if (isEmpty(regNumber)) {
      errors.push('Mosque Registration Number is required for MOSQUE_HOSPITAL customers');
    } else if (typeof regNumber !== 'string' || regNumber.trim().length < 1) {
      errors.push('Mosque Registration Number must be a valid string');
    } else if (regNumber.trim().length > 100) {
      errors.push('Mosque Registration Number must be 100 characters or less');
    }

    // 4. Contact Name (required) - check both new and old field names
    const contactName = getValue(record, 'Contact Name', 'contact_name', 'contact-name', 'Contact_Name');
    if (isEmpty(contactName)) {
      errors.push('Contact Name is required for MOSQUE_HOSPITAL customers');
    } else if (typeof contactName !== 'string' || contactName.trim().length < 1) {
      errors.push('Contact Name must be a valid string');
    } else if (contactName.trim().length > 200) {
      errors.push('Contact Name must be 200 characters or less');
    }

    // 5. Contact Number (required) - check both new and old field names
    const contactNumber = getValue(record, 'Contact Number', 'mobile_number_1', 'Mobile Number 1', 'Phone 1');
    if (isEmpty(contactNumber)) {
      errors.push('Contact Number is required for MOSQUE_HOSPITAL customers');
    } else if (!isValidMobileNumber(contactNumber)) {
      errors.push('Contact Number must be in format +XXX-XXX-XXX-XXX (e.g., +252-612-345-678)');
    }

    // ALL OTHER FIELDS ARE OPTIONAL - Only validate format if provided
    
    // Contact Number 2 (optional)
    const contactNumber2 = getValue(record, 'Contact Number 2', 'mobile_number_2', 'Mobile Number 2', 'Phone 2');
    if (!isEmpty(contactNumber2) && !isValidMobileNumber(contactNumber2)) {
      errors.push('Contact Number 2 must be in format +XXX-XXX-XXX-XXX if provided (e.g., +252-612-345-679)');
    }

    // Email (optional)
    const email = getValue(record, 'Email', 'email', 'E-mail', 'e_mail');
    if (!isEmpty(email)) {
      if (!isValidEmail(email)) {
        errors.push('Email must be a valid email address if provided');
      } else if (email.length > 255) {
        errors.push('Email must be 255 characters or less if provided');
      }
    }

    // Address (optional)
    const address = getValue(record, 'Address', 'address');
    if (!isEmpty(address) && address.trim().length > 500) {
      errors.push('Address must be 500 characters or less if provided');
    }

    // Size (optional)
    const size = getValue(record, 'Size', 'size');
    if (!isEmpty(size) && size.trim().length > 100) {
      errors.push('Size must be 100 characters or less if provided');
    }

    // Floor (optional)
    const floor = getValue(record, 'Floor', 'floor');
    if (!isEmpty(floor) && floor.trim().length > 50) {
      errors.push('Floor must be 50 characters or less if provided');
    }

    // File Number (optional)
    const fileNumber = getValue(record, 'File Number', 'file_number', 'file-number', 'File_Number');
    if (!isEmpty(fileNumber) && fileNumber.trim().length > 100) {
      errors.push('File Number must be 100 characters or less if provided');
    }

    // Legacy optional fields
    const carrierNetwork1 = getValue(record, 'Carrier Network 1', 'carrier_mobile_1', 'Carrier Mobile 1', 'Carrier 1');
    if (!isEmpty(carrierNetwork1) && carrierNetwork1.trim().length > 100) {
      errors.push('Carrier Network 1 must be 100 characters or less if provided');
    }

    const carrierNetwork2 = getValue(record, 'Carrier Network 2', 'carrier_mobile_2', 'Carrier Mobile 2', 'Carrier 2');
    if (!isEmpty(carrierNetwork2) && carrierNetwork2.trim().length > 100) {
      errors.push('Carrier Network 2 must be 100 characters or less if provided');
    }

    const district = getValue(record, 'District', 'district_id', 'District ID', 'district-id');
    const section = getValue(record, 'Section', 'section');
    if (!isEmpty(section) && section.trim().length > 100) {
      errors.push('Section must be 100 characters or less if provided');
    }

    const block = getValue(record, 'Block', 'block');
    if (!isEmpty(block) && block.trim().length > 100) {
      errors.push('Block must be 100 characters or less if provided');
    }
  }

  /**
   * Validates NON_PROFIT customer fields - 5 required fields, rest optional
   */
  private validateNonProfitFields(record: any, errors: string[]): void {
    // Helper functions
    const isEmpty = (value: any): boolean => {
      return value === null || value === undefined || value === '' || 
             (typeof value === 'string' && value.trim() === '');
    };

    const isValidEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    const isValidMobileNumber = (mobile: string): boolean => {
      const mobileRegex = /^\+\d{1,3}-?\d{3,4}-?\d{3,4}-?\d{3,4}$/;
      return mobileRegex.test(mobile);
    };

    // Helper function to get value with flexible column names (supports both old and new headers)
    const getValue = (data: any, ...possibleKeys: string[]) => {
      for (const key of possibleKeys) {
        if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
          return data[key];
        }
      }
      return null;
    };

    // 5 Required fields for NON_PROFIT customers
    
    // 1. PR-ID (required) - check both new and old field names
    const prId = getValue(record, 'PR-ID', 'pr_id', 'PR-ID', 'pr-id', 'PR_ID');
    if (isEmpty(prId)) {
      errors.push('PR-ID is required for NON_PROFIT customers');
    } else if (typeof prId !== 'string' || prId.trim().length < 1) {
      errors.push('PR-ID must be a valid string');
    } else if (prId.trim().length > 50) {
      errors.push('PR-ID must be 50 characters or less');
    }

    // 2. NGO Name (required) - check both new and old field names
    const ngoName = getValue(record, 'NGO Name', 'ngo_name', 'full_non_profit_name', 'Full Non-Profit Name');
    if (isEmpty(ngoName)) {
      errors.push('NGO Name is required for NON_PROFIT customers');
    } else if (typeof ngoName !== 'string' || ngoName.trim().length < 3) {
      errors.push('NGO Name must be at least 3 characters');
    } else if (ngoName.trim().length > 200) {
      errors.push('NGO Name must be 200 characters or less');
    }

    // 3. NGO Registration Number (required) - check both new and old field names
    const regNumber = getValue(record, 'NGO Registration Number', 'ngo_registration_number', 'registration_number', 'Registration Number');
    if (isEmpty(regNumber)) {
      errors.push('NGO Registration Number is required for NON_PROFIT customers');
    } else if (typeof regNumber !== 'string' || regNumber.trim().length < 1) {
      errors.push('NGO Registration Number must be a valid string');
    } else if (regNumber.trim().length > 100) {
      errors.push('NGO Registration Number must be 100 characters or less');
    }

    // 4. Contact Name (required) - check both new and old field names
    const contactName = getValue(record, 'Contact Name', 'contact_name', 'contact-name', 'Contact_Name');
    if (isEmpty(contactName)) {
      errors.push('Contact Name is required for NON_PROFIT customers');
    } else if (typeof contactName !== 'string' || contactName.trim().length < 1) {
      errors.push('Contact Name must be a valid string');
    } else if (contactName.trim().length > 200) {
      errors.push('Contact Name must be 200 characters or less');
    }

    // 5. Contact Number (required) - check both new and old field names
    const contactNumber = getValue(record, 'Contact Number', 'mobile_number_1', 'Mobile Number 1', 'Phone 1');
    if (isEmpty(contactNumber)) {
      errors.push('Contact Number is required for NON_PROFIT customers');
    } else if (!isValidMobileNumber(contactNumber)) {
      errors.push('Contact Number must be in format +XXX-XXX-XXX-XXX (e.g., +252-612-345-678)');
    }

    // ALL OTHER FIELDS ARE OPTIONAL - Only validate format if provided
    
    // Contact Number 2 (optional)
    const contactNumber2 = getValue(record, 'Contact Number 2', 'mobile_number_2', 'Mobile Number 2', 'Phone 2');
    if (!isEmpty(contactNumber2) && !isValidMobileNumber(contactNumber2)) {
      errors.push('Contact Number 2 must be in format +XXX-XXX-XXX-XXX if provided (e.g., +252-612-345-679)');
    }

    // Email (optional)
    const email = getValue(record, 'Email', 'email', 'E-mail', 'e_mail');
    if (!isEmpty(email)) {
      if (!isValidEmail(email)) {
        errors.push('Email must be a valid email address if provided');
      } else if (email.length > 255) {
        errors.push('Email must be 255 characters or less if provided');
      }
    }

    // Size (optional)
    const size = getValue(record, 'Size', 'size');
    if (!isEmpty(size) && size.trim().length > 100) {
      errors.push('Size must be 100 characters or less if provided');
    }

    // Floor (optional)
    const floor = getValue(record, 'Floor', 'floor');
    if (!isEmpty(floor) && floor.trim().length > 50) {
      errors.push('Floor must be 50 characters or less if provided');
    }

    // Address (optional)
    const address = getValue(record, 'Address', 'address');
    if (!isEmpty(address) && address.trim().length > 500) {
      errors.push('Address must be 500 characters or less if provided');
    }

    // File Number (optional)
    const fileNumber = getValue(record, 'File Number', 'file_number', 'file-number', 'File_Number');
    if (!isEmpty(fileNumber) && fileNumber.trim().length > 100) {
      errors.push('File Number must be 100 characters or less if provided');
    }
  }

  /**
   * Validates RESIDENTIAL customer fields - 1 required field, rest optional
   */
  private validateResidentialFields(record: any, errors: string[]): void {
    // Helper functions
    const isEmpty = (value: any): boolean => {
      return value === null || value === undefined || value === '' || 
             (typeof value === 'string' && value.trim() === '');
    };

    // Helper function to get value with flexible column names (supports both old and new headers)
    const getValue = (data: any, ...possibleKeys: string[]) => {
      for (const key of possibleKeys) {
        if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
          return data[key];
        }
      }
      return null;
    };

    // 1 Required field for RESIDENTIAL customers
    
    // PR-ID (required) - check both new and old field names
    const prId = getValue(record, 'PR-ID', 'pr_id', 'PR-ID', 'pr-id', 'PR_ID');
    if (isEmpty(prId)) {
      errors.push('PR-ID is required for RESIDENTIAL customers');
    } else if (typeof prId !== 'string' || prId.trim().length < 1) {
      errors.push('PR-ID must be a valid string');
    } else if (prId.trim().length > 50) {
      errors.push('PR-ID must be 50 characters or less');
    }

    // ALL OTHER FIELDS ARE OPTIONAL - Only validate format if provided
    
    // Size (optional)
    const size = getValue(record, 'Size', 'size');
    if (!isEmpty(size) && size.trim().length > 100) {
      errors.push('Size must be 100 characters or less if provided');
    }

    // Floor (optional)
    const floor = getValue(record, 'Floor', 'floor');
    if (!isEmpty(floor) && floor.trim().length > 50) {
      errors.push('Floor must be 50 characters or less if provided');
    }

    // File Number (optional)
    const fileNumber = getValue(record, 'File Number', 'file_number', 'file-number', 'File_Number');
    if (!isEmpty(fileNumber) && fileNumber.trim().length > 100) {
      errors.push('File Number must be 100 characters or less if provided');
    }

    // Address (optional)
    const address = getValue(record, 'Address', 'address');
    if (!isEmpty(address) && address.trim().length > 500) {
      errors.push('Address must be 500 characters or less if provided');
    }
  }

  private async createRecord(entityType: string, record: any, userId: string) {
    switch (entityType) {
      case 'customer':
        return await this.createCustomer(record, userId);
      case 'property':
        return await this.createProperty(record, userId);
      case 'tax':
        return await this.createTaxAssessment(record, userId);
      default:
        throw new AppError('Invalid entity type', 400);
    }
  }

  private async createCustomer(data: any, userId: string) {
    // Helper function to check if a value is a valid UUID
    const isValidUUID = (value: any): boolean => {
      if (!value || typeof value !== 'string') return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(value);
    };

    // Helper function to check if any of the possible field names exist
    const hasAnyField = (data: any, ...fieldNames: string[]): boolean => {
      return fieldNames.some(field => data[field] !== undefined && data[field] !== null && data[field] !== '');
    };

    // Determine customer type from data
    let customerType = 'PERSON'; // Default
    if (data.business_name) customerType = 'BUSINESS';
    else if (hasAnyField(data, 'Full Government / Department Name', 'full_department_name', 'Full Department Name', 'Department Name')) customerType = 'GOVERNMENT';
    else if (hasAnyField(data, 'Full Mosque or Hospital Name', 'full_mosque_hospital_name', 'mosque_registration_number', 'Mosque Registration Number') || 
             (data.full_name && !data.first_name && !data.pr_id)) customerType = 'MOSQUE_HOSPITAL';
    else if (hasAnyField(data, 'NGO Name', 'ngo_name', 'full_non_profit_name', 'ngo_registration_number', 'NGO Registration Number')) customerType = 'NON_PROFIT';
    else if (hasAnyField(data, 'PR-ID', 'pr_id') && (hasAnyField(data, 'Size', 'size', 'Floor', 'floor', 'File Number', 'file_number', 'Address', 'address')) && 
             !hasAnyField(data, 'full_name', 'ngo_name', 'business_name', 'rental_name', 'full_department_name')) customerType = 'RESIDENTIAL';
    else if (data.rental_name) customerType = 'RENTAL';

    // Generate unique reference ID using timestamp + random to avoid collisions
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const uniqueSuffix = `${timestamp}${random}`.slice(-8);
    const referenceId = `CUS-2025-${uniqueSuffix}`;
    
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        reference_id: referenceId,
        customer_type: customerType,
        status: 'DRAFT',
        created_by: userId,
      })
      .select()
      .single();

    if (customerError) throw new Error(customerError.message);

    try {
      // Create type-specific details
      const tableName = `customer_${customerType.toLowerCase()}`;
      let typeData = { ...data };
      
      // Add customer_id
      typeData.customer_id = customer.id;

      // Handle district_id - convert code to UUID if needed
      if (typeData.district_id) {
        if (!isValidUUID(typeData.district_id)) {
          // Try to look up district by code
          const { data: district } = await supabase
            .from('districts')
            .select('id, code, name')
            .eq('code', typeData.district_id)
            .single();
          
          if (district) {
            typeData.district_id = district.id;
          } else {
            // District not found - throw error with helpful message
            const { data: allDistricts } = await supabase
              .from('districts')
              .select('code, name')
              .limit(10);
            
            const availableCodes = allDistricts?.map(d => d.code).join(', ') || 'none';
            throw new Error(`District code "${typeData.district_id}" not found. Available codes: ${availableCodes}. Please use a valid district code or UUID.`);
          }
        }
      } else if (['BUSINESS', 'GOVERNMENT', 'MOSQUE_HOSPITAL', 'NON_PROFIT'].includes(customerType)) {
        // District is required for these customer types
        throw new Error(`district_id is required for ${customerType} customers. Please provide a valid district code or UUID.`);
      }

      // Map Excel column names to database field names for PERSON type
      if (customerType === 'PERSON') {
        // Helper function to get value with flexible column names
        const getValue = (data: any, ...possibleKeys: string[]) => {
          for (const key of possibleKeys) {
            if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
              return data[key];
            }
          }
          // Try case-insensitive and trimmed matches
          const dataKeys = Object.keys(data);
          for (const possibleKey of possibleKeys) {
            for (const dataKey of dataKeys) {
              if (dataKey.trim().toLowerCase() === possibleKey.toLowerCase()) {
                if (data[dataKey] !== undefined && data[dataKey] !== null && data[dataKey] !== '') {
                  return data[dataKey];
                }
              }
            }
          }
          return null;
        };

        // Helper function to convert Excel date to YYYY-MM-DD format
        const convertExcelDate = (value: any): string | null => {
          if (!value || value === 'Not found' || value === 'Not Found' || value === '') {
            return null;
          }

          // If it's already in YYYY-MM-DD format, return as is
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return value;
          }

          // If it's just a year (like "1942"), convert to Jan 1st of that year
          if (typeof value === 'string' && /^\d{4}$/.test(value)) {
            return `${value}-01-01`;
          }

          // If it's an Excel serial number (number > 1000), convert it
          const numValue = Number(value);
          if (!isNaN(numValue) && numValue > 1000) {
            // Excel serial date conversion (Excel epoch is 1900-01-01, but Excel incorrectly treats 1900 as leap year)
            const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
            const convertedDate = new Date(excelEpoch.getTime() + numValue * 24 * 60 * 60 * 1000);
            
            const year = convertedDate.getFullYear();
            const month = String(convertedDate.getMonth() + 1).padStart(2, '0');
            const day = String(convertedDate.getDate()).padStart(2, '0');
            
            return `${year}-${month}-${day}`;
          }

          // If it's a string that might be a date, try to parse it
          if (typeof value === 'string') {
            const parsed = new Date(value);
            if (!isNaN(parsed.getTime())) {
              const year = parsed.getFullYear();
              const month = String(parsed.getMonth() + 1).padStart(2, '0');
              const day = String(parsed.getDate()).padStart(2, '0');
              return `${year}-${month}-${day}`;
            }
          }

          // Default fallback
          return '1990-01-01';
        };

        // Helper function to clean and normalize gender values
        const normalizeGender = (value: any): string => {
          if (!value) return 'MALE';
          
          const cleaned = value.toString().trim().toUpperCase();
          
          // Handle common variations
          if (cleaned === 'MALE' || cleaned === 'M' || cleaned === 'MAN') return 'MALE';
          if (cleaned === 'FEMALE' || cleaned === 'FEMAL' || cleaned === 'F' || cleaned === 'WOMAN') return 'FEMALE';
          if (cleaned === 'NOT FOUND' || cleaned === 'NOT_FOUND' || cleaned === 'UNKNOWN') return 'MALE';
          
          // Default to MALE if unclear
          return 'MALE';
        };

        // Get the full name to split into first_name for backward compatibility
        const fullName = getValue(data, 'full_name', 'Full Name', 'Full Name ', ' Full Name', 'full-name', 'Full_Name', 'fullname', 'name', 'Name') || 'Unknown';
        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0] || 'Unknown';

        // Map Excel columns to database fields
        const mappedData = {
          customer_id: customer.id,
          pr_id: getValue(data, 'pr_id', 'PR-ID', 'pr-id', 'PR_ID'),
          full_name: fullName,
          mothers_name: getValue(data, 'mothers_name', 'Mothers Name', 'Mothers Name ', ' Mothers Name', 'mothers-name', 'Mothers_Name', 'Mother Name', 'mother_name'),
          date_of_birth: convertExcelDate(getValue(data, 'date_of_birth', 'Date of Birth', 'Date of brith', 'Date of brith ', ' Date of Birth', 'date-of-birth', 'Date_of_Birth', 'DOB', 'dob')),
          place_of_birth: getValue(data, 'place_of_birth', 'Place of Birth', 'POB', 'place-of-birth', 'Place_of_Birth', 'pob'),
          gender: normalizeGender(getValue(data, 'gender', 'Gender')),
          nationality: getValue(data, 'nationality', 'Nationality'),
          mobile_number_1: getValue(data, 'mobile_number_1', 'Mobile Number 1', 'mobile-number-1', 'Mobile_Number_1', 'phone1', 'Phone 1'),
          email: getValue(data, 'email', 'Email', 'E-mail', 'e_mail'),
          id_type: getValue(data, 'id_type', 'ID Type', 'Type of ID', 'id-type', 'ID_Type'),
          
          // Optional fields
          id_number: getValue(data, 'id_number', 'ID Number', 'id-number', 'ID_Number'),
          place_of_issue: getValue(data, 'place_of_issue', 'Place of Issue', 'place-of-issue', 'Place_of_Issue'),
          issue_date: convertExcelDate(getValue(data, 'issue_date', 'Issue Date', 'issue-date', 'Issue_Date')),
          expiry_date: convertExcelDate(getValue(data, 'expiry_date', 'Expiry Date', 'expiry-date', 'Expiry_Date')),
          

        };

        // Use mapped data instead of original data
        typeData = mappedData;
      }

      // Map Excel column names to database field names for BUSINESS type
      if (customerType === 'BUSINESS') {
        // Helper function to get value with flexible column names
        const getValue = (data: any, ...possibleKeys: string[]) => {
          for (const key of possibleKeys) {
            if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
              return data[key];
            }
          }
          // Try case-insensitive and trimmed matches
          const dataKeys = Object.keys(data);
          for (const possibleKey of possibleKeys) {
            for (const dataKey of dataKeys) {
              if (dataKey.trim().toLowerCase() === possibleKey.toLowerCase()) {
                if (data[dataKey] !== undefined && data[dataKey] !== null && data[dataKey] !== '') {
                  return data[dataKey];
                }
              }
            }
          }
          return null;
        };

        // Map Excel columns to database fields for BUSINESS
        const mappedData = {
          customer_id: customer.id,
          pr_id: getValue(data, 'pr_id', 'PR-ID', 'pr-id', 'PR_ID'),
          business_name: getValue(data, 'business_name', 'Business Name', 'Full Business Name', 'business-name', 'Business_Name'),
          business_license_number: getValue(data, 'business_license_number', 'Business License Number', 'License Number', 'Commercial License Number', 'business-license-number', 'Business_License_Number'),
          business_address: getValue(data, 'business_address', 'Business Address', 'Address', 'business-address', 'Business_Address'),
          rental_name: getValue(data, 'rental_name', 'Rental Name', 'rental-name', 'Rental_Name'),
          mobile_number_1: getValue(data, 'mobile_number_1', 'Mobile Number 1', 'Contact Number', 'Phone 1', 'mobile-number-1', 'Mobile_Number_1'),
          mobile_number_2: getValue(data, 'mobile_number_2', 'Mobile Number 2', 'Contact Number 2', 'Phone 2', 'mobile-number-2', 'Mobile_Number_2'),
          email: getValue(data, 'email', 'Email', 'E-mail', 'e_mail'),
          size: getValue(data, 'size', 'Size'),
          floor: getValue(data, 'floor', 'Floor'),
          file_number: getValue(data, 'file_number', 'File Number', 'file-number', 'File_Number'),
          
          // Optional fields
          business_registration_number: getValue(data, 'business_registration_number', 'Registration Number', 'Reg Number', 'business-registration-number', 'Business_Registration_Number'),
          contact_name: getValue(data, 'contact_name', 'Contact Name', 'contact-name', 'Contact_Name'),
          carrier_network: getValue(data, 'carrier_network', 'Carrier Network', 'Carrier', 'carrier-network', 'Carrier_Network'),
          street: getValue(data, 'street', 'Street'),
          district_id: getValue(data, 'district_id', 'District ID', 'District', 'district-id', 'District_ID'),
          section: getValue(data, 'section', 'Section'),
          block: getValue(data, 'block', 'Block'),
        };

        // Use mapped data instead of original data
        typeData = mappedData;
      }

      // Map Excel column names to database field names for GOVERNMENT type
      if (customerType === 'GOVERNMENT') {
        // Helper function to get value with flexible column names
        const getValue = (data: any, ...possibleKeys: string[]) => {
          for (const key of possibleKeys) {
            if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
              return data[key];
            }
          }
          // Try case-insensitive and trimmed matches
          const dataKeys = Object.keys(data);
          for (const possibleKey of possibleKeys) {
            for (const dataKey of dataKeys) {
              if (dataKey.trim().toLowerCase() === possibleKey.toLowerCase()) {
                if (data[dataKey] !== undefined && data[dataKey] !== null && data[dataKey] !== '') {
                  return data[dataKey];
                }
              }
            }
          }
          return null;
        };

        // Map Excel columns to database fields for GOVERNMENT
        const mappedData = {
          customer_id: customer.id,
          pr_id: getValue(data, 'PR-ID', 'pr_id', 'PR-ID', 'pr-id', 'PR_ID'),
          full_department_name: getValue(data, 'Full Government / Department Name', 'full_department_name', 'Full Department Name', 'Department Name', 'full-department-name', 'Full_Department_Name'),
          contact_name: getValue(data, 'Contact Name', 'contact_name', 'contact-name', 'Contact_Name'),
          department_address: getValue(data, 'Department Address', 'department_address', 'Address', 'department-address', 'Department_Address'),
          mobile_number_1: getValue(data, 'Contact Number', 'mobile_number_1', 'Mobile Number 1', 'Phone 1', 'mobile-number-1', 'Mobile_Number_1'),
          mobile_number_2: getValue(data, 'Contact Number 2', 'mobile_number_2', 'Mobile Number 2', 'Phone 2', 'mobile-number-2', 'Mobile_Number_2'),
          email: getValue(data, 'Email', 'email', 'E-mail', 'e_mail'),
          file_number: getValue(data, 'File Number', 'file_number', 'file-number', 'File_Number'),
          size: getValue(data, 'Size', 'size'),
          
          // Legacy optional fields
          carrier_mobile_1: getValue(data, 'Carrier Network 1', 'carrier_mobile_1', 'Carrier Mobile 1', 'Carrier 1', 'carrier-mobile-1', 'Carrier_Mobile_1'),
          carrier_mobile_2: getValue(data, 'Carrier Network 2', 'carrier_mobile_2', 'Carrier Mobile 2', 'Carrier 2', 'carrier-mobile-2', 'Carrier_Mobile_2'),
          street: getValue(data, 'Street', 'street'),
          district_id: getValue(data, 'District', 'district_id', 'District ID', 'district-id', 'District_ID'),
          section: getValue(data, 'Section', 'section'),
          block: getValue(data, 'Block', 'block'),
        };

        // Use mapped data instead of original data
        typeData = mappedData;
      }

      // Map Excel column names to database field names for MOSQUE_HOSPITAL type
      if (customerType === 'MOSQUE_HOSPITAL') {
        // Helper function to get value with flexible column names
        const getValue = (data: any, ...possibleKeys: string[]) => {
          for (const key of possibleKeys) {
            if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
              return data[key];
            }
          }
          // Try case-insensitive and trimmed matches
          const dataKeys = Object.keys(data);
          for (const possibleKey of possibleKeys) {
            for (const dataKey of dataKeys) {
              if (dataKey.trim().toLowerCase() === possibleKey.toLowerCase()) {
                if (data[dataKey] !== undefined && data[dataKey] !== null && data[dataKey] !== '') {
                  return data[dataKey];
                }
              }
            }
          }
          return null;
        };

        // Map Excel columns to database fields for MOSQUE_HOSPITAL
        const mappedData = {
          customer_id: customer.id,
          pr_id: getValue(data, 'PR-ID', 'pr_id', 'PR-ID', 'pr-id', 'PR_ID'),
          full_mosque_hospital_name: getValue(data, 'Full Mosque or Hospital Name', 'full_mosque_hospital_name', 'full_name', 'Full Name'),
          mosque_registration_number: getValue(data, 'Mosque Registration Number', 'mosque_registration_number', 'registration_number', 'Registration Number'),
          contact_name: getValue(data, 'Contact Name', 'contact_name', 'contact-name', 'Contact_Name'),
          mobile_number_1: getValue(data, 'Contact Number', 'mobile_number_1', 'Mobile Number 1', 'Phone 1', 'mobile-number-1', 'Mobile_Number_1'),
          mobile_number_2: getValue(data, 'Contact Number 2', 'mobile_number_2', 'Mobile Number 2', 'Phone 2', 'mobile-number-2', 'Mobile_Number_2'),
          email: getValue(data, 'Email', 'email', 'E-mail', 'e_mail'),
          address: getValue(data, 'Address', 'address'),
          size: getValue(data, 'Size', 'size'),
          floor: getValue(data, 'Floor', 'floor'),
          file_number: getValue(data, 'File Number', 'file_number', 'file-number', 'File_Number'),
          
          // Legacy optional fields (for backward compatibility)
          full_name: getValue(data, 'Full Mosque or Hospital Name', 'full_mosque_hospital_name', 'full_name', 'Full Name'),
          registration_number: getValue(data, 'Mosque Registration Number', 'mosque_registration_number', 'registration_number', 'Registration Number'),
          carrier_mobile_1: getValue(data, 'Carrier Network 1', 'carrier_mobile_1', 'Carrier Mobile 1', 'Carrier 1', 'carrier-mobile-1', 'Carrier_Mobile_1'),
          carrier_mobile_2: getValue(data, 'Carrier Network 2', 'carrier_mobile_2', 'Carrier Mobile 2', 'Carrier 2', 'carrier-mobile-2', 'Carrier_Mobile_2'),
          district_id: getValue(data, 'District', 'district_id', 'District ID', 'district-id', 'District_ID'),
          section: getValue(data, 'Section', 'section'),
          block: getValue(data, 'Block', 'block'),
        };

        // Use mapped data instead of original data
        typeData = mappedData;
      }

      // Map Excel column names to database field names for NON_PROFIT type
      if (customerType === 'NON_PROFIT') {
        // Helper function to get value with flexible column names
        const getValue = (data: any, ...possibleKeys: string[]) => {
          for (const key of possibleKeys) {
            if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
              return data[key];
            }
          }
          // Try case-insensitive and trimmed matches
          const dataKeys = Object.keys(data);
          for (const possibleKey of possibleKeys) {
            for (const dataKey of dataKeys) {
              if (dataKey.trim().toLowerCase() === possibleKey.toLowerCase()) {
                if (data[dataKey] !== undefined && data[dataKey] !== null && data[dataKey] !== '') {
                  return data[dataKey];
                }
              }
            }
          }
          return null;
        };

        // Map Excel columns to database fields for NON_PROFIT
        const mappedData = {
          customer_id: customer.id,
          pr_id: getValue(data, 'PR-ID', 'pr_id', 'PR-ID', 'pr-id', 'PR_ID'),
          ngo_name: getValue(data, 'NGO Name', 'ngo_name', 'full_non_profit_name', 'Full Non-Profit Name'),
          ngo_registration_number: getValue(data, 'NGO Registration Number', 'ngo_registration_number', 'registration_number', 'Registration Number'),
          contact_name: getValue(data, 'Contact Name', 'contact_name', 'contact-name', 'Contact_Name'),
          mobile_number_1: getValue(data, 'Contact Number', 'mobile_number_1', 'Mobile Number 1', 'Phone 1', 'mobile-number-1', 'Mobile_Number_1'),
          mobile_number_2: getValue(data, 'Contact Number 2', 'mobile_number_2', 'Mobile Number 2', 'Phone 2', 'mobile-number-2', 'Mobile_Number_2'),
          email: getValue(data, 'Email', 'email', 'E-mail', 'e_mail'),
          size: getValue(data, 'Size', 'size'),
          floor: getValue(data, 'Floor', 'floor'),
          address: getValue(data, 'Address', 'address'),
          file_number: getValue(data, 'File Number', 'file_number', 'file-number', 'File_Number'),
          
          // Legacy optional fields (for backward compatibility)
          full_non_profit_name: getValue(data, 'NGO Name', 'ngo_name', 'full_non_profit_name', 'Full Non-Profit Name'),
          registration_number: getValue(data, 'NGO Registration Number', 'ngo_registration_number', 'registration_number', 'Registration Number'),
          license_number: getValue(data, 'license_number', 'License Number', 'license-number', 'License_Number'),
          carrier_mobile_1: getValue(data, 'Carrier Network 1', 'carrier_mobile_1', 'Carrier Mobile 1', 'Carrier 1', 'carrier-mobile-1', 'Carrier_Mobile_1'),
          carrier_mobile_2: getValue(data, 'Carrier Network 2', 'carrier_mobile_2', 'Carrier Mobile 2', 'Carrier 2', 'carrier-mobile-2', 'Carrier_Mobile_2'),
          district_id: getValue(data, 'District', 'district_id', 'District ID', 'district-id', 'District_ID'),
          section: getValue(data, 'Section', 'section'),
          block: getValue(data, 'Block', 'block'),
        };

        // Use mapped data instead of original data
        typeData = mappedData;
      }

      // Map Excel column names to database field names for RESIDENTIAL type
      if (customerType === 'RESIDENTIAL') {
        // Helper function to get value with flexible column names
        const getValue = (data: any, ...possibleKeys: string[]) => {
          for (const key of possibleKeys) {
            if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
              return data[key];
            }
          }
          // Try case-insensitive and trimmed matches
          const dataKeys = Object.keys(data);
          for (const possibleKey of possibleKeys) {
            for (const dataKey of dataKeys) {
              if (dataKey.trim().toLowerCase() === possibleKey.toLowerCase()) {
                if (data[dataKey] !== undefined && data[dataKey] !== null && data[dataKey] !== '') {
                  return data[dataKey];
                }
              }
            }
          }
          return null;
        };

        // Map Excel columns to database fields for RESIDENTIAL
        const mappedData = {
          customer_id: customer.id,
          pr_id: getValue(data, 'PR-ID', 'pr_id', 'PR-ID', 'pr-id', 'PR_ID'),
          size: getValue(data, 'Size', 'size'),
          floor: getValue(data, 'Floor', 'floor'),
          file_number: getValue(data, 'File Number', 'file_number', 'file-number', 'File_Number'),
          address: getValue(data, 'Address', 'address'),
        };

        // Use mapped data instead of original data
        typeData = mappedData;
      }

      // Handle PERSON type data transformation and validation
      if (customerType === 'PERSON') {
        // If new fields are missing but old fields exist, construct them
        if (!typeData.full_name && (typeData.first_name || typeData.father_name || typeData.grandfather_name)) {
          typeData.full_name = [
            typeData.first_name,
            typeData.father_name,
            typeData.grandfather_name,
            typeData.fourth_name
          ].filter(Boolean).join(' ').trim() || 'Unknown';
        }
        
        if (!typeData.mothers_name && typeData.fourth_name) {
          typeData.mothers_name = typeData.fourth_name;
        }
        
        if (!typeData.pr_id && typeData.id_number && typeData.id_number !== 'N/A') {
          typeData.pr_id = typeData.id_number;
        }
        
        // Ensure all 10 required fields have values
        typeData.pr_id = typeData.pr_id || `PR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        typeData.full_name = typeData.full_name || 'Unknown';
        typeData.mothers_name = typeData.mothers_name || 'Unknown Mother';
        typeData.date_of_birth = typeData.date_of_birth || '1990-01-01';
        typeData.place_of_birth = typeData.place_of_birth || 'Unknown';
        typeData.gender = (typeData.gender || 'MALE').toUpperCase();
        typeData.nationality = typeData.nationality || 'Unknown';
        typeData.mobile_number_1 = typeData.mobile_number_1 || '+252612345678';
        typeData.email = typeData.email || `${typeData.full_name.toLowerCase().replace(/\s+/g, '.')}@example.com`;
        typeData.id_type = typeData.id_type || 'National ID Card';
        
        // Optional fields (can be null)
        typeData.id_number = typeData.id_number || null;
        typeData.place_of_issue = typeData.place_of_issue || null;
        typeData.issue_date = typeData.issue_date || null;
        typeData.expiry_date = typeData.expiry_date || null;
        typeData.carrier_mobile_1 = typeData.carrier_mobile_1 || null;
        typeData.mobile_number_2 = typeData.mobile_number_2 || null;
        typeData.carrier_mobile_2 = typeData.carrier_mobile_2 || null;
        typeData.emergency_contact_name = typeData.emergency_contact_name || null;
        typeData.emergency_contact_number = typeData.emergency_contact_number || null;
      }

      // Handle BUSINESS type data transformation and validation
      if (customerType === 'BUSINESS') {
        // All fields are optional for business customers, just set defaults for empty values
        typeData.pr_id = typeData.pr_id || null;
        typeData.business_name = typeData.business_name || null;
        typeData.business_license_number = typeData.business_license_number || null;
        typeData.business_address = typeData.business_address || null;
        typeData.rental_name = typeData.rental_name || null;
        typeData.mobile_number_1 = typeData.mobile_number_1 || null;
        typeData.mobile_number_2 = typeData.mobile_number_2 || null;
        typeData.email = typeData.email || null;
        typeData.size = typeData.size || null;
        typeData.floor = typeData.floor || null;
        typeData.file_number = typeData.file_number || null;
        
        // Optional fields
        typeData.business_registration_number = typeData.business_registration_number || null;
        typeData.contact_name = typeData.contact_name || null;
        typeData.carrier_network = typeData.carrier_network || null;
        typeData.street = typeData.street || null;
        typeData.district_id = typeData.district_id || null;
        typeData.section = typeData.section || null;
        typeData.block = typeData.block || null;
      }

      // Handle GOVERNMENT type data transformation and validation
      if (customerType === 'GOVERNMENT') {
        // Ensure the 3 required fields have values, set defaults if empty
        typeData.pr_id = typeData.pr_id || `PR-GOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        typeData.full_department_name = typeData.full_department_name || 'Government Department';
        typeData.contact_name = typeData.contact_name || 'Contact Person';
        
        // All other fields are optional (can be null)
        typeData.department_address = typeData.department_address || null;
        typeData.mobile_number_1 = typeData.mobile_number_1 || null;
        typeData.mobile_number_2 = typeData.mobile_number_2 || null;
        typeData.email = typeData.email || null;
        typeData.file_number = typeData.file_number || null;
        typeData.size = typeData.size || null;
        
        // Legacy optional fields
        typeData.carrier_mobile_1 = typeData.carrier_mobile_1 || null;
        typeData.carrier_mobile_2 = typeData.carrier_mobile_2 || null;
        typeData.street = typeData.street || null;
        typeData.district_id = typeData.district_id || null;
        typeData.section = typeData.section || null;
        typeData.block = typeData.block || null;
      }

      // Handle MOSQUE_HOSPITAL type data transformation and validation
      if (customerType === 'MOSQUE_HOSPITAL') {
        // Ensure the 5 required fields have values, set defaults if empty
        typeData.pr_id = typeData.pr_id || `PR-MOS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        typeData.full_mosque_hospital_name = typeData.full_mosque_hospital_name || 'Mosque/Hospital';
        typeData.mosque_registration_number = typeData.mosque_registration_number || `MOS-REG-${Date.now()}`;
        typeData.contact_name = typeData.contact_name || 'Contact Person';
        typeData.mobile_number_1 = typeData.mobile_number_1 || '+252612345678';
        
        // All other fields are optional (can be null)
        typeData.mobile_number_2 = typeData.mobile_number_2 || null;
        typeData.email = typeData.email || null;
        typeData.address = typeData.address || null;
        typeData.size = typeData.size || null;
        typeData.floor = typeData.floor || null;
        typeData.file_number = typeData.file_number || null;
        
        // Legacy optional fields (for backward compatibility)
        typeData.full_name = typeData.full_mosque_hospital_name;
        typeData.registration_number = typeData.mosque_registration_number;
        typeData.carrier_mobile_1 = typeData.carrier_mobile_1 || null;
        typeData.carrier_mobile_2 = typeData.carrier_mobile_2 || null;
        typeData.district_id = typeData.district_id || null;
        typeData.section = typeData.section || null;
        typeData.block = typeData.block || null;
      }

      // Handle NON_PROFIT type data transformation and validation
      if (customerType === 'NON_PROFIT') {
        // Ensure the 5 required fields have values, set defaults if empty
        typeData.pr_id = typeData.pr_id || `PR-NGO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        typeData.ngo_name = typeData.ngo_name || 'NGO Organization';
        typeData.ngo_registration_number = typeData.ngo_registration_number || `NGO-REG-${Date.now()}`;
        typeData.contact_name = typeData.contact_name || 'Contact Person';
        typeData.mobile_number_1 = typeData.mobile_number_1 || '+252612345678';
        
        // All other fields are optional (can be null)
        typeData.mobile_number_2 = typeData.mobile_number_2 || null;
        typeData.email = typeData.email || null;
        typeData.size = typeData.size || null;
        typeData.floor = typeData.floor || null;
        typeData.address = typeData.address || null;
        typeData.file_number = typeData.file_number || null;
        
        // Legacy optional fields (for backward compatibility)
        typeData.full_non_profit_name = typeData.ngo_name;
        typeData.registration_number = typeData.ngo_registration_number;
        typeData.license_number = typeData.license_number || null;
        typeData.carrier_mobile_1 = typeData.carrier_mobile_1 || null;
        typeData.carrier_mobile_2 = typeData.carrier_mobile_2 || null;
        typeData.district_id = typeData.district_id || null;
        typeData.section = typeData.section || null;
        typeData.block = typeData.block || null;
      }

      // Handle RESIDENTIAL type data transformation and validation
      if (customerType === 'RESIDENTIAL') {
        // Ensure the 1 required field has a value, set default if empty
        typeData.pr_id = typeData.pr_id || `PR-RES-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // All other fields are optional (can be null)
        typeData.size = typeData.size || null;
        typeData.floor = typeData.floor || null;
        typeData.file_number = typeData.file_number || null;
        typeData.address = typeData.address || null;
      }

      // Handle RENTAL type data transformation and validation
      if (customerType === 'RENTAL') {
        // Ensure all 11 required fields have values
        typeData.pr_id = typeData.pr_id || `PR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        typeData.rental_name = typeData.rental_name || 'Unknown Rental';
        typeData.rental_mothers_name = typeData.rental_mothers_name || 'Unknown Mother';
        typeData.date_of_birth = typeData.date_of_birth || '1990-01-01';
        typeData.place_of_birth = typeData.place_of_birth || 'Unknown';
        typeData.gender = (typeData.gender || 'MALE').toUpperCase();
        typeData.nationality = typeData.nationality || 'Unknown';
        typeData.mobile_number_1 = typeData.mobile_number_1 || '+252612345678';
        typeData.mobile_number_2 = typeData.mobile_number_2 || '+252612345679';
        typeData.email = typeData.email || `${typeData.rental_name.toLowerCase().replace(/\s+/g, '.')}@example.com`;
        typeData.id_type = typeData.id_type || 'National ID Card';
        
        // Optional fields (can be null)
        typeData.id_number = typeData.id_number || null;
        typeData.place_of_issue = typeData.place_of_issue || null;
        typeData.issue_date = typeData.issue_date || null;
        typeData.expiry_date = typeData.expiry_date || null;
        typeData.carrier_mobile_1 = typeData.carrier_mobile_1 || null;
        typeData.carrier_mobile_2 = typeData.carrier_mobile_2 || null;
        typeData.emergency_contact_name = typeData.emergency_contact_name || null;
        typeData.emergency_contact_number = typeData.emergency_contact_number || null;
      }

      const { error: detailsError } = await supabase.from(tableName).insert(typeData);

      if (detailsError) {
        // Rollback customer creation
        await supabase.from('customers').delete().eq('id', customer.id);
        throw new Error(detailsError.message);
      }

      // Create activity log
      await supabase.from('activity_logs').insert({
        entity_type: 'CUSTOMER',
        entity_id: customer.id,
        action: 'CREATED',
        performed_by: userId,
        metadata: {
          reference_id: referenceId,
          source: 'bulk_upload',
        },
      });

      // Create audit log
      await supabase.from('audit_logs').insert({
        entity_type: 'customer',
        entity_id: customer.id,
        action: 'create',
        field: 'status',
        old_value: null,
        new_value: 'DRAFT',
        changed_by: userId,
      });

      // Get user info for notification
      const { data: user } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', userId)
        .single();

      // Create notification for administrators
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .in('role', ['ADMINISTRATOR', 'APPROVER']);

      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          title: 'New Customer Created (Bulk Upload)',
          message: `Customer ${referenceId} created via bulk upload by ${user?.full_name || 'Unknown User'}`,
          entity_type: 'CUSTOMER',
          entity_id: customer.id,
        }));

        await supabase.from('notifications').insert(notifications);
      }

      return customer;
    } catch (error) {
      // Cleanup on error
      await supabase.from('customers').delete().eq('id', customer.id);
      throw error;
    }
  }

  /**
   * Creates a property record from bulk upload data
   * 
   * Handles:
   * - Customer lookup by reference ID (optional for drafts)
   * - Boundary data separation and insertion into property_boundaries table
   * - Property ownership record creation
   * - Coordinate conversion from lat/lng to PostGIS POINT format
   * - UUID validation and placeholder text cleaning
   * 
   * @param data - Property data from Excel upload
   * @param userId - ID of the user creating the property
   * @returns Created property record
   * @throws Error if required fields are missing or invalid
   */
  private async createProperty(data: any, userId: string) {
    // Helper function to check if a value is a valid UUID
    const isValidUUID = (value: any): boolean => {
      if (!value || typeof value !== 'string') return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(value);
    };

    // Helper function to clean UUID fields (convert invalid/placeholder to null)
    const cleanUUID = (value: any): string | null => {
      if (!value) return null;
      const strValue = String(value).trim();
      // Check if it's a placeholder or invalid UUID
      if (strValue.includes('PASTE') || strValue.includes('optional') || strValue.includes('UUID') || !isValidUUID(strValue)) {
        return null;
      }
      return strValue;
    };

    // Look up customer by reference ID if provided (optional for draft)
    let customerId = null;
    if (data.customer_reference_id && !String(data.customer_reference_id).includes('optional')) {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('reference_id', data.customer_reference_id)
        .single();

      if (customerError || !customer) {
        console.warn(`Customer with reference ID ${data.customer_reference_id} not found - creating property without customer`);
        // Don't throw error - customer is optional for draft
      } else {
        customerId = customer.id;
      }
    }

    // Generate reference ID and parcel number
    const { count } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true });

    const nextNumber = (count || 0) + 1;
    const referenceId = `PROP-2025-${String(nextNumber).padStart(5, '0')}`;
    const parcelNumber = `PARCEL-2025-${String(nextNumber).padStart(5, '0')}`;

    // Separate boundary data from property data
    const boundaryData = {
      north_length: data.north_length,
      north_adjacent_type: data.north_type || data.north_adjacent_type,
      south_length: data.south_length,
      south_adjacent_type: data.south_type || data.south_adjacent_type,
      east_length: data.east_length,
      east_adjacent_type: data.east_type || data.east_adjacent_type,
      west_length: data.west_length,
      west_adjacent_type: data.west_type || data.west_adjacent_type,
    };

    // Prepare property data - remove fields that don't belong in properties table
    const propertyData = { ...data };
    delete propertyData.customer_reference_id;
    delete propertyData.north_length;
    delete propertyData.north_type;
    delete propertyData.north_adjacent_type;
    delete propertyData.south_length;
    delete propertyData.south_type;
    delete propertyData.south_adjacent_type;
    delete propertyData.east_length;
    delete propertyData.east_type;
    delete propertyData.east_adjacent_type;
    delete propertyData.west_length;
    delete propertyData.west_type;
    delete propertyData.west_adjacent_type;
    
    // Clean UUID fields - convert placeholders to null
    propertyData.district_id = cleanUUID(propertyData.district_id);
    propertyData.sub_district_id = cleanUUID(propertyData.sub_district_id);
    propertyData.property_type_id = cleanUUID(propertyData.property_type_id);
    
    // Validate required district_id
    if (!propertyData.district_id) {
      throw new Error('district_id is required and must be a valid UUID');
    }
    
    // Combine coordinates if latitude and longitude are provided
    if (data.latitude && data.longitude) {
      propertyData.coordinates = `POINT(${data.longitude} ${data.latitude})`;
      delete propertyData.latitude;
      delete propertyData.longitude;
    }

    // Insert property
    const { data: property, error } = await supabase
      .from('properties')
      .insert({
        ...propertyData,
        reference_id: referenceId,
        parcel_number: parcelNumber,
        status: 'DRAFT',
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Create property ownership if customer was provided
    if (customerId) {
      const { error: ownershipError } = await supabase
        .from('property_ownership')
        .insert({
          property_id: property.id,
          customer_id: customerId,
          ownership_type: 'OWNER',
          ownership_percentage: 100,
          start_date: new Date().toISOString().split('T')[0],
          is_current: true,
        });

      if (ownershipError) {
        console.error('Failed to create ownership:', ownershipError.message);
        // Don't fail the whole operation - ownership can be added later
      }
    }

    // Insert boundaries if all boundary data is provided
    const hasBoundaries = boundaryData.north_length && boundaryData.south_length && 
                          boundaryData.east_length && boundaryData.west_length;
    
    if (hasBoundaries) {
      const { error: boundaryError } = await supabase
        .from('property_boundaries')
        .insert({
          property_id: property.id,
          ...boundaryData,
        });

      if (boundaryError) {
        console.error('Failed to create boundaries:', boundaryError.message);
        // Don't fail the whole operation - boundaries can be added later
      }
    }

    return property;
  }

  private async createTaxAssessment(data: any, userId: string) {
    // Helper function to check if a value is a valid UUID
    const isValidUUID = (value: any): boolean => {
      if (!value || typeof value !== 'string') return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(value);
    };

    // Validate property_id
    if (!data.property_id || !isValidUUID(data.property_id)) {
      throw new Error('property_id is required and must be a valid UUID. Please replace "PASTE_PROPERTY_UUID_HERE" with an actual property UUID from your system.');
    }

    // Generate assessment number
    const { count } = await supabase
      .from('tax_assessments')
      .select('*', { count: 'exact', head: true });

    const nextNumber = (count || 0) + 1;
    const referenceId = `TAX-${data.tax_year}-${String(nextNumber).padStart(5, '0')}`;

    const { data: assessment, error } = await supabase
      .from('tax_assessments')
      .insert({
        ...data,
        reference_id: referenceId,
        status: 'ASSESSED',
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return assessment;
  }

  async generateTemplate(entityType: 'customer' | 'property' | 'tax', customerType?: 'PERSON' | 'BUSINESS' | 'RENTAL' | 'GOVERNMENT' | 'MOSQUE_HOSPITAL' | 'NON_PROFIT' | 'RESIDENTIAL') {
    const templates = {
      customer: {
        // PERSON customer template
        person: {
          headers: [
            'customer_type',
            'pr_id',
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
            pr_id: 'PR-2025-001',
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
        },
        // BUSINESS customer template
        business: {
          headers: [
            'customer_type',
            'pr_id',
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
            'business_registration_number',
            'contact_name',
            'carrier_network',
            'street',
            'district_id',
            'section',
            'block',
          ],
          example: {
            customer_type: 'BUSINESS',
            pr_id: 'PR-BUS-001',
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
            business_registration_number: 'REG-2025-001',
            contact_name: 'Ahmed Hassan',
            carrier_network: 'Hormuud',
            street: 'Business Street',
            district_id: 'JJG',
            section: 'Section A',
            block: 'Block 1',
          },
        },
        // RENTAL customer template
        rental: {
          headers: [
            'customer_type',
            'pr_id',
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
            'id_number',
            'place_of_issue',
            'issue_date',
            'expiry_date',
            'carrier_mobile_1',
            'carrier_mobile_2',
            'emergency_contact_name',
            'emergency_contact_number',
          ],
          example: {
            customer_type: 'RENTAL',
            pr_id: 'PR-RNT-001',
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
            id_number: 'RNT123456',
            place_of_issue: 'Hargeisa',
            issue_date: '2020-01-01',
            expiry_date: '2030-01-01',
            carrier_mobile_1: 'Hormuud',
            carrier_mobile_2: 'Telesom',
            emergency_contact_name: 'Ali Hassan',
            emergency_contact_number: '+252-612-345-680',
          },
        },
        // GOVERNMENT customer template
        government: {
          headers: [
            'PR-ID',
            'Full Government / Department Name',
            'Contact Name',
            'Department Address',
            'Contact Number',
            'Contact Number 2',
            'Email',
            'File Number',
            'Size',
            'Carrier Network 1',
            'Carrier Network 2',
            'Street',
            'District',
            'Section',
            'Block',
          ],
          example: {
            'PR-ID': 'PR-GOV-001',
            'Full Government / Department Name': 'Ministry of Finance',
            'Contact Name': 'Ahmed Hassan Director',
            'Department Address': '123 Government Street, Mogadishu',
            'Contact Number': '+252-612-345-678',
            'Contact Number 2': '+252-612-345-679',
            'Email': 'contact@mof.gov.so',
            'File Number': 'GOV-FILE-001',
            'Size': '1000 sqm',
            'Carrier Network 1': 'Hormuud',
            'Carrier Network 2': 'Telesom',
            'Street': 'Government Street',
            'District': 'JJG',
            'Section': 'Section A',
            'Block': 'Block 1',
          },
        },
        // MOSQUE_HOSPITAL customer template
        mosque_hospital: {
          headers: [
            'PR-ID',
            'Full Mosque or Hospital Name',
            'Mosque Registration Number',
            'Contact Name',
            'Contact Number',
            'Contact Number 2',
            'Email',
            'Address',
            'Size',
            'Floor',
            'File Number',
            'Carrier Network 1',
            'Carrier Network 2',
            'District',
            'Section',
            'Block',
          ],
          example: {
            'PR-ID': 'PR-MOS-001',
            'Full Mosque or Hospital Name': 'Al-Noor Mosque',
            'Mosque Registration Number': 'MOS-REG-2025-001',
            'Contact Name': 'Sheikh Ahmed Hassan',
            'Contact Number': '+252-612-345-678',
            'Contact Number 2': '+252-612-345-679',
            'Email': 'contact@alnoor.mosque.so',
            'Address': '123 Mosque Street, Mogadishu',
            'Size': '500 sqm',
            'Floor': 'Ground Floor',
            'File Number': 'MOS-FILE-001',
            'Carrier Network 1': 'Hormuud',
            'Carrier Network 2': 'Telesom',
            'District': 'JJG',
            'Section': 'Section A',
            'Block': 'Block 1',
          },
        },
        // NON_PROFIT (NGO) customer template
        non_profit: {
          headers: [
            'PR-ID',
            'NGO Name',
            'NGO Registration Number',
            'Contact Name',
            'Contact Number',
            'Contact Number 2',
            'Email',
            'Size',
            'Floor',
            'Address',
            'File Number',
            'Carrier Network 1',
            'Carrier Network 2',
            'District',
            'Section',
            'Block',
          ],
          example: {
            'PR-ID': 'PR-NGO-001',
            'NGO Name': 'Hope Foundation',
            'NGO Registration Number': 'NGO-REG-2025-001',
            'Contact Name': 'Amina Hassan Director',
            'Contact Number': '+252-612-345-678',
            'Contact Number 2': '+252-612-345-679',
            'Email': 'contact@hopefoundation.so',
            'Size': '300 sqm',
            'Floor': '1st Floor',
            'Address': '456 NGO Street, Mogadishu',
            'File Number': 'NGO-FILE-001',
            'Carrier Network 1': 'Hormuud',
            'Carrier Network 2': 'Telesom',
            'District': 'JJG',
            'Section': 'Section B',
            'Block': 'Block 2',
          },
        },
        // RESIDENTIAL customer template
        residential: {
          headers: [
            'PR-ID',
            'Size',
            'Floor',
            'File Number',
            'Address',
          ],
          example: {
            'PR-ID': 'PR-RES-001',
            'Size': '150 sqm',
            'Floor': '2nd Floor',
            'File Number': 'RES-FILE-001',
            'Address': '789 Residential Street, Mogadishu',
          },
        },
      },
      property: {
        headers: [
          'property_type_id',
          'district_id',
          'sub_district_id',
          'property_location',
          'size',
          'is_building',
          'number_of_floors',
          'door_number',
          'road_name',
        ],
        example: {
          property_type_id: 'uuid-here',
          district_id: 'uuid-here',
          sub_district_id: 'uuid-here',
          property_location: '123 Main Street',
          size: 250,
          is_building: true,
          number_of_floors: 2,
          door_number: '123',
          road_name: 'Main Street',
        },
      },
      tax: {
        headers: [
          'property_id',
          'tax_year',
          'assessed_amount',
          'exemption_amount',
          'due_date',
        ],
        example: {
          property_id: 'uuid-here',
          tax_year: 2025,
          assessed_amount: 10000,
          exemption_amount: 0,
          due_date: '2025-12-31',
        },
      },
    };

    if (entityType === 'customer') {
      // Return specific customer type template or default to person
      const type = customerType?.toLowerCase() || 'person';
      return templates.customer[type as keyof typeof templates.customer] || templates.customer.person;
    }
    
    return templates[entityType];
  }
}

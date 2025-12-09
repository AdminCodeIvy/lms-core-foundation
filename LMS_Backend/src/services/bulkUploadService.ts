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
      canCommit: errors.length === 0,
    };
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
        if (record.first_name) {
          // PERSON type
          if (!record.first_name) errors.push('first_name is required');
          if (!record.father_name) errors.push('father_name is required');
          if (!record.mobile_number_1) errors.push('mobile_number_1 is required');
        } else if (record.business_name) {
          // BUSINESS type
          if (!record.business_name) errors.push('business_name is required');
          if (!record.mobile_number_1) errors.push('mobile_number_1 is required');
        } else if (record.full_department_name) {
          // GOVERNMENT type
          if (!record.full_department_name) errors.push('full_department_name is required');
          if (!record.mobile_number_1) errors.push('mobile_number_1 is required');
        } else if (record.full_name) {
          // MOSQUE_HOSPITAL type
          if (!record.full_name) errors.push('full_name is required');
          if (!record.mobile_number_1) errors.push('mobile_number_1 is required');
        } else if (record.full_non_profit_name) {
          // NON_PROFIT type
          if (!record.full_non_profit_name) errors.push('full_non_profit_name is required');
          if (!record.mobile_number_1) errors.push('mobile_number_1 is required');
        } else if (record.full_contractor_name) {
          // CONTRACTOR type
          if (!record.full_contractor_name) errors.push('full_contractor_name is required');
          if (!record.mobile_number_1) errors.push('mobile_number_1 is required');
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
   * Commits validated bulk upload data to the database
   * 
   * Processes each record sequentially to avoid race conditions in reference ID generation.
   * Creates activity logs and notifications for each successful import.
   * 
   * @param uploadData - The validated data to commit
   * @param userId - ID of the user performing the upload
   * @returns Results object with success/failure counts and error details
   * @throws AppError if validation fails
   */
  async commitUpload(uploadData: BulkUploadData, userId: string) {
    const { entityType, data } = uploadData;

    // Validate first
    const validation = await this.validateUpload(uploadData, userId);
    
    if (!validation.canCommit) {
      throw new AppError('Cannot commit upload with validation errors', 400);
    }

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as any[],
    };

    // Process each record - fetch count inside loop to avoid duplicates
    for (let i = 0; i < data.length; i++) {
      try {
        console.log(`Processing record ${i + 1}/${data.length}:`, JSON.stringify(data[i]).substring(0, 100));
        await this.createRecord(entityType, data[i], userId);
        results.successful++;
        console.log(`✓ Record ${i + 1} created successfully`);
      } catch (error: any) {
        console.error(`✗ Record ${i + 1} failed:`, error.message);
        results.failed++;
        results.errors.push({
          row: i + 1,
          error: error.message,
          data: data[i],
        });
      }
    }

    return results;
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
    // Determine customer type from data
    let customerType = 'PERSON'; // Default
    if (data.business_name) customerType = 'BUSINESS';
    else if (data.full_department_name) customerType = 'GOVERNMENT';
    else if (data.full_name && !data.first_name) customerType = 'MOSQUE_HOSPITAL';
    else if (data.full_non_profit_name) customerType = 'NON_PROFIT';
    else if (data.full_contractor_name) customerType = 'CONTRACTOR';

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
      const typeData = { ...data };
      
      // Add customer_id
      typeData.customer_id = customer.id;

      // Set defaults for required fields to avoid NOT NULL constraint violations
      if (customerType === 'PERSON') {
        // Normalize gender to uppercase (MALE, FEMALE)
        if (typeData.gender) {
          typeData.gender = typeData.gender.toUpperCase();
        }
        
        // Required fields with defaults
        typeData.date_of_birth = typeData.date_of_birth || '1990-01-01';
        typeData.place_of_birth = typeData.place_of_birth || 'Unknown';
        typeData.gender = typeData.gender || 'MALE';
        typeData.nationality = typeData.nationality || 'Unknown';
        typeData.carrier_mobile_1 = typeData.carrier_mobile_1 || 'Unknown';
        
        // Emergency contact (required in DB but can have default)
        typeData.emergency_contact_name = typeData.emergency_contact_name || 'N/A';
        typeData.emergency_contact_number = typeData.emergency_contact_number || 'N/A';
        typeData.mobile_number_2 = typeData.mobile_number_2 || null;
        typeData.carrier_mobile_2 = typeData.carrier_mobile_2 || null;
        typeData.email = typeData.email || `${typeData.first_name.toLowerCase()}@example.com`;
        typeData.id_type = typeData.id_type || 'National ID Card';
        typeData.id_number = typeData.id_number || 'N/A';
        typeData.place_of_issue = typeData.place_of_issue || 'N/A';
        typeData.issue_date = typeData.issue_date || '2020-01-01';
        typeData.expiry_date = typeData.expiry_date || '2030-01-01';
        typeData.fourth_name = typeData.fourth_name || null;
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

  async generateTemplate(entityType: 'customer' | 'property' | 'tax') {
    const templates = {
      customer: {
        headers: [
          'customer_type',
          'first_name',
          'father_name',
          'grandfather_name',
          'fourth_name',
          'gender',
          'nationality',
          'date_of_birth',
          'place_of_birth',
          'id_type',
          'id_number',
          'issue_date',
          'expiry_date',
          'place_of_issue',
          'mobile_number_1',
          'carrier_mobile_1',
          'email',
          'emergency_contact_name',
          'emergency_contact_number',
        ],
        example: {
          customer_type: 'PERSON',
          first_name: 'John',
          father_name: 'Doe',
          grandfather_name: 'Smith',
          fourth_name: '',
          gender: 'MALE',
          nationality: 'Somalia',
          date_of_birth: '1990-01-01',
          place_of_birth: 'Mogadishu',
          id_type: 'National ID Card',
          id_number: '123456789',
          issue_date: '2020-01-01',
          expiry_date: '2030-01-01',
          place_of_issue: 'Mogadishu',
          mobile_number_1: '+252612345678',
          carrier_mobile_1: 'Hormuud',
          email: 'john@example.com',
          emergency_contact_name: 'Jane Doe',
          emergency_contact_number: '+252612345679',
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

    return templates[entityType];
  }
}

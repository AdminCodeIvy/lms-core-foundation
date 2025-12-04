import { supabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export interface BulkUploadData {
  entityType: 'customer' | 'property' | 'tax';
  data: any[];
}

export class BulkUploadService {
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
        if (!record.district_id) errors.push('district_id is required');
        if (!record.sub_district_id) errors.push('sub_district_id is required');
        if (!record.property_type_id) errors.push('property_type_id is required');
        break;

      case 'tax':
        if (!record.property_id) errors.push('property_id is required');
        if (!record.tax_year) errors.push('tax_year is required');
        if (!record.assessed_amount) errors.push('assessed_amount is required');
        break;
    }

    return errors;
  }

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

  private async createProperty(data: any, userId: string) {
    // Generate reference ID and parcel number
    const { count } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true });

    const nextNumber = (count || 0) + 1;
    const referenceId = `PROP-2025-${String(nextNumber).padStart(5, '0')}`;
    const parcelNumber = `PARCEL-2025-${String(nextNumber).padStart(5, '0')}`;

    const { data: property, error } = await supabase
      .from('properties')
      .insert({
        ...data,
        reference_id: referenceId,
        parcel_number: parcelNumber,
        status: 'DRAFT',
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return property;
  }

  private async createTaxAssessment(data: any, userId: string) {
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

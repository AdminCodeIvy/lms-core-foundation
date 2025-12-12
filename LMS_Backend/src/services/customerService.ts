import { supabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';
// import { getSocketHandler } from '../websocket/socketHandler'; // WebSocket removed

export interface CustomerFilters {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  search?: string;
  showArchived?: boolean;
  district_id?: string;
  updated_from?: string;
  updated_to?: string;
}

export class CustomerService {
  async getCustomers(filters: CustomerFilters) {
    const {
      page = 1,
      limit = 50,
      type,
      status,
      search,
      showArchived = false,
      district_id,
      updated_from,
      updated_to,
    } = filters;

    let query = supabase
      .from('customers')
      .select(
        `
        id,
        reference_id,
        customer_type,
        status,
        updated_at,
        customer_person(full_name, pr_id, mothers_name),
        customer_business(business_name, districts(name)),
        customer_government(full_department_name),
        customer_mosque_hospital(full_name, districts(name)),
        customer_non_profit(full_non_profit_name, districts(name)),
        customer_residential(pr_id)
      `,
        { count: 'exact' }
      );

    // Apply filters
    if (type && type !== 'ALL') {
      query = query.eq('customer_type', type);
    }

    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    } else if (!showArchived) {
      query = query.neq('status', 'ARCHIVED');
    }

    if (search) {
      query = query.or(`reference_id.ilike.%${search}%`);
    }

    // Date range filter
    if (updated_from) {
      query = query.gte('updated_at', updated_from);
    }
    if (updated_to) {
      query = query.lte('updated_at', updated_to);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('updated_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw new AppError(error.message, 500);

    // Transform data
    const customers = (data || []).map((customer: any) => {
      let name = 'Unknown';

      switch (customer.customer_type) {
        case 'PERSON': {
          const personData = customer.customer_person;
          const person = Array.isArray(personData) ? personData[0] : personData;
          if (person) {
            // Use full_name field
            if (person.full_name) {
              name = person.full_name;
            }
          }
          break;
        }
        case 'BUSINESS':
          if (customer.customer_business && customer.customer_business.length > 0) {
            name = customer.customer_business[0].business_name;
          }
          break;
        case 'GOVERNMENT':
          if (customer.customer_government && customer.customer_government.length > 0) {
            name = customer.customer_government[0].full_department_name;
          }
          break;
        case 'MOSQUE_HOSPITAL':
          if (customer.customer_mosque_hospital && customer.customer_mosque_hospital.length > 0) {
            name = customer.customer_mosque_hospital[0].full_name;
          }
          break;
        case 'NON_PROFIT':
          if (customer.customer_non_profit && customer.customer_non_profit.length > 0) {
            name = customer.customer_non_profit[0].full_non_profit_name;
          }
          break;
        case 'RESIDENTIAL':
          if (customer.customer_residential && customer.customer_residential.length > 0) {
            name = customer.customer_residential[0].pr_id;
          }
          break;
        case 'RENTAL':
          if (customer.customer_rental && customer.customer_rental.length > 0) {
            name = customer.customer_rental[0].rental_name;
          }
          break;
      }

      return {
        id: customer.id,
        reference_id: customer.reference_id,
        customer_type: customer.customer_type,
        status: customer.status,
        name,
        updated_at: customer.updated_at,
      };
    });

    return {
      data: customers,
      meta: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async getCustomer(id: string) {
    const { data, error } = await supabase
      .from('customers')
      .select(
        `
        *,
        customer_person(*),
        customer_business(*),
        customer_government(*),
        customer_mosque_hospital(*),
        customer_non_profit(*),
        customer_residential(*),
        customer_rental(*),
        created_by_user:users!customers_created_by_fkey(full_name),
        approved_by_user:users!customers_approved_by_fkey(full_name)
      `
      )
      .eq('id', id)
      .single();

    if (error) throw new AppError(error.message, 404);
    if (!data) throw new AppError('Customer not found', 404);

    // Transform array responses to single objects
    const transformedData = {
      ...data,
      customer_person: Array.isArray(data.customer_person) && data.customer_person.length > 0 
        ? data.customer_person[0] 
        : data.customer_person,
      customer_business: Array.isArray(data.customer_business) && data.customer_business.length > 0 
        ? data.customer_business[0] 
        : data.customer_business,
      customer_government: Array.isArray(data.customer_government) && data.customer_government.length > 0 
        ? data.customer_government[0] 
        : data.customer_government,
      customer_mosque_hospital: Array.isArray(data.customer_mosque_hospital) && data.customer_mosque_hospital.length > 0 
        ? data.customer_mosque_hospital[0] 
        : data.customer_mosque_hospital,
      customer_non_profit: Array.isArray(data.customer_non_profit) && data.customer_non_profit.length > 0 
        ? data.customer_non_profit[0] 
        : data.customer_non_profit,
      customer_residential: Array.isArray(data.customer_residential) && data.customer_residential.length > 0 
        ? data.customer_residential[0] 
        : data.customer_residential,
      person_data: Array.isArray(data.customer_person) && data.customer_person.length > 0 
        ? data.customer_person[0] 
        : data.customer_person,
      business_data: Array.isArray(data.customer_business) && data.customer_business.length > 0 
        ? data.customer_business[0] 
        : data.customer_business,
      government_data: Array.isArray(data.customer_government) && data.customer_government.length > 0 
        ? data.customer_government[0] 
        : data.customer_government,
      mosque_hospital_data: Array.isArray(data.customer_mosque_hospital) && data.customer_mosque_hospital.length > 0 
        ? data.customer_mosque_hospital[0] 
        : data.customer_mosque_hospital,
      non_profit_data: Array.isArray(data.customer_non_profit) && data.customer_non_profit.length > 0 
        ? data.customer_non_profit[0] 
        : data.customer_non_profit,
      residential_data: Array.isArray(data.customer_residential) && data.customer_residential.length > 0 
        ? data.customer_residential[0] 
        : data.customer_residential,
    };

    return transformedData;
  }

  async createCustomer(customerData: any, userId: string) {
    // Validate userId
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.error('Invalid userId received:', { userId, type: typeof userId });
      throw new AppError('Invalid user ID provided', 400);
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error('Invalid UUID format for userId:', userId);
      throw new AppError('Invalid user ID format', 400);
    }

    const { customer_type, 
            customer_person, customer_business, customer_government, 
            customer_mosque_hospital, customer_non_profit, customer_residential, customer_rental,
            person_data, business_data, government_data,
            mosque_hospital_data, non_profit_data, residential_data, rental_data } = customerData;

    // Generate reference ID with improved retry mechanism
    let refId: string;
    let attempts = 0;
    const maxAttempts = 3;

    do {
      attempts++;
      
      // Use fallback generator directly since database function is broken
      refId = await this.generateFallbackReferenceId();

      // Check if this reference ID already exists
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('reference_id', refId)
        .single();

      if (!existingCustomer) {
        // Reference ID is unique, we can use it
        console.log(`Generated unique reference ID: ${refId} on attempt ${attempts}`);
        break;
      }

      console.warn(`Reference ID ${refId} already exists, attempt ${attempts}/${maxAttempts}`);

      if (attempts >= maxAttempts) {
        // Last resort: use timestamp-based ID
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        refId = `CUS-${new Date().getFullYear()}-${timestamp}-${random}`;
        
        // Final check
        const { data: finalCheck } = await supabase
          .from('customers')
          .select('id')
          .eq('reference_id', refId)
          .single();
          
        if (!finalCheck) {
          console.log(`Using timestamp-based reference ID: ${refId}`);
          break;
        }
        
        throw new AppError('Failed to generate unique reference ID after multiple attempts', 500);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 200 * attempts));
    } while (attempts < maxAttempts);

    // Create customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        reference_id: refId,
        customer_type,
        status: 'DRAFT',
        created_by: userId,
      })
      .select()
      .single();

    if (customerError) {
      if (customerError.code === '23505' && customerError.message.includes('reference_id')) {
        throw new AppError('Reference ID conflict detected. Please try again.', 409);
      }
      throw new AppError(customerError.message, 500);
    }

    if (!customer || !customer.id) {
      throw new AppError('Failed to create customer - no ID returned', 500);
    }

    // Get the appropriate details based on customer type
    // Support both naming conventions: customer_person OR person_data
    let details = null;
    switch (customer_type) {
      case 'PERSON':
        details = customer_person || person_data;
        break;
      case 'BUSINESS':
        details = customer_business || business_data;
        break;
      case 'GOVERNMENT':
        details = customer_government || government_data;
        break;
      case 'MOSQUE_HOSPITAL':
        details = customer_mosque_hospital || mosque_hospital_data;
        break;
      case 'NON_PROFIT':
        details = customer_non_profit || non_profit_data;
        break;
      case 'RESIDENTIAL':
        details = customer_residential || residential_data;
        break;
      case 'RENTAL':
        details = customer_rental || rental_data;
        break;
    }

    if (!details) {
      await supabase.from('customers').delete().eq('id', customer.id);
      throw new AppError(`Missing details for customer type: ${customer_type}`, 400);
    }

    // PR-ID can be duplicated - no uniqueness check needed

    // Create customer type-specific details
    const tableName = `customer_${customer_type.toLowerCase()}`;
    
    // Validate customer ID before inserting details
    if (!customer.id || typeof customer.id !== 'string' || customer.id.trim() === '') {
      await supabase.from('customers').delete().eq('reference_id', refId);
      throw new AppError('Invalid customer ID generated', 500);
    }
    
    // Insert only the new simplified fields
    let insertData = { customer_id: customer.id, ...details };
    
    const { error: detailsError } = await supabase.from(tableName).insert(insertData);

    if (detailsError) {
      // Rollback customer creation
      await supabase.from('customers').delete().eq('id', customer.id);
      
      // Provide user-friendly error messages
      if (detailsError.code === '23502') { // NOT NULL constraint violation
        const match = detailsError.message.match(/column "([^"]+)"/);
        if (match) {
          const fieldName = match[1];
          const friendlyFieldNames: { [key: string]: string } = {
            'carrier_network': 'Carrier Network',
            'business_name': 'Business Name',
            'contact_name': 'Contact Name',
            'mobile_number_1': 'Contact Number',
            'email': 'Email',
            'pr_id': 'PR-ID'
          };
          const friendlyName = friendlyFieldNames[fieldName] || fieldName;
          throw new AppError(`${friendlyName} is required. Please fill in this field.`, 400);
        }
      }
      
      // Generic database error
      throw new AppError('Failed to save customer details. Please check all required fields.', 400);
    }

    // Create activity log
    await supabase.from('activity_logs').insert({
      entity_type: 'CUSTOMER',
      entity_id: customer.id,
      action: 'CREATED',
      performed_by: userId,
      metadata: {
        reference_id: customer.reference_id,
        customer_type: customer.customer_type,
        status: 'DRAFT',
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

    return customer;
  }

  async updateCustomer(id: string, customerData: any, userId: string) {
    const { customer_type, 
            customer_person, customer_business, customer_government, 
            customer_mosque_hospital, customer_non_profit, customer_residential, customer_rental,
            person_data, business_data, government_data,
            mosque_hospital_data, non_profit_data, residential_data, rental_data } = customerData;

    // Get current customer status
    const { data: currentCustomer } = await supabase
      .from('customers')
      .select('status')
      .eq('id', id)
      .single();

    // Prepare update data
    const updateData: any = { updated_at: new Date().toISOString() };

    // If currently APPROVED, move back to SUBMITTED for re-approval
    if (currentCustomer?.status === 'APPROVED') {
      updateData.status = 'SUBMITTED';
      updateData.submitted_at = new Date().toISOString();
      updateData.approved_by = null;
      // Note: approved_at column may not exist in schema, so we don't set it
    }

    // Update customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (customerError) throw new AppError(customerError.message, 500);

    // Get the appropriate details based on customer type
    // Support both naming conventions: customer_person OR person_data
    let details = null;
    switch (customer_type) {
      case 'PERSON':
        details = customer_person || person_data;
        break;
      case 'BUSINESS':
        details = customer_business || business_data;
        break;
      case 'GOVERNMENT':
        details = customer_government || government_data;
        break;
      case 'MOSQUE_HOSPITAL':
        details = customer_mosque_hospital || mosque_hospital_data;
        break;
      case 'NON_PROFIT':
        details = customer_non_profit || non_profit_data;
        break;
      case 'RESIDENTIAL':
        details = customer_residential || residential_data;
        break;
      case 'RENTAL':
        details = customer_rental || rental_data;
        break;
    }

    if (!details) {
      throw new AppError(`Missing details for customer type: ${customer_type}`, 400);
    }

    // PR-ID can be duplicated - no uniqueness check needed

    // Update customer type-specific details
    const tableName = `customer_${customer_type.toLowerCase()}`;
    
    // Update only the new simplified fields
    let detailsUpdateData = { ...details };
    
    const { error: detailsError } = await supabase
      .from(tableName)
      .update(detailsUpdateData)
      .eq('customer_id', id);

    if (detailsError) throw new AppError(detailsError.message, 500);

    // Create activity log
    const activityMetadata: any = {
      customer_type: customer.customer_type,
    };

    // Add note if returned to SUBMITTED for re-approval
    if (currentCustomer?.status === 'APPROVED' && customer.status === 'SUBMITTED') {
      activityMetadata.note = 'Edited after approval - returned to SUBMITTED for re-approval';
    }

    await supabase.from('activity_logs').insert({
      entity_type: 'CUSTOMER',
      entity_id: id,
      action: 'UPDATED',
      performed_by: userId,
      metadata: activityMetadata,
    });

    // Create audit log
    await supabase.from('audit_logs').insert({
      entity_type: 'customer',
      entity_id: id,
      action: 'update',
      field: null,
      old_value: null,
      new_value: `Updated ${customer_type} details`,
      changed_by: userId,
    });

    return customer;
  }

  async deleteCustomer(id: string, userId: string) {
    const { error } = await supabase.from('customers').delete().eq('id', id);

    if (error) throw new AppError(error.message, 500);

    // Log audit
    await supabase.from('audit_logs').insert({
      entity_type: 'customer',
      entity_id: id,
      action: 'delete',
      field: 'status',
      old_value: 'DRAFT',
      new_value: 'DELETED',
      changed_by: userId,
    });

    // WebSocket removed - not needed for LMS
  }

  async submitCustomer(id: string, userId: string) {
    // First, get the customer to check if it has details
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('*, customer_person(*), customer_business(*), customer_government(*), customer_mosque_hospital(*), customer_non_profit(*), customer_residential(*), customer_rental(*)')
      .eq('id', id)
      .single();

    if (fetchError) throw new AppError(fetchError.message, 500);
    if (!customer) throw new AppError('Customer not found', 404);

    // Validate that customer has type-specific details
    let hasDetails = false;
    switch (customer.customer_type) {
      case 'PERSON':
        hasDetails = customer.customer_person && (Array.isArray(customer.customer_person) ? customer.customer_person.length > 0 : !!customer.customer_person);
        break;
      case 'BUSINESS':
        hasDetails = customer.customer_business && (Array.isArray(customer.customer_business) ? customer.customer_business.length > 0 : !!customer.customer_business);
        break;
      case 'GOVERNMENT':
        hasDetails = customer.customer_government && (Array.isArray(customer.customer_government) ? customer.customer_government.length > 0 : !!customer.customer_government);
        break;
      case 'MOSQUE_HOSPITAL':
        hasDetails = customer.customer_mosque_hospital && (Array.isArray(customer.customer_mosque_hospital) ? customer.customer_mosque_hospital.length > 0 : !!customer.customer_mosque_hospital);
        break;
      case 'NON_PROFIT':
        hasDetails = customer.customer_non_profit && (Array.isArray(customer.customer_non_profit) ? customer.customer_non_profit.length > 0 : !!customer.customer_non_profit);
        break;
      case 'RESIDENTIAL':
        hasDetails = customer.customer_residential && (Array.isArray(customer.customer_residential) ? customer.customer_residential.length > 0 : !!customer.customer_residential);
        break;
      case 'RENTAL':
        hasDetails = customer.customer_rental && (Array.isArray(customer.customer_rental) ? customer.customer_rental.length > 0 : !!customer.customer_rental);
        break;
    }

    if (!hasDetails) {
      throw new AppError(`Missing details for customer: ${customer.customer_type}`, 400);
    }

    // Update customer status
    const { data, error } = await supabase
      .from('customers')
      .update({ 
        status: 'SUBMITTED',
        submitted_at: new Date().toISOString(),
        rejection_feedback: null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    // Create activity log
    await supabase.from('activity_logs').insert({
      entity_type: 'CUSTOMER',
      entity_id: id,
      action: 'SUBMITTED',
      performed_by: userId,
      metadata: {
        reference_id: data.reference_id,
        customer_type: data.customer_type,
        submitted_at: new Date().toISOString(),
      },
    });

    // Create audit log
    await supabase.from('audit_logs').insert({
      entity_type: 'customer',
      entity_id: id,
      action: 'submit',
      field: 'status',
      old_value: 'DRAFT',
      new_value: 'SUBMITTED',
      changed_by: userId,
    });

    // Create notification for approvers
    const { data: approvers } = await supabase
      .from('users')
      .select('id, full_name')
      .in('role', ['APPROVER', 'ADMINISTRATOR'])
      .eq('is_active', true);

    if (approvers && approvers.length > 0) {
      const { data: submitter } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', userId)
        .single();

      const notifications = approvers.map((approver) => ({
        user_id: approver.id,
        title: 'New Customer Submitted',
        message: `Customer ${data.reference_id} submitted by ${submitter?.full_name || 'Unknown User'}`,
        entity_type: 'CUSTOMER',
        entity_id: id,
      }));

      await supabase.from('notifications').insert(notifications);
    }

    return data;
  }

  async archiveCustomer(id: string, userId: string) {
    // Get current customer to check status
    const { data: currentCustomer } = await supabase
      .from('customers')
      .select('status')
      .eq('id', id)
      .single();

    const oldStatus = currentCustomer?.status || 'UNKNOWN';
    const newStatus = oldStatus === 'ARCHIVED' ? 'DRAFT' : 'ARCHIVED';

    const { data, error } = await supabase
      .from('customers')
      .update({ status: newStatus })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    // Create activity log
    await supabase.from('activity_logs').insert({
      entity_type: 'CUSTOMER',
      entity_id: id,
      action: newStatus === 'ARCHIVED' ? 'ARCHIVED' : 'UNARCHIVED',
      performed_by: userId,
      metadata: {
        reference_id: data.reference_id,
        old_status: oldStatus,
        new_status: newStatus,
      },
    });

    // Create audit log
    await supabase.from('audit_logs').insert({
      entity_type: 'customer',
      entity_id: id,
      action: newStatus === 'ARCHIVED' ? 'archive' : 'unarchive',
      field: 'status',
      old_value: oldStatus,
      new_value: newStatus,
      changed_by: userId,
    });

    return data;
  }

  async generateReferenceId(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('generate_customer_reference_id');

      if (error) {
        console.warn('Database function failed, using fallback generator:', error.message);
        return this.generateFallbackReferenceId();
      }

      return data;
    } catch (error) {
      console.warn('Reference ID generation failed, using fallback:', error);
      return this.generateFallbackReferenceId();
    }
  }

  private async generateFallbackReferenceId(): Promise<string> {
    // Fallback: Generate reference ID using timestamp and random number
    const year = new Date().getFullYear();
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 100000); // Larger random number
    
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      // Create more unique ID with microseconds and larger random
      const microseconds = (timestamp + attempts * 1000).toString().slice(-8);
      const randomPart = (random + attempts * 123).toString().padStart(5, '0');
      const refId = `CUS-${year}-${microseconds}${randomPart}`;
      
      // Check if this ID exists
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('reference_id', refId)
        .single();

      if (!existing) {
        return refId;
      }

      attempts++;
      // Add small delay to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    throw new AppError('Failed to generate unique fallback reference ID', 500);
  }
}

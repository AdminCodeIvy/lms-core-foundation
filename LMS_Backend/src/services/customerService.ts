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
        customer_person(first_name, fourth_name),
        customer_business(business_name, districts(name)),
        customer_government(full_department_name, districts(name)),
        customer_mosque_hospital(full_name, districts(name)),
        customer_non_profit(full_non_profit_name, districts(name)),
        customer_contractor(full_contractor_name)
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
            name =
              person.fourth_name && person.fourth_name.trim()
                ? `${person.first_name} ${person.fourth_name}`.trim()
                : person.first_name;
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
        case 'CONTRACTOR':
          if (customer.customer_contractor && customer.customer_contractor.length > 0) {
            name = customer.customer_contractor[0].full_contractor_name;
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
        customer_contractor(*),
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
      customer_contractor: Array.isArray(data.customer_contractor) && data.customer_contractor.length > 0 
        ? data.customer_contractor[0] 
        : data.customer_contractor,
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
      contractor_data: Array.isArray(data.customer_contractor) && data.customer_contractor.length > 0 
        ? data.customer_contractor[0] 
        : data.customer_contractor,
    };

    return transformedData;
  }

  async createCustomer(customerData: any, userId: string) {
    const { customer_type, 
            customer_person, customer_business, customer_government, 
            customer_mosque_hospital, customer_non_profit, customer_contractor,
            person_data, business_data, government_data,
            mosque_hospital_data, non_profit_data, contractor_data } = customerData;

    // Generate reference ID
    const { data: refId, error: refError } = await supabase.rpc(
      'generate_customer_reference_id'
    );

    if (refError) throw new AppError('Failed to generate reference ID', 500);

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
      case 'CONTRACTOR':
        details = customer_contractor || contractor_data;
        break;
    }

    if (!details) {
      await supabase.from('customers').delete().eq('id', customer.id);
      throw new AppError(`Missing details for customer type: ${customer_type}`, 400);
    }

    // Create customer type-specific details
    const tableName = `customer_${customer_type.toLowerCase()}`;
    const { error: detailsError } = await supabase.from(tableName).insert({
      customer_id: customer.id,
      ...details,
    });

    if (detailsError) {
      // Rollback customer creation
      await supabase.from('customers').delete().eq('id', customer.id);
      throw new AppError(detailsError.message, 500);
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
            customer_mosque_hospital, customer_non_profit, customer_contractor,
            person_data, business_data, government_data,
            mosque_hospital_data, non_profit_data, contractor_data } = customerData;

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
      case 'CONTRACTOR':
        details = customer_contractor || contractor_data;
        break;
    }

    if (!details) {
      throw new AppError(`Missing details for customer type: ${customer_type}`, 400);
    }

    // Update customer type-specific details
    const tableName = `customer_${customer_type.toLowerCase()}`;
    const { error: detailsError } = await supabase
      .from(tableName)
      .update(details)
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
      .select('*, customer_person(*), customer_business(*), customer_government(*), customer_mosque_hospital(*), customer_non_profit(*), customer_contractor(*)')
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
      case 'CONTRACTOR':
        hasDetails = customer.customer_contractor && (Array.isArray(customer.customer_contractor) ? customer.customer_contractor.length > 0 : !!customer.customer_contractor);
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
    const { data, error } = await supabase.rpc('generate_customer_reference_id');

    if (error) throw new AppError('Failed to generate reference ID', 500);

    return data;
  }
}

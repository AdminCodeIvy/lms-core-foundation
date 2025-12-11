import { supabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';
// import { getSocketHandler } from '../websocket/socketHandler'; // WebSocket removed

export interface ReviewQueueFilters {
  page?: number;
  limit?: number;
  entityType?: 'customer' | 'property';
  status?: string;
}

export class WorkflowService {
  async getReviewQueue(filters: ReviewQueueFilters) {
    const {
      page = 1,
      limit = 50,
      entityType,
      status = 'SUBMITTED',
    } = filters;

    const items: any[] = [];

    // Get customers if requested
    if (!entityType || entityType === 'customer') {
      const { data: customers } = await supabase
        .from('customers')
        .select(
          `
          id,
          reference_id,
          customer_type,
          status,
          created_by,
          created_at,
          submitted_at,
          customer_person(first_name, fourth_name, full_name, pr_id),
          customer_business(business_name),
          customer_government(full_department_name)
        `
        )
        .eq('status', status)
        .order('submitted_at', { ascending: true });

      if (customers) {
        customers.forEach((customer: any) => {
          let name = 'Unknown';
          switch (customer.customer_type) {
            case 'PERSON':
              const person = Array.isArray(customer.customer_person) 
                ? customer.customer_person[0] 
                : customer.customer_person;
              if (person) {
                // Use new full_name field if available, otherwise construct from old fields
                if (person.full_name) {
                  name = person.full_name;
                } else {
                  name = person.fourth_name 
                    ? `${person.first_name} ${person.fourth_name}` 
                    : person.first_name;
                }
              }
              break;
            case 'BUSINESS':
              if (customer.customer_business?.[0]) {
                name = customer.customer_business[0].business_name;
              }
              break;
            case 'GOVERNMENT':
              if (customer.customer_government?.[0]) {
                name = customer.customer_government[0].full_department_name;
              }
              break;
          }

          items.push({
            id: customer.id,
            reference_id: customer.reference_id,
            entity_type: 'customer',
            name,
            type: customer.customer_type,
            status: customer.status,
            submitted_at: customer.submitted_at,
            created_at: customer.created_at,
          });
        });
      }
    }

    // Get properties if requested
    if (!entityType || entityType === 'property') {
      const { data: properties } = await supabase
        .from('properties')
        .select(
          `
          id,
          reference_id,
          parcel_number,
          property_location,
          status,
          created_by,
          created_at,
          property_types(name)
        `
        )
        .eq('status', status)
        .order('created_at', { ascending: true });

      if (properties) {
        properties.forEach((property: any) => {
          items.push({
            id: property.id,
            reference_id: property.reference_id,
            entity_type: 'property',
            name: property.property_location || property.parcel_number,
            type: property.property_types?.name || 'Unknown',
            status: property.status,
            submitted_at: property.created_at,
            created_at: property.created_at,
          });
        });
      }
    }

    // Sort by submitted_at
    items.sort((a, b) => 
      new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    );

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit;
    const paginatedItems = items.slice(from, to);

    return {
      data: paginatedItems,
      meta: {
        page,
        limit,
        total: items.length,
        totalPages: Math.ceil(items.length / limit),
      },
    };
  }

  async getReviewItem(entityType: 'customer' | 'property', id: string) {
    if (entityType === 'customer') {
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
          customer_residential(*)
        `
        )
        .eq('id', id)
        .single();

      if (error) throw new AppError(error.message, 404);
      return { entity_type: 'customer', ...data };
    } else {
      const { data, error } = await supabase
        .from('properties')
        .select(
          `
          *,
          property_types(name, category),
          districts(name, code),
          sub_districts(name),
          property_photos(*)
        `
        )
        .eq('id', id)
        .single();

      if (error) throw new AppError(error.message, 404);
      return { entity_type: 'property', ...data };
    }
  }

  async approveCustomer(id: string, userId: string) {
    const { data, error } = await supabase
      .from('customers')
      .update({
        status: 'APPROVED',
        approved_by: userId,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    // Create audit log
    await supabase.from('audit_logs').insert({
      entity_type: 'customer',
      entity_id: id,
      action: 'approve',
      field: 'status',
      old_value: 'SUBMITTED',
      new_value: 'APPROVED',
      changed_by: userId,
    });

    // Create notification for creator
    try {
      await supabase.from('notifications').insert({
        user_id: data.created_by,
        title: 'Customer Approved',
        message: `Your customer ${data.reference_id} has been approved`,
        entity_type: 'customer',
        entity_id: id,
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    // Emit WebSocket event - REMOVED
    // try {
    //   const socketHandler = getSocketHandler();
    //   socketHandler.emitToRoom('customers', 'customers:approved', {
    //     id: data.id,
    //     reference_id: data.reference_id,
    //   });
    //   socketHandler.emitToUser(data.created_by, 'notification:new', {
    //     type: 'customer_approved',
    //     customerId: id,
    //   });
    // } catch (error) {
    //   console.error('Failed to emit socket event:', error);
    // }

    return data;
  }

  async rejectCustomer(id: string, userId: string, feedback: string) {
    const { data, error } = await supabase
      .from('customers')
      .update({
        status: 'REJECTED',
        rejection_feedback: feedback,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    // Create audit log
    await supabase.from('audit_logs').insert({
      entity_type: 'customer',
      entity_id: id,
      action: 'reject',
      field: 'status',
      old_value: 'SUBMITTED',
      new_value: 'REJECTED',
      changed_by: userId,
      metadata: { feedback },
    });

    // Create notification for creator
    try {
      await supabase.from('notifications').insert({
        user_id: data.created_by,
        title: 'Customer Rejected',
        message: `Your customer ${data.reference_id} has been rejected: ${feedback}`,
        entity_type: 'customer',
        entity_id: id,
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    // Emit WebSocket event - REMOVED
    // try {
    //   const socketHandler = getSocketHandler();
    //   socketHandler.emitToRoom('customers', 'customers:rejected', {
    //     id: data.id,
    //     reference_id: data.reference_id,
    //   });
    //   socketHandler.emitToUser(data.created_by, 'notification:new', {
    //     type: 'customer_rejected',
    //     customerId: id,
    //   });
    // } catch (error) {
    //   console.error('Failed to emit socket event:', error);
    // }

    return data;
  }

  async approveProperty(id: string, userId: string) {
    const { data, error } = await supabase
      .from('properties')
      .update({
        status: 'APPROVED',
        approved_by: userId,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    // Create audit log
    await supabase.from('audit_logs').insert({
      entity_type: 'property',
      entity_id: id,
      action: 'approve',
      field: 'status',
      old_value: 'SUBMITTED',
      new_value: 'APPROVED',
      changed_by: userId,
    });

    // Create notification for creator
    try {
      await supabase.from('notifications').insert({
        user_id: data.created_by,
        title: 'Property Approved',
        message: `Your property ${data.reference_id} has been approved`,
        entity_type: 'property',
        entity_id: id,
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    // Emit WebSocket event - REMOVED
    // try {
    //   const socketHandler = getSocketHandler();
    //   socketHandler.emitToRoom('properties', 'properties:approved', {
    //     id: data.id,
    //     reference_id: data.reference_id,
    //   });
    //   socketHandler.emitToUser(data.created_by, 'notification:new', {
    //     type: 'property_approved',
    //     propertyId: id,
    //   });
    // } catch (error) {
    //   console.error('Failed to emit socket event:', error);
    // }

    return data;
  }

  async rejectProperty(id: string, userId: string, feedback: string) {
    const { data, error } = await supabase
      .from('properties')
      .update({
        status: 'REJECTED',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    // Create audit log
    await supabase.from('audit_logs').insert({
      entity_type: 'property',
      entity_id: id,
      action: 'reject',
      field: 'status',
      old_value: 'SUBMITTED',
      new_value: 'REJECTED',
      changed_by: userId,
      metadata: { feedback },
    });

    // Create notification for creator
    try {
      await supabase.from('notifications').insert({
        user_id: data.created_by,
        title: 'Property Rejected',
        message: `Your property ${data.reference_id} has been rejected: ${feedback}`,
        entity_type: 'property',
        entity_id: id,
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    // Emit WebSocket event - REMOVED
    // try {
    //   const socketHandler = getSocketHandler();
    //   socketHandler.emitToRoom('properties', 'properties:rejected', {
    //     id: data.id,
    //     reference_id: data.reference_id,
    //   });
    //   socketHandler.emitToUser(data.created_by, 'notification:new', {
    //     type: 'property_rejected',
    //     propertyId: id,
    //   });
    // } catch (error) {
    //   console.error('Failed to emit socket event:', error);
    // }

    return data;
  }
}

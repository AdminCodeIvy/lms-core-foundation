import { supabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';
// import { getSocketHandler } from '../websocket/socketHandler'; // WebSocket removed

export interface PropertyFilters {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  districtId?: string;
  subDistrictId?: string;
  search?: string;
  showArchived?: boolean;
}

export class PropertyService {
  async getProperties(filters: PropertyFilters) {
    const {
      page = 1,
      limit = 50,
      status,
      type,
      districtId,
      subDistrictId,
      search,
      showArchived = false,
    } = filters;

    let query = supabase
      .from('properties')
      .select(
        `
        id,
        reference_id,
        parcel_number,
        property_type_id,
        status,
        district_id,
        sub_district_id,
        updated_at,
        property_types(name),
        districts(name),
        sub_districts(name)
      `,
        { count: 'exact' }
      );

    // Apply filters
    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    } else if (!showArchived) {
      query = query.neq('status', 'ARCHIVED');
    }

    if (type) {
      query = query.eq('property_type_id', type);
    }

    if (districtId) {
      query = query.eq('district_id', districtId);
    }

    if (subDistrictId) {
      query = query.eq('sub_district_id', subDistrictId);
    }

    if (search) {
      query = query.or(
        `reference_id.ilike.%${search}%,parcel_number.ilike.%${search}%`
      );
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('updated_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw new AppError(error.message, 500);

    return {
      data: data || [],
      meta: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async getProperty(id: string) {
    const { data, error } = await supabase
      .from('properties')
      .select(
        `
        *,
        property_type:property_types(id, name, category),
        district:districts(id, name, code),
        sub_district:sub_districts(id, name),
        creator:users!properties_created_by_fkey(id, full_name),
        approver:users!properties_approved_by_fkey(id, full_name),
        property_photos(*),
        property_boundaries(*),
        property_ownership(
          *,
          customer:customers(
            id,
            reference_id,
            customer_type,
            customer_person(first_name, father_name, grandfather_name),
            customer_business(business_name)
          )
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) throw new AppError(error.message, 404);
    if (!data) throw new AppError('Property not found', 404);

    // Transform array responses to single objects where appropriate
    const transformedData = {
      ...data,
      property_boundaries: Array.isArray(data.property_boundaries) && data.property_boundaries.length > 0
        ? data.property_boundaries[0]
        : data.property_boundaries,
    };

    return transformedData;
  }

  async createProperty(propertyData: any, userId: string) {
    // Extract boundaries and customer_id from propertyData
    const { boundaries, customer_id, ...propertyFields } = propertyData;

    // Generate reference ID using the service method
    const refId = await this.generateReferenceId();

    // Generate parcel number using the service method
    const parcelNumber = await this.generateParcelNumber(
      propertyData.district_id,
      propertyData.sub_district_id
    );

    // Create property
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .insert({
        ...propertyFields,
        reference_id: refId,
        parcel_number: parcelNumber,
        status: 'DRAFT',
        created_by: userId,
      })
      .select()
      .single();

    if (propertyError) throw new AppError(propertyError.message, 500);

    // Create property ownership if customer_id provided
    if (customer_id) {
      const { error: ownershipError } = await supabase
        .from('property_ownership')
        .insert({
          property_id: property.id,
          customer_id: customer_id,
          ownership_type: 'OWNER',
          ownership_percentage: 100,
          start_date: new Date().toISOString().split('T')[0],
          is_current: true,
        });

      if (ownershipError) {
        // Rollback property creation
        await supabase.from('properties').delete().eq('id', property.id);
        throw new AppError(ownershipError.message, 500);
      }
    }

    // Create boundaries if provided
    if (boundaries) {
      const { error: boundariesError } = await supabase
        .from('property_boundaries')
        .insert({
          property_id: property.id,
          ...boundaries,
        });

      if (boundariesError) {
        // Rollback property and ownership creation
        await supabase.from('property_ownership').delete().eq('property_id', property.id);
        await supabase.from('properties').delete().eq('id', property.id);
        throw new AppError(boundariesError.message, 500);
      }
    }

    // Create activity log
    await supabase.from('activity_logs').insert({
      entity_type: 'PROPERTY',
      entity_id: property.id,
      action: 'CREATED',
      performed_by: userId,
      metadata: {
        reference_id: property.reference_id,
        status: 'DRAFT',
      },
    });

    // Create audit log
    await supabase.from('audit_logs').insert({
      entity_type: 'property',
      entity_id: property.id,
      action: 'create',
      field: 'status',
      old_value: null,
      new_value: 'DRAFT',
      changed_by: userId,
    });

    // Emit WebSocket event - REMOVED
    // try {
    //   const socketHandler = getSocketHandler();
    //   socketHandler.emitToRoom('properties', 'properties:created', {
    //     id: property.id,
    //     reference_id: property.reference_id,
    //   });
    // } catch (error) {
    //   console.error('Failed to emit socket event:', error);
    // }

    return property;
  }

  async updateProperty(id: string, propertyData: any, userId: string) {
    // Extract boundaries from propertyData
    const { boundaries, ...propertyFields } = propertyData;

    // Update property
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .update({
        ...propertyFields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (propertyError) throw new AppError(propertyError.message, 500);

    // Update boundaries if provided
    if (boundaries) {
      const { error: boundariesError } = await supabase
        .from('property_boundaries')
        .upsert(
          {
            property_id: id,
            ...boundaries,
          },
          { onConflict: 'property_id' }
        );

      if (boundariesError) throw new AppError(boundariesError.message, 500);
    }

    // Create activity log
    await supabase.from('activity_logs').insert({
      entity_type: 'PROPERTY',
      entity_id: id,
      action: 'UPDATED',
      performed_by: userId,
      metadata: {
        updated_fields: Object.keys(propertyFields),
      },
    });

    // Create audit log
    await supabase.from('audit_logs').insert({
      entity_type: 'property',
      entity_id: id,
      action: 'update',
      field: null,
      old_value: null,
      new_value: 'Updated property details',
      changed_by: userId,
    });

    // Emit WebSocket event - REMOVED
    // try {
    //   const socketHandler = getSocketHandler();
    //   socketHandler.emitToRoom('properties', 'properties:updated', {
    //     id: property.id,
    //     reference_id: property.reference_id,
    //   });
    // } catch (error) {
    //   console.error('Failed to emit socket event:', error);
    // }

    return property;
  }

  async deleteProperty(id: string, userId: string) {
    const { error } = await supabase.from('properties').delete().eq('id', id);

    if (error) throw new AppError(error.message, 500);

    // Log audit
    await supabase.from('audit_logs').insert({
      entity_type: 'property',
      entity_id: id,
      action: 'delete',
      field: 'status',
      old_value: 'DRAFT',
      new_value: 'DELETED',
      changed_by: userId,
    });

    // Emit WebSocket event - REMOVED
    // try {
    //   const socketHandler = getSocketHandler();
    //   socketHandler.emitToRoom('properties', 'properties:deleted', { id });
    // } catch (error) {
    //   console.error('Failed to emit socket event:', error);
    // }
  }

  async submitProperty(id: string, userId: string) {
    const { data, error } = await supabase
      .from('properties')
      .update({ status: 'SUBMITTED' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    // Create notification for approvers (optional - don't fail if it doesn't work)
    try {
      const { data: approvers } = await supabase
        .from('users')
        .select('id')
        .in('role', ['APPROVER', 'ADMINISTRATOR'])
        .eq('is_active', true);

      if (approvers && approvers.length > 0) {
        const notifications = approvers.map((approver) => ({
          user_id: approver.id,
          title: 'New Property Submission',
          message: `Property ${data.reference_id} has been submitted for approval`,
          entity_type: 'property',
          entity_id: id,
        }));

        await supabase.from('notifications').insert(notifications);
      }
    } catch (notifError) {
      console.error('Failed to create notifications:', notifError);
    }

    // Emit WebSocket event - REMOVED
    // try {
    //   const socketHandler = getSocketHandler();
    //   socketHandler.emitToRoom('properties', 'properties:submitted', {
    //     id: data.id,
    //     reference_id: data.reference_id,
    //   });
    //   socketHandler.emitToRole('APPROVER', 'notification:new', {
    //     type: 'property_submitted',
    //     propertyId: id,
    //   });
    // } catch (error) {
    //   console.error('Failed to emit socket event:', error);
    // }

    return data;
  }

  async archiveProperty(id: string, userId: string) {
    const { data, error } = await supabase
      .from('properties')
      .update({ status: 'ARCHIVED' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    // Emit WebSocket event - REMOVED
    // try {
    //   const socketHandler = getSocketHandler();
    //   socketHandler.emitToRoom('properties', 'properties:archived', {
    //     id: data.id,
    //     reference_id: data.reference_id,
    //   });
    // } catch (error) {
    //   console.error('Failed to emit socket event:', error);
    // }

    return data;
  }

  async generateReferenceId(): Promise<string> {
    // Try to use the RPC function, fallback to manual generation
    const { data, error } = await supabase.rpc('generate_property_reference_id');

    if (error) {
      // Fallback: Generate manually
      const { count } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true });
      
      const nextNumber = (count || 0) + 1;
      return `PROP-2025-${String(nextNumber).padStart(5, '0')}`;
    }

    return data;
  }

  async generateParcelNumber(districtId: string, subDistrictId: string): Promise<string> {
    // Try to use the RPC function, fallback to manual generation
    const { data, error } = await supabase.rpc('generate_parcel_number', {
      p_district_id: districtId,
      p_sub_district_id: subDistrictId,
    });

    if (error) {
      // Fallback: Generate manually
      const { count } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true });
      
      const nextNumber = (count || 0) + 1;
      return `PARCEL-2025-${String(nextNumber).padStart(5, '0')}`;
    }

    return data;
  }

  async uploadPhoto(propertyId: string, file: Express.Multer.File, userId: string) {
    // Generate unique filename
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${propertyId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('property-photos')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) throw new AppError(uploadError.message, 500);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('property-photos')
      .getPublicUrl(fileName);

    // Save photo metadata to database
    const { data: photo, error: photoError } = await supabase
      .from('property_photos')
      .insert({
        property_id: propertyId,
        photo_url: publicUrl,
        uploaded_by: userId,
      })
      .select()
      .single();

    if (photoError) {
      // Cleanup: delete uploaded file if database insert fails
      await supabase.storage.from('property-photos').remove([fileName]);
      throw new AppError(photoError.message, 500);
    }

    return photo;
  }

  async deletePhoto(photoId: string, userId: string) {
    const { error } = await supabase
      .from('property_photos')
      .delete()
      .eq('id', photoId);

    if (error) throw new AppError(error.message, 500);
  }

  async getPropertyForTax(propertyId: string) {
    const { data, error } = await supabase
      .from('properties')
      .select(
        `
        id,
        reference_id,
        parcel_number,
        property_type_id,
        district_id,
        sub_district_id,
        size,
        property_types(name, category),
        districts(name),
        sub_districts(name)
      `
      )
      .eq('id', propertyId)
      .eq('status', 'APPROVED')
      .single();

    if (error) throw new AppError(error.message, 404);
    if (!data) throw new AppError('Property not found or not approved', 404);

    return data;
  }

  async searchProperties(searchTerm: string) {
    const { data, error } = await supabase
      .from('properties')
      .select(
        `
        id,
        reference_id,
        parcel_number,
        property_type_id,
        district_id,
        sub_district_id,
        property_types(name),
        districts(name),
        sub_districts(name)
      `
      )
      .or(
        `reference_id.ilike.%${searchTerm}%,parcel_number.ilike.%${searchTerm}%`
      )
      .limit(10);

    if (error) throw new AppError(error.message, 500);

    return data || [];
  }

  async syncToAGO(propertyId: string, userId: string) {
    // This would integrate with AGO API
    // For now, just return success message (AGO not implemented yet)
    const { data, error } = await supabase
      .from('properties')
      .select()
      .eq('id', propertyId)
      .single();

    if (error) throw new AppError(error.message, 500);

    // TODO: Implement actual AGO sync logic here
    // For now, just return the property data
    return { ...data, ago_sync_message: 'AGO sync will be implemented later' };
  }
}

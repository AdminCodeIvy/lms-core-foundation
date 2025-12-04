import { supabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export interface UserFilters {
  page?: number;
  limit?: number;
  role?: string;
  isActive?: boolean;
  search?: string;
}

export class AdminService {
  async getUsers(filters: UserFilters) {
    const {
      page = 1,
      limit = 50,
      role,
      isActive,
      search,
    } = filters;

    let query = supabase
      .from('users')
      .select('id, full_name, role, is_active, created_at, updated_at', { count: 'exact' });

    // Apply filters
    if (role && role !== 'ALL') {
      query = query.eq('role', role);
    }

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%`);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

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

  async getUser(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, role, is_active, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) throw new AppError(error.message, 404);
    if (!data) throw new AppError('User not found', 404);

    return data;
  }

  async createUser(userData: any) {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
    });

    if (authError) throw new AppError(authError.message, 500);

    // Create user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        full_name: userData.full_name,
        role: userData.role,
        is_active: true,
      })
      .select()
      .single();

    if (profileError) {
      // Rollback auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new AppError(profileError.message, 500);
    }

    return profile;
  }

  async updateUser(id: string, userData: any) {
    const { data, error } = await supabase
      .from('users')
      .update({
        full_name: userData.full_name,
        role: userData.role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    return data;
  }

  async deactivateUser(id: string) {
    const { data, error } = await supabase
      .from('users')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    return data;
  }

  async getAuditLogs(filters: any) {
    const {
      page = 1,
      limit = 50,
      entityType,
      entityId,
      userId,
      action,
    } = filters;

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    // Apply filters
    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    if (entityId) {
      query = query.eq('entity_id', entityId);
    }

    if (userId) {
      query = query.eq('changed_by', userId);
    }

    if (action) {
      query = query.eq('action', action);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

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

  async getAGOSettings() {
    // For now, return placeholder settings
    // In production, this would fetch from a settings table
    return {
      enabled: false,
      api_url: process.env.AGO_API_URL || '',
      api_key: process.env.AGO_API_KEY ? '***hidden***' : '',
      sync_interval: 3600,
      last_sync: null,
      status: 'not_configured',
    };
  }

  async updateAGOSettings(settings: any) {
    // For now, just return success
    // In production, this would update a settings table
    return {
      ...settings,
      api_key: '***hidden***',
      updated_at: new Date().toISOString(),
    };
  }

  async testAGOConnection() {
    // For now, return placeholder response
    // In production, this would test the actual AGO connection
    return {
      success: false,
      message: 'AGO integration not yet implemented',
      timestamp: new Date().toISOString(),
    };
  }
}

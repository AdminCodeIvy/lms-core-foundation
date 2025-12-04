import { supabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export interface ActivityLogFilters {
  page?: number;
  limit?: number;
  entityType?: string;
  entityId?: string;
  action?: string;
  userId?: string;
}

export class ActivityLogService {
  async getActivityLogs(filters: ActivityLogFilters) {
    const {
      page = 1,
      limit = 50,
      entityType,
      entityId,
      action,
      userId,
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

    if (action) {
      query = query.eq('action', action);
    }

    if (userId) {
      query = query.eq('changed_by', userId);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw new AppError(error.message, 500);

    // Enrich with user information
    const enrichedData = await this.enrichWithUserInfo(data || []);

    return {
      data: enrichedData,
      meta: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async getActivityLogsByEntity(entityType: string, entityId: string, filters: any = {}) {
    const {
      page = 1,
      limit = 50,
    } = filters;

    const query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw new AppError(error.message, 500);

    // Enrich with user information
    const enrichedData = await this.enrichWithUserInfo(data || []);

    return {
      data: enrichedData,
      meta: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  private async enrichWithUserInfo(logs: any[]) {
    if (logs.length === 0) return logs;

    // Get unique user IDs
    const userIds = [...new Set(logs.map(log => log.changed_by))];

    // Fetch user information
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, role')
      .in('id', userIds);

    const userMap = new Map(users?.map(u => [u.id, u]) || []);

    // Enrich logs with user info
    return logs.map(log => ({
      ...log,
      user: userMap.get(log.changed_by) || null,
    }));
  }

  async createActivityLog(logData: {
    entityType: string;
    entityId: string;
    action: string;
    field?: string;
    oldValue?: any;
    newValue?: any;
    userId: string;
  }) {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        entity_type: logData.entityType,
        entity_id: logData.entityId,
        action: logData.action,
        field: logData.field || null,
        old_value: logData.oldValue ? String(logData.oldValue) : null,
        new_value: logData.newValue ? String(logData.newValue) : null,
        changed_by: logData.userId,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    return data;
  }
}

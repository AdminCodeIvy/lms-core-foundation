import { supabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';
// import { getSocketHandler } from '../websocket/socketHandler'; // WebSocket removed

export interface NotificationFilters {
  page?: number;
  limit?: number;
  isRead?: boolean;
}

export class NotificationService {
  async getNotifications(userId: string, filters: NotificationFilters) {
    const {
      page = 1,
      limit = 50,
      isRead,
    } = filters;

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (isRead !== undefined) {
      query = query.eq('is_read', isRead);
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

  async getUnreadCount(userId: string) {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw new AppError(error.message, 500);

    return { count: count || 0 };
  }

  async markAsRead(userId: string, notificationId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    // WebSocket removed - not needed for LMS

    return data;
  }

  async markAllAsRead(userId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw new AppError(error.message, 500);

    // WebSocket removed - not needed for LMS

    return { message: 'All notifications marked as read' };
  }
}

import { apiClient } from './api';

export interface Notification {
  id: string;
  title: string;
  message: string;
  entity_type: string;
  entity_id: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationFilters {
  isRead?: boolean;
  limit?: number;
  offset?: number;
}

export const notificationService = {
  async getNotifications(filters?: NotificationFilters) {
    const response = await apiClient.get<{ data: Notification[] }>('/notifications', filters);
    return response.data;
  },

  async getUnreadCount() {
    const response = await apiClient.get<{ data: { count: number } }>('/notifications/unread-count');
    return response.data.count;
  },

  async markAsRead(notificationId: string) {
    const response = await apiClient.patch<{ data: Notification }>(`/notifications/${notificationId}/read`);
    return response.data;
  },

  async markAllAsRead() {
    const response = await apiClient.patch<{ data: { updated: number } }>('/notifications/mark-all-read');
    return response.data;
  },
};

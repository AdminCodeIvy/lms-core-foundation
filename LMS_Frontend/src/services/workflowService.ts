import { apiClient } from './api';

export interface ReviewQueueFilters {
  page?: number;
  limit?: number;
  entityType?: 'customer' | 'property';
  search?: string;
}

export const workflowService = {
  async getReviewQueue(filters?: ReviewQueueFilters) {
    const response = await apiClient.get<any>('/workflow/review-queue', filters);
    return response;
  },

  async getReviewItem(entityType: 'customer' | 'property', entityId: string) {
    const response = await apiClient.get<any>(`/workflow/review-queue/${entityType}/${entityId}`);
    return response.data;
  },

  async approveCustomer(customerId: string) {
    const response = await apiClient.post<any>(`/workflow/customers/${customerId}/approve`);
    return response.data;
  },

  async rejectCustomer(customerId: string, feedback: string) {
    const response = await apiClient.post<any>(`/workflow/customers/${customerId}/reject`, { feedback });
    return response.data;
  },

  async approveProperty(propertyId: string) {
    const response = await apiClient.post<any>(`/workflow/properties/${propertyId}/approve`);
    return response.data;
  },

  async rejectProperty(propertyId: string, feedback: string) {
    const response = await apiClient.post<any>(`/workflow/properties/${propertyId}/reject`, { feedback });
    return response.data;
  },
};

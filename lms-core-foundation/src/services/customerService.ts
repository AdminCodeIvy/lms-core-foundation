import { apiClient } from './api';

export interface CustomerFilters {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  search?: string;
  showArchived?: boolean;
}

export const customerService = {
  async getCustomers(filters?: CustomerFilters) {
    // apiClient already returns the parsed response body (response.data from axios interceptor)
    // Backend returns: { success: true, data: [...], meta: { page, limit, total, totalPages } }
    const response = await apiClient.get<any>('/customers', filters);
    return response;
  },

  async getCustomer(id: string) {
    const response = await apiClient.get<any>(`/customers/${id}`);
    return response.data;
  },

  async createCustomer(data: any) {
    const response = await apiClient.post<any>('/customers', data);
    return response.data;
  },

  async updateCustomer(id: string, data: any) {
    const response = await apiClient.put<any>(`/customers/${id}`, data);
    return response.data;
  },

  async deleteCustomer(id: string) {
    await apiClient.delete(`/customers/${id}`);
  },

  async submitCustomer(id: string) {
    const response = await apiClient.post<any>(`/customers/${id}/submit`);
    return response.data;
  },

  async archiveCustomer(id: string) {
    const response = await apiClient.patch<any>(`/customers/${id}/archive`);
    return response.data;
  },

  async generateReferenceId() {
    const response = await apiClient.get<any>('/customers/generate-reference-id');
    return response.data.referenceId;
  },

  async getApprovedCustomers() {
    const response = await apiClient.get<any>('/customers', { 
      status: 'APPROVED',
      limit: 100 
    });
    return response.data;
  },
};

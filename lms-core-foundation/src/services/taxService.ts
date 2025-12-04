import { apiClient } from './api';

export interface TaxFilters {
  page?: number;
  limit?: number;
  year?: number;
  status?: string;
  search?: string;
  showArchived?: boolean;
}

export const taxService = {
  async getAssessments(filters?: TaxFilters) {
    const response = await apiClient.get<any>('/tax/assessments', filters);
    return response;
  },

  async getAssessment(id: string) {
    const response = await apiClient.get<any>(`/tax/assessments/${id}`);
    return response.data;
  },

  async createAssessment(data: any) {
    const response = await apiClient.post<any>('/tax/assessments', data);
    return response.data;
  },

  async updateAssessment(id: string, data: any) {
    const response = await apiClient.put<any>(`/tax/assessments/${id}`, data);
    return response.data;
  },

  async deleteAssessment(id: string) {
    await apiClient.delete(`/tax/assessments/${id}`);
  },

  async archiveAssessment(id: string) {
    const response = await apiClient.patch<any>(`/tax/assessments/${id}/archive`);
    return response.data;
  },

  async getPayments(assessmentId: string) {
    const response = await apiClient.get<any>(`/tax/assessments/${assessmentId}/payments`);
    return response.data;
  },

  async createPayment(assessmentId: string, data: any) {
    const response = await apiClient.post<any>(`/tax/assessments/${assessmentId}/payments`, data);
    return response.data;
  },

  async getTaxStats(year?: number) {
    const response = await apiClient.get<any>('/tax/stats', year ? { year } : undefined);
    return response.data;
  },
};

import { apiClient } from './api';

export interface PropertyFilters {
  page?: number;
  limit?: number;
  status?: string;
  district?: string;
  propertyType?: string;
  search?: string;
  showArchived?: boolean;
}

export const propertyService = {
  async getProperties(filters?: PropertyFilters) {
    const response = await apiClient.get<any>('/properties', filters);
    return response;
  },

  async getProperty(id: string) {
    const response = await apiClient.get<any>(`/properties/${id}`);
    return response.data;
  },

  async createProperty(data: any) {
    const response = await apiClient.post<any>('/properties', data);
    return response.data;
  },

  async updateProperty(id: string, data: any) {
    const response = await apiClient.put<any>(`/properties/${id}`, data);
    return response.data;
  },

  async deleteProperty(id: string) {
    await apiClient.delete(`/properties/${id}`);
  },

  async submitProperty(id: string) {
    const response = await apiClient.post<any>(`/properties/${id}/submit`);
    return response.data;
  },

  async archiveProperty(id: string) {
    const response = await apiClient.patch<any>(`/properties/${id}/archive`);
    return response.data;
  },

  async generateReferenceId(districtCode: string) {
    const response = await apiClient.get<any>('/properties/generate-reference-id', { district: districtCode });
    return response.data.referenceId;
  },

  async generateParcelNumber() {
    const response = await apiClient.get<any>('/properties/generate-parcel-number');
    return response.data.parcelNumber;
  },

  async uploadPhoto(propertyId: string, file: File) {
    const formData = new FormData();
    formData.append('photo', file);
    // Axios automatically sets Content-Type for FormData
    const response = await apiClient.post<any>(`/properties/${propertyId}/photos`, formData);
    return response.data;
  },

  async deletePhoto(propertyId: string, photoId: string) {
    await apiClient.delete(`/properties/${propertyId}/photos/${photoId}`);
  },

  async getPropertyForTax(id: string) {
    const response = await apiClient.get<any>(`/properties/${id}/for-tax`);
    return response.data;
  },

  async searchProperties(query: string) {
    const response = await apiClient.get<any>('/properties/search', { q: query });
    return response.data;
  },

  async syncToAGO(id: string) {
    const response = await apiClient.post<any>(`/properties/${id}/sync-ago`);
    return response.data;
  },
};

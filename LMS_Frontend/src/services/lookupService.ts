import { apiClient } from './api';

export const lookupService = {
  async getDistricts() {
    const response = await apiClient.get<any>('/lookups/districts');
    return response.data;
  },

  async getSubDistricts(districtId?: string) {
    const response = await apiClient.get<any>('/lookups/sub-districts', 
      districtId ? { district_id: districtId } : undefined
    );
    return response.data;
  },

  async getPropertyTypes() {
    const response = await apiClient.get<any>('/lookups/property-types');
    return response.data;
  },

  async getCarriers() {
    const response = await apiClient.get<any>('/lookups/carriers');
    return response.data;
  },

  async getCountries() {
    const response = await apiClient.get<any>('/lookups/countries');
    return response.data;
  },
};

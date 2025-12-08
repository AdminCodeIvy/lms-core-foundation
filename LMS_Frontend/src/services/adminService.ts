import { apiClient } from './api';

// User Management
export interface User {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserFilters {
  search?: string;
  role?: string;
  isActive?: boolean;
}

// Lookup Management
export interface District {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

export interface SubDistrict {
  id: string;
  district_id: string;
  name: string;
  is_active: boolean;
}

export interface PropertyType {
  id: string;
  name: string;
  category: string;
  is_active: boolean;
}

export interface Carrier {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Country {
  id: string;
  code: string;
  name: string;
}

// Audit Logs
export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  timestamp: string;
  users?: {
    id: string;
    full_name: string;
  };
}

export interface AuditLogFilters {
  entityType?: string;
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export const adminService = {
  // User Management
  async getUsers(filters?: UserFilters) {
    const response = await apiClient.get<{ data: User[] }>('/admin/users', filters);
    return response.data;
  },

  async toggleUserStatus(userId: string, isActive: boolean) {
    // Backend currently only has deactivate endpoint
    // If we're deactivating (isActive = false), use the deactivate endpoint
    if (!isActive) {
      const response = await apiClient.patch<{ data: User }>(`/admin/users/${userId}/deactivate`);
      return response.data;
    }
    // For activation, we'd need to use the update endpoint
    const response = await apiClient.put<{ data: User }>(`/admin/users/${userId}`, { is_active: isActive });
    return response.data;
  },

  // Lookup Management - Districts
  async getDistricts() {
    const response = await apiClient.get<{ data: District[] }>('/lookups/districts');
    return response.data;
  },

  async createDistrict(data: Omit<District, 'id'>) {
    const response = await apiClient.post<{ data: District }>('/lookups/districts', data);
    return response.data;
  },

  async updateDistrict(id: string, data: Partial<District>) {
    const response = await apiClient.put<{ data: District }>(`/lookups/districts/${id}`, data);
    return response.data;
  },

  async toggleDistrictStatus(id: string, isActive: boolean) {
    // Backend uses PUT for updates, so we update the is_active field
    const response = await apiClient.put<{ data: District }>(`/lookups/districts/${id}`, { is_active: isActive });
    return response.data;
  },

  // Lookup Management - Sub-Districts
  async getSubDistricts() {
    const response = await apiClient.get<{ data: SubDistrict[] }>('/lookups/sub-districts');
    return response.data;
  },

  async createSubDistrict(data: Omit<SubDistrict, 'id'>) {
    const response = await apiClient.post<{ data: SubDistrict }>('/lookups/sub-districts', data);
    return response.data;
  },

  async updateSubDistrict(id: string, data: Partial<SubDistrict>) {
    const response = await apiClient.put<{ data: SubDistrict }>(`/lookups/sub-districts/${id}`, data);
    return response.data;
  },

  // Lookup Management - Property Types
  async getPropertyTypes() {
    const response = await apiClient.get<{ data: PropertyType[] }>('/lookups/property-types');
    return response.data;
  },

  async createPropertyType(data: Omit<PropertyType, 'id'>) {
    const response = await apiClient.post<{ data: PropertyType }>('/lookups/property-types', data);
    return response.data;
  },

  async updatePropertyType(id: string, data: Partial<PropertyType>) {
    const response = await apiClient.put<{ data: PropertyType }>(`/lookups/property-types/${id}`, data);
    return response.data;
  },

  // Lookup Management - Carriers
  async getCarriers() {
    const response = await apiClient.get<{ data: Carrier[] }>('/lookups/carriers');
    return response.data;
  },

  async createCarrier(data: Omit<Carrier, 'id'>) {
    const response = await apiClient.post<{ data: Carrier }>('/lookups/carriers', data);
    return response.data;
  },

  async updateCarrier(id: string, data: Partial<Carrier>) {
    const response = await apiClient.put<{ data: Carrier }>(`/lookups/carriers/${id}`, data);
    return response.data;
  },

  // Lookup Management - Countries
  async getCountries() {
    const response = await apiClient.get<{ data: Country[] }>('/lookups/countries');
    return response.data;
  },

  async createCountry(data: Omit<Country, 'id'>) {
    const response = await apiClient.post<{ data: Country }>('/lookups/countries', data);
    return response.data;
  },

  async updateCountry(id: string, data: Partial<Country>) {
    const response = await apiClient.put<{ data: Country }>(`/lookups/countries/${id}`, data);
    return response.data;
  },

  // Audit Logs
  async getAuditLogs(filters?: AuditLogFilters) {
    const response = await apiClient.get<{ data: AuditLog[]; total: number }>('/admin/audit-logs', filters);
    return response;
  },

  // User CRUD operations
  async getUser(userId: string) {
    const response = await apiClient.get<{ data: User }>(`/admin/users/${userId}`);
    return response.data;
  },

  async createUser(data: { email: string; password: string; full_name: string; role: string }) {
    const response = await apiClient.post<{ data: User }>('/admin/users', data);
    return response.data;
  },

  async updateUser(userId: string, data: { full_name?: string; role?: string; is_active?: boolean }) {
    const response = await apiClient.put<{ data: User }>(`/admin/users/${userId}`, data);
    return response.data;
  },

  // Activity Logs (for specific entities)
  async getActivityLogs(entityType: string, entityId: string) {
    const response = await apiClient.get<{ data: any[] }>(`/activity-logs/${entityType}/${entityId}`);
    return response.data;
  },
};

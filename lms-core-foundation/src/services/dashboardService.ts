import { apiClient } from './api';

export interface DashboardStats {
  drafts_pending: number;
  waiting_approval: number;
  approved: number;
  rejections: number;
}

export interface TaxStats {
  total_assessed: number;
  total_collected: number;
  collection_rate: number;
  total_outstanding: number;
}

interface BackendDashboardStats {
  customers: {
    total: number;
    pending: number;
    approved: number;
  };
  properties: {
    total: number;
    pending: number;
    approved: number;
  };
  tax: {
    year: number;
    totalAssessments: number;
    totalAmount: number;
    totalPaid: number;
    totalOutstanding: number;
    collectionRate: number;
  };
}

interface BackendTaxStats {
  year: number;
  totalAssessments: number;
  totalAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  collectionRate: number;
}

export const dashboardService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get<{ data: BackendDashboardStats }>('/dashboard/stats');
    const data = response.data;
    
    // Transform backend format to frontend format
    // Combine customers and properties for overall stats
    return {
      drafts_pending: data.customers.total - data.customers.pending - data.customers.approved,
      waiting_approval: data.customers.pending + data.properties.pending,
      approved: data.customers.approved + data.properties.approved,
      rejections: 0, // Backend doesn't track rejections separately yet
    };
  },

  async getTaxStats(year?: number): Promise<TaxStats> {
    const response = await apiClient.get<{ data: BackendTaxStats }>('/dashboard/tax-stats', { year });
    const data = response.data;
    
    // Transform backend format to frontend format
    return {
      total_assessed: data.totalAmount,
      total_collected: data.totalPaid,
      collection_rate: data.collectionRate,
      total_outstanding: data.totalOutstanding,
    };
  },
};

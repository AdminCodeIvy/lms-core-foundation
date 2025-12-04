import { supabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export class DashboardService {
  async getDashboardStats() {
    try {
      // Get customer stats
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'ARCHIVED');

      const { count: pendingCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'SUBMITTED');

      const { count: approvedCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'APPROVED');

      // Get property stats
      const { count: totalProperties } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'ARCHIVED');

      const { count: pendingProperties } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'SUBMITTED');

      const { count: approvedProperties } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'APPROVED');

      // Get tax stats for current year
      const currentYear = new Date().getFullYear();
      const { count: totalAssessments } = await supabase
        .from('tax_assessments')
        .select('*', { count: 'exact', head: true })
        .eq('tax_year', currentYear);

      const { data: taxData } = await supabase
        .from('tax_assessments')
        .select('assessed_amount, paid_amount, outstanding_amount')
        .eq('tax_year', currentYear);

      const totalTaxAmount = taxData?.reduce((sum, item) => sum + (item.assessed_amount || 0), 0) || 0;
      const totalPaid = taxData?.reduce((sum, item) => sum + (item.paid_amount || 0), 0) || 0;
      const totalOutstanding = taxData?.reduce((sum, item) => sum + (item.outstanding_amount || 0), 0) || 0;

      // Get recent activities (last 10)
      const { data: recentActivities } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      return {
        customers: {
          total: totalCustomers || 0,
          pending: pendingCustomers || 0,
          approved: approvedCustomers || 0,
        },
        properties: {
          total: totalProperties || 0,
          pending: pendingProperties || 0,
          approved: approvedProperties || 0,
        },
        tax: {
          year: currentYear,
          totalAssessments: totalAssessments || 0,
          totalAmount: totalTaxAmount,
          totalPaid: totalPaid,
          totalOutstanding: totalOutstanding,
          collectionRate: totalTaxAmount > 0 ? (totalPaid / totalTaxAmount) * 100 : 0,
        },
        recentActivities: recentActivities || [],
      };
    } catch (error: any) {
      throw new AppError(error.message, 500);
    }
  }

  async getTaxStats(year?: number) {
    const targetYear = year || new Date().getFullYear();

    const { count: totalAssessments } = await supabase
      .from('tax_assessments')
      .select('*', { count: 'exact', head: true })
      .eq('tax_year', targetYear);

    const { data: taxData } = await supabase
      .from('tax_assessments')
      .select('assessed_amount, paid_amount, outstanding_amount, status')
      .eq('tax_year', targetYear);

    const totalAmount = taxData?.reduce((sum, item) => sum + (item.assessed_amount || 0), 0) || 0;
    const totalPaid = taxData?.reduce((sum, item) => sum + (item.paid_amount || 0), 0) || 0;
    const totalOutstanding = taxData?.reduce((sum, item) => sum + (item.outstanding_amount || 0), 0) || 0;

    const statusBreakdown = taxData?.reduce((acc: any, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {}) || {};

    return {
      year: targetYear,
      totalAssessments: totalAssessments || 0,
      totalAmount,
      totalPaid,
      totalOutstanding,
      collectionRate: totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0,
      statusBreakdown,
    };
  }
}

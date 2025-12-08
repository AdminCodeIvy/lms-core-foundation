import { supabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';
// import { getSocketHandler } from '../websocket/socketHandler'; // WebSocket removed

export interface TaxFilters {
  page?: number;
  limit?: number;
  status?: string;
  propertyId?: string;
  year?: number;
  search?: string;
  arrearsOnly?: boolean;
  district_id?: string;
}

export class TaxService {
  async getAssessments(filters: TaxFilters) {
    const {
      page = 1,
      limit = 50,
      status,
      propertyId,
      year,
      search,
      arrearsOnly = false,
      district_id,
    } = filters;

    let query = supabase
      .from('tax_assessments')
      .select(
        `
        *,
        properties(reference_id, parcel_number, district_id)
      `,
        { count: 'exact' }
      );

    // Apply filters
    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    if (year) {
      query = query.eq('tax_year', year);
    }

    if (search) {
      query = query.or(`reference_id.ilike.%${search}%`);
    }

    // Arrears only filter (overdue or partial with outstanding amount)
    if (arrearsOnly) {
      query = query.or('status.eq.OVERDUE,and(status.eq.PARTIAL,outstanding_amount.gt.0)');
    }

    // District filter (via properties)
    if (district_id) {
      query = query.eq('properties.district_id', district_id);
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

  async getAssessment(id: string) {
    const { data, error } = await supabase
      .from('tax_assessments')
      .select(
        `
        *,
        properties(
          reference_id,
          parcel_number,
          property_location,
          size,
          property_types(name, category),
          districts(name),
          sub_districts(name)
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) throw new AppError(error.message, 404);
    if (!data) throw new AppError('Tax assessment not found', 404);

    return data;
  }

  async createAssessment(assessmentData: any, userId: string) {
    // Generate reference ID
    const { count } = await supabase
      .from('tax_assessments')
      .select('*', { count: 'exact', head: true });

    const nextNumber = (count || 0) + 1;
    const referenceId = `TAX-${assessmentData.tax_year}-${String(nextNumber).padStart(5, '0')}`;

    // Calculate assessed amount (base_assessment - exemption_amount)
    const baseAssessment = assessmentData.base_assessment || 0;
    const exemptionAmount = assessmentData.exemption_amount || 0;
    const assessedAmount = baseAssessment - exemptionAmount;

    // Create assessment
    const { data: assessment, error: assessmentError } = await supabase
      .from('tax_assessments')
      .insert({
        ...assessmentData,
        reference_id: referenceId,
        assessed_amount: assessedAmount,
        paid_amount: 0,
        outstanding_amount: assessedAmount,
        status: 'NOT_ASSESSED',
        created_by: userId,
      })
      .select()
      .single();

    if (assessmentError) throw new AppError(assessmentError.message, 500);

    // Create audit log
    await supabase.from('audit_logs').insert({
      entity_type: 'tax_assessment',
      entity_id: assessment.id,
      action: 'create',
      field: 'status',
      old_value: null,
      new_value: 'PENDING',
      changed_by: userId,
    });

    // WebSocket removed - not needed for LMS

    return assessment;
  }

  async updateAssessment(id: string, assessmentData: any, userId: string) {
    // Recalculate assessed amount if base or exemption changed
    let updateData = { ...assessmentData };
    
    if (assessmentData.base_assessment !== undefined || 
        assessmentData.exemption_amount !== undefined) {
      
      // Get current assessment
      const { data: current } = await supabase
        .from('tax_assessments')
        .select('base_assessment, exemption_amount, paid_amount')
        .eq('id', id)
        .single();

      if (current) {
        const baseAssessment = assessmentData.base_assessment ?? current.base_assessment;
        const exemptionAmount = assessmentData.exemption_amount ?? current.exemption_amount;
        const assessedAmount = baseAssessment - exemptionAmount;

        updateData.assessed_amount = assessedAmount;
        updateData.outstanding_amount = assessedAmount - (current.paid_amount || 0);
      }
    }

    const { data: assessment, error: assessmentError } = await supabase
      .from('tax_assessments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (assessmentError) throw new AppError(assessmentError.message, 500);

    // Create audit log
    await supabase.from('audit_logs').insert({
      entity_type: 'tax_assessment',
      entity_id: id,
      action: 'update',
      field: 'assessment_data',
      old_value: null,
      new_value: JSON.stringify(updateData),
      changed_by: userId,
    });

    // WebSocket removed - not needed for LMS

    return assessment;
  }

  async deleteAssessment(id: string, userId: string) {
    const { error } = await supabase.from('tax_assessments').delete().eq('id', id);

    if (error) throw new AppError(error.message, 500);

    // Log audit
    await supabase.from('audit_logs').insert({
      entity_type: 'tax_assessment',
      entity_id: id,
      action: 'delete',
      field: 'status',
      old_value: 'PENDING',
      new_value: 'DELETED',
      changed_by: userId,
    });

    // WebSocket removed - not needed for LMS
  }

  async archiveAssessment(id: string, userId: string) {
    const { data, error } = await supabase
      .from('tax_assessments')
      .update({ status: 'ARCHIVED' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    // WebSocket removed - not needed for LMS

    return data;
  }

  async getPayments(assessmentId: string) {
    const { data, error } = await supabase
      .from('tax_payments')
      .select('*')
      .eq('assessment_id', assessmentId)
      .order('payment_date', { ascending: false });

    if (error) throw new AppError(error.message, 500);

    return data || [];
  }

  async createPayment(paymentData: any, userId: string) {
    // Get assessment
    const { data: assessment, error: assessmentError } = await supabase
      .from('tax_assessments')
      .select('*')
      .eq('id', paymentData.assessment_id)
      .single();

    if (assessmentError || !assessment) {
      throw new AppError('Tax assessment not found', 404);
    }

    // Generate receipt number
    const { count } = await supabase
      .from('tax_payments')
      .select('*', { count: 'exact', head: true });

    const nextNumber = (count || 0) + 1;
    const receiptNumber = `RCPT-${new Date().getFullYear()}-${String(nextNumber).padStart(5, '0')}`;

    // Create payment
    const { data: payment, error: paymentError } = await supabase
      .from('tax_payments')
      .insert({
        ...paymentData,
        receipt_number: receiptNumber,
        recorded_by: userId,
      })
      .select()
      .single();

    if (paymentError) throw new AppError(paymentError.message, 500);

    // Update assessment
    const newPaidAmount = (assessment.paid_amount || 0) + paymentData.amount;
    const newOutstandingAmount = assessment.assessed_amount - newPaidAmount;
    const newStatus = newOutstandingAmount <= 0 ? 'PAID' : 'PARTIAL';

    await supabase
      .from('tax_assessments')
      .update({
        paid_amount: newPaidAmount,
        outstanding_amount: newOutstandingAmount,
        status: newStatus,
      })
      .eq('id', paymentData.assessment_id);

    // Create audit log for payment
    await supabase.from('audit_logs').insert({
      entity_type: 'tax_payment',
      entity_id: payment.id,
      action: 'create',
      field: 'amount',
      old_value: null,
      new_value: paymentData.amount.toString(),
      changed_by: userId,
      metadata: { receipt_number: receiptNumber, assessment_id: paymentData.assessment_id } as any,
    });

    // Create audit log for assessment status change
    if (assessment.status !== newStatus) {
      await supabase.from('audit_logs').insert({
        entity_type: 'tax_assessment',
        entity_id: paymentData.assessment_id,
        action: 'update',
        field: 'status',
        old_value: assessment.status,
        new_value: newStatus,
        changed_by: userId,
        metadata: { payment_id: payment.id } as any,
      });
    }

    // WebSocket removed - not needed for LMS

    return payment;
  }

  async getTaxStats(year?: number) {
    const currentYear = year || new Date().getFullYear();

    // Get total assessments
    const { count: totalAssessments } = await supabase
      .from('tax_assessments')
      .select('*', { count: 'exact', head: true })
      .eq('tax_year', currentYear);

    // Get total amount
    const { data: amountData } = await supabase
      .from('tax_assessments')
      .select('assessed_amount, paid_amount, outstanding_amount')
      .eq('tax_year', currentYear);

    const totalAmount = amountData?.reduce((sum, item) => sum + (item.assessed_amount || 0), 0) || 0;
    const totalPaid = amountData?.reduce((sum, item) => sum + (item.paid_amount || 0), 0) || 0;
    const totalOutstanding = amountData?.reduce((sum, item) => sum + (item.outstanding_amount || 0), 0) || 0;

    // Get status breakdown
    const { data: statusData } = await supabase
      .from('tax_assessments')
      .select('status')
      .eq('tax_year', currentYear);

    const statusBreakdown = statusData?.reduce((acc: any, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {}) || {};

    return {
      year: currentYear,
      totalAssessments: totalAssessments || 0,
      totalAmount,
      totalPaid,
      totalOutstanding,
      collectionRate: totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0,
      statusBreakdown,
    };
  }
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const assessmentId = url.searchParams.get('assessment_id');

    if (!assessmentId) {
      return new Response(
        JSON.stringify({ error: 'assessment_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching tax assessment detail:', assessmentId);

    // Get tax assessment with all related data
    const { data: assessment, error: assessmentError } = await supabase
      .from('tax_assessments')
      .select(`
        *,
        property:properties!tax_assessments_property_id_fkey(
          id,
          reference_id,
          parcel_number,
          district:districts!properties_district_id_fkey(id, code, name),
          sub_district:sub_districts!properties_sub_district_id_fkey(id, name),
          property_type:property_types!properties_property_type_id_fkey(id, name),
          customer_id,
          customer:customers!properties_customer_id_fkey(id, name, entity_type, contact_number, email)
        ),
        creator:users!tax_assessments_created_by_fkey(id, full_name)
      `)
      .eq('id', assessmentId)
      .maybeSingle();

    if (assessmentError) {
      console.error('Error fetching tax assessment:', assessmentError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch tax assessment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!assessment) {
      return new Response(
        JSON.stringify({ error: 'Tax assessment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get payment history
    const { data: payments, error: paymentsError } = await supabase
      .from('tax_payments')
      .select(`
        *,
        collector:users!tax_payments_collected_by_fkey(id, full_name)
      `)
      .eq('assessment_id', assessmentId)
      .order('payment_date', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    }

    // Get activity logs
    const { data: logs, error: logsError } = await supabase
      .from('activity_logs')
      .select(`
        *,
        performed_by_user:users!activity_logs_performed_by_fkey(full_name)
      `)
      .eq('entity_type', 'TAX_ASSESSMENT')
      .eq('entity_id', assessmentId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (logsError) {
      console.error('Error fetching activity logs:', logsError);
    }

    // Calculate days overdue
    let daysOverdue = 0;
    if (assessment.due_date) {
      const today = new Date();
      const dueDate = new Date(assessment.due_date);
      if (today > dueDate) {
        daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    return new Response(
      JSON.stringify({
        assessment: {
          ...assessment,
          days_overdue: daysOverdue
        },
        payments: payments || [],
        activity_logs: logs || []
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in get-tax-detail function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const taxYear = body.tax_year;
    const currentYear = new Date().getFullYear();
    const year = taxYear ? parseInt(taxYear) : currentYear;

    console.log('Get tax stats v2 - Fetching for year:', year);

    // Get assessments for the year
    const { data: assessments, error: assessmentsError } = await supabase
      .from('tax_assessments')
      .select('assessed_amount, paid_amount, outstanding_amount, status')
      .eq('tax_year', year);

    if (assessmentsError) {
      console.error('Error fetching assessments:', assessmentsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch tax statistics' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate statistics
    const totalAssessed = assessments.reduce((sum, a) => sum + (a.assessed_amount || 0), 0);
    const totalCollected = assessments.reduce((sum, a) => sum + (a.paid_amount || 0), 0);
    const totalOutstanding = assessments.reduce((sum, a) => sum + (a.outstanding_amount || 0), 0);
    const collectionRate = totalAssessed > 0 ? (totalCollected / totalAssessed) * 100 : 0;

    // Count by status
    const statusCounts = {
      not_assessed: assessments.filter(a => a.status === 'NOT_ASSESSED').length,
      assessed: assessments.filter(a => a.status === 'ASSESSED').length,
      paid: assessments.filter(a => a.status === 'PAID').length,
      partial: assessments.filter(a => a.status === 'PARTIAL').length,
      overdue: assessments.filter(a => a.status === 'OVERDUE').length
    };

    // Get properties with arrears (outstanding > 0)
    const propertiesWithArrears = assessments.filter(a => (a.outstanding_amount || 0) > 0).length;

    return new Response(
      JSON.stringify({
        tax_year: year,
        total_assessed: totalAssessed,
        total_collected: totalCollected,
        total_outstanding: totalOutstanding,
        collection_rate: Math.round(collectionRate * 100) / 100,
        status_counts: statusCounts,
        properties_with_arrears: propertiesWithArrears,
        total_assessments: assessments.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in get-tax-stats function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile || !['INPUTTER', 'APPROVER', 'ADMINISTRATOR'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentData = await req.json();

    console.log('Recording tax payment:', paymentData);

    // Validate required fields
    if (!paymentData.assessment_id || !paymentData.amount_paid || 
        !paymentData.payment_date || !paymentData.payment_method) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the assessment to validate payment amount
    const { data: assessment, error: assessmentError } = await supabase
      .from('tax_assessments')
      .select('*, property:properties!tax_assessments_property_id_fkey(reference_id)')
      .eq('id', paymentData.assessment_id)
      .single();

    if (assessmentError || !assessment) {
      return new Response(
        JSON.stringify({ error: 'Tax assessment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate payment amount doesn't exceed outstanding
    if (paymentData.amount_paid > assessment.outstanding_amount) {
      return new Response(
        JSON.stringify({ 
          error: 'Payment amount exceeds outstanding amount',
          outstanding: assessment.outstanding_amount 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate receipt number if not provided
    let receiptNumber = paymentData.receipt_number;
    if (!receiptNumber) {
      const { data: receiptData, error: receiptError } = await supabase
        .rpc('generate_receipt_number');
      
      if (receiptError) {
        console.error('Error generating receipt number:', receiptError);
        return new Response(
          JSON.stringify({ error: 'Failed to generate receipt number' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      receiptNumber = receiptData;
    }

    // Create payment record
    const { data: payment, error: createError } = await supabase
      .from('tax_payments')
      .insert({
        assessment_id: paymentData.assessment_id,
        payment_date: paymentData.payment_date,
        amount_paid: paymentData.amount_paid,
        payment_method: paymentData.payment_method,
        receipt_number: receiptNumber,
        notes: paymentData.notes || null,
        collected_by: profile.id
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating payment:', createError);
      return new Response(
        JSON.stringify({ error: 'Failed to record payment', details: createError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // The trigger will automatically update the assessment's paid_amount and status
    // Fetch the updated assessment
    const { data: updatedAssessment } = await supabase
      .from('tax_assessments')
      .select('*')
      .eq('id', paymentData.assessment_id)
      .single();

    // Create activity log
    await supabase.from('activity_logs').insert({
      entity_type: 'TAX_ASSESSMENT',
      entity_id: paymentData.assessment_id,
      action: 'PAYMENT_ADDED',
      performed_by: profile.id,
      metadata: {
        amount_paid: paymentData.amount_paid,
        payment_method: paymentData.payment_method,
        receipt_number: receiptNumber
      }
    });

    console.log('Payment recorded successfully:', payment.id);

    // Check if fully paid
    const isFullyPaid = updatedAssessment && updatedAssessment.status === 'PAID';

    return new Response(
      JSON.stringify({ 
        payment,
        assessment: updatedAssessment,
        is_fully_paid: isFullyPaid
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in create-tax-payment function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

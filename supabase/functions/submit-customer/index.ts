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

    const { customer_id } = await req.json();

    if (!customer_id) {
      return new Response(
        JSON.stringify({ error: 'customer_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Submitting customer:', customer_id);

    // Get customer to validate
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single();

    if (fetchError || !customer) {
      console.error('Error fetching customer:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Customer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate status is DRAFT
    if (customer.status !== 'DRAFT') {
      return new Response(
        JSON.stringify({ error: 'Only DRAFT customers can be submitted' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate user is creator or administrator
    const { data: userProfile } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (customer.created_by !== user.id && userProfile?.role !== 'ADMINISTRATOR') {
      return new Response(
        JSON.stringify({ error: 'You can only submit your own customers' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update customer status to SUBMITTED
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        status: 'SUBMITTED',
        submitted_at: new Date().toISOString(),
        rejection_feedback: null // Clear any previous rejection feedback
      })
      .eq('id', customer_id);

    if (updateError) {
      console.error('Error updating customer:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to submit customer' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create activity log
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        entity_type: 'CUSTOMER',
        entity_id: customer_id,
        action: 'SUBMITTED',
        performed_by: user.id,
        metadata: {
          reference_id: customer.reference_id,
          customer_type: customer.customer_type,
          submitted_at: new Date().toISOString()
        }
      });

    if (logError) {
      console.error('Error creating activity log:', logError);
    }

    // Get all approvers to notify
    const { data: approvers } = await supabase
      .from('users')
      .select('id')
      .in('role', ['APPROVER', 'ADMINISTRATOR'])
      .eq('is_active', true);

    // Create notifications for all approvers
    if (approvers && approvers.length > 0) {
      const notifications = approvers.map(approver => ({
        user_id: approver.id,
        title: 'New Customer Submitted',
        message: `Customer ${customer.reference_id} submitted by ${userProfile?.full_name || 'Unknown User'}`,
        entity_type: 'CUSTOMER',
        entity_id: customer_id
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
      } else {
        console.log('Notifications created for', approvers.length, 'approvers');
      }
    }

    console.log('Customer submitted successfully:', customer_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Customer submitted successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in submit-customer function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

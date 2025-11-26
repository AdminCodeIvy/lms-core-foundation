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

    const { entity_id } = await req.json();

    if (!entity_id) {
      return new Response(
        JSON.stringify({ error: 'entity_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Approving customer:', entity_id);

    // Validate user is APPROVER or ADMINISTRATOR
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['APPROVER', 'ADMINISTRATOR'].includes(userProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Only Approvers and Administrators can approve customers' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get customer to validate
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', entity_id)
      .single();

    if (fetchError || !customer) {
      console.error('Error fetching customer:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Customer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate status is SUBMITTED
    if (customer.status !== 'SUBMITTED') {
      return new Response(
        JSON.stringify({ error: 'Only SUBMITTED customers can be approved' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update customer status to APPROVED
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        status: 'APPROVED',
        approved_by: user.id,
        rejection_feedback: null // Clear any rejection feedback
      })
      .eq('id', entity_id);

    if (updateError) {
      console.error('Error updating customer:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to approve customer' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create activity log
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        entity_type: 'CUSTOMER',
        entity_id: entity_id,
        action: 'APPROVED',
        performed_by: user.id,
        metadata: {
          reference_id: customer.reference_id,
          customer_type: customer.customer_type,
          approver_name: userProfile.full_name,
          approved_at: new Date().toISOString()
        }
      });

    if (logError) {
      console.error('Error creating activity log:', logError);
    }

    // Create notification for customer creator
    if (customer.created_by) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: customer.created_by,
          title: 'Customer Approved',
          message: `Your customer ${customer.reference_id} was approved by ${userProfile.full_name}`,
          entity_type: 'CUSTOMER',
          entity_id: entity_id
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      } else {
        console.log('Notification created for customer creator');
      }
    }

    console.log('Customer approved successfully:', entity_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Customer approved successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in approve-customer function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

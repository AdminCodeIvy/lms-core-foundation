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

    const { customer_id, unarchive } = await req.json();

    if (!customer_id) {
      return new Response(
        JSON.stringify({ error: 'customer_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate user is administrator only
    const { data: userProfile } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (userProfile?.role !== 'ADMINISTRATOR') {
      return new Response(
        JSON.stringify({ error: 'Only administrators can archive/unarchive customers' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get customer
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

    let newStatus;
    let action;
    let message;

    if (unarchive) {
      // Unarchive: return to previous status (DRAFT or APPROVED)
      if (customer.status !== 'ARCHIVED') {
        return new Response(
          JSON.stringify({ error: 'Customer is not archived' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      newStatus = customer.approved_by ? 'APPROVED' : 'DRAFT';
      action = 'unarchive';
      message = 'Customer unarchived successfully';
    } else {
      // Archive
      if (customer.status === 'ARCHIVED') {
        return new Response(
          JSON.stringify({ error: 'Customer is already archived' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      newStatus = 'ARCHIVED';
      action = 'archive';
      message = 'Customer archived successfully';
    }

    // Update customer status
    const { error: updateError } = await supabase
      .from('customers')
      .update({ status: newStatus })
      .eq('id', customer_id);

    if (updateError) {
      console.error('Error updating customer:', updateError);
      return new Response(
        JSON.stringify({ error: `Failed to ${action} customer` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create audit log
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        entity_type: 'customer',
        entity_id: customer_id,
        action: action,
        field: 'status',
        old_value: customer.status,
        new_value: newStatus,
        changed_by: user.id,
      });

    if (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in archive-customer function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

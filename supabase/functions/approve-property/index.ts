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

    const { property_id } = await req.json();

    if (!property_id) {
      return new Response(
        JSON.stringify({ error: 'property_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Approving property:', property_id);

    // Get property
    const { data: property, error: fetchError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', property_id)
      .single();

    if (fetchError || !property) {
      console.error('Error fetching property:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Property not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate status is SUBMITTED
    if (property.status !== 'SUBMITTED') {
      return new Response(
        JSON.stringify({ error: 'Only SUBMITTED properties can be approved' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate user is approver or administrator
    const { data: userProfile } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (!['APPROVER', 'ADMINISTRATOR'].includes(userProfile?.role || '')) {
      return new Response(
        JSON.stringify({ error: 'Only approvers can approve properties' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update property status to APPROVED
    const { error: updateError } = await supabase
      .from('properties')
      .update({
        status: 'APPROVED',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        rejection_feedback: null
      })
      .eq('id', property_id);

    if (updateError) {
      console.error('Error updating property:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to approve property' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log audit trail
    await supabase.from('audit_logs').insert([
      {
        entity_type: 'property',
        entity_id: property_id,
        action: 'approve',
        field: 'status',
        old_value: 'SUBMITTED',
        new_value: 'APPROVED',
        changed_by: user.id,
      },
      {
        entity_type: 'property',
        entity_id: property_id,
        action: 'approve',
        field: 'approved_by',
        old_value: null,
        new_value: user.id,
        changed_by: user.id,
      }
    ]);

    // Create activity log
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        entity_type: 'PROPERTY',
        entity_id: property_id,
        action: 'APPROVED',
        performed_by: user.id,
        metadata: {
          reference_id: property.reference_id,
          approved_at: new Date().toISOString()
        }
      });

    if (logError) {
      console.error('Error creating activity log:', logError);
    }

    // Create notification for property creator
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: property.created_by,
        title: 'Property Approved',
        message: `Your property ${property.reference_id} was approved by ${userProfile?.full_name || 'Unknown User'}`,
        entity_type: 'PROPERTY',
        entity_id: property_id
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    console.log('Property approved successfully:', property_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Property approved successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in approve-property function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

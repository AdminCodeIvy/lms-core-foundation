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

    console.log('Submitting property:', property_id);

    // Get property to validate
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

    // Validate status is DRAFT
    if (property.status !== 'DRAFT') {
      return new Response(
        JSON.stringify({ error: 'Only DRAFT properties can be submitted' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate user is creator or administrator
    const { data: userProfile } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (property.created_by !== user.id && userProfile?.role !== 'ADMINISTRATOR') {
      return new Response(
        JSON.stringify({ error: 'You can only submit your own properties' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update property status to SUBMITTED
    const { error: updateError } = await supabase
      .from('properties')
      .update({
        status: 'SUBMITTED',
        submitted_at: new Date().toISOString(),
        rejection_feedback: null
      })
      .eq('id', property_id);

    if (updateError) {
      console.error('Error updating property:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to submit property' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log audit trail
    const { error: auditError } = await supabase.from('audit_logs').insert([
      {
        entity_type: 'property',
        entity_id: property_id,
        action: 'submit',
        field: 'status',
        old_value: 'DRAFT',
        new_value: 'SUBMITTED',
        changed_by: user.id,
      },
      {
        entity_type: 'property',
        entity_id: property_id,
        action: 'submit',
        field: 'submitted_at',
        old_value: null,
        new_value: new Date().toISOString(),
        changed_by: user.id,
      }
    ]);

    if (auditError) {
      console.error('Error creating audit logs:', auditError);
    } else {
      console.log('Audit logs created successfully for property submission');
    }

    // Create activity log
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        entity_type: 'PROPERTY',
        entity_id: property_id,
        action: 'SUBMITTED',
        performed_by: user.id,
        metadata: {
          reference_id: property.reference_id,
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
        title: 'New Property Submitted',
        message: `Property ${property.reference_id} submitted by ${userProfile?.full_name || 'Unknown User'}`,
        entity_type: 'PROPERTY',
        entity_id: property_id
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

    console.log('Property submitted successfully:', property_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Property submitted successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in submit-property function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

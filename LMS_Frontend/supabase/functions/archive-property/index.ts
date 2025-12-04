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

    const { property_id, unarchive } = await req.json();

    if (!property_id) {
      return new Response(
        JSON.stringify({ error: 'property_id is required' }),
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
        JSON.stringify({ error: 'Only approvers can archive/unarchive properties' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    let newStatus;
    let action;
    let message;

    if (unarchive) {
      // Unarchive: return to previous status (DRAFT or APPROVED)
      if (property.status !== 'ARCHIVED') {
        return new Response(
          JSON.stringify({ error: 'Property is not archived' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      newStatus = property.approved_by ? 'APPROVED' : 'DRAFT';
      action = 'UNARCHIVED';
      message = 'Property unarchived successfully';
    } else {
      // Archive
      if (property.status === 'ARCHIVED') {
        return new Response(
          JSON.stringify({ error: 'Property is already archived' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      newStatus = 'ARCHIVED';
      action = 'ARCHIVED';
      message = 'Property archived successfully';
    }

    // Update property status
    const { error: updateError } = await supabase
      .from('properties')
      .update({ status: newStatus })
      .eq('id', property_id);

    if (updateError) {
      console.error('Error updating property:', updateError);
      return new Response(
        JSON.stringify({ error: `Failed to ${unarchive ? 'unarchive' : 'archive'} property` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create activity log
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        entity_type: 'PROPERTY',
        entity_id: property_id,
        action,
        performed_by: user.id,
        metadata: {
          reference_id: property.reference_id
        }
      });

    if (logError) {
      console.error('Error creating activity log:', logError);
    }

    // Create notification for property creator
    if (!unarchive) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: property.created_by,
          title: 'Property Archived',
          message: `Property ${property.reference_id} was archived by ${userProfile?.full_name || 'Unknown User'}`,
          entity_type: 'PROPERTY',
          entity_id: property_id
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }
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
    console.error('Error in archive-property function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

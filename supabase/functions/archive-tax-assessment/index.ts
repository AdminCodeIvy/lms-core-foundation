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

    const { assessment_id, unarchive } = await req.json();

    if (!assessment_id) {
      return new Response(
        JSON.stringify({ error: 'assessment_id is required' }),
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
        JSON.stringify({ error: 'Only administrators can archive/unarchive tax assessments' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tax assessment
    const { data: assessment, error: fetchError } = await supabase
      .from('tax_assessments')
      .select('*')
      .eq('id', assessment_id)
      .single();

    if (fetchError || !assessment) {
      console.error('Error fetching tax assessment:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Tax assessment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let action;
    let message;
    let newArchived;

    if (unarchive) {
      // Unarchive
      if (!assessment.is_archived) {
        return new Response(
          JSON.stringify({ error: 'Tax assessment is not archived' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      newArchived = false;
      action = 'unarchive';
      message = 'Tax assessment unarchived successfully';
    } else {
      // Archive
      if (assessment.is_archived) {
        return new Response(
          JSON.stringify({ error: 'Tax assessment is already archived' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      newArchived = true;
      action = 'archive';
      message = 'Tax assessment archived successfully';
    }

    // Update tax assessment
    const { error: updateError } = await supabase
      .from('tax_assessments')
      .update({ is_archived: newArchived })
      .eq('id', assessment_id);

    if (updateError) {
      console.error('Error updating tax assessment:', updateError);
      return new Response(
        JSON.stringify({ error: `Failed to ${action} tax assessment` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create audit log
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        entity_type: 'tax_assessment',
        entity_id: assessment_id,
        action: action,
        field: 'is_archived',
        old_value: assessment.is_archived ? 'true' : 'false',
        new_value: newArchived ? 'true' : 'false',
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
    console.error('Error in archive-tax-assessment function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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

    const { customer_id, page = 1, limit = 20 } = await req.json();

    if (!customer_id) {
      return new Response(
        JSON.stringify({ error: 'customer_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching activity logs for customer:', customer_id);

    // Get activity logs with user information
    const { data: logs, error: logsError, count } = await supabase
      .from('activity_logs')
      .select(`
        *,
        performed_by_user:users!activity_logs_performed_by_fkey(full_name)
      `, { count: 'exact' })
      .eq('entity_type', 'CUSTOMER')
      .eq('entity_id', customer_id)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (logsError) {
      console.error('Error fetching activity logs:', logsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch activity logs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform data for frontend
    const transformedLogs = (logs || []).map(log => ({
      id: log.id,
      action: log.action,
      performed_by: log.performed_by,
      performed_by_name: log.performed_by_user?.full_name || 'Unknown User',
      timestamp: log.created_at,
      changes: log.changes || null,
      metadata: log.metadata || null
    }));

    console.log('Activity logs fetched successfully:', transformedLogs.length);

    return new Response(
      JSON.stringify({
        data: transformedLogs,
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit)
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in get-activity-logs function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

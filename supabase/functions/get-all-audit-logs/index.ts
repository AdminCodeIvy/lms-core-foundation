import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

interface GetAllLogsRequest {
  entityType?: string;
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated and is an administrator
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is an administrator
    const { data: profile } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'ADMINISTRATOR') {
      throw new Error('Forbidden: Administrator access required');
    }

    const { 
      entityType, 
      userId, 
      action, 
      startDate, 
      endDate, 
      limit = 100, 
      offset = 0 
    }: GetAllLogsRequest = await req.json();

    console.log('Fetching all audit logs with filters:', { entityType, userId, action, startDate, endDate });

    // Build query with filters
    let query = supabaseClient
      .from('audit_logs')
      .select(`
        id,
        entity_type,
        entity_id,
        action,
        field,
        old_value,
        new_value,
        changed_by,
        timestamp,
        users!audit_logs_changed_by_fkey (
          id,
          full_name
        )
      `, { count: 'exact' });

    // Apply filters
    if (entityType && entityType !== 'all') {
      query = query.eq('entity_type', entityType);
    }

    if (userId && userId !== 'all') {
      query = query.eq('changed_by', userId);
    }

    if (action && action !== 'all') {
      query = query.eq('action', action);
    }

    if (startDate) {
      query = query.gte('timestamp', startDate);
    }

    if (endDate) {
      query = query.lte('timestamp', endDate);
    }

    // Execute query with pagination
    const { data: logs, error: logsError, count } = await query
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (logsError) {
      console.error('Error fetching logs:', logsError);
      throw logsError;
    }

    console.log(`Found ${logs?.length || 0} audit logs`);

    return new Response(
      JSON.stringify({ 
        logs: logs || [], 
        total: count || 0,
        limit,
        offset
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error getting all audit logs:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' ? 401 : error.message.startsWith('Forbidden') ? 403 : 400,
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

interface GetLogsRequest {
  entityType: 'customer' | 'property' | 'tax_assessment' | 'tax_payment' | 'user';
  entityId: string;
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

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { entityType, entityId, limit = 100, offset = 0 }: GetLogsRequest = await req.json();

    if (!entityType || !entityId) {
      throw new Error('entityType and entityId are required');
    }

    console.log(`Fetching audit logs for ${entityType}:${entityId}`);

    // Fetch logs with user information
    const { data: logs, error: logsError, count } = await supabaseClient
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
      `, { count: 'exact' })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
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
    console.error('Error getting audit logs:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

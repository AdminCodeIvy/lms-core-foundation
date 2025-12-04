import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

interface AuditLogEntry {
  entityType: 'customer' | 'property' | 'tax_assessment' | 'tax_payment' | 'user';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'submit' | 'approve' | 'reject' | 'archive';
  field?: string;
  oldValue?: string | null;
  newValue?: string | null;
  userId: string;
}

interface LogRequest {
  logs: AuditLogEntry[];
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

    const { logs }: LogRequest = await req.json();

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      throw new Error('Invalid logs data');
    }

    console.log(`Logging ${logs.length} audit entries`);

    // Transform and insert logs
    const auditEntries = logs.map(log => ({
      entity_type: log.entityType,
      entity_id: log.entityId,
      action: log.action,
      field: log.field || null,
      old_value: log.oldValue !== undefined ? String(log.oldValue) : null,
      new_value: log.newValue !== undefined ? String(log.newValue) : null,
      changed_by: log.userId,
      timestamp: new Date().toISOString(),
    }));

    const { error: insertError } = await supabaseClient
      .from('audit_logs')
      .insert(auditEntries);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log('Successfully logged audit entries');

    return new Response(
      JSON.stringify({ success: true, count: logs.length }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error logging audit:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

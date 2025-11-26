import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock AGO sync with 90% success rate
const mockAGOSync = async (propertyId: string, supabase: any) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

  // 90% success rate
  const success = Math.random() > 0.1;

  if (success) {
    // Generate mock GlobalID
    const globalId = '{' + 
      Array.from({ length: 8 }, () => Math.random().toString(16).substr(2, 1)).join('') + '-' +
      Array.from({ length: 4 }, () => Math.random().toString(16).substr(2, 1)).join('') + '-' +
      Array.from({ length: 4 }, () => Math.random().toString(16).substr(2, 1)).join('') + '-' +
      Array.from({ length: 4 }, () => Math.random().toString(16).substr(2, 1)).join('') + '-' +
      Array.from({ length: 12 }, () => Math.random().toString(16).substr(2, 1)).join('') +
    '}';

    // Update property
    await supabase
      .from('properties')
      .update({
        ago_sync_status: 'SYNCED',
        ago_sync_error: null,
        last_sync_at: new Date().toISOString(),
        global_id: globalId,
      })
      .eq('id', propertyId);

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        entity_type: 'PROPERTY',
        entity_id: propertyId,
        action: 'SYNCED',
        performed_by: 'system',
        metadata: { message: 'Successfully synced to AGO' },
      });

    return { success: true, error: null };
  } else {
    // Simulate errors
    const errors = [
      'Connection timeout',
      'Invalid geometry',
      'Duplicate GlobalID',
      'Service unavailable',
      'Authentication failed',
    ];
    const error = errors[Math.floor(Math.random() * errors.length)];

    // Update property
    await supabase
      .from('properties')
      .update({
        ago_sync_status: 'ERROR',
        ago_sync_error: error,
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', propertyId);

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        entity_type: 'PROPERTY',
        entity_id: propertyId,
        action: 'SYNC_FAILED',
        performed_by: 'system',
        metadata: { error },
      });

    // Schedule retry using database function
    await supabase.rpc('schedule_ago_retry', {
      p_property_id: propertyId,
      p_attempt_number: 1,
      p_error_message: error,
    });

    return { success: false, error };
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { propertyId } = await req.json();

    if (!propertyId) {
      throw new Error('Property ID is required');
    }

    // Get property
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      throw new Error('Property not found');
    }

    // Only sync approved properties
    if (property.status !== 'APPROVED') {
      throw new Error('Only approved properties can be synced');
    }

    // Perform mock sync
    const result = await mockAGOSync(propertyId, supabase);

    // Create notification for admin if sync failed
    if (!result.success) {
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'ADMINISTRATOR')
        .eq('is_active', true);

      if (admins) {
        for (const admin of admins) {
          await supabase
            .from('notifications')
            .insert({
              user_id: admin.id,
              title: 'AGO Sync Failed',
              message: `Property ${property.reference_id} failed to sync to AGO. Error: ${result.error}`,
              link: `/properties/${propertyId}`,
            });
        }
      }
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Mock AGO sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

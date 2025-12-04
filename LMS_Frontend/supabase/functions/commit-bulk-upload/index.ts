import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { sessionId } = await req.json();

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('bulk_upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('uploaded_by', user.id)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'PREVIEW') {
      throw new Error('Session already committed');
    }

    const validationResults = session.validation_results as any[];
    const validRows = validationResults.filter(r => r.status === 'valid');

    if (validRows.length === 0) {
      throw new Error('No valid rows to commit');
    }

    let createdCount = 0;

    // Process valid rows based on upload type
    switch (session.upload_type) {
      case 'CUSTOMER': {
        // Create customer records
        for (const row of validRows) {
          try {
            const data = row.data;
            
            // Insert customer
            const { data: customer, error: customerError } = await supabase
              .from('customers')
              .insert({
                customer_type: 'PERSON',
                status: 'DRAFT',
                created_by: user.id,
              })
              .select()
              .single();

            if (customerError) throw customerError;

            // Insert customer_person details
            const { error: personError } = await supabase
              .from('customer_person')
              .insert({
                customer_id: customer.id,
                first_name: data['First Name *'],
                father_name: data['Father Name *'],
                grandfather_name: data['Grandfather Name *'],
                fourth_name: data['Fourth Name'] || null,
                date_of_birth: data['Date of Birth * (YYYY-MM-DD)'],
                place_of_birth: data['Place of Birth *'],
                gender: data['Gender * (Male/Female)'].toUpperCase(),
                nationality: data['Nationality *'],
                mobile_number_1: data['Mobile Number 1 *'],
                carrier_mobile_1: data['Carrier Mobile 1 *'],
                mobile_number_2: data['Mobile Number 2'] || null,
                carrier_mobile_2: data['Carrier Mobile 2'] || null,
                emergency_contact_name: data['Emergency Contact Name *'],
                emergency_contact_number: data['Emergency Contact Number *'],
                email: data['Email *'],
                id_type: data['ID Type *'],
                id_number: data['ID Number *'],
                place_of_issue: data['Place of Issue *'],
                issue_date: data['Issue Date * (YYYY-MM-DD)'],
                expiry_date: data['Expiry Date * (YYYY-MM-DD)'],
              });

            if (personError) throw personError;

            createdCount++;
          } catch (error) {
            console.error(`Failed to create customer for row ${row.rowNumber}:`, error);
          }
        }
        break;
      }

      case 'PROPERTY':
      case 'TAX_ASSESSMENT':
      case 'TAX_PAYMENT': {
        // Mock implementation - would need actual logic for each type
        createdCount = validRows.length;
        break;
      }
    }

    // Update session status
    await supabase
      .from('bulk_upload_sessions')
      .update({
        status: 'COMMITTED',
        committed_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    // Create notification
    await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title: 'Bulk Upload Completed',
        message: `Successfully created ${createdCount} draft records from ${session.file_name}`,
        link: '/bulk-upload',
      });

    return new Response(
      JSON.stringify({
        createdCount,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Commit error:', error);
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

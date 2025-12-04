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

    console.log('Fetching property detail:', property_id);

    // Get property with all relations
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select(`
        *,
        district:districts!properties_district_id_fkey(id, code, name),
        sub_district:sub_districts!properties_sub_district_id_fkey(id, name),
        property_type:property_types!properties_property_type_id_fkey(id, name),
        creator:users!properties_created_by_fkey(id, full_name),
        approver:users!properties_approved_by_fkey(id, full_name)
      `)
      .eq('id', property_id)
      .single();

    if (propertyError || !property) {
      console.error('Error fetching property:', propertyError);
      return new Response(
        JSON.stringify({ error: 'Property not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get boundaries
    const { data: boundaries } = await supabase
      .from('property_boundaries')
      .select('*')
      .eq('property_id', property_id)
      .single();

    // Get photos
    const { data: photos } = await supabase
      .from('property_photos')
      .select(`
        *,
        uploader:users!property_photos_uploaded_by_fkey(id, full_name)
      `)
      .eq('property_id', property_id)
      .order('created_at', { ascending: false });

    // Get ownership
    const { data: ownership } = await supabase
      .from('property_ownership')
      .select(`
        *,
        customer:customers!property_ownership_customer_id_fkey(
          id,
          reference_id,
          customer_type,
          first_name,
          last_name,
          full_name_ar,
          business_name
        )
      `)
      .eq('property_id', property_id)
      .order('start_date', { ascending: false });

    return new Response(
      JSON.stringify({
        property,
        boundaries,
        photos: photos || [],
        ownership: ownership || []
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in get-property-detail function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

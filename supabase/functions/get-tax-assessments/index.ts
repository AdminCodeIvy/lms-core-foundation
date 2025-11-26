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

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const search = url.searchParams.get('search') || '';
    const taxYear = url.searchParams.get('tax_year') || '';
    const status = url.searchParams.get('status') || '';
    const districtId = url.searchParams.get('district_id') || '';
    const arrearsOnly = url.searchParams.get('arrears_only') === 'true';

    console.log('Fetching tax assessments with filters:', { 
      page, limit, search, taxYear, status, districtId, arrearsOnly 
    });

    // Build query
    let query = supabase
      .from('tax_assessments')
      .select(`
        *,
        property:properties!tax_assessments_property_id_fkey(
          id,
          reference_id,
          parcel_number,
          district:districts!properties_district_id_fkey(id, name),
          customer_id,
          customer:customers!properties_customer_id_fkey(id, name, entity_type)
        ),
        creator:users!tax_assessments_created_by_fkey(id, full_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (search) {
      // Search by property reference ID or parcel number
      const { data: properties } = await supabase
        .from('properties')
        .select('id')
        .or(`reference_id.ilike.%${search}%,parcel_number.ilike.%${search}%`);
      
      if (properties && properties.length > 0) {
        const propertyIds = properties.map(p => p.id);
        query = query.in('property_id', propertyIds);
      } else {
        // No matching properties, return empty result
        return new Response(
          JSON.stringify({
            data: [],
            pagination: { page, limit, total: 0, totalPages: 0 }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (taxYear) {
      query = query.eq('tax_year', parseInt(taxYear));
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (arrearsOnly) {
      query = query.gt('outstanding_amount', 0);
    }

    if (districtId) {
      // Filter by district through property
      const { data: properties } = await supabase
        .from('properties')
        .select('id')
        .eq('district_id', districtId);
      
      if (properties && properties.length > 0) {
        const propertyIds = properties.map(p => p.id);
        query = query.in('property_id', propertyIds);
      }
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: assessments, error, count } = await query;

    if (error) {
      console.error('Error fetching tax assessments:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch tax assessments' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        data: assessments,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in get-tax-assessments function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

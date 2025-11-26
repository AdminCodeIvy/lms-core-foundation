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
    const status = url.searchParams.get('status') || '';
    const districtId = url.searchParams.get('district_id') || '';
    const showArchived = url.searchParams.get('show_archived') === 'true';

    console.log('Fetching properties with filters:', { page, limit, search, status, districtId, showArchived });

    // Build query
    let query = supabase
      .from('properties')
      .select(`
        *,
        district:districts!properties_district_id_fkey(id, code, name),
        sub_district:sub_districts!properties_sub_district_id_fkey(id, name),
        property_type:property_types!properties_property_type_id_fkey(id, name),
        creator:users!properties_created_by_fkey(id, full_name),
        approver:users!properties_approved_by_fkey(id, full_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (search) {
      query = query.or(`reference_id.ilike.%${search}%,parcel_number.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    } else if (!showArchived) {
      // By default, hide archived properties
      query = query.neq('status', 'ARCHIVED');
    }

    if (districtId) {
      query = query.eq('district_id', districtId);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: properties, error, count } = await query;

    if (error) {
      console.error('Error fetching properties:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch properties' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        data: properties,
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
    console.error('Error in get-properties function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

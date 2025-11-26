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

    // Validate user is APPROVER or ADMINISTRATOR
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['APPROVER', 'ADMINISTRATOR'].includes(userProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Only Approvers and Administrators can access review queue' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    console.log(`Fetching review queue - page: ${page}, limit: ${limit}`);

    // Get submitted customers
    const { data: customers, error: customersError, count } = await supabase
      .from('customers')
      .select(`
        id,
        reference_id,
        customer_type,
        status,
        submitted_at,
        created_by,
        customer_person(first_name, father_name, grandfather_name),
        customer_business(business_name),
        customer_government(full_department_name),
        customer_mosque_hospital(full_name),
        customer_non_profit(full_non_profit_name),
        customer_contractor(full_contractor_name),
        created_by_user:users!customers_created_by_fkey(full_name)
      `, { count: 'exact' })
      .eq('status', 'SUBMITTED')
      .order('submitted_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (customersError) {
      console.error('Error fetching customers:', customersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch review queue' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform data
    const data = customers?.map(customer => {
      let name = '';
      
      if (customer.customer_type === 'PERSON' && customer.customer_person?.[0]) {
        const person = customer.customer_person[0];
        name = `${person.first_name} ${person.father_name} ${person.grandfather_name}`;
      } else if (customer.customer_type === 'BUSINESS' && customer.customer_business?.[0]) {
        name = customer.customer_business[0].business_name;
      } else if (customer.customer_type === 'GOVERNMENT' && customer.customer_government?.[0]) {
        name = customer.customer_government[0].full_department_name;
      } else if (customer.customer_type === 'MOSQUE_HOSPITAL' && customer.customer_mosque_hospital?.[0]) {
        name = customer.customer_mosque_hospital[0].full_name;
      } else if (customer.customer_type === 'NON_PROFIT' && customer.customer_non_profit?.[0]) {
        name = customer.customer_non_profit[0].full_non_profit_name;
      } else if (customer.customer_type === 'CONTRACTOR' && customer.customer_contractor?.[0]) {
        name = customer.customer_contractor[0].full_contractor_name;
      }

      // Calculate days pending
      const submittedDate = new Date(customer.submitted_at);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - submittedDate.getTime());
      const daysPending = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Get submitted by name
      const createdByUser = customer.created_by_user as any;
      const submittedByName = Array.isArray(createdByUser) 
        ? createdByUser[0]?.full_name 
        : createdByUser?.full_name;

      return {
        id: customer.id,
        entity_type: 'CUSTOMER',
        reference_id: customer.reference_id,
        name,
        customer_type: customer.customer_type,
        submitted_by: customer.created_by,
        submitted_by_name: submittedByName,
        submitted_at: customer.submitted_at,
        days_pending: daysPending
      };
    }) || [];

    const totalPages = Math.ceil((count || 0) / limit);

    console.log(`Returning ${data.length} items from review queue`);

    return new Response(
      JSON.stringify({
        data,
        pagination: {
          total: count || 0,
          page,
          limit,
          totalPages
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-review-queue function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

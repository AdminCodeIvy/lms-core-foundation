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

    // Get user role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = userProfile?.role;

    console.log('Fetching dashboard stats for user:', user.id, 'Role:', userRole);

    // Initialize stats
    let draftsPending = 0;
    let waitingApproval = 0;
    let approved = 0;
    let rejections = 0;

    // Get drafts pending submission (customers + properties)
    if (userRole === 'INPUTTER') {
      // Inputter sees only their own drafts
      const { count: customerDrafts } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'DRAFT')
        .eq('created_by', user.id);
      
      const { count: propertyDrafts } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'DRAFT')
        .eq('created_by', user.id);
      
      draftsPending = (customerDrafts || 0) + (propertyDrafts || 0);
    } else {
      // Approver/Admin sees all drafts
      const { count: customerDrafts } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'DRAFT');
      
      const { count: propertyDrafts } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'DRAFT');
      
      draftsPending = (customerDrafts || 0) + (propertyDrafts || 0);
    }

    // Get waiting approval (all users can see) (customers + properties)
    const { count: customerSubmitted } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'SUBMITTED');
    
    const { count: propertySubmitted } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'SUBMITTED');
    
    waitingApproval = (customerSubmitted || 0) + (propertySubmitted || 0);

    // Get approved (all users can see) (customers + properties)
    const { count: customerApproved } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'APPROVED');
    
    const { count: propertyApproved } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'APPROVED');
    
    approved = (customerApproved || 0) + (propertyApproved || 0);

    // Get rejections needing fixes (customers + properties)
    if (userRole === 'INPUTTER') {
      // Inputter sees only their own rejections
      const { count: customerRejections } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'REJECTED')
        .eq('created_by', user.id);
      
      const { count: propertyRejections } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'REJECTED')
        .eq('created_by', user.id);
      
      rejections = (customerRejections || 0) + (propertyRejections || 0);
    } else {
      // Approver/Admin sees all rejections
      const { count: customerRejections } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'REJECTED');
      
      const { count: propertyRejections } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'REJECTED');
      
      rejections = (customerRejections || 0) + (propertyRejections || 0);
    }

    console.log('Dashboard stats fetched:', { draftsPending, waitingApproval, approved, rejections });

    return new Response(
      JSON.stringify({
        drafts_pending: draftsPending,
        waiting_approval: waitingApproval,
        approved: approved,
        rejections: rejections
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in get-dashboard-stats function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile || !['INPUTTER', 'APPROVER', 'ADMINISTRATOR'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const assessmentData = await req.json();

    console.log('Creating tax assessment:', assessmentData);

    // Validate required fields
    if (!assessmentData.property_id || !assessmentData.tax_year || !assessmentData.base_assessment) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for duplicate (property + year)
    const { data: existing } = await supabase
      .from('tax_assessments')
      .select('id')
      .eq('property_id', assessmentData.property_id)
      .eq('tax_year', assessmentData.tax_year)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Tax assessment for this property and year already exists' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate assessed amount
    const exemptionAmount = assessmentData.exemption_amount || 0;
    const assessedAmount = assessmentData.base_assessment - exemptionAmount;

    // Validate renter details if occupancy is RENTED
    if (assessmentData.occupancy_type === 'RENTED') {
      if (!assessmentData.renter_name || !assessmentData.renter_contact || 
          !assessmentData.renter_national_id || !assessmentData.monthly_rent_amount ||
          !assessmentData.rental_start_date) {
        return new Response(
          JSON.stringify({ error: 'Renter details are required when occupancy type is RENTED' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create tax assessment
    const { data: assessment, error: createError } = await supabase
      .from('tax_assessments')
      .insert({
        property_id: assessmentData.property_id,
        tax_year: assessmentData.tax_year,
        occupancy_type: assessmentData.occupancy_type,
        renter_name: assessmentData.renter_name || null,
        renter_contact: assessmentData.renter_contact || null,
        renter_national_id: assessmentData.renter_national_id || null,
        monthly_rent_amount: assessmentData.monthly_rent_amount || null,
        rental_start_date: assessmentData.rental_start_date || null,
        has_rental_agreement: assessmentData.has_rental_agreement || false,
        property_type: assessmentData.property_type,
        land_size: assessmentData.land_size,
        built_up_area: assessmentData.built_up_area || null,
        number_of_units: assessmentData.number_of_units || null,
        number_of_floors: assessmentData.number_of_floors || null,
        has_water: assessmentData.has_water || false,
        has_electricity: assessmentData.has_electricity || false,
        has_sewer: assessmentData.has_sewer || false,
        has_waste_collection: assessmentData.has_waste_collection || false,
        construction_status: assessmentData.construction_status,
        property_registered: assessmentData.property_registered || false,
        title_deed_number: assessmentData.title_deed_number || null,
        base_assessment: assessmentData.base_assessment,
        exemption_amount: exemptionAmount,
        assessed_amount: assessedAmount,
        assessment_date: assessmentData.assessment_date,
        due_date: assessmentData.due_date,
        created_by: profile.id
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating tax assessment:', createError);
      return new Response(
        JSON.stringify({ error: 'Failed to create tax assessment', details: createError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create activity log
    await supabase.from('activity_logs').insert({
      entity_type: 'TAX_ASSESSMENT',
      entity_id: assessment.id,
      action: 'CREATED',
      performed_by: profile.id,
      metadata: {
        property_id: assessmentData.property_id,
        tax_year: assessmentData.tax_year,
        assessed_amount: assessedAmount
      }
    });

    console.log('Tax assessment created successfully:', assessment.id);

    return new Response(
      JSON.stringify({ assessment }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in create-tax-assessment function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import * as XLSX from 'npm:xlsx@0.18.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRow {
  rowNumber: number;
  data: Record<string, any>;
  status: 'valid' | 'error' | 'warning';
  messages: string[];
}

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

    const { uploadType, filename, fileData } = await req.json();

    // Decode base64 file data
    const buffer = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));

    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet);

    if (rows.length === 0) {
      throw new Error('No data found in Excel file');
    }

    if (rows.length > 1000) {
      throw new Error('Maximum 1,000 rows allowed per upload');
    }

    // Validate rows
    const validationResults: ValidationRow[] = [];
    let validCount = 0;
    let errorCount = 0;
    let warningCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as Record<string, any>;
      const rowNumber = i + 2; // Excel row number (accounting for header)
      const messages: string[] = [];
      let status: 'valid' | 'error' | 'warning' = 'valid';

      // Basic validation based on upload type
      switch (uploadType) {
        case 'CUSTOMER':
          if (!row['First Name *']) messages.push('First Name is required');
          if (!row['Father Name *']) messages.push('Father Name is required');
          if (!row['Email *']) messages.push('Email is required');
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row['Email *'])) {
            messages.push('Invalid email format');
          }
          if (!row['Mobile Number 1 *']) messages.push('Mobile Number 1 is required');
          if (!row['Date of Birth * (YYYY-MM-DD)']) {
            messages.push('Date of Birth is required');
          } else if (!/^\d{4}-\d{2}-\d{2}$/.test(row['Date of Birth * (YYYY-MM-DD)'])) {
            messages.push('Date of Birth must be in YYYY-MM-DD format');
          }
          break;

        case 'PROPERTY':
          if (!row['Property Location *']) messages.push('Property Location is required');
          if (!row['District Code *']) messages.push('District Code is required');
          if (!row['Size * (sqm)']) messages.push('Size is required');
          else if (isNaN(Number(row['Size * (sqm)']))) {
            messages.push('Size must be a number');
          }
          if (!row['North Length * (m)']) messages.push('North Length is required');
          if (!row['South Length * (m)']) messages.push('South Length is required');
          if (!row['East Length * (m)']) messages.push('East Length is required');
          if (!row['West Length * (m)']) messages.push('West Length is required');
          break;

        case 'TAX_ASSESSMENT':
          if (!row['Property Reference ID *']) messages.push('Property Reference ID is required');
          if (!row['Tax Year * (2020-2030)']) messages.push('Tax Year is required');
          else {
            const year = Number(row['Tax Year * (2020-2030)']);
            if (isNaN(year) || year < 2020 || year > 2030) {
              messages.push('Tax Year must be between 2020 and 2030');
            }
          }
          if (!row['Base Assessment * (USD)']) messages.push('Base Assessment is required');
          else if (isNaN(Number(row['Base Assessment * (USD)']))) {
            messages.push('Base Assessment must be a number');
          }
          if (!row['Assessment Date * (YYYY-MM-DD)']) {
            messages.push('Assessment Date is required');
          } else if (!/^\d{4}-\d{2}-\d{2}$/.test(row['Assessment Date * (YYYY-MM-DD)'])) {
            messages.push('Assessment Date must be in YYYY-MM-DD format');
          }
          break;

        case 'TAX_PAYMENT':
          if (!row['Property Reference ID *']) messages.push('Property Reference ID is required');
          if (!row['Tax Year *']) messages.push('Tax Year is required');
          if (!row['Amount Paid * (USD)']) messages.push('Amount Paid is required');
          else if (isNaN(Number(row['Amount Paid * (USD)']))) {
            messages.push('Amount Paid must be a number');
          }
          if (!row['Receipt Number *']) messages.push('Receipt Number is required');
          break;
      }

      if (messages.length > 0) {
        status = 'error';
        errorCount++;
      } else {
        validCount++;
      }

      validationResults.push({
        rowNumber,
        data: row,
        status,
        messages,
      });
    }

    // Create session record
    const { data: session, error: sessionError } = await supabase
      .from('bulk_upload_sessions')
      .insert({
        upload_type: uploadType,
        file_name: filename,
        uploaded_by: user.id,
        total_rows: rows.length,
        valid_rows: validCount,
        error_rows: errorCount,
        warning_rows: warningCount,
        validation_results: validationResults,
        status: 'PREVIEW',
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        rows: validationResults,
        validRows: validCount,
        errorRows: errorCount,
        warningRows: warningCount,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Validation error:', error);
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

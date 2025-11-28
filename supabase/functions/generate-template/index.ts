import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TemplateRequest {
  uploadType: 'CUSTOMER' | 'PROPERTY' | 'TAX_ASSESSMENT' | 'TAX_PAYMENT';
  customerSubType?: 'PERSON' | 'BUSINESS' | 'GOVERNMENT' | 'MOSQUE_HOSPITAL' | 'NON_PROFIT' | 'CONTRACTOR';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Dynamic import of XLSX to avoid build issues
    const XLSX = await import('https://esm.sh/xlsx@0.18.5');
    
    const { uploadType, customerSubType }: TemplateRequest = await req.json();

    let headers: string[] = [];
    let sampleData: any[] = [];
    let filename = '';

    switch (uploadType) {
      case 'CUSTOMER':
        // Generate specific template based on customer subtype
        if (customerSubType === 'PERSON') {
          filename = 'customer_person_template.xlsx';
          headers = [
            'First Name *',
            'Father Name *',
            'Grandfather Name *',
            'Fourth Name',
            'Date of Birth * (YYYY-MM-DD)',
            'Place of Birth *',
            'Gender * (Male/Female)',
            'Nationality *',
            'Mobile Number 1 *',
            'Carrier Mobile 1 *',
            'Mobile Number 2',
            'Carrier Mobile 2',
            'Emergency Contact Name *',
            'Emergency Contact Number *',
            'Email *',
            'ID Type *',
            'ID Number *',
            'Place of Issue *',
            'Issue Date * (YYYY-MM-DD)',
            'Expiry Date * (YYYY-MM-DD)',
          ];
          sampleData = [{
            'First Name *': 'Ahmed',
            'Father Name *': 'Mohamed',
            'Grandfather Name *': 'Ali',
            'Fourth Name': 'Hassan',
            'Date of Birth * (YYYY-MM-DD)': '1990-05-15',
            'Place of Birth *': 'Jigjiga',
            'Gender * (Male/Female)': 'Male',
            'Nationality *': 'Ethiopia',
            'Mobile Number 1 *': '+251912345678',
            'Carrier Mobile 1 *': 'Ethio Telecom',
            'Mobile Number 2': '+251923456789',
            'Carrier Mobile 2': 'Safaricom',
            'Emergency Contact Name *': 'Fatima Ahmed',
            'Emergency Contact Number *': '+251987654321',
            'Email *': 'ahmed.mohamed@example.com',
            'ID Type *': 'National ID Card',
            'ID Number *': 'ID123456',
            'Place of Issue *': 'Ethiopia',
            'Issue Date * (YYYY-MM-DD)': '2015-01-01',
            'Expiry Date * (YYYY-MM-DD)': '2030-01-01',
          }];
        } else if (customerSubType === 'BUSINESS') {
          filename = 'customer_business_template.xlsx';
          headers = [
            'Business Name *',
            'Business Registration Number *',
            'Business License Number *',
            'Business Address *',
            'Contact Name *',
            'Mobile Number 1 *',
            'Mobile Number 2',
            'Carrier Network *',
            'Email *',
            'Street *',
            'District ID *',
            'Section',
            'Block',
          ];
          sampleData = [{
            'Business Name *': 'ABC Trading Company',
            'Business Registration Number *': 'BR123456',
            'Business License Number *': 'BL789012',
            'Business Address *': '123 Main Street, Jigjiga',
            'Contact Name *': 'Ahmed Mohamed',
            'Mobile Number 1 *': '+251912345678',
            'Mobile Number 2': '+251923456789',
            'Carrier Network *': 'Ethio Telecom',
            'Email *': 'info@abctrading.com',
            'Street *': 'Main Street',
            'District ID *': 'JJG',
            'Section': 'A',
            'Block': '12',
          }];
        } else if (customerSubType === 'GOVERNMENT') {
          filename = 'customer_government_template.xlsx';
          headers = [
            'Full Department Name *',
            'Department Address *',
            'Contact Name *',
            'Mobile Number 1 *',
            'Carrier Mobile 1 *',
            'Mobile Number 2',
            'Carrier Mobile 2',
            'Email *',
            'Street *',
            'District ID *',
            'Section',
            'Block',
          ];
          sampleData = [{
            'Full Department Name *': 'Ministry of Finance',
            'Department Address *': '456 Government Road, Jigjiga',
            'Contact Name *': 'Director General',
            'Mobile Number 1 *': '+251911234567',
            'Carrier Mobile 1 *': 'Ethio Telecom',
            'Mobile Number 2': '',
            'Carrier Mobile 2': '',
            'Email *': 'contact@mof.gov.et',
            'Street *': 'Government Road',
            'District ID *': 'JJG',
            'Section': 'B',
            'Block': '5',
          }];
        } else if (customerSubType === 'MOSQUE_HOSPITAL') {
          filename = 'customer_mosque_hospital_template.xlsx';
          headers = [
            'Full Name *',
            'Registration Number *',
            'Address *',
            'Contact Name *',
            'Mobile Number 1 *',
            'Carrier Mobile 1 *',
            'Mobile Number 2',
            'Carrier Mobile 2',
            'Email *',
            'District ID *',
            'Section',
            'Block',
          ];
          sampleData = [{
            'Full Name *': 'Central Mosque',
            'Registration Number *': 'MOS123456',
            'Address *': '789 Religious Street, Jigjiga',
            'Contact Name *': 'Imam Ahmed',
            'Mobile Number 1 *': '+251913456789',
            'Carrier Mobile 1 *': 'Ethio Telecom',
            'Mobile Number 2': '',
            'Carrier Mobile 2': '',
            'Email *': 'central.mosque@example.com',
            'District ID *': 'JJG',
            'Section': 'C',
            'Block': '8',
          }];
        } else if (customerSubType === 'NON_PROFIT') {
          filename = 'customer_nonprofit_template.xlsx';
          headers = [
            'Full Non-Profit Name *',
            'Registration Number *',
            'License Number *',
            'Address *',
            'Contact Name *',
            'Mobile Number 1 *',
            'Carrier Mobile 1 *',
            'Mobile Number 2',
            'Carrier Mobile 2',
            'Email *',
            'District ID *',
            'Section',
            'Block',
          ];
          sampleData = [{
            'Full Non-Profit Name *': 'Community Development Organization',
            'Registration Number *': 'NPO123456',
            'License Number *': 'NPL789012',
            'Address *': '321 Charity Avenue, Jigjiga',
            'Contact Name *': 'Director',
            'Mobile Number 1 *': '+251914567890',
            'Carrier Mobile 1 *': 'Ethio Telecom',
            'Mobile Number 2': '',
            'Carrier Mobile 2': '',
            'Email *': 'info@cdo.org',
            'District ID *': 'JJG',
            'Section': 'D',
            'Block': '3',
          }];
        } else if (customerSubType === 'CONTRACTOR') {
          filename = 'customer_contractor_template.xlsx';
          headers = [
            'Full Contractor Name *',
            'Contact Name *',
            'Mobile Number 1 *',
            'Carrier Mobile 1 *',
            'Mobile Number 2',
            'Carrier Mobile 2',
            'Email *',
          ];
          sampleData = [{
            'Full Contractor Name *': 'Construction Services Ltd',
            'Contact Name *': 'Engineer Ahmed',
            'Mobile Number 1 *': '+251915678901',
            'Carrier Mobile 1 *': 'Ethio Telecom',
            'Mobile Number 2': '',
            'Carrier Mobile 2': '',
            'Email *': 'ahmed@construction.com',
          }];
        } else {
          throw new Error('Invalid customer subtype');
        }
        break;

      case 'PROPERTY':
        filename = 'property_template.xlsx';
        headers = [
          'Property Location *',
          'Sub Location',
          'District Code *',
          'Sub-District Name',
          'Downtown * (Yes/No)',
          'Building or Empty Land * (Building/Empty Land)',
          'Has Built Area * (Yes/No)',
          'Number of Floors (1-14)',
          'Size * (sqm)',
          'Parcel Area (sqm)',
          'Property Type',
          'Property Wall * (Yes/No)',
          'Door Number',
          'Road Name',
          'Postal Zip Code',
          'Section',
          'Block',
          'Map URL',
          'Coordinates (lat, long)',
          'North Length * (m)',
          'North Type * (Building/Empty Land/Road)',
          'South Length * (m)',
          'South Type * (Building/Empty Land/Road)',
          'East Length * (m)',
          'East Type * (Building/Empty Land/Road)',
          'West Length * (m)',
          'West Type * (Building/Empty Land/Road)',
          'Owner Reference ID',
        ];
        sampleData = [{
          'Property Location *': 'Main Street',
          'Sub Location': 'Downtown',
          'District Code *': 'JJG',
          'Sub-District Name': 'Central',
          'Downtown * (Yes/No)': 'Yes',
          'Building or Empty Land * (Building/Empty Land)': 'Building',
          'Has Built Area * (Yes/No)': 'Yes',
          'Number of Floors (1-14)': '2',
          'Size * (sqm)': '500',
          'Parcel Area (sqm)': '600',
          'Property Type': 'Residential',
          'Property Wall * (Yes/No)': 'Yes',
          'Door Number': '123',
          'Road Name': 'Main Road',
          'Postal Zip Code': '12345',
          'Section': 'A',
          'Block': '1',
          'Map URL': 'https://maps.google.com',
          'Coordinates (lat, long)': '9.3500, 42.7931',
          'North Length * (m)': '25',
          'North Type * (Building/Empty Land/Road)': 'Road',
          'South Length * (m)': '25',
          'South Type * (Building/Empty Land/Road)': 'Building',
          'East Length * (m)': '20',
          'East Type * (Building/Empty Land/Road)': 'Empty Land',
          'West Length * (m)': '20',
          'West Type * (Building/Empty Land/Road)': 'Building',
          'Owner Reference ID': 'CUS-2025-00001',
        }];
        break;

      case 'TAX_ASSESSMENT':
        filename = 'tax_assessment_template.xlsx';
        headers = [
          'Property Reference ID *',
          'Tax Year * (2020-2030)',
          'Occupancy Type * (Owner Occupied/Rented/Vacant/Mixed Use)',
          'Property Type',
          'Land Size * (sqm)',
          'Built-Up Area (sqm)',
          'Number of Units',
          'Number of Floors',
          'Has Water * (Yes/No)',
          'Has Electricity * (Yes/No)',
          'Has Sewer * (Yes/No)',
          'Has Waste Collection * (Yes/No)',
          'Construction Status * (Completed/Under Construction/Planned)',
          'Property Registered * (Yes/No)',
          'Title Deed Number',
          'Base Assessment * (USD)',
          'Exemption Amount (USD)',
          'Assessment Date * (YYYY-MM-DD)',
          'Due Date * (YYYY-MM-DD)',
          'Renter Name',
          'Renter Contact',
          'Renter National ID',
          'Monthly Rent (USD)',
          'Rental Start Date (YYYY-MM-DD)',
          'Has Rental Agreement (Yes/No)',
        ];
        sampleData = [{
          'Property Reference ID *': 'PROP-2025-00001',
          'Tax Year * (2020-2030)': '2025',
          'Occupancy Type * (Owner Occupied/Rented/Vacant/Mixed Use)': 'Owner Occupied',
          'Property Type': 'Residential',
          'Land Size * (sqm)': '500',
          'Built-Up Area (sqm)': '300',
          'Number of Units': '1',
          'Number of Floors': '2',
          'Has Water * (Yes/No)': 'Yes',
          'Has Electricity * (Yes/No)': 'Yes',
          'Has Sewer * (Yes/No)': 'Yes',
          'Has Waste Collection * (Yes/No)': 'Yes',
          'Construction Status * (Completed/Under Construction/Planned)': 'Completed',
          'Property Registered * (Yes/No)': 'Yes',
          'Title Deed Number': 'TD123456',
          'Base Assessment * (USD)': '5000',
          'Exemption Amount (USD)': '500',
          'Assessment Date * (YYYY-MM-DD)': '2025-01-01',
          'Due Date * (YYYY-MM-DD)': '2025-12-31',
          'Renter Name': '',
          'Renter Contact': '',
          'Renter National ID': '',
          'Monthly Rent (USD)': '',
          'Rental Start Date (YYYY-MM-DD)': '',
          'Has Rental Agreement (Yes/No)': '',
        }];
        break;

      case 'TAX_PAYMENT':
        filename = 'tax_payment_template.xlsx';
        headers = [
          'Property Reference ID *',
          'Tax Year *',
          'Payment Date * (YYYY-MM-DD)',
          'Amount Paid * (USD)',
          'Payment Method * (Cash/Bank Transfer/Check/Mobile Money/Credit Card)',
          'Receipt Number *',
          'Notes',
        ];
        sampleData = [{
          'Property Reference ID *': 'PROP-2025-00001',
          'Tax Year *': '2025',
          'Payment Date * (YYYY-MM-DD)': '2025-06-15',
          'Amount Paid * (USD)': '2500',
          'Payment Method * (Cash/Bank Transfer/Check/Mobile Money/Credit Card)': 'Bank Transfer',
          'Receipt Number *': 'RCP-2025-00001',
          'Notes': 'Partial payment',
        }];
        break;

      default:
        throw new Error('Invalid upload type');
    }

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Add data sheet
    const ws = XLSX.utils.json_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(wb, ws, 'Data');

    // Add instructions sheet
    const instructions = [
      ['Bulk Upload Instructions'],
      [''],
      ['1. Fill in the data starting from row 2'],
      ['2. Required fields are marked with *'],
      ['3. Maximum 1,000 rows per upload'],
      ['4. Date format must be YYYY-MM-DD'],
      ['5. For Yes/No fields, use exactly "Yes" or "No"'],
      ['6. Do not modify column headers'],
      ['7. Save as .xlsx or .xls before uploading'],
      [''],
      ['Valid Values:'],
      ['- Gender: Male, Female'],
      ['- Downtown: Yes, No'],
      ['- Building Type: Building, Empty Land'],
      ['- Boundary Types: Building, Empty Land, Road'],
      ['- Construction Status: Completed, Under Construction, Planned'],
      ['- Payment Methods: Cash, Bank Transfer, Check, Mobile Money, Credit Card'],
      ['- Occupancy Types: Owner Occupied, Rented, Vacant, Mixed Use'],
    ];
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    // Generate Excel file
    const fileData = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    return new Response(
      JSON.stringify({
        file: Array.from(new Uint8Array(fileData)),
        filename,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Generate template error:', error);
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

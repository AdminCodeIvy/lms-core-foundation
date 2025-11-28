import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

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
            'first_name',
            'father_name',
            'grandfather_name',
            'fourth_name',
            'date_of_birth',
            'place_of_birth',
            'gender',
            'nationality',
            'mobile_number_1',
            'carrier_mobile_1',
            'mobile_number_2',
            'carrier_mobile_2',
            'emergency_contact_name',
            'emergency_contact_number',
            'email',
            'id_type',
            'id_number',
            'place_of_issue',
            'issue_date',
            'expiry_date',
          ];
          sampleData = [{
            'first_name': 'Ahmed',
            'father_name': 'Mohamed',
            'grandfather_name': 'Ali',
            'fourth_name': 'Hassan',
            'date_of_birth': '1990-05-15',
            'place_of_birth': 'Jigjiga',
            'gender': 'MALE',
            'nationality': 'Ethiopia',
            'mobile_number_1': '+251912345678',
            'carrier_mobile_1': 'Ethio Telecom',
            'mobile_number_2': '+251923456789',
            'carrier_mobile_2': 'Safaricom',
            'emergency_contact_name': 'Fatima Ahmed',
            'emergency_contact_number': '+251987654321',
            'email': 'ahmed.mohamed@example.com',
            'id_type': 'National ID Card',
            'id_number': 'ID123456',
            'place_of_issue': 'Ethiopia',
            'issue_date': '2015-01-01',
            'expiry_date': '2030-01-01',
          }];
        } else if (customerSubType === 'BUSINESS') {
          filename = 'customer_business_template.xlsx';
          headers = [
            'business_name',
            'business_registration_number',
            'business_license_number',
            'business_address',
            'contact_name',
            'mobile_number_1',
            'mobile_number_2',
            'carrier_network',
            'email',
            'street',
            'district_id',
            'section',
            'block',
          ];
          sampleData = [{
            'business_name': 'ABC Trading Company',
            'business_registration_number': 'BR123456',
            'business_license_number': 'BL789012',
            'business_address': '123 Main Street, Jigjiga',
            'contact_name': 'Ahmed Mohamed',
            'mobile_number_1': '+251912345678',
            'mobile_number_2': '+251923456789',
            'carrier_network': 'Ethio Telecom',
            'email': 'info@abctrading.com',
            'street': 'Main Street',
            'district_id': 'JJG',
            'section': 'A',
            'block': '12',
          }];
        } else if (customerSubType === 'GOVERNMENT') {
          filename = 'customer_government_template.xlsx';
          headers = [
            'full_department_name',
            'department_address',
            'contact_name',
            'mobile_number_1',
            'carrier_mobile_1',
            'mobile_number_2',
            'carrier_mobile_2',
            'email',
            'street',
            'district_id',
            'section',
            'block',
          ];
          sampleData = [{
            'full_department_name': 'Ministry of Finance',
            'department_address': '456 Government Road, Jigjiga',
            'contact_name': 'Director General',
            'mobile_number_1': '+251911234567',
            'carrier_mobile_1': 'Ethio Telecom',
            'mobile_number_2': '',
            'carrier_mobile_2': '',
            'email': 'contact@mof.gov.et',
            'street': 'Government Road',
            'district_id': 'JJG',
            'section': 'B',
            'block': '5',
          }];
        } else if (customerSubType === 'MOSQUE_HOSPITAL') {
          filename = 'customer_mosque_hospital_template.xlsx';
          headers = [
            'full_name',
            'registration_number',
            'address',
            'contact_name',
            'mobile_number_1',
            'carrier_mobile_1',
            'mobile_number_2',
            'carrier_mobile_2',
            'email',
            'district_id',
            'section',
            'block',
          ];
          sampleData = [{
            'full_name': 'Central Mosque',
            'registration_number': 'MOS123456',
            'address': '789 Religious Street, Jigjiga',
            'contact_name': 'Imam Ahmed',
            'mobile_number_1': '+251913456789',
            'carrier_mobile_1': 'Ethio Telecom',
            'mobile_number_2': '',
            'carrier_mobile_2': '',
            'email': 'central.mosque@example.com',
            'district_id': 'JJG',
            'section': 'C',
            'block': '8',
          }];
        } else if (customerSubType === 'NON_PROFIT') {
          filename = 'customer_nonprofit_template.xlsx';
          headers = [
            'full_non_profit_name',
            'registration_number',
            'license_number',
            'address',
            'contact_name',
            'mobile_number_1',
            'carrier_mobile_1',
            'mobile_number_2',
            'carrier_mobile_2',
            'email',
            'district_id',
            'section',
            'block',
          ];
          sampleData = [{
            'full_non_profit_name': 'Community Development Organization',
            'registration_number': 'NPO123456',
            'license_number': 'NPL789012',
            'address': '321 Charity Avenue, Jigjiga',
            'contact_name': 'Director',
            'mobile_number_1': '+251914567890',
            'carrier_mobile_1': 'Ethio Telecom',
            'mobile_number_2': '',
            'carrier_mobile_2': '',
            'email': 'info@cdo.org',
            'district_id': 'JJG',
            'section': 'D',
            'block': '3',
          }];
        } else if (customerSubType === 'CONTRACTOR') {
          filename = 'customer_contractor_template.xlsx';
          headers = [
            'full_contractor_name',
            'contact_name',
            'mobile_number_1',
            'carrier_mobile_1',
            'mobile_number_2',
            'carrier_mobile_2',
            'email',
          ];
          sampleData = [{
            'full_contractor_name': 'Construction Services Ltd',
            'contact_name': 'Engineer Ahmed',
            'mobile_number_1': '+251915678901',
            'carrier_mobile_1': 'Ethio Telecom',
            'mobile_number_2': '',
            'carrier_mobile_2': '',
            'email': 'ahmed@construction.com',
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
      ['2. Column headers must match exactly (case-sensitive, use underscores)'],
      ['3. Maximum 1,000 rows per upload'],
      ['4. Date format must be YYYY-MM-DD'],
      ['5. Gender values: MALE or FEMALE (all caps)'],
      ['6. For Yes/No fields, use exactly "Yes" or "No"'],
      ['7. Do not modify column headers'],
      ['8. Save as .xlsx or .xls before uploading'],
      [''],
      ['Valid Values:'],
      ['- Gender: MALE, FEMALE'],
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

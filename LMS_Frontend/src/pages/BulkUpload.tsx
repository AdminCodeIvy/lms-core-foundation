import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, FileSpreadsheet, Users, Home, Receipt, DollarSign, Download, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

type UploadType = 'CUSTOMER' | 'PROPERTY' | 'TAX_ASSESSMENT' | 'TAX_PAYMENT';
type CustomerSubType = 'PERSON' | 'BUSINESS' | 'GOVERNMENT' | 'MOSQUE_HOSPITAL' | 'NON_PROFIT' | 'RESIDENTIAL' | 'RENTAL';

interface ValidationRow {
  rowNumber: number;
  data: Record<string, any>;
  status: 'valid' | 'error' | 'warning';
  messages: string[];
}

const uploadTypes = [
  {
    type: 'CUSTOMER' as UploadType,
    title: 'Customers',
    description: 'Upload customer records (Person, Business, Government, etc.)',
    icon: Users,
    color: 'bg-blue-500',
  },
  {
    type: 'PROPERTY' as UploadType,
    title: 'Properties',
    description: 'Upload property records with location and boundary data',
    icon: Home,
    color: 'bg-green-500',
  },
  {
    type: 'TAX_ASSESSMENT' as UploadType,
    title: 'Tax Assessments',
    description: 'Upload tax assessment records for properties',
    icon: Receipt,
    color: 'bg-purple-500',
  },
  {
    type: 'TAX_PAYMENT' as UploadType,
    title: 'Tax Payments',
    description: 'Upload tax payment records',
    icon: DollarSign,
    color: 'bg-orange-500',
  },
];

const customerSubTypes = [
  {
    type: 'PERSON' as CustomerSubType,
    title: 'Person / Individual',
    description: 'Individual property owner or stakeholder',
    icon: Users,
  },
  {
    type: 'BUSINESS' as CustomerSubType,
    title: 'Business / Commercial',
    description: 'Commercial business or company',
    icon: Users,
  },
  {
    type: 'GOVERNMENT' as CustomerSubType,
    title: 'Government Property',
    description: 'Government ministry or department',
    icon: Users,
  },
  {
    type: 'MOSQUE_HOSPITAL' as CustomerSubType,
    title: 'Mosque / Hospital',
    description: 'Public property - religious or healthcare',
    icon: Users,
  },
  {
    type: 'NON_PROFIT' as CustomerSubType,
    title: 'Non-Profit',
    description: 'NGO or non-profit organization',
    icon: Users,
  },
  {
    type: 'RESIDENTIAL' as CustomerSubType,
    title: 'Residential',
    description: 'Residential property owner',
    icon: Users,
  },
  {
    type: 'RENTAL' as CustomerSubType,
    title: 'Rental Customer',
    description: 'Property rental customer or tenant',
    icon: Home,
  },
];

export default function BulkUpload() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [selectedType, setSelectedType] = useState<UploadType | null>(null);
  const [selectedCustomerType, setSelectedCustomerType] = useState<CustomerSubType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationResults, setValidationResults] = useState<ValidationRow[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'error' | 'warning'>('all');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const canUpload = profile?.role === 'INPUTTER' || profile?.role === 'ADMINISTRATOR';

  // Map UI steps to progress bar steps
  const getProgressStep = () => {
    if (selectedType === 'CUSTOMER') {
      // For customers: 1→1, 2→2, 3→3, 4→4, 5→4, 6→5
      if (step <= 3) return step;
      if (step === 4) return 4;
      if (step === 5) return 4; // Validation is part of upload step in progress
      return 5; // Complete
    } else {
      // For non-customers (skip step 2): 1→1, 3→2, 4→3, 5→4, 6→5
      if (step === 1) return 1;
      if (step === 3) return 2;
      if (step === 4) return 3;
      if (step === 5) return 4;
      return 5; // Complete
    }
  };

  const progressStep = getProgressStep();

  if (!canUpload) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to perform bulk uploads. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleTypeSelect = (type: UploadType) => {
    setSelectedType(type);
    // If customer type selected, go to customer sub-type selection
    // Otherwise go directly to template download
    if (type === 'CUSTOMER') {
      setStep(2); // Customer type selection
    } else {
      setSelectedCustomerType(null);
      setStep(3); // Skip to template download
    }
  };

  const handleCustomerTypeSelect = (customerType: CustomerSubType) => {
    setSelectedCustomerType(customerType);
    setStep(3); // Go to template download
  };

  const handleDownloadTemplate = async () => {
    try {
      // Fetch data for templates
      let districts: any[] = [];
      let propertyTypes: any[] = [];
      let properties: any[] = [];
      
      if (selectedType === 'PROPERTY') {
        try {
          const [districtsRes, typesRes] = await Promise.all([
            fetch(`${import.meta.env.VITE_API_BASE_URL}/lookups/districts`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            }),
            fetch(`${import.meta.env.VITE_API_BASE_URL}/lookups/property-types`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            })
          ]);
          
          if (districtsRes.ok) {
            const data = await districtsRes.json();
            districts = data.data || [];
          }
          if (typesRes.ok) {
            const data = await typesRes.json();
            propertyTypes = data.data || [];
          }
        } catch (error) {
          console.error('Failed to fetch lookups:', error);
        }
      } else if (selectedType === 'TAX_ASSESSMENT') {
        try {
          // Fetch approved properties for tax assessment
          const propertiesRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/properties?status=APPROVED&limit=100`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
          });
          
          if (propertiesRes.ok) {
            const data = await propertiesRes.json();
            properties = data.data?.properties || [];
          }
        } catch (error) {
          console.error('Failed to fetch properties:', error);
        }
      }
      
      // For customer uploads, generate template client-side based on subtype
      if (selectedType === 'CUSTOMER') {
        if (!selectedCustomerType) {
          toast.error('Please select a customer type');
          return;
        }

        let headers: string[] = [];
        let sampleRow: Record<string, string> = {};
        let filename = '';

        switch (selectedCustomerType) {
          case 'PERSON':
            filename = 'customer_person_template.xlsx';
            headers = [
              'pr_id',
              'full_name',
              'mothers_name',
              'date_of_birth',
              'place_of_birth',
              'gender',
              'nationality',
              'mobile_number_1',
              'email',
              'id_type',
              'carrier_mobile_1',
              'mobile_number_2',
              'carrier_mobile_2',
              'emergency_contact_name',
              'emergency_contact_number',
              'id_number',
              'place_of_issue',
              'issue_date',
              'expiry_date',
            ];
            sampleRow = {
              pr_id: 'PR-001',
              full_name: 'Ahmed Mohamed Ali',
              mothers_name: 'Fatima Hassan',
              date_of_birth: '1990-05-15',
              place_of_birth: 'Jigjiga',
              gender: 'MALE',
              nationality: 'Ethiopia',
              mobile_number_1: '+251912345678',
              email: 'ahmed.mohamed@example.com',
              id_type: 'National ID Card',
              carrier_mobile_1: 'Ethio Telecom',
              mobile_number_2: '+251923456789',
              carrier_mobile_2: 'Safaricom',
              emergency_contact_name: 'Fatima Ahmed',
              emergency_contact_number: '+251987654321',
              id_number: 'ID123456',
              place_of_issue: 'Ethiopia',
              issue_date: '2015-01-01',
              expiry_date: '2030-01-01',
            };
            break;
          case 'BUSINESS':
            filename = 'customer_business_template.xlsx';
            headers = [
              'customer_type',
              'property_id',
              'business_name',
              'business_license_number',
              'business_address',
              'rental_name',
              'mobile_number_1',
              'mobile_number_2',
              'email',
              'size',
              'floor',
              'file_number',
            ];
            sampleRow = {
              customer_type: 'BUSINESS',
              property_id: 'PR-BUS-001',
              business_name: 'ABC Trading Company',
              business_license_number: 'BL-2025-001',
              business_address: '123 Business Street, Mogadishu',
              rental_name: 'ABC Rental Services',
              mobile_number_1: '+252-612-345-678',
              mobile_number_2: '+252-612-345-679',
              email: 'info@abctrading.com',
              size: '500 sqm',
              floor: '2nd Floor',
              file_number: 'FILE-2025-001',
            };
            break;
          case 'GOVERNMENT':
            filename = 'customer_government_template.xlsx';
            headers = [
              'PR-ID',
              'Full Government / Department Name',
              'Contact Name',
              'Department Address',
              'Contact Number',
              'Contact Number 2',
              'Email',
              'File Number',
              'Size',
              'Carrier Network 1',
              'Carrier Network 2',
              'Street',
              'District',
              'Section',
              'Block',
            ];
            sampleRow = {
              'PR-ID': 'PR-GOV-001',
              'Full Government / Department Name': 'Ministry of Finance',
              'Contact Name': 'Ahmed Hassan Director',
              'Department Address': '123 Government Street, Mogadishu',
              'Contact Number': '+252-612-345-678',
              'Contact Number 2': '+252-612-345-679',
              'Email': 'contact@mof.gov.so',
              'File Number': 'GOV-FILE-001',
              'Size': '1000 sqm',
              'Carrier Network 1': 'Hormuud',
              'Carrier Network 2': 'Telesom',
              'Street': 'Government Street',
              'District': 'JJG',
              'Section': 'Section A',
              'Block': 'Block 1',
            };
            break;
          case 'MOSQUE_HOSPITAL':
            filename = 'customer_mosque_hospital_template.xlsx';
            headers = [
              'PR-ID',
              'Full Mosque or Hospital Name',
              'Mosque Registration Number',
              'Contact Name',
              'Contact Number',
              'Contact Number 2',
              'Email',
              'Address',
              'Size',
              'Floor',
              'File Number',
              'Carrier Network 1',
              'Carrier Network 2',
              'District',
              'Section',
              'Block',
            ];
            sampleRow = {
              'PR-ID': 'PR-MOS-001',
              'Full Mosque or Hospital Name': 'Al-Noor Mosque',
              'Mosque Registration Number': 'MOS-REG-2025-001',
              'Contact Name': 'Sheikh Ahmed Hassan',
              'Contact Number': '+252-612-345-678',
              'Contact Number 2': '+252-612-345-679',
              'Email': 'contact@alnoor.mosque.so',
              'Address': '123 Mosque Street, Mogadishu',
              'Size': '500 sqm',
              'Floor': 'Ground Floor',
              'File Number': 'MOS-FILE-001',
              'Carrier Network 1': 'Hormuud',
              'Carrier Network 2': 'Telesom',
              'District': 'JJG',
              'Section': 'Section A',
              'Block': 'Block 1',
            };
            break;
          case 'NON_PROFIT':
            filename = 'customer_nonprofit_template.xlsx';
            headers = [
              'PR-ID',
              'NGO Name',
              'NGO Registration Number',
              'Contact Name',
              'Contact Number',
              'Contact Number 2',
              'Email',
              'Size',
              'Floor',
              'Address',
              'File Number',
              'Carrier Network 1',
              'Carrier Network 2',
              'District',
              'Section',
              'Block',
            ];
            sampleRow = {
              'PR-ID': 'PR-NGO-001',
              'NGO Name': 'Hope Foundation',
              'NGO Registration Number': 'NGO-REG-2025-001',
              'Contact Name': 'Amina Hassan Director',
              'Contact Number': '+252-612-345-678',
              'Contact Number 2': '+252-612-345-679',
              'Email': 'contact@hopefoundation.so',
              'Size': '300 sqm',
              'Floor': '1st Floor',
              'Address': '456 NGO Street, Mogadishu',
              'File Number': 'NGO-FILE-001',
              'Carrier Network 1': 'Hormuud',
              'Carrier Network 2': 'Telesom',
              'District': 'JJG',
              'Section': 'Section B',
              'Block': 'Block 2',
            };
            break;
          case 'RESIDENTIAL':
            filename = 'customer_residential_template.xlsx';
            headers = [
              'PR-ID',
              'Size',
              'Floor',
              'File Number',
              'Address',
            ];
            sampleRow = {
              'PR-ID': 'PR-RES-001',
              'Size': '150 sqm',
              'Floor': '2nd Floor',
              'File Number': 'RES-FILE-001',
              'Address': '789 Residential Street, Mogadishu',
            };
            break;
          case 'RENTAL':
            filename = 'customer_rental_template.xlsx';
            headers = [
              'pr_id',
              'rental_name',
              'rental_mothers_name',
              'date_of_birth',
              'place_of_birth',
              'gender',
              'nationality',
              'mobile_number_1',
              'mobile_number_2',
              'email',
              'id_type',
              'carrier_mobile_1',
              'carrier_mobile_2',
              'emergency_contact_name',
              'emergency_contact_number',
              'id_number',
              'place_of_issue',
              'issue_date',
              'expiry_date',
            ];
            sampleRow = {
              pr_id: 'PR-RENTAL-001',
              rental_name: 'Sara Ahmed Mohamed',
              rental_mothers_name: 'Amina Hassan',
              date_of_birth: '1992-03-20',
              place_of_birth: 'Jigjiga',
              gender: 'FEMALE',
              nationality: 'Ethiopia',
              mobile_number_1: '+251916789012',
              mobile_number_2: '+251927890123',
              email: 'sara.ahmed@example.com',
              id_type: 'National ID Card',
              carrier_mobile_1: 'Ethio Telecom',
              carrier_mobile_2: 'Safaricom',
              emergency_contact_name: 'Ahmed Mohamed',
              emergency_contact_number: '+251918901234',
              id_number: 'RID789012',
              place_of_issue: 'Ethiopia',
              issue_date: '2018-01-01',
              expiry_date: '2033-01-01',
            };
            break;
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
        XLSX.utils.book_append_sheet(wb, ws, 'Data');

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
        ];
        const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
        XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

        XLSX.writeFile(wb, filename);

        toast.success('Template downloaded successfully');
        setStep(4);
        return;
      }

      // For other upload types, generate template client-side
      let templateData: any[] = [];
      let filename = '';

      if (selectedType === 'PROPERTY') {
        // Get first district and property type as examples
        const exampleDistrict = districts[0];
        const examplePropertyType = propertyTypes[0];
        
        templateData = [
          {
            // Basic Information (Required fields marked with *)
            'property_location': 'Main Street Area',
            'sub_location': 'Near Market',
            'district_id': exampleDistrict?.id || '',
            'sub_district_id': '',
            'is_downtown': 'true',
            'is_building': 'true',
            'has_built_area': 'false',
            'number_of_floors': '2',
            'size': '500.50',
            'parcel_area': '600.00',
            'property_type_id': examplePropertyType?.id || '',
            'has_property_wall': 'true',
            
            // Address Details
            'door_number': '123',
            'road_name': 'Main Road',
            'postal_zip_code': '12345',
            'section': 'A',
            'block': '5',
            
            // Boundaries (Optional - provide all 4 or none)
            'north_length': '25.50',
            'north_type': 'BUILDING',
            'south_length': '25.50',
            'south_type': 'ROAD',
            'east_length': '20.00',
            'east_type': 'EMPTY_LAND',
            'west_length': '20.00',
            'west_type': 'BUILDING',
            
            // Location (Required)
            'latitude': '9.0192',
            'longitude': '38.7525',
            
            // Optional
            'map_url': 'https://maps.google.com/...'
          }
        ];
        filename = 'property-template.xlsx';
      } else if (selectedType === 'TAX_ASSESSMENT') {
        templateData = [
          {
            'property_id': '',
            'tax_year': '2025',
            'base_assessment': '10000',
            'exemption_amount': '0',
            'assessed_amount': '10000',
            'assessment_date': '2025-01-01',
            'due_date': '2025-12-31',
            'land_size': '500.50',
            'occupancy_type': 'OWNER_OCCUPIED',
            'construction_status': 'COMPLETED'
          }
        ];
        filename = 'tax-assessment-template.xlsx';
      } else if (selectedType === 'TAX_PAYMENT') {
        templateData = [
          {
            'Assessment Reference ID': 'TAX-2025-00001',
            'Payment Date': '2025-01-15',
            'Amount Paid': '5000',
            'Payment Method': 'CASH | BANK_TRANSFER | CHECK | MOBILE_MONEY',
            'Receipt Number': 'REC-001',
            'Notes': 'Enter assessment reference ID from tax assessments'
          }
        ];
        filename = 'tax-payment-template.xlsx';
      }

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(templateData);

      // Set column widths
      const colWidths = templateData.length > 0
        ? Object.keys(templateData[0]).map(() => ({ wch: 25 }))
        : [];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Template');

      // Add reference sheets and instructions
      if (selectedType === 'PROPERTY') {
        // Districts reference sheet
        if (districts.length > 0) {
          const districtData = districts.map(d => ({
            'District Name': d.name,
            'District Code': d.code,
            'District UUID': d.id,
          }));
          const wsDistricts = XLSX.utils.json_to_sheet(districtData);
          XLSX.utils.book_append_sheet(wb, wsDistricts, 'Districts');
        }
        
        // Property Types reference sheet
        if (propertyTypes.length > 0) {
          const typeData = propertyTypes.map(t => ({
            'Property Type Name': t.name,
            'Property Type Code': t.code,
            'Property Type UUID': t.id,
          }));
          const wsTypes = XLSX.utils.json_to_sheet(typeData);
          XLSX.utils.book_append_sheet(wb, wsTypes, 'Property Types');
        }
        
        // Instructions sheet
        const instructions = [
          ['Property Bulk Upload Instructions'],
          [''],
          ['REQUIRED FIELDS:'],
          ['- district_id: MUST copy UUID from "Districts" sheet (REQUIRED!)'],
          ['- size: Property size in square meters (must be > 0)'],
          [''],
          ['OPTIONAL FIELDS (leave empty if not needed):'],
          ['- customer_reference_id: Leave empty for draft (can add later)'],
          ['- sub_district_id: Leave empty or copy UUID from system'],
          ['- property_type_id: Leave empty or copy UUID from "Property Types" sheet'],
          ['- Boundaries: Provide all 4 sides or leave all empty'],
          [''],
          ['HOW TO USE UUIDs:'],
          ['1. Go to "Districts" sheet'],
          ['2. Find your district (e.g., "Addis Ababa")'],
          ['3. Copy the UUID from "District UUID" column'],
          ['4. Paste into district_id field in Template sheet'],
          ['5. Repeat for property_type_id using "Property Types" sheet'],
          [''],
          ['BOOLEAN FIELDS (use lowercase):'],
          ['- is_downtown: true or false'],
          ['- is_building: true or false'],
          ['- has_built_area: true or false'],
          ['- has_property_wall: true or false'],
          [''],
          ['BOUNDARY TYPES (use uppercase):'],
          ['- north_type, south_type, east_type, west_type'],
          ['- Valid values: BUILDING, EMPTY_LAND, ROAD'],
          [''],
          ['IMPORTANT TIPS:'],
          ['1. DO NOT leave placeholder text in UUID fields'],
          ['2. Either paste a valid UUID or leave the cell EMPTY'],
          ['3. Properties will be created as DRAFT status'],
          ['4. Customer can be added later before submission'],
          ['5. Maximum 1,000 rows per upload'],
          ['6. Save as .xlsx before uploading'],
        ];
        const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
        XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
      } else if (selectedType === 'TAX_ASSESSMENT') {
        // Add properties reference sheet
        if (properties.length > 0) {
          const propertyData = properties.map(p => ({
            'Parcel Number': p.parcel_number,
            'Reference ID': p.reference_id,
            'Property UUID': p.id,
            'District': p.district?.name || 'N/A',
            'Size (sqm)': p.size || 'N/A',
          }));
          const wsProperties = XLSX.utils.json_to_sheet(propertyData);
          XLSX.utils.book_append_sheet(wb, wsProperties, 'Properties');
        } else {
          // Add a note if no properties available
          const noPropertiesNote = [
            ['No Approved Properties Available'],
            [''],
            ['There are no approved properties in the system yet.'],
            ['You need to:'],
            ['1. Create properties in the system'],
            ['2. Submit them for approval'],
            ['3. Get them approved'],
            ['4. Then you can create tax assessments for them'],
            [''],
            ['To get a property UUID:'],
            ['1. Go to Properties page in the system'],
            ['2. Click on an approved property'],
            ['3. Copy the UUID from the browser URL'],
            ['   Example: /properties/12345678-1234-1234-1234-123456789abc'],
            ['   The UUID is: 12345678-1234-1234-1234-123456789abc'],
          ];
          const wsNoProperties = XLSX.utils.aoa_to_sheet(noPropertiesNote);
          XLSX.utils.book_append_sheet(wb, wsNoProperties, 'Properties');
        }
        
        // Instructions for tax assessment
        const instructions = [
          ['Tax Assessment Bulk Upload Instructions'],
          [''],
          ['REQUIRED FIELDS:'],
          ['- property_id: UUID of the property (REQUIRED!)'],
          ['- tax_year: Year of assessment (e.g., 2025)'],
          ['- base_assessment: Base tax amount before exemptions (must be > 0)'],
          ['- exemption_amount: Tax exemption amount (default: 0)'],
          ['- assessed_amount: Final tax amount (base_assessment - exemption_amount)'],
          ['- land_size: Property land size in square meters'],
          ['- assessment_date: Date of assessment (format: YYYY-MM-DD)'],
          ['- due_date: Payment due date (format: YYYY-MM-DD)'],
          ['- occupancy_type: OWNER_OCCUPIED, RENTED, VACANT, or MIXED_USE'],
          ['- construction_status: COMPLETED, UNDER_CONSTRUCTION, or PLANNED'],
          [''],
          ['CALCULATION:'],
          ['- assessed_amount MUST equal (base_assessment - exemption_amount)'],
          ['- Example: base_assessment=10000, exemption_amount=0, assessed_amount=10000'],
          [''],
          ['HOW TO GET PROPERTY UUID:'],
          ['METHOD 1: Use the Properties reference sheet'],
          ['1. Go to "Properties" sheet in this workbook'],
          ['2. Find your property by Parcel Number or Reference ID'],
          ['3. Copy the UUID from "Property UUID" column'],
          ['4. Paste into property_id field in Template sheet'],
          [''],
          ['METHOD 2: From the system'],
          ['1. Go to Properties page in the system'],
          ['2. Click on the property you want to assess'],
          ['3. Copy the UUID from the URL or property details'],
          ['4. Paste into property_id field'],
          [''],
          ['IMPORTANT:'],
          ['1. Property must exist in the system before creating assessment'],
          ['2. Property must be APPROVED status'],
          ['3. One assessment per property per year'],
          ['4. Tax year must be current year or future'],
          ['5. due_date must be after assessment_date'],
          ['6. Maximum 1,000 rows per upload'],
          ['7. Save as .xlsx before uploading'],
        ];
        const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
        XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
      }

      // Generate and download
      XLSX.writeFile(wb, filename);

      toast.success('Template downloaded successfully');
      setStep(4);
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error('Failed to download template');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (selectedFile.size > maxSize) {
      toast.error('File size must be less than 10MB');
      return;
    }

    const validExtensions = ['.xlsx', '.xls'];
    const extension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(extension)) {
      toast.error('Only Excel files (.xlsx, .xls) are supported');
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file || !selectedType) return;

    setUploading(true);
    setUploadProgress(0);
    setValidating(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          setUploadProgress(30);
          
          // Parse Excel file
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          setUploadProgress(60);

          // Validate rows
          const results: ValidationRow[] = [];
          jsonData.forEach((row: any, index: number) => {
            const rowNumber = index + 2; // Excel rows start at 2 (after header)
            const messages: string[] = [];
            let status: 'valid' | 'error' | 'warning' = 'valid';

            // Basic validation based on type
            if (selectedType === 'CUSTOMER') {
              // Validate based on customer sub-type
              if (selectedCustomerType === 'PERSON') {
                // Helper function to get value from row with flexible column names
                const getValue = (row: any, ...possibleKeys: string[]) => {
                  // First try exact matches
                  for (const key of possibleKeys) {
                    if (row[key] !== undefined && row[key] !== null && row[key].toString().trim() !== '') {
                      return row[key];
                    }
                  }
                  
                  // Then try fuzzy matches (trimmed keys)
                  const rowKeys = Object.keys(row);
                  for (const possibleKey of possibleKeys) {
                    for (const rowKey of rowKeys) {
                      if (rowKey.trim().toLowerCase() === possibleKey.toLowerCase()) {
                        if (row[rowKey] !== undefined && row[rowKey] !== null && row[rowKey].toString().trim() !== '') {
                          return row[rowKey];
                        }
                      }
                    }
                  }
                  
                  return null;
                };

                // Validate 10 required fields for PERSON with flexible column names
                if (!getValue(row, 'pr_id', 'PR-ID', 'pr-id', 'PR_ID')) {
                  messages.push('PR-ID is required (column: pr_id, PR-ID, or PR_ID)');
                  status = 'error';
                }
                if (!getValue(row, 'full_name', 'Full Name', 'Full Name ', ' Full Name', 'full-name', 'Full_Name', 'fullname', 'name', 'Name')) {
                  messages.push('Full Name is required (column: full_name, Full Name, or Name)');
                  status = 'error';
                }
                if (!getValue(row, 'mothers_name', 'Mothers Name', 'mothers-name', 'Mothers_Name', 'Mother Name', 'mother_name')) {
                  messages.push('Mothers Name is required (column: mothers_name, Mothers Name, or Mother Name)');
                  status = 'error';
                }
                if (!getValue(row, 'date_of_birth', 'Date of Birth', 'Date of brith', 'date-of-birth', 'Date_of_Birth', 'DOB', 'dob')) {
                  messages.push('Date of Birth is required (column: date_of_birth, Date of Birth, Date of brith, or DOB)');
                  status = 'error';
                }
                if (!getValue(row, 'place_of_birth', 'Place of Birth', 'place-of-birth', 'Place_of_Birth', 'POB', 'pob')) {
                  messages.push('Place of Birth is required (column: place_of_birth, Place of Birth, or POB)');
                  status = 'error';
                }
                if (!getValue(row, 'gender', 'Gender')) {
                  messages.push('Gender is required (column: gender or Gender)');
                  status = 'error';
                }
                if (!getValue(row, 'nationality', 'Nationality')) {
                  messages.push('Nationality is required (column: nationality or Nationality)');
                  status = 'error';
                }
                if (!getValue(row, 'mobile_number_1', 'Mobile Number 1', 'mobile-number-1', 'Mobile_Number_1', 'phone1', 'Phone 1')) {
                  messages.push('Mobile Number 1 is required (column: mobile_number_1, Mobile Number 1, or Phone 1)');
                  status = 'error';
                }
                if (!getValue(row, 'email', 'Email', 'E-mail', 'e_mail')) {
                  messages.push('Email is required (column: email or Email)');
                  status = 'error';
                }
                if (!getValue(row, 'id_type', 'ID Type', 'id-type', 'ID_Type', 'Type of ID')) {
                  messages.push('ID Type is required (column: id_type, ID Type, or Type of ID)');
                  status = 'error';
                }
              } else if (selectedCustomerType === 'BUSINESS') {
                // All business fields are optional - no validation errors
                // Just check for basic format if values are provided
                if (row['email'] && row['email'].toString().trim() && !row['email'].toString().includes('@')) {
                  messages.push('Email format is invalid');
                  status = 'warning';
                }
                if (row['mobile_number_1'] && row['mobile_number_1'].toString().trim() && !row['mobile_number_1'].toString().match(/^\+\d{1,3}-?\d{3,4}-?\d{3,4}-?\d{3,4}$/)) {
                  messages.push('Mobile number 1 format should be +XXX-XXX-XXX-XXX');
                  status = 'warning';
                }
                if (row['mobile_number_2'] && row['mobile_number_2'].toString().trim() && !row['mobile_number_2'].toString().match(/^\+\d{1,3}-?\d{3,4}-?\d{3,4}-?\d{3,4}$/)) {
                  messages.push('Mobile number 2 format should be +XXX-XXX-XXX-XXX');
                  status = 'warning';
                }
              } else if (selectedCustomerType === 'GOVERNMENT') {
                // Only 3 required fields for GOVERNMENT customers
                if (!row['pr_id']) {
                  messages.push('PR-ID is required');
                  status = 'error';
                }
                if (!row['full_department_name']) {
                  messages.push('Full Government / Department Name is required');
                  status = 'error';
                }
                if (!row['contact_name']) {
                  messages.push('Contact Name is required');
                  status = 'error';
                }
                
                // Optional format validation
                if (row['email'] && row['email'].toString().trim() && !row['email'].toString().includes('@')) {
                  messages.push('Email format is invalid');
                  status = 'warning';
                }
                if (row['mobile_number_1'] && row['mobile_number_1'].toString().trim() && !row['mobile_number_1'].toString().match(/^\+\d{1,3}-?\d{3,4}-?\d{3,4}-?\d{3,4}$/)) {
                  messages.push('Mobile number 1 format should be +XXX-XXX-XXX-XXX');
                  status = 'warning';
                }
                if (row['mobile_number_2'] && row['mobile_number_2'].toString().trim() && !row['mobile_number_2'].toString().match(/^\+\d{1,3}-?\d{3,4}-?\d{3,4}-?\d{3,4}$/)) {
                  messages.push('Mobile number 2 format should be +XXX-XXX-XXX-XXX');
                  status = 'warning';
                }
              } else if (selectedCustomerType === 'MOSQUE_HOSPITAL') {
                // 5 Required fields for MOSQUE_HOSPITAL
                if (!row['PR-ID']) {
                  messages.push('PR-ID is required');
                  status = 'error';
                }
                if (!row['Full Mosque or Hospital Name']) {
                  messages.push('Full Mosque or Hospital Name is required');
                  status = 'error';
                }
                if (!row['Mosque Registration Number']) {
                  messages.push('Mosque Registration Number is required');
                  status = 'error';
                }
                if (!row['Contact Name']) {
                  messages.push('Contact Name is required');
                  status = 'error';
                }
                if (!row['Contact Number']) {
                  messages.push('Contact Number is required');
                  status = 'error';
                }
                
                // Validate mobile number format if provided
                if (row['Contact Number'] && row['Contact Number'].toString().trim() && !row['Contact Number'].toString().match(/^\+\d{1,3}-?\d{3,4}-?\d{3,4}-?\d{3,4}$/)) {
                  messages.push('Contact Number format should be +XXX-XXX-XXX-XXX');
                  status = 'warning';
                }
                if (row['Contact Number 2'] && row['Contact Number 2'].toString().trim() && !row['Contact Number 2'].toString().match(/^\+\d{1,3}-?\d{3,4}-?\d{3,4}-?\d{3,4}$/)) {
                  messages.push('Contact Number 2 format should be +XXX-XXX-XXX-XXX');
                  status = 'warning';
                }
                
                // Validate email format if provided
                if (row['Email'] && row['Email'].toString().trim() && !row['Email'].toString().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                  messages.push('Email format is invalid');
                  status = 'warning';
                }
              } else if (selectedCustomerType === 'NON_PROFIT') {
                // 5 Required fields for NON_PROFIT
                if (!row['PR-ID']) {
                  messages.push('PR-ID is required');
                  status = 'error';
                }
                if (!row['NGO Name']) {
                  messages.push('NGO Name is required');
                  status = 'error';
                }
                if (!row['NGO Registration Number']) {
                  messages.push('NGO Registration Number is required');
                  status = 'error';
                }
                if (!row['Contact Name']) {
                  messages.push('Contact Name is required');
                  status = 'error';
                }
                if (!row['Contact Number']) {
                  messages.push('Contact Number is required');
                  status = 'error';
                }
                
                // Validate mobile number format if provided
                if (row['Contact Number'] && row['Contact Number'].toString().trim() && !row['Contact Number'].toString().match(/^\+\d{1,3}-?\d{3,4}-?\d{3,4}-?\d{3,4}$/)) {
                  messages.push('Contact Number format should be +XXX-XXX-XXX-XXX');
                  status = 'warning';
                }
                if (row['Contact Number 2'] && row['Contact Number 2'].toString().trim() && !row['Contact Number 2'].toString().match(/^\+\d{1,3}-?\d{3,4}-?\d{3,4}-?\d{3,4}$/)) {
                  messages.push('Contact Number 2 format should be +XXX-XXX-XXX-XXX');
                  status = 'warning';
                }
                
                // Validate email format if provided
                if (row['Email'] && row['Email'].toString().trim() && !row['Email'].toString().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                  messages.push('Email format is invalid');
                  status = 'warning';
                }
              } else if (selectedCustomerType === 'RESIDENTIAL') {
                // 1 Required field for RESIDENTIAL
                if (!row['PR-ID']) {
                  messages.push('PR-ID is required');
                  status = 'error';
                }
              } else if (selectedCustomerType === 'RENTAL') {
                // Validate 11 required fields for RENTAL
                if (!row['pr_id']) {
                  messages.push('PR-ID is required');
                  status = 'error';
                }
                if (!row['rental_name']) {
                  messages.push('Rental name is required');
                  status = 'error';
                }
                if (!row['rental_mothers_name']) {
                  messages.push('Rental mother\'s name is required');
                  status = 'error';
                }
                if (!row['date_of_birth']) {
                  messages.push('Date of birth is required');
                  status = 'error';
                }
                if (!row['place_of_birth']) {
                  messages.push('Place of birth is required');
                  status = 'error';
                }
                if (!row['gender']) {
                  messages.push('Gender is required');
                  status = 'error';
                }
                if (!row['nationality']) {
                  messages.push('Nationality is required');
                  status = 'error';
                }
                if (!row['mobile_number_1']) {
                  messages.push('Mobile number 1 is required');
                  status = 'error';
                }
                if (!row['mobile_number_2']) {
                  messages.push('Mobile number 2 is required');
                  status = 'error';
                }
                if (!row['email']) {
                  messages.push('Email is required');
                  status = 'error';
                }
                if (!row['id_type']) {
                  messages.push('ID type is required');
                  status = 'error';
                }
              }
            } else if (selectedType === 'PROPERTY') {
              // Required fields validation
              if (!row['district_id']) {
                messages.push('district_id is required');
                status = 'error';
              }
              if (!row['size']) {
                messages.push('size is required');
                status = 'error';
              }
              if (!row['north_length']) {
                messages.push('north_length is required');
                status = 'error';
              }
              if (!row['south_length']) {
                messages.push('south_length is required');
                status = 'error';
              }
              if (!row['east_length']) {
                messages.push('east_length is required');
                status = 'error';
              }
              if (!row['west_length']) {
                messages.push('west_length is required');
                status = 'error';
              }
              if (!row['latitude'] || !row['longitude']) {
                messages.push('latitude and longitude are required');
                status = 'error';
              }
              // Note: customer_reference_id is optional - can be added later before submission
            } else if (selectedType === 'TAX_ASSESSMENT') {
              if (!row['property_id']) {
                messages.push('property_id is required');
                status = 'error';
              }
              if (!row['tax_year']) {
                messages.push('tax_year is required');
                status = 'error';
              }
              if (!row['base_assessment']) {
                messages.push('base_assessment is required');
                status = 'error';
              }
              if (!row['assessed_amount']) {
                messages.push('assessed_amount is required');
                status = 'error';
              }
              if (!row['land_size']) {
                messages.push('land_size is required');
                status = 'error';
              }
            } else if (selectedType === 'TAX_PAYMENT') {
              if (!row['Assessment Reference ID']) {
                messages.push('Assessment Reference ID is required');
                status = 'error';
              }
              if (!row['Amount Paid']) {
                messages.push('Amount Paid is required');
                status = 'error';
              }
            }

            results.push({
              rowNumber,
              data: row,
              status,
              messages: messages.length > 0 ? messages : ['Valid'],
            });
          });

          setUploadProgress(100);
          setValidationResults(results);
          setSessionId(`session-${Date.now()}`);
          
          const validRows = results.filter(r => r.status === 'valid').length;
          const errorRows = results.filter(r => r.status === 'error').length;
          
          setStep(5);
          toast.success(`Validation complete: ${validRows} valid, ${errorRows} errors`);
        } catch (parseError: any) {
          console.error('Parse error:', parseError);
          toast.error('Failed to parse Excel file');
        }
      };

      reader.readAsBinaryString(file);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      setValidating(false);
    }
  };

  const handleCommit = async () => {
    if (!validationResults.length) return;

    setCommitting(true);
    try {
      const validRows = validationResults.filter(r => r.status === 'valid');

      if (validRows.length === 0) {
        toast.error('No valid records to commit');
        return;
      }

      // Call backend API to commit the upload
      const response = await fetch('http://localhost:3000/api/v1/bulk-upload/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          entityType: selectedType === 'TAX_ASSESSMENT' || selectedType === 'TAX_PAYMENT' 
            ? 'tax' 
            : selectedType.toLowerCase(),
          validData: validRows.map(r => r.data), // Send as validData for backend
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to commit upload');
      }

      const result = await response.json();

      setStep(6);
      toast.success(`Import complete! ${result.data.successful} records created successfully.`);
      
      if (result.data.failed > 0) {
        toast.error(`${result.data.failed} records failed to import.`);
      }
    } catch (error: any) {
      console.error('Commit error:', error);
      toast.error(error.message || 'Failed to process records');
    } finally {
      setCommitting(false);
    }
  };

  const handleDownloadErrors = () => {
    const errorRows = validationResults.filter(r => r.status === 'error');
    const csv = [
      ['Row', 'Error Messages', 'Data'],
      ...errorRows.map(row => [
        row.rowNumber,
        row.messages.join('; '),
        JSON.stringify(row.data),
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `errors_${selectedType}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const filteredResults = validationResults.filter(row => {
    if (filterStatus === 'all') return true;
    return row.status === filterStatus;
  });

  const stats = {
    total: validationResults.length,
    valid: validationResults.filter(r => r.status === 'valid').length,
    errors: validationResults.filter(r => r.status === 'error').length,
    warnings: validationResults.filter(r => r.status === 'warning').length,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bulk Upload</h1>
        <p className="text-muted-foreground mt-2">
          Upload multiple records at once using Excel templates
        </p>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  progressStep >= s ? 'border-primary bg-primary text-primary-foreground' : 'border-muted bg-background'
                }`}>
                  {s}
                </div>
                {i < 4 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-colors ${
                    progressStep > s ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-muted-foreground">Data Type</span>
            <span className="text-xs text-muted-foreground">{selectedType === 'CUSTOMER' ? 'Customer Type' : 'Template'}</span>
            <span className="text-xs text-muted-foreground">Template</span>
            <span className="text-xs text-muted-foreground">Upload & Validate</span>
            <span className="text-xs text-muted-foreground">Complete</span>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Select Upload Type */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {uploadTypes.map((type) => (
            <Card
              key={type.type}
              className="cursor-pointer hover:border-primary transition-all hover:shadow-lg"
              onClick={() => handleTypeSelect(type.type)}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${type.color} bg-opacity-10`}>
                    <type.icon className={`h-8 w-8 ${type.color.replace('bg-', 'text-')}`} />
                  </div>
                  <div>
                    <CardTitle>{type.title}</CardTitle>
                    <CardDescription>{type.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Step 2: Select Customer Type (only for CUSTOMER uploads) */}
      {step === 2 && selectedType === 'CUSTOMER' && (
        <div>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Select Customer Type</CardTitle>
              <CardDescription>
                Choose the type of customers you want to upload
              </CardDescription>
            </CardHeader>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customerSubTypes.map((subType) => (
              <Card
                key={subType.type}
                className="cursor-pointer hover:border-primary transition-all hover:shadow-lg"
                onClick={() => handleCustomerTypeSelect(subType.type)}
              >
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-blue-500 bg-opacity-10">
                      <subType.icon className="h-8 w-8 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{subType.title}</CardTitle>
                      <CardDescription>{subType.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="mt-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Download Template */}
      {step === 3 && selectedType && (
        <Card>
          <CardHeader>
            <CardTitle>Download Template</CardTitle>
            <CardDescription>
              Download the Excel template for {uploadTypes.find(t => t.type === selectedType)?.title}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <FileSpreadsheet className="h-4 w-4" />
              <AlertDescription>
                <strong>Template Requirements:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Maximum 1,000 rows per upload</li>
                  <li>Required columns are marked with *</li>
                  <li>Follow the date format: YYYY-MM-DD</li>
                  <li>Sample data provided in the first row</li>
                  <li>Instructions included in separate sheet</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button onClick={handleDownloadTemplate} size="lg">
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
              <Button variant="outline" onClick={() => selectedType === 'CUSTOMER' ? setStep(2) : setStep(1)}>
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Upload File */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              Select your completed Excel file to upload
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted rounded-lg p-12 text-center">
              {!file ? (
                <div>
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">Drag and drop your file here</p>
                  <p className="text-sm text-muted-foreground mb-4">or</p>
                  <Button asChild variant="secondary">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      Browse Files
                      <input
                        id="file-upload"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </Button>
                  <p className="text-xs text-muted-foreground mt-4">
                    .xlsx or .xls • Max 10MB • Max 1,000 rows
                  </p>
                </div>
              ) : (
                <div>
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">{file.name}</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button variant="outline" onClick={() => setFile(null)}>
                    Choose Different File
                  </Button>
                </div>
              )}
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading and validating...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleUpload} disabled={!file || uploading} size="lg">
                {uploading ? 'Validating...' : 'Upload & Validate'}
              </Button>
              <Button variant="outline" onClick={() => setStep(3)} disabled={uploading}>
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Preview & Validate */}
      {step === 5 && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Rows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-600">Valid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-600">Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-orange-600">Warnings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.warnings}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Validation Results</CardTitle>
                  <CardDescription>Review validation results before committing</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={filterStatus === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={filterStatus === 'valid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('valid')}
                  >
                    Valid
                  </Button>
                  <Button
                    variant={filterStatus === 'error' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('error')}
                  >
                    Errors
                  </Button>
                  <Button
                    variant={filterStatus === 'warning' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('warning')}
                  >
                    Warnings
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row #</TableHead>
                      <TableHead>Data Preview</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Messages</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.slice(0, 50).map((row) => (
                      <TableRow key={row.rowNumber}>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell className="max-w-md truncate">
                          {Object.entries(row.data).slice(0, 3).map(([key, value]) => (
                            <span key={key} className="mr-2">
                              <strong>{key}:</strong> {String(value)}
                            </span>
                          ))}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            row.status === 'valid' ? 'default' :
                            row.status === 'error' ? 'destructive' : 'secondary'
                          }>
                            {row.status === 'valid' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {row.status === 'error' && <XCircle className="h-3 w-3 mr-1" />}
                            {row.status === 'warning' && <AlertCircle className="h-3 w-3 mr-1" />}
                            {row.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.messages.length > 0 && (
                            <ul className="list-disc list-inside text-sm">
                              {row.messages.map((msg, i) => (
                                <li key={i}>{msg}</li>
                              ))}
                            </ul>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredResults.length > 50 && (
                <p className="text-sm text-muted-foreground mt-4">
                  Showing first 50 of {filteredResults.length} rows
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2">
            {stats.errors > 0 && (
              <Button variant="outline" onClick={handleDownloadErrors}>
                <Download className="mr-2 h-4 w-4" />
                Download Error Report
              </Button>
            )}
            <Button
              onClick={handleCommit}
              disabled={stats.valid === 0 || committing}
              size="lg"
            >
              {committing ? 'Creating Records...' : `Commit ${stats.valid} Valid Rows`}
            </Button>
            <Button variant="outline" onClick={() => {
              setStep(3);
              setFile(null);
              setValidationResults([]);
            }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Step 6: Complete */}
      {step === 6 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500 bg-opacity-10">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <CardTitle>Upload Complete!</CardTitle>
                <CardDescription>Your records have been successfully created</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Summary:</strong>
                <ul className="list-disc list-inside mt-2">
                  <li>Created: {stats.valid} draft records</li>
                  {stats.errors > 0 && <li>Skipped (errors): {stats.errors} rows</li>}
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button onClick={() => {
                const typeMapping: Record<UploadType, string> = {
                  CUSTOMER: '/customers',
                  PROPERTY: '/properties',
                  TAX_ASSESSMENT: '/tax',
                  TAX_PAYMENT: '/tax',
                };
                navigate(typeMapping[selectedType!]);
              }}>
                View Created Records
              </Button>
              <Button variant="outline" onClick={() => {
                setStep(1);
                setSelectedType(null);
                setSelectedCustomerType(null);
                setFile(null);
                setValidationResults([]);
                setSessionId(null);
              }}>
                Upload Another File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

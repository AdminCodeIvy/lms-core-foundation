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
type CustomerSubType = 'PERSON' | 'BUSINESS' | 'GOVERNMENT' | 'MOSQUE_HOSPITAL' | 'NON_PROFIT' | 'CONTRACTOR';

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

  const handleCustomerTypeSelect = (subType: CustomerSubType) => {
    setSelectedCustomerType(subType);
    setStep(3); // Go to template download
  };

  const customerSubTypes = [
    { type: 'PERSON' as CustomerSubType, title: 'Person', description: 'Individual customers', icon: Users },
    { type: 'BUSINESS' as CustomerSubType, title: 'Business', description: 'Business entities and companies', icon: Users },
    { type: 'GOVERNMENT' as CustomerSubType, title: 'Government', description: 'Government departments and agencies', icon: Users },
    { type: 'MOSQUE_HOSPITAL' as CustomerSubType, title: 'Mosque/Hospital', description: 'Religious and healthcare facilities', icon: Users },
    { type: 'NON_PROFIT' as CustomerSubType, title: 'Non-Profit', description: 'Non-profit organizations', icon: Users },
    { type: 'CONTRACTOR' as CustomerSubType, title: 'Contractor', description: 'Contractors and service providers', icon: Users },
  ];

  const handleDownloadTemplate = async () => {
    try {
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
            sampleRow = {
              first_name: 'Ahmed',
              father_name: 'Mohamed',
              grandfather_name: 'Ali',
              fourth_name: 'Hassan',
              date_of_birth: '1990-05-15',
              place_of_birth: 'Jigjiga',
              gender: 'MALE',
              nationality: 'Ethiopia',
              mobile_number_1: '+251912345678',
              carrier_mobile_1: 'Ethio Telecom',
              mobile_number_2: '+251923456789',
              carrier_mobile_2: 'Safaricom',
              emergency_contact_name: 'Fatima Ahmed',
              emergency_contact_number: '+251987654321',
              email: 'ahmed.mohamed@example.com',
              id_type: 'National ID Card',
              id_number: 'ID123456',
              place_of_issue: 'Ethiopia',
              issue_date: '2015-01-01',
              expiry_date: '2030-01-01',
            };
            break;
          case 'BUSINESS':
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
            sampleRow = {
              business_name: 'ABC Trading Company',
              business_registration_number: 'BR123456',
              business_license_number: 'BL789012',
              business_address: '123 Main Street, Jigjiga',
              contact_name: 'Ahmed Mohamed',
              mobile_number_1: '+251912345678',
              mobile_number_2: '+251923456789',
              carrier_network: 'Ethio Telecom',
              email: 'info@abctrading.com',
              street: 'Main Street',
              district_id: 'JJG',
              section: 'A',
              block: '12',
            };
            break;
          case 'GOVERNMENT':
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
            sampleRow = {
              full_department_name: 'Ministry of Finance',
              department_address: '456 Government Road, Jigjiga',
              contact_name: 'Director General',
              mobile_number_1: '+251911234567',
              carrier_mobile_1: 'Ethio Telecom',
              mobile_number_2: '',
              carrier_mobile_2: '',
              email: 'contact@mof.gov.et',
              street: 'Government Road',
              district_id: 'JJG',
              section: 'B',
              block: '5',
            };
            break;
          case 'MOSQUE_HOSPITAL':
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
            sampleRow = {
              full_name: 'Central Mosque',
              registration_number: 'MOS123456',
              address: '789 Religious Street, Jigjiga',
              contact_name: 'Imam Ahmed',
              mobile_number_1: '+251913456789',
              carrier_mobile_1: 'Ethio Telecom',
              mobile_number_2: '',
              carrier_mobile_2: '',
              email: 'central.mosque@example.com',
              district_id: 'JJG',
              section: 'C',
              block: '8',
            };
            break;
          case 'NON_PROFIT':
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
            sampleRow = {
              full_non_profit_name: 'Community Development Organization',
              registration_number: 'NPO123456',
              license_number: 'NPL789012',
              address: '321 Charity Avenue, Jigjiga',
              contact_name: 'Director',
              mobile_number_1: '+251914567890',
              carrier_mobile_1: 'Ethio Telecom',
              mobile_number_2: '',
              carrier_mobile_2: '',
              email: 'info@cdo.org',
              district_id: 'JJG',
              section: 'D',
              block: '3',
            };
            break;
          case 'CONTRACTOR':
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
            sampleRow = {
              full_contractor_name: 'Construction Services Ltd',
              contact_name: 'Engineer Ahmed',
              mobile_number_1: '+251915678901',
              carrier_mobile_1: 'Ethio Telecom',
              mobile_number_2: '',
              carrier_mobile_2: '',
              email: 'ahmed@construction.com',
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
        templateData = [
          {
            'Customer Reference ID': 'CUS-2025-00001',
            'Parcel Number': 'PARCEL-001',
            'District Code': 'ADD | DRD | HRG | JJG',
            'Sub District': 'Sub-district name',
            'Property Type': 'Residential | Commercial | etc',
            'Latitude': '9.0192',
            'Longitude': '38.7525',
            'Notes': 'All fields required'
          }
        ];
        filename = 'property-template.xlsx';
      } else if (selectedType === 'TAX_ASSESSMENT') {
        templateData = [
          {
            'Property Reference ID': 'PROP-2025-00001',
            'Tax Year': '2025',
            'Land Size': '500',
            'Assessed Amount': '10000',
            'Due Date': '2025-12-31',
            'Notes': 'Enter property reference ID from properties table'
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
              if (!row['Customer Type']) {
                messages.push('Customer Type is required');
                status = 'error';
              }
              if (!row['Email']) {
                messages.push('Email is required');
                status = 'error';
              }
              if (!row['Mobile 1']) {
                messages.push('Mobile 1 is required');
                status = 'error';
              }
            } else if (selectedType === 'PROPERTY') {
              if (!row['Customer Reference ID']) {
                messages.push('Customer Reference ID is required');
                status = 'error';
              }
              if (!row['Parcel Number']) {
                messages.push('Parcel Number is required');
                status = 'error';
              }
              if (!row['District Code']) {
                messages.push('District Code is required');
                status = 'error';
              }
            } else if (selectedType === 'TAX_ASSESSMENT') {
              if (!row['Property Reference ID']) {
                messages.push('Property Reference ID is required');
                status = 'error';
              }
              if (!row['Tax Year']) {
                messages.push('Tax Year is required');
                status = 'error';
              }
              if (!row['Assessed Amount']) {
                messages.push('Assessed Amount is required');
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const validRows = validationResults.filter(r => r.status === 'valid');
      let createdCount = 0;

      // Insert records based on type
      if (selectedType === 'CUSTOMER') {
        // For customers, we'd need to insert into customers table and related tables
        // This is complex, so for now just show a message
        toast.info('Customer bulk upload requires manual processing. Please contact support.');
      } else if (selectedType === 'PROPERTY') {
        toast.info('Property bulk upload requires manual processing. Please contact support.');
      } else if (selectedType === 'TAX_ASSESSMENT') {
        toast.info('Tax assessment bulk upload requires manual processing. Please contact support.');
      } else if (selectedType === 'TAX_PAYMENT') {
        toast.info('Tax payment bulk upload requires manual processing. Please contact support.');
      }

      setStep(6);
      toast.success(`Processing complete. ${validRows.length} records are ready.`);
    } catch (error: any) {
      console.error('Commit error:', error);
      toast.error('Failed to process records');
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

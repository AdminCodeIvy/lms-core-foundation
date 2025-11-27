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

type UploadType = 'CUSTOMER' | 'PROPERTY' | 'TAX_ASSESSMENT' | 'TAX_PAYMENT';

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
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedType, setSelectedType] = useState<UploadType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationResults, setValidationResults] = useState<ValidationRow[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'error' | 'warning'>('all');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const canUpload = profile?.role === 'INPUTTER' || profile?.role === 'ADMINISTRATOR';

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
    setStep(2);
  };

  const handleDownloadTemplate = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-template', {
        body: { uploadType: selectedType },
      });

      if (error) throw error;

      // Create blob and download
      const blob = new Blob([data.file], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Template downloaded successfully');
      setStep(3);
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.message || 'Failed to download template');
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

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;

        setUploadProgress(50);

        // Validate file
        const { data, error } = await supabase.functions.invoke('validate-bulk-upload', {
          body: {
            uploadType: selectedType,
            filename: file.name,
            fileData: base64.split(',')[1], // Remove data:... prefix
          },
        });

        setUploadProgress(100);

        if (error) throw error;

        setValidationResults(data.rows);
        setSessionId(data.sessionId);
        setStep(4);
        toast.success(`Validation complete: ${data.validRows} valid, ${data.errorRows} errors`);
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleCommit = async () => {
    if (!sessionId) return;

    setCommitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('commit-bulk-upload', {
        body: { sessionId },
      });

      if (error) throw error;

      setStep(5);
      toast.success(`Successfully created ${data.createdCount} draft records`);
    } catch (error: any) {
      console.error('Commit error:', error);
      toast.error(error.message || 'Failed to commit records');
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
                  step >= s ? 'border-primary bg-primary text-primary-foreground' : 'border-muted bg-background'
                }`}>
                  {s}
                </div>
                {i < 4 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-colors ${
                    step > s ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-muted-foreground">Select Type</span>
            <span className="text-xs text-muted-foreground">Template</span>
            <span className="text-xs text-muted-foreground">Upload</span>
            <span className="text-xs text-muted-foreground">Validate</span>
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

      {/* Step 2: Download Template */}
      {step === 2 && selectedType && (
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
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Upload File */}
      {step === 3 && (
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
              <Button variant="outline" onClick={() => setStep(2)} disabled={uploading}>
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Preview & Validate */}
      {step === 4 && (
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

      {/* Step 5: Complete */}
      {step === 5 && (
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

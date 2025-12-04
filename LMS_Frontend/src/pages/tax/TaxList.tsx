import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { taxService } from '@/services/taxService';
import { lookupService } from '@/services/lookupService';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, FileDown, Filter, Archive, ArchiveRestore, Receipt, DollarSign } from 'lucide-react';
import { TaxAssessment, TaxStatus } from '@/types/tax';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { exportToExcel, formatCurrency as formatCurrencyUtil, formatDate } from '@/lib/export-utils';
import * as XLSX from 'xlsx';

export default function TaxList() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [assessments, setAssessments] = useState<TaxAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [search, setSearch] = useState('');
  const [taxYear, setTaxYear] = useState('all');
  const [status, setStatus] = useState('all');
  const [districtId, setDistrictId] = useState('all');
  const [arrearsOnly, setArrearsOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [districts, setDistricts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });

  const canCreateAssessment = profile?.role && ['INPUTTER', 'ADMINISTRATOR'].includes(profile.role);
  const canExport = profile?.role && ['APPROVER', 'ADMINISTRATOR'].includes(profile.role);
  const isViewer = profile?.role === 'VIEWER';

  // Generate year options (2020-2030)
  const yearOptions = Array.from({ length: 11 }, (_, i) => 2020 + i);

  // For viewers, only show assessed/paid status
  useEffect(() => {
    if (isViewer && status === 'all') {
      setStatus('ASSESSED');
    }
  }, [isViewer]);

  useEffect(() => {
    fetchDistricts();
  }, []);

  useEffect(() => {
    fetchAssessments();
  }, [search, taxYear, status, districtId, arrearsOnly, showArchived, pagination.page]);

  // Real-time subscription removed - using backend API
  // Polling can be added if needed

  const fetchDistricts = async () => {
    try {
      const data = await lookupService.getDistricts();
      setDistricts(data);
    } catch (error) {
      console.error('Error fetching districts:', error);
    }
  };

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const filters = {
        page: pagination.page,
        limit: pagination.limit,
        year: taxYear !== 'all' ? parseInt(taxYear) : undefined,
        status: status !== 'all' ? status : undefined,
        search: search || undefined,
        showArchived,
      };

      const response = await taxService.getAssessments(filters);
      
      setAssessments(response.data as unknown as TaxAssessment[]);
      setPagination({
        page: response.meta.page,
        limit: response.meta.limit,
        total: response.meta.total,
        totalPages: response.meta.totalPages,
      });
    } catch (error: any) {
      console.error('Error fetching tax assessments:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load tax assessments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      setDownloadingTemplate(true);

      // Create template data with headers and sample row
      const headers = [
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

      const sampleData = [{
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
      const filename = 'tax_assessment_template.xlsx';
      XLSX.writeFile(wb, filename);

      toast({
        title: 'Success',
        description: 'Template downloaded successfully',
      });
    } catch (error: any) {
      console.error('Download template error:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to download template',
        variant: 'destructive',
      });
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);

      // Fetch all assessments for export (no pagination)
      const filters = {
        page: 1,
        limit: 10000, // Large limit for export
        year: taxYear !== 'all' ? parseInt(taxYear) : undefined,
        status: status !== 'all' ? status : undefined,
        search: search || undefined,
        showArchived,
      };

      const response = await taxService.getAssessments(filters);
      const assessments = response.data;

      if (!assessments || assessments.length === 0) {
        toast({
          title: 'No data',
          description: 'No tax assessments found',
        });
        setExporting(false);
        return;
      }

      // Format data for export
      const exportData = assessments.map((assessment: any) => ({
        'Reference ID': assessment.reference_id || 'N/A',
        'Tax Year': assessment.tax_year,
        'Owner Type': assessment.occupancy_type,
        'Property Type': assessment.property_type,
        'Land Size (m²)': assessment.land_size,
        'Built Up Area (m²)': assessment.built_up_area || 'N/A',
        'Assessment Date': formatDate(assessment.assessment_date),
        'Due Date': formatDate(assessment.due_date),
        'Base Assessment': formatCurrencyUtil(assessment.base_assessment),
        'Exemption': formatCurrencyUtil(assessment.exemption_amount),
        'Assessed Amount': formatCurrencyUtil(assessment.assessed_amount),
        'Paid Amount': formatCurrencyUtil(assessment.paid_amount),
        'Outstanding Amount': formatCurrencyUtil(assessment.outstanding_amount),
        'Penalty Amount': formatCurrencyUtil(assessment.penalty_amount),
        'Status': assessment.status,
      }));

      const filters_list = [];
      if (search) filters_list.push(`Search: ${search}`);
      if (taxYear !== 'all') filters_list.push(`Tax Year: ${taxYear}`);
      if (status !== 'all') filters_list.push(`Status: ${status}`);
      if (arrearsOnly) filters_list.push('Arrears Only: Yes');

      const success = exportToExcel({
        data: exportData,
        filename: 'tax_assessments',
        sheetName: 'Tax Assessments',
        includeMetadata: true,
        metadata: {
          exportedBy: profile?.fullName || 'Unknown',
          filters: filters_list.join(', ') || 'None',
          totalRecords: assessments.length,
        },
      });

      if (success) {
        toast({
          title: 'Success',
          description: `Exported ${exportData.length} tax assessments`,
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to export tax assessments',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status: TaxStatus) => {
    const variants: Record<TaxStatus, { variant: any; label: string }> = {
      NOT_ASSESSED: { variant: 'secondary', label: 'Not Assessed' },
      ASSESSED: { variant: 'default', label: 'Assessed' },
      PAID: { variant: 'success', label: 'Paid' },
      PARTIAL: { variant: 'warning', label: 'Partial' },
      OVERDUE: { variant: 'destructive', label: 'Overdue' }
    };
    const config = variants[status];
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const canArchive = () => {
    return profile?.role === 'ADMINISTRATOR';
  };

  // Archive functionality disabled - requires TAX_ARCHIVE_MIGRATION.sql to be run first
  // const handleArchive = async (assessment: TaxAssessment, e: React.MouseEvent) => {
  //   e.stopPropagation();
  //   ...
  // };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {isViewer ? 'Tax Assessments' : 'Tax Assessments'}
          </h1>
          <p className="text-muted-foreground">
            {isViewer ? 'View property tax assessments and payments' : 'Manage property tax assessments and payments'}
          </p>
        </div>
        {!isViewer && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleDownloadTemplate} 
              disabled={downloadingTemplate}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {downloadingTemplate ? 'Downloading...' : 'Download Template'}
            </Button>
            {canExport && (
              <Button variant="outline" onClick={handleExport} disabled={exporting}>
                <FileDown className="mr-2 h-4 w-4" />
                {exporting ? 'Exporting...' : 'Export'}
              </Button>
            )}
            {canCreateAssessment && (
              <Button onClick={() => navigate('/tax/new')}>
                <Plus className="mr-2 h-4 w-4" />
                New Assessment
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      {isViewer ? (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by property reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={taxYear} onValueChange={setTaxYear}>
              <SelectTrigger>
                <SelectValue placeholder="Tax Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {yearOptions.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={districtId} onValueChange={setDistrictId}>
              <SelectTrigger>
                <SelectValue placeholder="District" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                {districts.map(district => (
                  <SelectItem key={district.id} value={district.id}>
                    {district.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      ) : (
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Filters</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by property reference ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={taxYear} onValueChange={setTaxYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Tax Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {yearOptions.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="NOT_ASSESSED">Not Assessed</SelectItem>
                  <SelectItem value="ASSESSED">Assessed</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="PARTIAL">Partial</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                </SelectContent>
              </Select>

              <Select value={districtId} onValueChange={setDistrictId}>
                <SelectTrigger>
                  <SelectValue placeholder="District" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Districts</SelectItem>
                  {districts.map(district => (
                    <SelectItem key={district.id} value={district.id}>
                      {district.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="arrears-only"
              checked={arrearsOnly}
              onCheckedChange={setArrearsOnly}
            />
            <Label htmlFor="arrears-only">Show only properties with outstanding amounts</Label>
          </div>
        </div>
      </Card>
      )}

      {/* Viewer Card View */}
      {isViewer ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))
          ) : assessments.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-12 text-center text-muted-foreground">
                No tax assessments found.
              </CardContent>
            </Card>
          ) : (
            assessments.map((assessment) => (
              <Card 
                key={assessment.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/tax/${assessment.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{assessment.property?.reference_id || 'N/A'}</h3>
                      <p className="text-sm text-muted-foreground">Year: {assessment.tax_year}</p>
                    </div>
                    {getStatusBadge(assessment.status)}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      <span>{assessment.property?.parcel_number || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>Assessed: {formatCurrency(assessment.assessed_amount)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span>Paid: {formatCurrency(assessment.paid_amount)}</span>
                    </div>
                    {assessment.outstanding_amount > 0 && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-destructive" />
                        <span className="text-destructive font-medium">
                          Outstanding: {formatCurrency(assessment.outstanding_amount)}
                        </span>
                      </div>
                    )}
                    <div className="text-muted-foreground pt-2">
                      {assessment.property?.district?.name || 'N/A'}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/tax/${assessment.id}`);
                    }}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* Table View for other roles */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property Reference</TableHead>
                  <TableHead>Parcel Number</TableHead>
                  <TableHead>Tax Year</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead className="text-right">Assessed</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : assessments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <p className="text-muted-foreground">No tax assessments found.</p>
                    {canCreateAssessment && (
                      <Button
                        variant="link"
                        onClick={() => navigate('/tax/new')}
                        className="mt-2"
                      >
                        Create your first assessment
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                assessments.map((assessment) => (
                  <TableRow
                    key={assessment.id}
                    className={`cursor-pointer ${assessment.status === 'OVERDUE' ? 'bg-destructive/5' : ''}`}
                    onClick={() => navigate(`/tax/${assessment.id}`)}
                  >
                    <TableCell className="font-medium">
                      {assessment.property?.reference_id || 'N/A'}
                    </TableCell>
                    <TableCell>{assessment.property?.parcel_number || 'N/A'}</TableCell>
                    <TableCell>{assessment.tax_year}</TableCell>
                    <TableCell>{assessment.property?.customer?.name || 'N/A'}</TableCell>
                    <TableCell>{assessment.property?.district?.name || 'N/A'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(assessment.assessed_amount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(assessment.paid_amount)}</TableCell>
                    <TableCell className="text-right">
                      <span className={assessment.outstanding_amount > 0 ? 'text-destructive font-medium' : ''}>
                        {formatCurrency(assessment.outstanding_amount)}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(assessment.status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tax/${assessment.id}`);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Pagination for Viewer Card View */}
      {isViewer && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

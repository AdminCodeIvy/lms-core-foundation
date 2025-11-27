import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
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
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, FileDown, Filter } from 'lucide-react';
import { TaxAssessment, TaxStatus } from '@/types/tax';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function TaxList() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [assessments, setAssessments] = useState<TaxAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [taxYear, setTaxYear] = useState('all');
  const [status, setStatus] = useState('all');
  const [districtId, setDistrictId] = useState('all');
  const [arrearsOnly, setArrearsOnly] = useState(false);
  const [districts, setDistricts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });

  const canCreateAssessment = profile?.role && ['INPUTTER', 'APPROVER', 'ADMINISTRATOR'].includes(profile.role);
  const canExport = profile?.role && ['APPROVER', 'ADMINISTRATOR'].includes(profile.role);

  // Generate year options (2020-2030)
  const yearOptions = Array.from({ length: 11 }, (_, i) => 2020 + i);

  useEffect(() => {
    fetchDistricts();
  }, []);

  useEffect(() => {
    fetchAssessments();
  }, [search, taxYear, status, districtId, arrearsOnly, pagination.page]);

  const fetchDistricts = async () => {
    const { data } = await supabase
      .from('districts')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (data) setDistricts(data);
  };

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      // Build base query
      let query = supabase
        .from('tax_assessments')
        .select(`
          *,
          property:properties!tax_assessments_property_id_fkey(
            id,
            reference_id,
            parcel_number,
            district:districts!properties_district_id_fkey(id, name),
            customer_id,
            customer:customers!properties_customer_id_fkey(id, name, entity_type)
          ),
          creator:users!tax_assessments_created_by_fkey(id, full_name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply search filter
      if (search) {
        const { data: properties } = await supabase
          .from('properties')
          .select('id')
          .or(`reference_id.ilike.%${search}%,parcel_number.ilike.%${search}%`);
        
        if (properties && properties.length > 0) {
          const propertyIds = properties.map(p => p.id);
          query = query.in('property_id', propertyIds);
        } else {
          // No matching properties, return empty result
          setAssessments([]);
          setPagination({
            page: pagination.page,
            limit: pagination.limit,
            total: 0,
            totalPages: 0
          });
          setLoading(false);
          return;
        }
      }

      // Apply filters
      if (taxYear && taxYear !== 'all') {
        query = query.eq('tax_year', parseInt(taxYear));
      }

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (arrearsOnly) {
        query = query.gt('outstanding_amount', 0);
      }

      if (districtId && districtId !== 'all') {
        const { data: properties } = await supabase
          .from('properties')
          .select('id')
          .eq('district_id', districtId);
        
        if (properties && properties.length > 0) {
          const propertyIds = properties.map(p => p.id);
          query = query.in('property_id', propertyIds);
        }
      }

      // Apply pagination
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setAssessments((data as unknown as TaxAssessment[]) || []);
      const total = count ?? 0;
      setPagination({
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: total > 0 ? Math.ceil(total / pagination.limit) : 0
      });
    } catch (error: any) {
      console.error('Error fetching tax assessments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tax assessments',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
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

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tax Assessments</h1>
          <p className="text-muted-foreground">Manage property tax assessments and payments</p>
        </div>
        <div className="flex gap-2">
          {canExport && (
            <Button variant="outline">
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}
          {canCreateAssessment && (
            <Button onClick={() => navigate('/tax/new')}>
              <Plus className="mr-2 h-4 w-4" />
              New Assessment
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
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

      {/* Table */}
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
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Edit, Plus, Check, X, Home, Building2, FileText } from 'lucide-react';
import { TaxAssessment, TaxPayment, TaxStatus } from '@/types/tax';
import { format } from 'date-fns';

export default function TaxDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [assessment, setAssessment] = useState<TaxAssessment | null>(null);
  const [payments, setPayments] = useState<TaxPayment[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const canEdit = profile?.role && ['INPUTTER', 'APPROVER', 'ADMINISTRATOR'].includes(profile.role);

  useEffect(() => {
    if (id) {
      fetchTaxDetail();
    }
  }, [id]);

  const fetchTaxDetail = async () => {
    setLoading(true);
    try {
      // Fetch tax assessment with property and creator details
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('tax_assessments')
        .select(`
          *,
          property:properties(id, reference_id, parcel_number, property_location, sub_location, door_number, road_name),
          creator:users!created_by(id, full_name)
        `)
        .eq('id', id)
        .single();

      if (assessmentError) throw assessmentError;

      // Fetch payments for this assessment
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('tax_payments')
        .select(`
          *,
          collector:users!collected_by(id, full_name)
        `)
        .eq('assessment_id', id)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Fetch activity logs
      const { data: logsData, error: logsError } = await supabase
        .from('activity_logs')
        .select(`
          *,
          performer:users!performed_by(id, full_name)
        `)
        .eq('entity_type', 'TAX_ASSESSMENT')
        .eq('entity_id', id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (logsError) throw logsError;

      setAssessment(assessmentData);
      setPayments(paymentsData || []);
      setActivityLogs(logsData || []);
    } catch (error: any) {
      console.error('Error fetching tax detail:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load tax assessment details',
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
    return <Badge variant={config.variant as any} className="text-lg px-4 py-1">{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount_paid, 0);

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Tax assessment not found</p>
          <Button onClick={() => navigate('/tax')} className="mt-4">
            Back to Tax List
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/tax">Tax</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {assessment.property?.reference_id} - {assessment.tax_year}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/tax')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold">
            Tax Assessment - {assessment.property?.reference_id} ({assessment.tax_year})
          </h1>
          <div className="mt-2">{getStatusBadge(assessment.status)}</div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/tax/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Assessment
            </Button>
            <Button onClick={() => navigate(`/tax/${id}/payment/new`)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment
            </Button>
          </div>
        )}
      </div>

      {/* Property Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Property Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Property Reference</p>
            <Link
              to={`/properties/${assessment.property_id}`}
              className="font-medium text-primary hover:underline"
            >
              {assessment.property?.reference_id}
            </Link>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Parcel Number</p>
            <p className="font-medium">{assessment.property?.parcel_number || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">District</p>
            <p className="font-medium">{assessment.property?.district?.name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Property Type</p>
            <p className="font-medium">{assessment.property?.property_type?.name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Owner</p>
            <Link
              to={`/customers/${assessment.property?.customer_id}`}
              className="font-medium text-primary hover:underline"
            >
              {assessment.property?.customer?.name || 'N/A'}
            </Link>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Occupancy Type</p>
            <Badge variant="outline">
              {assessment.occupancy_type.replace(/_/g, ' ')}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Assessment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Property Characteristics */}
          <div>
            <h3 className="font-semibold mb-3">Property Characteristics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Land Size</p>
                <p className="font-medium">{assessment.land_size} m²</p>
              </div>
              {assessment.built_up_area && (
                <div>
                  <p className="text-sm text-muted-foreground">Built-Up Area</p>
                  <p className="font-medium">{assessment.built_up_area} m²</p>
                </div>
              )}
              {assessment.number_of_units && (
                <div>
                  <p className="text-sm text-muted-foreground">Number of Units</p>
                  <p className="font-medium">{assessment.number_of_units}</p>
                </div>
              )}
              {assessment.number_of_floors && (
                <div>
                  <p className="text-sm text-muted-foreground">Number of Floors</p>
                  <p className="font-medium">{assessment.number_of_floors}</p>
                </div>
              )}
            </div>
          </div>

          {/* Utilities & Services */}
          <div>
            <h3 className="font-semibold mb-3">Utilities & Services</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant={assessment.has_water ? 'success' : 'secondary'}>
                {assessment.has_water ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                Water
              </Badge>
              <Badge variant={assessment.has_electricity ? 'success' : 'secondary'}>
                {assessment.has_electricity ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                Electricity
              </Badge>
              <Badge variant={assessment.has_sewer ? 'success' : 'secondary'}>
                {assessment.has_sewer ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                Sewer
              </Badge>
              <Badge variant={assessment.has_waste_collection ? 'success' : 'secondary'}>
                {assessment.has_waste_collection ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                Waste Collection
              </Badge>
            </div>
          </div>

          {/* Construction & Legal Status */}
          <div>
            <h3 className="font-semibold mb-3">Construction & Legal Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Construction Status</p>
                <Badge variant="outline">{assessment.construction_status.replace(/_/g, ' ')}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Property Registered</p>
                <Badge variant={assessment.property_registered ? 'success' : 'secondary'}>
                  {assessment.property_registered ? 'Yes' : 'No'}
                </Badge>
              </div>
              {assessment.property_registered && assessment.title_deed_number && (
                <div>
                  <p className="text-sm text-muted-foreground">Title Deed Number</p>
                  <p className="font-medium">{assessment.title_deed_number}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tax Calculation */}
          <div>
            <h3 className="font-semibold mb-3">Tax Calculation</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Base Assessment</span>
                <span className="font-medium">{formatCurrency(assessment.base_assessment)}</span>
              </div>
              {assessment.exemption_amount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Exemption Amount</span>
                  <span className="font-medium text-destructive">
                    -{formatCurrency(assessment.exemption_amount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold text-lg">Assessed Amount</span>
                <span className="font-bold text-lg">{formatCurrency(assessment.assessed_amount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Paid Amount</span>
                <span className="font-medium text-green-600">{formatCurrency(assessment.paid_amount)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold text-lg">Outstanding Amount</span>
                <span className={`font-bold text-lg ${assessment.outstanding_amount > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {formatCurrency(assessment.outstanding_amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <h3 className="font-semibold mb-3">Dates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Assessment Date</p>
                <p className="font-medium">{format(new Date(assessment.assessment_date), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-medium">{format(new Date(assessment.due_date), 'MMM dd, yyyy')}</p>
              </div>
              {assessment.days_overdue && assessment.days_overdue > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Days Overdue</p>
                  <p className="font-medium text-destructive">{assessment.days_overdue} days</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Renter Details (if applicable) */}
      {assessment.occupancy_type === 'RENTED' && assessment.renter_name && (
        <Card>
          <CardHeader>
            <CardTitle>Renter Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Renter Name</p>
              <p className="font-medium">{assessment.renter_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contact Number</p>
              <p className="font-medium">{assessment.renter_contact}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">National ID</p>
              <p className="font-medium">{assessment.renter_national_id}</p>
            </div>
            {assessment.monthly_rent_amount && (
              <div>
                <p className="text-sm text-muted-foreground">Monthly Rent</p>
                <p className="font-medium">{formatCurrency(assessment.monthly_rent_amount)}</p>
              </div>
            )}
            {assessment.rental_start_date && (
              <div>
                <p className="text-sm text-muted-foreground">Rental Start Date</p>
                <p className="font-medium">{format(new Date(assessment.rental_start_date), 'MMM dd, yyyy')}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Has Rental Agreement</p>
              <Badge variant={assessment.has_rental_agreement ? 'success' : 'secondary'}>
                {assessment.has_rental_agreement ? 'Yes' : 'No'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No payments recorded yet.</p>
              {canEdit && (
                <Button onClick={() => navigate(`/tax/${id}/payment/new`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Receipt Number</TableHead>
                    <TableHead>Collected By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{format(new Date(payment.payment_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(payment.amount_paid)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.payment_method.replace(/_/g, ' ')}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{payment.receipt_number}</TableCell>
                      <TableCell>{payment.collector?.full_name || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Payment Summary */}
              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Paid:</span>
                  <span className="font-bold text-green-600">{formatCurrency(totalPaid)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Remaining:</span>
                  <span className={`font-bold ${assessment.outstanding_amount > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {formatCurrency(assessment.outstanding_amount)}
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

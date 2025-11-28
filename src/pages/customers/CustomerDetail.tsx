import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { 
  ArrowLeft, 
  Edit, 
  Send, 
  Trash2, 
  AlertCircle,
  Copy,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  IdCard,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import type { CustomerWithDetails, CustomerStatus } from '@/types/customer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SubmitConfirmationDialog } from '@/components/workflow/SubmitConfirmationDialog';
import { RejectionBanner } from '@/components/workflow/RejectionBanner';
import { ActivityLogTab } from '@/components/activity/ActivityLogTab';
import { AuditLogViewer } from '@/components/audit/AuditLogViewer';

const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const [customer, setCustomer] = useState<CustomerWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCustomer();
    }
  }, [id]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('customers')
        .select(`
          *,
          customer_person(*),
          customer_business(*,districts(name)),
          customer_government(*,districts(name)),
          customer_mosque_hospital(*,districts(name)),
          customer_non_profit(*,districts(name)),
          customer_contractor(*),
          created_by_user:users!customers_created_by_fkey(full_name),
          approved_by_user:users!customers_approved_by_fkey(full_name)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Transform data
      const transformedData: CustomerWithDetails = {
        ...data,
        person_data: data.customer_person?.[0],
        business_data: data.customer_business?.[0],
        government_data: data.customer_government?.[0],
        mosque_hospital_data: data.customer_mosque_hospital?.[0],
        non_profit_data: data.customer_non_profit?.[0],
        contractor_data: data.customer_contractor?.[0],
        created_by_user: data.created_by_user,
        approved_by_user: data.approved_by_user,
      };

      setCustomer(transformedData);
    } catch (err: any) {
      console.error('Error fetching customer:', err);
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load customer details',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Reference ID copied to clipboard',
    });
  };

  const handleSubmit = async () => {
    if (!customer) return;

    try {
      setSubmitting(true);

      // Update customer status to SUBMITTED
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          status: 'SUBMITTED',
          submitted_at: new Date().toISOString(),
          rejection_feedback: null
        })
        .eq('id', customer.id);

      if (updateError) throw updateError;

      // Create activity log
      const { error: logError } = await supabase
        .from('activity_logs')
        .insert({
          entity_type: 'CUSTOMER',
          entity_id: customer.id,
          action: 'SUBMITTED',
          performed_by: user!.id,
          metadata: {
            reference_id: customer.reference_id,
            customer_type: customer.customer_type,
            submitted_at: new Date().toISOString()
          }
        });

      if (logError) console.error('Activity log error:', logError);

      // Get approvers and create notifications
      const { data: approvers } = await supabase
        .from('users')
        .select('id')
        .in('role', ['APPROVER', 'ADMINISTRATOR'])
        .eq('is_active', true);

      if (approvers && approvers.length > 0) {
        const notifications = approvers.map(approver => ({
          user_id: approver.id,
          title: 'New Customer Submitted',
          message: `Customer ${customer.reference_id} submitted by ${profile?.full_name || 'Unknown User'}`,
          entity_type: 'CUSTOMER',
          entity_id: customer.id
        }));

        await supabase.from('notifications').insert(notifications);
      }

      toast({
        title: 'Success',
        description: 'Customer submitted for approval',
      });

      setSubmitDialogOpen(false);
      fetchCustomer();
    } catch (err: any) {
      console.error('Error submitting customer:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to submit customer',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeVariant = (status: CustomerStatus) => {
    switch (status) {
      case 'DRAFT': return 'secondary';
      case 'SUBMITTED': return 'default';
      case 'APPROVED': return 'default';
      case 'REJECTED': return 'destructive';
      default: return 'secondary';
    }
  };

  const InfoItem = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-3 border-b last:border-0">
        <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-medium break-words">{value}</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/customers')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || 'Customer not found'}
            <Button variant="outline" size="sm" onClick={fetchCustomer} className="mt-2 ml-2">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              <Link to="/customers">Customers</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{customer.reference_id}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Rejection Banner */}
      {customer.status === 'REJECTED' && customer.rejection_feedback && (
        <RejectionBanner
          approverName={customer.approved_by_user?.full_name}
          rejectedDate={customer.updated_at}
          feedback={customer.rejection_feedback}
          onEditClick={() => navigate(`/customers/${customer.id}/edit`)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Customer {customer.reference_id}</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(customer.reference_id)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(customer.status)} className="text-base px-3 py-1">
              {customer.status}
            </Badge>
          </div>
        </div>
        <TooltipProvider>
          <div className="flex gap-2">
            {(profile?.role === 'INPUTTER' && (customer.status === 'DRAFT' || customer.status === 'REJECTED') && customer.created_by === user?.id) ||
             (profile?.role === 'APPROVER' && (customer.status === 'SUBMITTED' || customer.status === 'APPROVED' || customer.status === 'REJECTED')) ||
             profile?.role === 'ADMINISTRATOR' ? (
              <Button variant="outline" onClick={() => navigate(`/customers/${customer.id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" disabled>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>No permission to edit</p>
                </TooltipContent>
              </Tooltip>
            )}
            {((customer.status === 'DRAFT' || customer.status === 'REJECTED') && 
              (customer.created_by === user?.id || profile?.role === 'ADMINISTRATOR')) ? (
              <Button onClick={() => setSubmitDialogOpen(true)}>
                <Send className="h-4 w-4 mr-2" />
                {customer.status === 'REJECTED' ? 'Resubmit' : 'Submit'}
              </Button>
            ) : null}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="destructive" disabled>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Coming in Phase 2B</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="properties" disabled>
                  Linked Properties
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Coming in Phase 3</p>
              </TooltipContent>
            </Tooltip>
            <TabsTrigger value="activity">
              Activity
            </TabsTrigger>
          </TooltipProvider>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Person Type */}
          {customer.customer_type === 'PERSON' && customer.person_data && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  <InfoItem
                    icon={IdCard}
                    label="Reference ID"
                    value={customer.reference_id}
                  />
                  <InfoItem
                    icon={User}
                    label="Full Name"
                    value={`${customer.person_data.first_name} ${customer.person_data.father_name} ${customer.person_data.grandfather_name}${customer.person_data.fourth_name ? ' ' + customer.person_data.fourth_name : ''}`}
                  />
                  <InfoItem
                    icon={Calendar}
                    label="Date of Birth"
                    value={format(new Date(customer.person_data.date_of_birth), 'MMM dd, yyyy')}
                  />
                  <InfoItem
                    icon={MapPin}
                    label="Place of Birth"
                    value={customer.person_data.place_of_birth}
                  />
                  <InfoItem
                    icon={User}
                    label="Gender"
                    value={customer.person_data.gender}
                  />
                  <InfoItem
                    icon={MapPin}
                    label="Nationality"
                    value={customer.person_data.nationality}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  <InfoItem
                    icon={Phone}
                    label="Mobile Number 1"
                    value={`${customer.person_data.mobile_number_1} (${customer.person_data.carrier_mobile_1})`}
                  />
                  {customer.person_data.mobile_number_2 && (
                    <InfoItem
                      icon={Phone}
                      label="Mobile Number 2"
                      value={`${customer.person_data.mobile_number_2} (${customer.person_data.carrier_mobile_2})`}
                    />
                  )}
                  <InfoItem
                    icon={Mail}
                    label="Email"
                    value={customer.person_data.email}
                  />
                  <InfoItem
                    icon={Phone}
                    label="Emergency Contact"
                    value={`${customer.person_data.emergency_contact_name} - ${customer.person_data.emergency_contact_number}`}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IdCard className="h-5 w-5" />
                    Identification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  <InfoItem
                    icon={IdCard}
                    label="ID Type"
                    value={customer.person_data.id_type}
                  />
                  <InfoItem
                    icon={IdCard}
                    label="ID Number"
                    value={customer.person_data.id_number}
                  />
                  <InfoItem
                    icon={MapPin}
                    label="Place of Issue"
                    value={customer.person_data.place_of_issue}
                  />
                  <InfoItem
                    icon={Calendar}
                    label="Issue Date"
                    value={format(new Date(customer.person_data.issue_date), 'MMM dd, yyyy')}
                  />
                  <InfoItem
                    icon={Calendar}
                    label="Expiry Date"
                    value={format(new Date(customer.person_data.expiry_date), 'MMM dd, yyyy')}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {/* Business Type */}
          {customer.customer_type === 'BUSINESS' && customer.business_data && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Business Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  <InfoItem icon={IdCard} label="Reference ID" value={customer.reference_id} />
                  <InfoItem icon={Building2} label="Business Name" value={customer.business_data.business_name} />
                  <InfoItem icon={IdCard} label="Registration Number" value={customer.business_data.business_registration_number} />
                  <InfoItem icon={IdCard} label="License Number" value={customer.business_data.business_license_number} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  <InfoItem icon={User} label="Contact Name" value={customer.business_data.contact_name} />
                  <InfoItem icon={Phone} label="Mobile Number 1" value={customer.business_data.mobile_number_1} />
                  {customer.business_data.mobile_number_2 && (
                    <InfoItem icon={Phone} label="Mobile Number 2" value={customer.business_data.mobile_number_2} />
                  )}
                  <InfoItem icon={Phone} label="Carrier Network" value={customer.business_data.carrier_network} />
                  <InfoItem icon={Mail} label="Email" value={customer.business_data.email} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  <InfoItem icon={MapPin} label="Business Address" value={customer.business_data.business_address} />
                  <InfoItem icon={MapPin} label="Street" value={customer.business_data.street} />
                  <InfoItem icon={MapPin} label="District" value={customer.business_data.districts?.name} />
                  {customer.business_data.section && (
                    <InfoItem icon={MapPin} label="Section" value={customer.business_data.section} />
                  )}
                  {customer.business_data.block && (
                    <InfoItem icon={MapPin} label="Block" value={customer.business_data.block} />
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Add similar sections for other customer types */}

          {/* Record Information */}
          <Card>
            <CardHeader>
              <CardTitle>Record Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <InfoItem
                icon={IdCard}
                label="Status"
                value={customer.status}
              />
              <InfoItem
                icon={User}
                label="Created By"
                value={customer.created_by_user?.full_name}
              />
              <InfoItem
                icon={Calendar}
                label="Created Date"
                value={format(new Date(customer.created_at), 'MMM dd, yyyy HH:mm')}
              />
              {customer.approved_by_user && (
                <>
                  <InfoItem
                    icon={User}
                    label="Approved By"
                    value={customer.approved_by_user.full_name}
                  />
                  <InfoItem
                    icon={Calendar}
                    label="Approved Date"
                    value={format(new Date(customer.updated_at), 'MMM dd, yyyy HH:mm')}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <ActivityLogTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <AuditLogViewer 
            entityType="customer" 
            entityId={customer.id}
            title="Customer Audit Trail"
          />
        </TabsContent>
      </Tabs>

      <SubmitConfirmationDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        onConfirm={handleSubmit}
        loading={submitting}
      />
    </div>
  );
};

export default CustomerDetail;

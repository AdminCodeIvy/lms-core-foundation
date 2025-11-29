import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ApproveConfirmationDialog } from '@/components/workflow/ApproveConfirmationDialog';
import { RejectFeedbackDialog } from '@/components/workflow/RejectFeedbackDialog';
import type { CustomerWithDetails } from '@/types/customer';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface PropertyDetails {
  id: string;
  reference_id: string;
  parcel_number: string;
  status: string;
  size: number;
  latitude: number;
  longitude: number;
  district?: { name: string };
  sub_district?: { name: string };
  property_type?: { name: string };
  creator?: { full_name: string };
  boundaries?: any;
  updated_at: string;
}

const InfoItem = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div className="space-y-1">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="font-medium">{value || 'N/A'}</p>
  </div>
);

export const ReviewQueueDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState<'CUSTOMER' | 'PROPERTY' | null>(null);
  const [customer, setCustomer] = useState<CustomerWithDetails | null>(null);
  const [property, setProperty] = useState<PropertyDetails | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  useEffect(() => {
    if (profile && !['APPROVER', 'ADMINISTRATOR'].includes(profile.role)) {
      navigate('/');
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You do not have permission to access the review queue',
      });
    }
  }, [profile, navigate, toast]);

  useEffect(() => {
    if (id) {
      fetchEntityDetails();
    }
  }, [id]);

  const fetchEntityDetails = async () => {
    try {
      setLoading(true);

      // Try to fetch as customer first
      const { data: customerData, error: customerError } = await supabase
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

      if (customerData && !customerError) {
        const transformedData: CustomerWithDetails = {
          ...customerData,
          person_data: customerData.customer_person?.[0],
          business_data: customerData.customer_business?.[0],
          government_data: customerData.customer_government?.[0],
          mosque_hospital_data: customerData.customer_mosque_hospital?.[0],
          non_profit_data: customerData.customer_non_profit?.[0],
          contractor_data: customerData.customer_contractor?.[0],
          created_by_user: customerData.created_by_user,
          approved_by_user: customerData.approved_by_user,
        };
        setCustomer(transformedData);
        setEntityType('CUSTOMER');
        return;
      }

      // If not a customer, try to fetch as property
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select(`
          *,
          district:districts(id, name, code),
          sub_district:sub_districts(id, name),
          property_type:property_types(id, name),
          creator:users!properties_created_by_fkey(id, full_name)
        `)
        .eq('id', id)
        .single();

      if (propertyError) throw propertyError;

      // Fetch boundaries
      const { data: boundariesData } = await supabase
        .from('property_boundaries')
        .select('*')
        .eq('property_id', id)
        .maybeSingle();

      setProperty({
        ...propertyData,
        boundaries: boundariesData
      });
      setEntityType('PROPERTY');
    } catch (err: any) {
      console.error('Error fetching entity:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load details',
      });
      navigate('/review-queue');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!id || !profile) return;

    try {
      setActionLoading(true);

      if (entityType === 'CUSTOMER' && customer) {
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            status: 'APPROVED',
            approved_by: profile.id
          })
          .eq('id', customer.id);

        if (updateError) throw updateError;

        await supabase.from('activity_logs').insert({
          entity_type: 'CUSTOMER',
          entity_id: customer.id,
          action: 'APPROVED',
          performed_by: profile.id,
          metadata: {
            reference_id: customer.reference_id,
            customer_type: customer.customer_type
          }
        });

        toast({
          title: 'Success',
          description: 'Customer approved successfully',
        });
      } else if (entityType === 'PROPERTY' && property) {
        const { error: updateError } = await supabase
          .from('properties')
          .update({
            status: 'APPROVED',
            approved_by: profile.id,
          })
          .eq('id', property.id);

        if (updateError) throw updateError;

        await supabase.from('activity_logs').insert({
          entity_type: 'PROPERTY',
          entity_id: property.id,
          action: 'APPROVED',
          performed_by: profile.id,
          metadata: {
            reference_id: property.reference_id,
          },
        });

        // Notify creator (best-effort)
        const { data: propertyCreator } = await supabase
          .from('properties')
          .select('created_by')
          .eq('id', property.id)
          .single();
        
        if (propertyCreator?.created_by) {
          await supabase.from('notifications').insert({
            user_id: propertyCreator.created_by,
            title: 'Property Approved',
            message: `Your property ${property.parcel_number} has been approved`,
            type: 'approval',
          });
        }

        toast({
          title: 'Success',
          description: 'Property approved successfully',
        });
      }

      navigate('/review-queue');
    } catch (err: any) {
      console.error('Error approving:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to approve',
      });
    } finally {
      setActionLoading(false);
      setApproveDialogOpen(false);
    }
  };

  const handleReject = async (feedback: string) => {
    if (!id || !profile) return;

    try {
      setActionLoading(true);

      if (entityType === 'CUSTOMER' && customer) {
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            status: 'REJECTED',
            rejection_feedback: feedback
          })
          .eq('id', customer.id);

        if (updateError) throw updateError;

        await supabase.from('activity_logs').insert({
          entity_type: 'CUSTOMER',
          entity_id: customer.id,
          action: 'REJECTED',
          performed_by: profile.id,
          metadata: {
            reference_id: customer.reference_id,
            customer_type: customer.customer_type,
            feedback
          }
        });

        toast({
          title: 'Success',
          description: 'Customer rejected',
        });
      } else if (entityType === 'PROPERTY' && property) {
        const { error: updateError } = await supabase
          .from('properties')
          .update({
            status: 'REJECTED',
            rejection_feedback: feedback
          })
          .eq('id', property.id);

        if (updateError) throw updateError;

        await supabase.from('activity_logs').insert({
          entity_type: 'PROPERTY',
          entity_id: property.id,
          action: 'REJECTED',
          performed_by: profile.id,
          metadata: {
            reference_id: property.reference_id,
            feedback
          },
        });

        // Notify creator (best-effort)
        const { data: propertyCreator } = await supabase
          .from('properties')
          .select('created_by')
          .eq('id', property.id)
          .single();
        
        if (propertyCreator?.created_by) {
          await supabase.from('notifications').insert({
            user_id: propertyCreator.created_by,
            title: 'Property Rejected',
            message: `Your property ${property.parcel_number} has been rejected: ${feedback}`,
            type: 'rejection',
          });
        }

        toast({
          title: 'Success',
          description: 'Property rejected',
        });
      }

      navigate('/review-queue');
    } catch (err: any) {
      console.error('Error rejecting:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to reject',
      });
    } finally {
      setActionLoading(false);
      setRejectDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!customer && !property) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested item could not be found.</p>
          <Button onClick={() => navigate('/review-queue')}>Back to Review Queue</Button>
        </div>
      </div>
    );
  }

  const daysPending = customer
    ? Math.floor((Date.now() - new Date(customer.submitted_at || customer.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : property
    ? Math.floor((Date.now() - new Date(property.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/review-queue">Review Queue</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Review Details</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/review-queue')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">
            {entityType === 'CUSTOMER' ? 'Customer Review' : 'Property Review'}
          </h1>
        </div>
        <Badge variant={daysPending > 3 ? 'destructive' : 'default'}>
          {daysPending} days pending
        </Badge>
      </div>

      {customer && entityType === 'CUSTOMER' && (
        <CustomerReviewContent
          customer={customer}
          onApprove={() => setApproveDialogOpen(true)}
          onReject={() => setRejectDialogOpen(true)}
          actionLoading={actionLoading}
        />
      )}

      {property && entityType === 'PROPERTY' && (
        <PropertyReviewContent
          property={property}
          onApprove={() => setApproveDialogOpen(true)}
          onReject={() => setRejectDialogOpen(true)}
          actionLoading={actionLoading}
        />
      )}

      <ApproveConfirmationDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        onConfirm={handleApprove}
        loading={actionLoading}
        entityType={entityType === 'CUSTOMER' ? 'customer' : 'property'}
        referenceId={customer?.reference_id || property?.reference_id || ''}
      />

      <RejectFeedbackDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        onConfirm={handleReject}
        loading={actionLoading}
        referenceId={customer?.reference_id || property?.reference_id || ''}
        entityType={entityType === 'CUSTOMER' ? 'customer' : 'property'}
      />
    </div>
  );
};

const CustomerReviewContent = ({
  customer,
  onApprove,
  onReject,
  actionLoading,
}: {
  customer: CustomerWithDetails;
  onApprove: () => void;
  onReject: () => void;
  actionLoading: boolean;
}) => {
  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <InfoItem label="Reference ID" value={customer.reference_id} />
          <InfoItem label="Customer Type" value={customer.customer_type} />
          <InfoItem label="Status" value={customer.status} />
          <InfoItem
            label="Submitted At"
            value={customer.submitted_at ? format(new Date(customer.submitted_at), 'PPp') : 'N/A'}
          />
          <InfoItem label="Submitted By" value={customer.created_by_user?.full_name} />
        </CardContent>
      </Card>

      {customer.customer_type === 'PERSON' && customer.person_data && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Person Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <InfoItem label="First Name" value={customer.person_data.first_name} />
            <InfoItem label="Father Name" value={customer.person_data.father_name} />
            <InfoItem label="Grandfather Name" value={customer.person_data.grandfather_name} />
            <InfoItem label="Gender" value={customer.person_data.gender} />
            <InfoItem label="Mobile 1" value={customer.person_data.mobile_number_1} />
            <InfoItem label="Email" value={customer.person_data.email} />
          </CardContent>
        </Card>
      )}

      {customer.customer_type === 'BUSINESS' && customer.business_data && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <InfoItem label="Business Name" value={customer.business_data.business_name} />
            <InfoItem label="Registration Number" value={customer.business_data.business_registration_number} />
            <InfoItem label="District" value={customer.business_data.districts?.name} />
            <InfoItem label="Mobile 1" value={customer.business_data.mobile_number_1} />
            <InfoItem label="Email" value={customer.business_data.email} />
          </CardContent>
        </Card>
      )}

      {customer.customer_type === 'GOVERNMENT' && customer.government_data && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Government Entity Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <InfoItem label="Full Department Name" value={customer.government_data.full_department_name} />
            <InfoItem label="District" value={customer.government_data.districts?.name} />
            <InfoItem label="Mobile 1" value={customer.government_data.mobile_number_1} />
            <InfoItem label="Email" value={customer.government_data.email} />
          </CardContent>
        </Card>
      )}

      {customer.customer_type === 'MOSQUE_HOSPITAL' && customer.mosque_hospital_data && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Mosque/Hospital Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <InfoItem label="Full Name" value={customer.mosque_hospital_data.full_name} />
            <InfoItem label="District" value={customer.mosque_hospital_data.districts?.name} />
            <InfoItem label="Mobile 1" value={customer.mosque_hospital_data.mobile_number_1} />
            <InfoItem label="Email" value={customer.mosque_hospital_data.email} />
          </CardContent>
        </Card>
      )}

      {customer.customer_type === 'NON_PROFIT' && customer.non_profit_data && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Non-Profit Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <InfoItem label="Full Name" value={customer.non_profit_data.full_non_profit_name} />
            <InfoItem label="District" value={customer.non_profit_data.districts?.name} />
            <InfoItem label="Mobile 1" value={customer.non_profit_data.mobile_number_1} />
            <InfoItem label="Email" value={customer.non_profit_data.email} />
          </CardContent>
        </Card>
      )}

      {customer.customer_type === 'CONTRACTOR' && customer.contractor_data && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Contractor Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <InfoItem label="Full Name" value={customer.contractor_data.full_contractor_name} />
            <InfoItem label="Mobile 1" value={customer.contractor_data.mobile_number_1} />
            <InfoItem label="Email" value={customer.contractor_data.email} />
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Button onClick={onApprove} disabled={actionLoading} className="flex-1">
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve
        </Button>
        <Button onClick={onReject} disabled={actionLoading} variant="destructive" className="flex-1">
          <XCircle className="h-4 w-4 mr-2" />
          Reject
        </Button>
      </div>
    </>
  );
};

const PropertyReviewContent = ({
  property,
  onApprove,
  onReject,
  actionLoading,
}: {
  property: PropertyDetails;
  onApprove: () => void;
  onReject: () => void;
  actionLoading: boolean;
}) => {
  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Property Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <InfoItem label="Reference ID" value={property.reference_id} />
          <InfoItem label="Parcel Number" value={property.parcel_number} />
          <InfoItem label="Status" value={property.status} />
          <InfoItem label="Property Type" value={property.property_type?.name} />
          <InfoItem label="District" value={property.district?.name} />
          <InfoItem label="Sub District" value={property.sub_district?.name} />
          <InfoItem label="Size (sq m)" value={property.size?.toString()} />
          <InfoItem label="Submitted By" value={property.creator?.full_name} />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Location Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <InfoItem label="Latitude" value={property.latitude?.toString()} />
          <InfoItem label="Longitude" value={property.longitude?.toString()} />
        </CardContent>
      </Card>

      {property.boundaries && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Boundaries</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <InfoItem label="North" value={property.boundaries.north} />
            <InfoItem label="South" value={property.boundaries.south} />
            <InfoItem label="East" value={property.boundaries.east} />
            <InfoItem label="West" value={property.boundaries.west} />
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Button onClick={onApprove} disabled={actionLoading} className="flex-1">
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve
        </Button>
        <Button onClick={onReject} disabled={actionLoading} variant="destructive" className="flex-1">
          <XCircle className="h-4 w-4 mr-2" />
          Reject
        </Button>
      </div>
    </>
  );
};

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
  property_location?: string;
  sub_location?: string;
  is_downtown?: boolean;
  is_building?: boolean;
  has_built_area?: boolean;
  number_of_floors?: number;
  parcel_area?: number;
  has_property_wall?: boolean;
  door_number?: string;
  road_name?: string;
  postal_zip_code?: string;
  section?: string;
  block?: string;
  coordinates?: any;
  latitude?: number;
  longitude?: number;
  district?: { name: string };
  sub_district?: { name: string };
  property_type?: { name: string };
  creator?: { full_name: string };
  boundaries?: any;
  photos?: any[];
  ownership?: any[];
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
  const [entityType, setEntityType] = useState<'CUSTOMER' | 'PROPERTY' | 'TAX' | null>(null);
  const [customer, setCustomer] = useState<CustomerWithDetails | null>(null);
  const [property, setProperty] = useState<PropertyDetails | null>(null);
  const [tax, setTax] = useState<any | null>(null);
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
        console.log('Customer data fetched:', customerData);
        console.log('Customer business data:', customerData.customer_business);
        console.log('Customer person data:', customerData.customer_person);
        
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
        
        console.log('Transformed customer data:', transformedData);
        console.log('Business data after transform:', transformedData.business_data);
        
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

      // Fetch photos with storage URLs
      const { data: photosData } = await supabase
        .from('property_photos')
        .select(`
          *,
          uploader:users(id, full_name)
        `)
        .eq('property_id', id)
        .order('created_at', { ascending: false });
      
      // Get public URLs for photos
      const photosWithUrls = photosData?.map(photo => {
        if (photo.photo_url && photo.photo_url.startsWith('property-photos/')) {
          const { data } = supabase.storage
            .from('property-photos')
            .getPublicUrl(photo.photo_url);
          return { ...photo, photo_url: data.publicUrl };
        }
        return photo;
      }) || [];

      // Fetch ownership
      const { data: ownershipData } = await supabase
        .from('property_ownership')
        .select(`
          *,
          customer:customers(
            id,
            reference_id,
            customer_type,
            customer_person(first_name, fourth_name),
            customer_business(business_name),
            customer_government(full_department_name),
            customer_mosque_hospital(full_name),
            customer_non_profit(full_non_profit_name),
            customer_contractor(full_contractor_name)
          )
        `)
        .eq('property_id', id)
        .eq('is_current', true);

      setProperty({
        ...propertyData,
        boundaries: boundariesData,
        photos: photosWithUrls,
        ownership: ownershipData || []
      });
      setEntityType('PROPERTY');
      return;
    
      // If not a property, try to fetch as tax assessment (no changes needed yet)
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

  if (!customer && !property && !tax) {
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
            {entityType === 'CUSTOMER' ? 'Customer Review' : entityType === 'PROPERTY' ? 'Property Review' : 'Tax Assessment Review'}
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

      {tax && entityType === 'TAX' && (
        <TaxReviewContent
          tax={tax}
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
        entityType={entityType === 'CUSTOMER' ? 'customer' : entityType === 'PROPERTY' ? 'property' : 'tax'}
        referenceId={customer?.reference_id || property?.reference_id || tax?.reference_id || ''}
      />

      <RejectFeedbackDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        onConfirm={handleReject}
        loading={actionLoading}
        referenceId={customer?.reference_id || property?.reference_id || tax?.reference_id || ''}
        entityType={entityType === 'CUSTOMER' ? 'customer' : entityType === 'PROPERTY' ? 'property' : 'tax'}
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
  console.log('CustomerReviewContent - Customer:', customer);
  console.log('CustomerReviewContent - Customer Type:', customer.customer_type);
  console.log('CustomerReviewContent - Business Data:', customer.business_data);
  
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
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <InfoItem label="First Name" value={customer.person_data.first_name} />
              <InfoItem label="Father Name" value={customer.person_data.father_name} />
              <InfoItem label="Grandfather Name" value={customer.person_data.grandfather_name} />
              <InfoItem label="Fourth Name" value={customer.person_data.fourth_name} />
              <InfoItem label="Gender" value={customer.person_data.gender} />
              <InfoItem label="Place of Birth" value={customer.person_data.place_of_birth} />
              <InfoItem label="Nationality" value={customer.person_data.nationality} />
              <InfoItem 
                label="Date of Birth" 
                value={customer.person_data.date_of_birth ? format(new Date(customer.person_data.date_of_birth), 'MMM dd, yyyy') : undefined}
              />
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <InfoItem label="Mobile 1" value={customer.person_data.mobile_number_1} />
              <InfoItem label="Carrier 1" value={customer.person_data.carrier_mobile_1} />
              <InfoItem label="Mobile 2" value={customer.person_data.mobile_number_2} />
              <InfoItem label="Carrier 2" value={customer.person_data.carrier_mobile_2} />
              <InfoItem label="Emergency Contact Name" value={customer.person_data.emergency_contact_name} />
              <InfoItem label="Emergency Contact Number" value={customer.person_data.emergency_contact_number} />
              <InfoItem label="Email" value={customer.person_data.email} />
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Identification</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <InfoItem label="ID Type" value={customer.person_data.id_type} />
              <InfoItem label="ID Number" value={customer.person_data.id_number} />
              <InfoItem label="Place of Issue" value={customer.person_data.place_of_issue} />
              <InfoItem 
                label="Issue Date" 
                value={customer.person_data.issue_date ? format(new Date(customer.person_data.issue_date), 'MMM dd, yyyy') : undefined}
              />
              <InfoItem 
                label="Expiry Date" 
                value={customer.person_data.expiry_date ? format(new Date(customer.person_data.expiry_date), 'MMM dd, yyyy') : undefined}
              />
            </CardContent>
          </Card>
        </>
      )}

      {customer.customer_type === 'BUSINESS' && customer.business_data && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <InfoItem label="Business Name" value={customer.business_data.business_name} />
              <InfoItem label="Registration Number" value={customer.business_data.business_registration_number} />
              <InfoItem label="License Number" value={customer.business_data.business_license_number} />
              <InfoItem label="Business Address" value={customer.business_data.business_address} />
              <InfoItem label="Contact Name" value={customer.business_data.contact_name} />
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Contact & Location</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <InfoItem label="Mobile 1" value={customer.business_data.mobile_number_1} />
              <InfoItem label="Mobile 2" value={customer.business_data.mobile_number_2} />
              <InfoItem label="Carrier Network" value={customer.business_data.carrier_network} />
              <InfoItem label="Email" value={customer.business_data.email} />
              <InfoItem label="Street" value={customer.business_data.street} />
              <InfoItem label="District" value={customer.business_data.districts?.name} />
              <InfoItem label="Section" value={customer.business_data.section} />
              <InfoItem label="Block" value={customer.business_data.block} />
            </CardContent>
          </Card>
        </>
      )}

      {customer.customer_type === 'GOVERNMENT' && customer.government_data && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Government Entity Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <InfoItem label="Full Department Name" value={customer.government_data.full_department_name} />
              <InfoItem label="Contact Name" value={customer.government_data.contact_name} />
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Contact & Location</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <InfoItem label="Mobile 1" value={customer.government_data.mobile_number_1} />
              <InfoItem label="Mobile 2" value={customer.government_data.mobile_number_2} />
              <InfoItem label="Email" value={customer.government_data.email} />
              <InfoItem label="Street" value={customer.government_data.street} />
              <InfoItem label="District" value={customer.government_data.districts?.name} />
              <InfoItem label="Section" value={customer.government_data.section} />
              <InfoItem label="Block" value={customer.government_data.block} />
            </CardContent>
          </Card>
        </>
      )}

      {customer.customer_type === 'MOSQUE_HOSPITAL' && customer.mosque_hospital_data && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Mosque/Hospital Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <InfoItem label="Full Name" value={customer.mosque_hospital_data.full_name} />
              <InfoItem label="Contact Name" value={customer.mosque_hospital_data.contact_name} />
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Contact & Location</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <InfoItem label="Mobile 1" value={customer.mosque_hospital_data.mobile_number_1} />
              <InfoItem label="Mobile 2" value={customer.mosque_hospital_data.mobile_number_2} />
              <InfoItem label="Email" value={customer.mosque_hospital_data.email} />
              <InfoItem label="District" value={customer.mosque_hospital_data.districts?.name} />
              <InfoItem label="Section" value={customer.mosque_hospital_data.section} />
              <InfoItem label="Block" value={customer.mosque_hospital_data.block} />
            </CardContent>
          </Card>
        </>
      )}

      {customer.customer_type === 'NON_PROFIT' && customer.non_profit_data && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Non-Profit Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <InfoItem label="Full Name" value={customer.non_profit_data.full_non_profit_name} />
              <InfoItem label="Contact Name" value={customer.non_profit_data.contact_name} />
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Contact & Location</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <InfoItem label="Mobile 1" value={customer.non_profit_data.mobile_number_1} />
              <InfoItem label="Mobile 2" value={customer.non_profit_data.mobile_number_2} />
              <InfoItem label="Email" value={customer.non_profit_data.email} />
              <InfoItem label="District" value={customer.non_profit_data.districts?.name} />
              <InfoItem label="Section" value={customer.non_profit_data.section} />
              <InfoItem label="Block" value={customer.non_profit_data.block} />
            </CardContent>
          </Card>
        </>
      )}

      {customer.customer_type === 'CONTRACTOR' && customer.contractor_data && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Contractor Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <InfoItem label="Full Name" value={customer.contractor_data.full_contractor_name} />
              <InfoItem label="Mobile 1" value={customer.contractor_data.mobile_number_1} />
              <InfoItem label="Mobile 2" value={customer.contractor_data.mobile_number_2} />
              <InfoItem label="Email" value={customer.contractor_data.email} />
            </CardContent>
          </Card>
        </>
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
      {/* Basic Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <InfoItem label="Reference ID" value={property.reference_id} />
          <InfoItem label="Parcel Number" value={property.parcel_number} />
          <InfoItem label="Property Location" value={property.property_location} />
          <InfoItem label="Sub Location" value={property.sub_location} />
          <InfoItem label="District" value={property.district?.name} />
          <InfoItem label="Sub-District" value={property.sub_district?.name} />
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Downtown</p>
            <Badge variant={property.is_downtown ? 'default' : 'secondary'}>
              {property.is_downtown ? 'Yes' : 'No'}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Type</p>
            <Badge variant={property.is_building ? 'default' : 'outline'}>
              {property.is_building ? 'Building' : 'Empty Land'}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Has Built Area</p>
            <Badge variant={property.has_built_area ? 'default' : 'secondary'}>
              {property.has_built_area ? 'Yes' : 'No'}
            </Badge>
          </div>
          
          <InfoItem label="Number of Floors" value={property.number_of_floors?.toString()} />
          <InfoItem label="Size" value={property.size ? `${property.size} m²` : undefined} />
          <InfoItem label="Parcel Area" value={property.parcel_area ? `${property.parcel_area} m²` : undefined} />
          <InfoItem label="Property Type" value={property.property_type?.name} />
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Property Wall</p>
            <Badge variant={property.has_property_wall ? 'default' : 'secondary'}>
              {property.has_property_wall ? 'Yes' : 'No'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Address Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Address Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <InfoItem label="Door Number" value={property.door_number} />
          <InfoItem label="Road Name" value={property.road_name} />
          <InfoItem label="Postal/Zip Code" value={property.postal_zip_code} />
          <InfoItem label="Section" value={property.section} />
          <InfoItem label="Block" value={property.block} />
        </CardContent>
      </Card>

      {/* Location Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Location Coordinates</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <InfoItem 
            label="Latitude" 
            value={property.coordinates?.coordinates?.[1]?.toString() || property.latitude?.toString()} 
          />
          <InfoItem 
            label="Longitude" 
            value={property.coordinates?.coordinates?.[0]?.toString() || property.longitude?.toString()} 
          />
        </CardContent>
      </Card>

      {/* Boundaries */}
      {property.boundaries && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Property Boundaries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 p-3 border rounded-lg">
                <p className="font-medium text-sm">North Boundary</p>
                <div className="grid gap-2">
                  <InfoItem label="Length" value={property.boundaries.north_length ? `${property.boundaries.north_length} m` : undefined} />
                  <InfoItem label="Adjacent Type" value={property.boundaries.north_adjacent_type} />
                </div>
              </div>
              
              <div className="space-y-2 p-3 border rounded-lg">
                <p className="font-medium text-sm">South Boundary</p>
                <div className="grid gap-2">
                  <InfoItem label="Length" value={property.boundaries.south_length ? `${property.boundaries.south_length} m` : undefined} />
                  <InfoItem label="Adjacent Type" value={property.boundaries.south_adjacent_type} />
                </div>
              </div>
              
              <div className="space-y-2 p-3 border rounded-lg">
                <p className="font-medium text-sm">East Boundary</p>
                <div className="grid gap-2">
                  <InfoItem label="Length" value={property.boundaries.east_length ? `${property.boundaries.east_length} m` : undefined} />
                  <InfoItem label="Adjacent Type" value={property.boundaries.east_adjacent_type} />
                </div>
              </div>
              
              <div className="space-y-2 p-3 border rounded-lg">
                <p className="font-medium text-sm">West Boundary</p>
                <div className="grid gap-2">
                  <InfoItem label="Length" value={property.boundaries.west_length ? `${property.boundaries.west_length} m` : undefined} />
                  <InfoItem label="Adjacent Type" value={property.boundaries.west_adjacent_type} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photos */}
      {property.photos && property.photos.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Property Photos ({property.photos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {property.photos.map((photo: any) => (
                <div key={photo.id} className="space-y-2">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <img
                      src={photo.photo_url}
                      alt={photo.caption || 'Property photo'}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  {photo.caption && (
                    <p className="text-sm text-muted-foreground">{photo.caption}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Uploaded by {photo.uploader?.full_name || 'Unknown'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ownership */}
      {property.ownership && property.ownership.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Ownership Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {property.ownership.map((owner: any) => (
                <div key={owner.id} className="border rounded-lg p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoItem 
                      label="Owner" 
                      value={
                        owner.customer?.customer_business?.[0]?.business_name ||
                        owner.customer?.customer_government?.[0]?.full_department_name ||
                        owner.customer?.customer_mosque_hospital?.[0]?.full_name ||
                        owner.customer?.customer_non_profit?.[0]?.full_non_profit_name ||
                        owner.customer?.customer_contractor?.[0]?.full_contractor_name ||
                        (owner.customer?.customer_person?.[0] 
                          ? `${owner.customer.customer_person[0].first_name} ${owner.customer.customer_person[0].fourth_name}`.trim()
                          : 'N/A')
                      }
                    />
                    <InfoItem label="Customer Reference" value={owner.customer?.reference_id} />
                    <InfoItem label="Customer Type" value={owner.customer?.customer_type} />
                    <InfoItem label="Ownership %" value={`${owner.ownership_percentage || 100}%`} />
                    <InfoItem 
                      label="Start Date" 
                      value={owner.start_date ? format(new Date(owner.start_date), 'MMM dd, yyyy') : undefined}
                    />
                    <InfoItem 
                      label="End Date" 
                      value={owner.end_date ? format(new Date(owner.end_date), 'MMM dd, yyyy') : 'Current'}
                    />
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={owner.is_current ? 'default' : 'secondary'}>
                        {owner.is_current ? 'Current' : 'Historical'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflow Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Workflow Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <InfoItem label="Submitted By" value={property.creator?.full_name} />
          <InfoItem label="Status" value={property.status} />
        </CardContent>
      </Card>

      {/* Action Buttons */}
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

const TaxReviewContent = ({
  tax,
  onApprove,
  onReject,
  actionLoading,
}: {
  tax: any;
  onApprove: () => void;
  onReject: () => void;
  actionLoading: boolean;
}) => {
  return (
    <>
      {/* Property & Tax Year */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Tax Assessment Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <InfoItem label="Reference ID" value={tax.reference_id} />
          <InfoItem label="Tax Year" value={tax.tax_year?.toString()} />
          <InfoItem label="Property Reference" value={tax.property?.reference_id} />
          <InfoItem label="Parcel Number" value={tax.property?.parcel_number} />
          <InfoItem label="District" value={tax.property?.district?.name} />
          <InfoItem label="Status" value={tax.status} />
        </CardContent>
      </Card>

      {/* Occupancy Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Occupancy Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <InfoItem label="Occupancy Type" value={tax.occupancy_type} />
          {tax.occupancy_type === 'RENTED' && (
            <>
              <InfoItem label="Renter Name" value={tax.renter_name} />
              <InfoItem label="Renter Contact" value={tax.renter_contact} />
              <InfoItem label="Renter National ID" value={tax.renter_national_id} />
              <InfoItem 
                label="Monthly Rent" 
                value={tax.monthly_rent_amount ? `$${tax.monthly_rent_amount.toLocaleString()}` : undefined} 
              />
              <InfoItem 
                label="Rental Start Date" 
                value={tax.rental_start_date ? format(new Date(tax.rental_start_date), 'MMM dd, yyyy') : undefined}
              />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Rental Agreement</p>
                <Badge variant={tax.has_rental_agreement ? 'default' : 'secondary'}>
                  {tax.has_rental_agreement ? 'Yes' : 'No'}
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Property Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Property Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <InfoItem label="Property Type" value={tax.property_type} />
          <InfoItem label="Land Size" value={tax.land_size ? `${tax.land_size} m²` : undefined} />
          <InfoItem label="Built-Up Area" value={tax.built_up_area ? `${tax.built_up_area} m²` : undefined} />
          <InfoItem label="Number of Units" value={tax.number_of_units?.toString()} />
          <InfoItem label="Number of Floors" value={tax.number_of_floors?.toString()} />
        </CardContent>
      </Card>

      {/* Utilities & Services */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Utilities & Services</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Water</p>
            <Badge variant={tax.has_water ? 'default' : 'secondary'}>
              {tax.has_water ? 'Yes' : 'No'}
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Electricity</p>
            <Badge variant={tax.has_electricity ? 'default' : 'secondary'}>
              {tax.has_electricity ? 'Yes' : 'No'}
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Sewer</p>
            <Badge variant={tax.has_sewer ? 'default' : 'secondary'}>
              {tax.has_sewer ? 'Yes' : 'No'}
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Waste Collection</p>
            <Badge variant={tax.has_waste_collection ? 'default' : 'secondary'}>
              {tax.has_waste_collection ? 'Yes' : 'No'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Construction & Legal Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Construction & Legal Status</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <InfoItem label="Construction Status" value={tax.construction_status} />
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Property Registered</p>
            <Badge variant={tax.property_registered ? 'default' : 'secondary'}>
              {tax.property_registered ? 'Yes' : 'No'}
            </Badge>
          </div>
          {tax.property_registered && (
            <InfoItem label="Title Deed Number" value={tax.title_deed_number} />
          )}
        </CardContent>
      </Card>

      {/* Tax Calculation */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Tax Calculation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <InfoItem 
            label="Base Assessment" 
            value={tax.base_assessment ? `$${tax.base_assessment.toLocaleString()}` : undefined} 
          />
          <InfoItem 
            label="Exemption Amount" 
            value={tax.exemption_amount ? `$${tax.exemption_amount.toLocaleString()}` : '$0'} 
          />
          <InfoItem 
            label="Assessed Amount" 
            value={tax.assessed_amount ? `$${tax.assessed_amount.toLocaleString()}` : undefined} 
          />
          <InfoItem 
            label="Amount Paid" 
            value={tax.amount_paid ? `$${tax.amount_paid.toLocaleString()}` : '$0'} 
          />
          <InfoItem 
            label="Outstanding" 
            value={tax.outstanding_amount ? `$${tax.outstanding_amount.toLocaleString()}` : '$0'} 
          />
        </CardContent>
      </Card>

      {/* Dates */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Important Dates</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <InfoItem 
            label="Assessment Date" 
            value={tax.assessment_date ? format(new Date(tax.assessment_date), 'MMM dd, yyyy') : undefined}
          />
          <InfoItem 
            label="Due Date" 
            value={tax.due_date ? format(new Date(tax.due_date), 'MMM dd, yyyy') : undefined}
          />
        </CardContent>
      </Card>

      {/* Workflow Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Workflow Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <InfoItem label="Created By" value={tax.creator?.full_name} />
          <InfoItem 
            label="Created At" 
            value={tax.created_at ? format(new Date(tax.created_at), 'MMM dd, yyyy HH:mm') : undefined}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
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

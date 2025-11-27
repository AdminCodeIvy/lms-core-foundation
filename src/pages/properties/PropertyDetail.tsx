import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, MapPin, Camera, Users, Activity, Receipt, Edit, Send } from 'lucide-react';
import { toast } from 'sonner';
import { ActivityLogTab } from '@/components/activity/ActivityLogTab';
import { SubmitConfirmationDialog } from '@/components/workflow/SubmitConfirmationDialog';
import { format } from 'date-fns';

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [boundaries, setBoundaries] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [ownership, setOwnership] = useState<any[]>([]);
  const [taxAssessments, setTaxAssessments] = useState<any[]>([]);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPropertyDetail();
      fetchTaxAssessments();
    }
  }, [id]);

  const fetchPropertyDetail = async () => {
    try {
      setLoading(true);

      // Fetch property with related data
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select(`
          *,
          district:districts(id, name, code),
          sub_district:sub_districts(id, name),
          creator:users!properties_created_by_fkey(id, full_name),
          approver:users!properties_approved_by_fkey(id, full_name)
        `)
        .eq('id', id)
        .maybeSingle();

      if (propertyError) throw propertyError;
      if (!propertyData) {
        setProperty(null);
        return;
      }

      // Fetch boundaries
      const { data: boundariesData } = await supabase
        .from('property_boundaries')
        .select('*')
        .eq('property_id', id)
        .maybeSingle();

      // Fetch photos
      const { data: photosData } = await supabase
        .from('property_photos')
        .select(`
          *,
          uploader:users(id, full_name)
        `)
        .eq('property_id', id);

      // Fetch ownership
      const { data: ownershipData } = await supabase
        .from('property_ownership')
        .select(`
          *,
          customer:customers(
            id,
            reference_id,
            customer_type,
            person:customer_person(first_name, last_name),
            business:customer_business(business_name)
          )
        `)
        .eq('property_id', id)
        .eq('is_current', true);

      setProperty(propertyData);
      setBoundaries(boundariesData);
      setPhotos(photosData || []);
      setOwnership(ownershipData || []);
    } catch (error) {
      console.error('Error fetching property:', error);
      toast.error('Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  const fetchTaxAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from('tax_assessments')
        .select('*')
        .eq('property_id', id)
        .order('tax_year', { ascending: false });

      if (error) throw error;
      setTaxAssessments(data || []);
    } catch (error) {
      console.error('Error fetching tax assessments:', error);
    }
  };

  const handleSubmit = async () => {
    if (!property) return;

    try {
      setSubmitting(true);

      // Update property status to SUBMITTED
      const { error: updateError } = await supabase
        .from('properties')
        .update({
          status: 'SUBMITTED'
        })
        .eq('id', property.id);

      if (updateError) throw updateError;

      // Create activity log
      await supabase.from('activity_logs').insert({
        entity_type: 'PROPERTY',
        entity_id: property.id,
        action: 'SUBMITTED',
        performed_by: user?.id
      });

      // Create notifications for approvers and administrators
      const { data: approvers } = await supabase
        .from('users')
        .select('id')
        .in('role', ['APPROVER', 'ADMINISTRATOR'])
        .eq('is_active', true);

      if (approvers && approvers.length > 0) {
        const notifications = approvers.map(approver => ({
          user_id: approver.id,
          title: 'Property Submitted for Approval',
          message: `Property ${property.reference_id} has been submitted for approval`,
          entity_type: 'PROPERTY',
          entity_id: property.id,
          action_url: `/properties/${property.id}`
        }));

        await supabase.from('notifications').insert(notifications);
      }

      toast.success('Property submitted for approval');
      setSubmitDialogOpen(false);
      fetchPropertyDetail();
    } catch (error: any) {
      console.error('Error submitting property:', error);
      toast.error(error.message || 'Failed to submit property');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      NOT_ASSESSED: { variant: 'secondary', label: 'Not Assessed' },
      ASSESSED: { variant: 'default', label: 'Assessed' },
      PAID: { variant: 'success', label: 'Paid' },
      PARTIAL: { variant: 'warning', label: 'Partial' },
      OVERDUE: { variant: 'destructive', label: 'Overdue' }
    };
    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-500';
      case 'SUBMITTED': return 'bg-blue-500';
      case 'APPROVED': return 'bg-green-500';
      case 'REJECTED': return 'bg-red-500';
      case 'ARCHIVED': return 'bg-gray-700';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Property not found</p>
        <Button onClick={() => navigate('/properties')} className="mt-4">
          Back to Properties
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/properties')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Property {property.reference_id}
            </h1>
            <p className="text-muted-foreground">
              {property.district?.name} • {property.parcel_number}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${getStatusColor(property.status)} text-base px-4 py-1.5`}>
            {property.status}
          </Badge>
          {((profile?.role === 'INPUTTER' && property.status === 'DRAFT' && property.created_by === user?.id) ||
            (profile?.role === 'APPROVER' && ['SUBMITTED', 'APPROVED', 'REJECTED'].includes(property.status)) ||
            profile?.role === 'ADMINISTRATOR') && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => toast.info('Property edit feature coming soon')}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {((property.status === 'DRAFT' || property.status === 'REJECTED') && 
            (property.created_by === user?.id || profile?.role === 'ADMINISTRATOR')) && (
            <Button 
              size="sm"
              onClick={() => setSubmitDialogOpen(true)}
            >
              <Send className="h-4 w-4 mr-2" />
              {property.status === 'REJECTED' ? 'Resubmit' : 'Submit'}
            </Button>
          )}
        </div>
      </div>

      {/* Rejection Banner */}
      {property.status === 'REJECTED' && property.rejection_feedback && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-destructive/10 p-2">
                <Activity className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-destructive">Property Rejected</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This property was rejected by {property.approver?.full_name || 'an approver'}
                </p>
                <div className="mt-3 rounded-lg bg-destructive/10 p-3">
                  <p className="text-sm font-medium">Rejection Feedback:</p>
                  <p className="text-sm mt-1">{property.rejection_feedback}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">
            <FileText className="h-4 w-4 mr-2" />
            Details
          </TabsTrigger>
          <TabsTrigger value="boundaries">
            <MapPin className="h-4 w-4 mr-2" />
            Boundaries
          </TabsTrigger>
          <TabsTrigger value="photos">
            <Camera className="h-4 w-4 mr-2" />
            Images ({photos.length})
          </TabsTrigger>
          <TabsTrigger value="ownership">
            <Users className="h-4 w-4 mr-2" />
            Ownership ({ownership.length})
          </TabsTrigger>
          <TabsTrigger value="tax">
            <Receipt className="h-4 w-4 mr-2" />
            Tax Summary ({taxAssessments.length})
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4 mr-2" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Reference ID</label>
                <p className="mt-1 font-mono">{property.reference_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Parcel Number</label>
                <p className="mt-1 font-mono">{property.parcel_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">District</label>
                <p className="mt-1">{property.district?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Sub-District</label>
                <p className="mt-1">{property.sub_district?.name || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Downtown</label>
                <Badge variant={property.is_downtown ? 'default' : 'secondary'}>
                  {property.is_downtown ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Type</label>
                <Badge variant={property.is_building ? 'default' : 'outline'}>
                  {property.is_building ? 'Building' : 'Empty Land'}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Size</label>
                <p className="mt-1">{property.size} m²</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Property Wall</label>
                <Badge variant={property.has_property_wall ? 'default' : 'secondary'}>
                  {property.has_property_wall ? 'Yes' : 'No'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="boundaries">
          <Card>
            <CardHeader>
              <CardTitle>Property Boundaries</CardTitle>
            </CardHeader>
            <CardContent>
              {boundaries ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold mb-2">North Boundary</h3>
                    <p>Length: {boundaries.north_length} m</p>
                    <Badge className="mt-2" variant="outline">
                      {boundaries.north_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold mb-2">South Boundary</h3>
                    <p>Length: {boundaries.south_length} m</p>
                    <Badge className="mt-2" variant="outline">
                      {boundaries.south_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold mb-2">East Boundary</h3>
                    <p>Length: {boundaries.east_length} m</p>
                    <Badge className="mt-2" variant="outline">
                      {boundaries.east_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold mb-2">West Boundary</h3>
                    <p>Length: {boundaries.west_length} m</p>
                    <Badge className="mt-2" variant="outline">
                      {boundaries.west_type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No boundary information available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos">
          <Card>
            <CardHeader>
              <CardTitle>Property Images</CardTitle>
            </CardHeader>
            <CardContent>
              {photos.length === 0 ? (
                <p className="text-muted-foreground">No images uploaded yet</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {photos.map((photo, index) => (
                    <div key={photo.id} className="rounded-lg border overflow-hidden">
                      <img
                        src={photo.photo_url}
                        alt={`Property photo ${index + 1}`}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-2 text-sm">
                        <p className="truncate">Photo {index + 1}</p>
                        <p className="text-muted-foreground text-xs">
                          {photo.uploader?.full_name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ownership">
          <Card>
            <CardHeader>
              <CardTitle>Property Ownership</CardTitle>
            </CardHeader>
            <CardContent>
              {ownership.length === 0 ? (
                <p className="text-muted-foreground">No owners linked to this property yet</p>
              ) : (
                <div className="space-y-3">
                  {ownership.map((owner) => (
                    <div key={owner.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          {owner.customer.person?.first_name} {owner.customer.person?.last_name || owner.customer.business?.business_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {owner.customer.reference_id}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge>{owner.ownership_type.replace('_', ' ')}</Badge>
                        {owner.ownership_percentage && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {owner.ownership_percentage}%
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Tax Summary</span>
                {profile?.role && ['INPUTTER', 'APPROVER', 'ADMINISTRATOR'].includes(profile.role) && (
                  <Button onClick={() => navigate('/tax/new')} size="sm">
                    Create Assessment
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {taxAssessments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No tax assessments for this property yet.</p>
                  {profile?.role && ['INPUTTER', 'APPROVER', 'ADMINISTRATOR'].includes(profile.role) && (
                    <Button onClick={() => navigate('/tax/new')}>
                      Create Assessment
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Latest Assessment Card */}
                  {taxAssessments[0] && (
                    <div className="p-4 border rounded-lg bg-accent/50">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg">Latest Assessment ({taxAssessments[0].tax_year})</h3>
                        {getStatusBadge(taxAssessments[0].status)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Assessed Amount</p>
                          <p className="font-semibold">{formatCurrency(taxAssessments[0].assessed_amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Paid Amount</p>
                          <p className="font-semibold text-green-600">{formatCurrency(taxAssessments[0].paid_amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Outstanding</p>
                          <p className={`font-semibold ${taxAssessments[0].outstanding_amount > 0 ? 'text-destructive' : 'text-green-600'}`}>
                            {formatCurrency(taxAssessments[0].outstanding_amount)}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <Button
                            size="sm"
                            onClick={() => navigate(`/tax/${taxAssessments[0].id}`)}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Assessment History Table */}
                  <div>
                    <h3 className="font-semibold mb-3">Assessment History</h3>
                    <div className="border rounded-lg">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-3 text-sm font-medium">Year</th>
                            <th className="text-left p-3 text-sm font-medium">Status</th>
                            <th className="text-right p-3 text-sm font-medium">Assessed</th>
                            <th className="text-right p-3 text-sm font-medium">Paid</th>
                            <th className="text-right p-3 text-sm font-medium">Outstanding</th>
                            <th className="text-right p-3 text-sm font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {taxAssessments.map((assessment) => (
                            <tr key={assessment.id} className="border-t hover:bg-muted/50">
                              <td className="p-3">{assessment.tax_year}</td>
                              <td className="p-3">{getStatusBadge(assessment.status)}</td>
                              <td className="p-3 text-right">{formatCurrency(assessment.assessed_amount)}</td>
                              <td className="p-3 text-right text-green-600">{formatCurrency(assessment.paid_amount)}</td>
                              <td className={`p-3 text-right ${assessment.outstanding_amount > 0 ? 'text-destructive font-medium' : ''}`}>
                                {formatCurrency(assessment.outstanding_amount)}
                              </td>
                              <td className="p-3 text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => navigate(`/tax/${assessment.id}`)}
                                >
                                  View
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Summary Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Assessed (All Years)</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(taxAssessments.reduce((sum, a) => sum + a.assessed_amount, 0))}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Paid (All Years)</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(taxAssessments.reduce((sum, a) => sum + a.paid_amount, 0))}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-destructive/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Outstanding (All Years)</p>
                      <p className="text-xl font-bold text-destructive">
                        {formatCurrency(taxAssessments.reduce((sum, a) => sum + a.outstanding_amount, 0))}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <ActivityLogTab customerId={property.id} />
        </TabsContent>
      </Tabs>

      {/* Submit Confirmation Dialog */}
      <SubmitConfirmationDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        onConfirm={handleSubmit}
        loading={submitting}
      />
    </div>
  );
}

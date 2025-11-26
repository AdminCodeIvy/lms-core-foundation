import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, MapPin, Image as ImageIcon, Users, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { ActivityLogTab } from '@/components/activity/ActivityLogTab';

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [boundaries, setBoundaries] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [ownership, setOwnership] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchPropertyDetail();
    }
  }, [id]);

  const fetchPropertyDetail = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-property-detail', {
        body: { property_id: id }
      });

      if (error) throw error;

      setProperty(data.property);
      setBoundaries(data.boundaries);
      setPhotos(data.photos || []);
      setOwnership(data.ownership || []);
    } catch (error) {
      console.error('Error fetching property:', error);
      toast.error('Failed to load property details');
    } finally {
      setLoading(false);
    }
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
        <Badge className={`${getStatusColor(property.status)} text-lg px-4 py-2`}>
          {property.status}
        </Badge>
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
            <ImageIcon className="h-4 w-4 mr-2" />
            Photos ({photos.length})
          </TabsTrigger>
          <TabsTrigger value="ownership">
            <Users className="h-4 w-4 mr-2" />
            Ownership ({ownership.length})
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
                      {boundaries.north_adjacent_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold mb-2">South Boundary</h3>
                    <p>Length: {boundaries.south_length} m</p>
                    <Badge className="mt-2" variant="outline">
                      {boundaries.south_adjacent_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold mb-2">East Boundary</h3>
                    <p>Length: {boundaries.east_length} m</p>
                    <Badge className="mt-2" variant="outline">
                      {boundaries.east_adjacent_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold mb-2">West Boundary</h3>
                    <p>Length: {boundaries.west_length} m</p>
                    <Badge className="mt-2" variant="outline">
                      {boundaries.west_adjacent_type.replace('_', ' ')}
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
              <CardTitle>Property Photos</CardTitle>
            </CardHeader>
            <CardContent>
              {photos.length === 0 ? (
                <p className="text-muted-foreground">No photos uploaded yet</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="rounded-lg border overflow-hidden">
                      <img
                        src={photo.file_url}
                        alt={photo.file_name}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-2 text-sm">
                        <p className="truncate">{photo.file_name}</p>
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
                          {owner.customer.first_name} {owner.customer.last_name || owner.customer.business_name}
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

        <TabsContent value="activity">
          <ActivityLogTab customerId={property.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { propertyService } from '@/services/propertyService';
import { lookupService } from '@/services/lookupService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { MapPicker } from '@/components/property/MapPicker';
import { Skeleton } from '@/components/ui/skeleton';

export default function PropertyEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [districts, setDistricts] = useState<any[]>([]);
  const [subDistricts, setSubDistricts] = useState<any[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    property_location: '',
    sub_location: '',
    district_id: '',
    sub_district_id: '',
    is_downtown: false,
    is_building: true,
    has_built_area: false,
    number_of_floors: '',
    size: '',
    parcel_area: '',
    property_type_id: '',
    has_property_wall: false,
    door_number: '',
    road_name: '',
    postal_zip_code: '',
    section: '',
    block: '',
    map_url: '',
    coordinates: '',
    // Boundaries
    north_length: '',
    north_type: 'BUILDING',
    south_length: '',
    south_type: 'BUILDING',
    east_length: '',
    east_type: 'BUILDING',
    west_length: '',
    west_type: 'BUILDING',
  });

  useEffect(() => {
    fetchLookups();
    if (id) {
      fetchProperty();
    }
  }, [id]);

  useEffect(() => {
    if (formData.district_id) {
      fetchSubDistricts(formData.district_id);
    }
  }, [formData.district_id]);

  const fetchLookups = async () => {
    try {
      const [districts, propertyTypes] = await Promise.all([
        lookupService.getDistricts(),
        lookupService.getPropertyTypes(),
      ]);

      setDistricts(districts);
      setPropertyTypes(propertyTypes);
    } catch (error: any) {
      console.error('Error fetching lookups:', error);
      toast.error('Failed to load form data');
    }
  };

  const fetchSubDistricts = async (districtId: string) => {
    try {
      const data = await lookupService.getSubDistricts(districtId);
      setSubDistricts(data || []);
    } catch (error: any) {
      console.error('Error fetching sub-districts:', error);
      setSubDistricts([]);
    }
  };

  const fetchProperty = async () => {
    try {
      setLoading(true);

      // Fetch property with boundaries from backend
      const property = await propertyService.getProperty(id!);

      if (!property) {
        toast.error('Property not found');
        navigate('/properties');
        return;
      }

      const boundaries = property.property_boundaries;

      // Parse coordinates if present
      let coordinatesStr = '';
      if (property.coordinates) {
        try {
          // Handle PostGIS geography format
          if (typeof property.coordinates === 'object' && property.coordinates.coordinates) {
            const [lng, lat] = property.coordinates.coordinates;
            coordinatesStr = `POINT(${lng} ${lat})`;
          } else if (typeof property.coordinates === 'string') {
            coordinatesStr = property.coordinates;
          }
        } catch (e) {
          console.error('Error parsing coordinates:', e);
        }
      }

      setFormData({
        property_location: property.property_location || '',
        sub_location: property.sub_location || '',
        district_id: property.district_id || '',
        sub_district_id: property.sub_district_id || '',
        is_downtown: property.is_downtown || false,
        is_building: property.is_building || true,
        has_built_area: property.has_built_area || false,
        number_of_floors: property.number_of_floors?.toString() || '',
        size: property.size?.toString() || '',
        parcel_area: property.parcel_area?.toString() || '',
        property_type_id: property.property_type_id || '',
        has_property_wall: property.has_property_wall || false,
        door_number: property.door_number || '',
        road_name: property.road_name || '',
        postal_zip_code: property.postal_zip_code || '',
        section: property.section || '',
        block: property.block || '',
        map_url: property.map_url || '',
        coordinates: coordinatesStr,
        north_length: boundaries?.north_length?.toString() || '',
        north_type: boundaries?.north_type || 'BUILDING',
        south_length: boundaries?.south_length?.toString() || '',
        south_type: boundaries?.south_type || 'BUILDING',
        east_length: boundaries?.east_length?.toString() || '',
        east_type: boundaries?.east_type || 'BUILDING',
        west_length: boundaries?.west_length?.toString() || '',
        west_type: boundaries?.west_type || 'BUILDING',
      });
    } catch (error: any) {
      console.error('Error fetching property:', error);
      toast.error('Failed to load property');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.district_id || !formData.size || !formData.north_length || 
        !formData.south_length || !formData.east_length || !formData.west_length) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);

      // Prepare update data
      const updateData = {
        property_location: formData.property_location || null,
        sub_location: formData.sub_location || null,
        district_id: formData.district_id,
        sub_district_id: formData.sub_district_id || null,
        is_downtown: formData.is_downtown,
        is_building: formData.is_building,
        has_built_area: formData.has_built_area,
        number_of_floors: formData.number_of_floors ? parseInt(formData.number_of_floors) : null,
        size: parseFloat(formData.size),
        parcel_area: formData.parcel_area ? parseFloat(formData.parcel_area) : null,
        property_type_id: formData.property_type_id || null,
        has_property_wall: formData.has_property_wall,
        door_number: formData.door_number || null,
        road_name: formData.road_name || null,
        postal_zip_code: formData.postal_zip_code || null,
        section: formData.section || null,
        block: formData.block || null,
        map_url: formData.map_url || null,
        coordinates: formData.coordinates || null,
        boundaries: {
          north_length: parseFloat(formData.north_length),
          north_type: formData.north_type,
          south_length: parseFloat(formData.south_length),
          south_type: formData.south_type,
          east_length: parseFloat(formData.east_length),
          east_type: formData.east_type,
          west_length: parseFloat(formData.west_length),
          west_type: formData.west_type
        }
      };

      // Update property via backend
      await propertyService.updateProperty(id!, updateData);

      toast.success('Property updated successfully');
      navigate(`/properties/${id}`);
    } catch (error: any) {
      console.error('Error updating property:', error);
      toast.error(error.message || 'Failed to update property');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/properties/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Property</h1>
          <p className="text-muted-foreground">Update property information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Property Location</Label>
              <Input
                value={formData.property_location}
                onChange={(e) => setFormData({ ...formData, property_location: e.target.value })}
                placeholder="Enter property location"
              />
            </div>

            <div>
              <Label>Sub Location</Label>
              <Input
                value={formData.sub_location}
                onChange={(e) => setFormData({ ...formData, sub_location: e.target.value })}
                placeholder="Enter sub location"
              />
            </div>

            <div>
              <Label>District *</Label>
              <Select value={formData.district_id} onValueChange={(value) => setFormData({ ...formData, district_id: value, sub_district_id: '' })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent>
                  {districts.map(district => (
                    <SelectItem key={district.id} value={district.id}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Sub-District</Label>
              <Select 
                value={formData.sub_district_id} 
                onValueChange={(value) => setFormData({ ...formData, sub_district_id: value })}
                disabled={!formData.district_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sub-district" />
                </SelectTrigger>
                <SelectContent>
                  {subDistricts.map(subDistrict => (
                    <SelectItem key={subDistrict.id} value={subDistrict.id}>
                      {subDistrict.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Downtown *</Label>
              <RadioGroup value={formData.is_downtown.toString()} onValueChange={(value) => setFormData({ ...formData, is_downtown: value === 'true' })}>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="downtown-yes" />
                    <Label htmlFor="downtown-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="downtown-no" />
                    <Label htmlFor="downtown-no">No</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>Type *</Label>
              <RadioGroup value={formData.is_building.toString()} onValueChange={(value) => setFormData({ ...formData, is_building: value === 'true' })}>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="type-building" />
                    <Label htmlFor="type-building">Building</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="type-land" />
                    <Label htmlFor="type-land">Empty Land</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>Size (m²) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                placeholder="Enter size"
                required
              />
            </div>

            <div>
              <Label>Property Type</Label>
              <Select value={formData.property_type_id} onValueChange={(value) => setFormData({ ...formData, property_type_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Address Details */}
        <Card>
          <CardHeader>
            <CardTitle>Address Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Door Number</Label>
              <Input
                value={formData.door_number}
                onChange={(e) => setFormData({ ...formData, door_number: e.target.value })}
                placeholder="Enter door number"
              />
            </div>

            <div>
              <Label>Road Name</Label>
              <Input
                value={formData.road_name}
                onChange={(e) => setFormData({ ...formData, road_name: e.target.value })}
                placeholder="Enter road name"
              />
            </div>
          </CardContent>
        </Card>

        {/* Boundaries */}
        <Card>
          <CardHeader>
            <CardTitle>Property Boundaries</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            {/* North */}
            <div className="space-y-2">
              <h3 className="font-semibold">North Boundary</h3>
              <div className="space-y-2">
                <div>
                  <Label>Length (m) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.north_length}
                    onChange={(e) => setFormData({ ...formData, north_length: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Adjacent Type *</Label>
                  <Select value={formData.north_type} onValueChange={(value) => setFormData({ ...formData, north_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUILDING">Building</SelectItem>
                      <SelectItem value="EMPTY_LAND">Empty Land</SelectItem>
                      <SelectItem value="ROAD">Road</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* South */}
            <div className="space-y-2">
              <h3 className="font-semibold">South Boundary</h3>
              <div className="space-y-2">
                <div>
                  <Label>Length (m) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.south_length}
                    onChange={(e) => setFormData({ ...formData, south_length: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Adjacent Type *</Label>
                  <Select value={formData.south_type} onValueChange={(value) => setFormData({ ...formData, south_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUILDING">Building</SelectItem>
                      <SelectItem value="EMPTY_LAND">Empty Land</SelectItem>
                      <SelectItem value="ROAD">Road</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* East */}
            <div className="space-y-2">
              <h3 className="font-semibold">East Boundary</h3>
              <div className="space-y-2">
                <div>
                  <Label>Length (m) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.east_length}
                    onChange={(e) => setFormData({ ...formData, east_length: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Adjacent Type *</Label>
                  <Select value={formData.east_type} onValueChange={(value) => setFormData({ ...formData, east_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUILDING">Building</SelectItem>
                      <SelectItem value="EMPTY_LAND">Empty Land</SelectItem>
                      <SelectItem value="ROAD">Road</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* West */}
            <div className="space-y-2">
              <h3 className="font-semibold">West Boundary</h3>
              <div className="space-y-2">
                <div>
                  <Label>Length (m) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.west_length}
                    onChange={(e) => setFormData({ ...formData, west_length: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Adjacent Type *</Label>
                  <Select value={formData.west_type} onValueChange={(value) => setFormData({ ...formData, west_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUILDING">Building</SelectItem>
                      <SelectItem value="EMPTY_LAND">Empty Land</SelectItem>
                      <SelectItem value="ROAD">Road</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map Location Picker */}
        <MapPicker
          coordinates={formData.coordinates}
          onCoordinatesChange={(coords) => setFormData({ ...formData, coordinates: coords || '' })}
          districtId={formData.district_id}
          subDistrictId={formData.sub_district_id}
        />

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(`/properties/${id}`)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

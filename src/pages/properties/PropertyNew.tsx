import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ArrowLeft, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { MapPicker } from '@/components/property/MapPicker';
import { cn } from '@/lib/utils';

export default function PropertyNew() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [districts, setDistricts] = useState<any[]>([]);
  const [subDistricts, setSubDistricts] = useState<any[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [openCustomer, setOpenCustomer] = useState(false);
  
  const [formData, setFormData] = useState({
    customer_id: '',
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
  }, []);

  useEffect(() => {
    if (formData.district_id) {
      fetchSubDistricts(formData.district_id);
    }
  }, [formData.district_id]);

  const fetchLookups = async () => {
    const [districtsRes, propertyTypesRes, customersRes] = await Promise.all([
      supabase.from('districts').select('*').eq('is_active', true).order('name'),
      supabase.from('property_types').select('*').eq('is_active', true).order('name'),
      supabase.from('customers').select(`
        id,
        reference_id,
        customer_type,
        status,
        customer_person(first_name, father_name),
        customer_business(business_name),
        customer_government(full_department_name),
        customer_mosque_hospital(full_name),
        customer_non_profit(full_non_profit_name),
        customer_contractor(full_contractor_name)
      `).in('status', ['APPROVED', 'SUBMITTED']).order('updated_at', { ascending: false }).limit(100)
    ]);

    if (districtsRes.data) setDistricts(districtsRes.data);
    if (propertyTypesRes.data) setPropertyTypes(propertyTypesRes.data);
    if (customersRes.data) {
      // Format customer names based on type
      const formattedCustomers = customersRes.data.map(customer => {
        let name = '';
        if (customer.customer_type === 'PERSON' && customer.customer_person?.[0]) {
          const person = customer.customer_person[0];
          name = `${person.first_name} ${person.father_name}`.trim();
        } else if (customer.customer_type === 'BUSINESS' && customer.customer_business?.[0]) {
          name = customer.customer_business[0].business_name;
        } else if (customer.customer_type === 'GOVERNMENT' && customer.customer_government?.[0]) {
          name = customer.customer_government[0].full_department_name;
        } else if (customer.customer_type === 'MOSQUE_HOSPITAL' && customer.customer_mosque_hospital?.[0]) {
          name = customer.customer_mosque_hospital[0].full_name;
        } else if (customer.customer_type === 'NON_PROFIT' && customer.customer_non_profit?.[0]) {
          name = customer.customer_non_profit[0].full_non_profit_name;
        } else if (customer.customer_type === 'CONTRACTOR' && customer.customer_contractor?.[0]) {
          name = customer.customer_contractor[0].full_contractor_name;
        }
        return { ...customer, name };
      });
      setCustomers(formattedCustomers);
    }
  };

  const fetchSubDistricts = async (districtId: string) => {
    console.log('Fetching sub-districts for district:', districtId);
    const { data, error } = await supabase
      .from('sub_districts')
      .select('*')
      .eq('district_id', districtId)
      .eq('is_active', true)
      .order('name');
    
    console.log('Sub-districts fetched:', { count: data?.length || 0, data, error });
    
    if (data) {
      setSubDistricts(data);
    } else {
      setSubDistricts([]);
    }
    
    if (error) {
      console.error('Error fetching sub-districts:', error);
      toast.error('Failed to load sub-districts');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.customer_id) {
      toast.error('Please select an owner');
      return;
    }

    if (!formData.district_id || !formData.size || !formData.north_length || 
        !formData.south_length || !formData.east_length || !formData.west_length) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.coordinates) {
      toast.error('Please select a location on the map');
      return;
    }

    try {
      setLoading(true);

      // Create property (excluding boundary fields)
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .insert({
          customer_id: formData.customer_id,
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
          created_by: profile?.id,
          status: 'DRAFT'
        })
        .select()
        .maybeSingle();

      if (propertyError) throw propertyError;

      // Create boundaries
      const { error: boundariesError } = await supabase
        .from('property_boundaries')
        .insert({
          property_id: property.id,
          north_length: parseFloat(formData.north_length),
          north_type: formData.north_type,
          south_length: parseFloat(formData.south_length),
          south_type: formData.south_type,
          east_length: parseFloat(formData.east_length),
          east_type: formData.east_type,
          west_length: parseFloat(formData.west_length),
          west_type: formData.west_type
        });

      if (boundariesError) throw boundariesError;

      // Upload images if any
      if (selectedImages.length > 0) {
        for (const image of selectedImages) {
          const fileExt = image.name.split('.').pop();
          const fileName = `${property.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('property-photos')
            .upload(fileName, image);

          if (!uploadError && uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('property-photos')
              .getPublicUrl(fileName);

            const { error: photoError } = await supabase.from('property_photos').insert({
              property_id: property.id,
              photo_url: publicUrl,
              uploaded_by: profile?.id,
            });

            if (photoError) {
              console.error('Error saving photo metadata:', photoError);
            }
          } else if (uploadError) {
            console.error('Error uploading photo:', uploadError);
          }
        }
      }

      // Create activity log
      await supabase.from('activity_logs').insert({
        entity_type: 'PROPERTY',
        entity_id: property.id,
        action: 'CREATED',
        performed_by: profile?.id,
        metadata: {
          reference_id: property.reference_id
        }
      });

      toast.success('Property created successfully');
      navigate(`/properties/${property.id}`);
    } catch (error: any) {
      console.error('Error creating property:', error);
      toast.error(error.message || 'Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/properties')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Property</h1>
          <p className="text-muted-foreground">Create a new property record</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Ownership */}
        <Card>
          <CardHeader>
            <CardTitle>Ownership</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Owner *</Label>
              <Popover open={openCustomer} onOpenChange={setOpenCustomer}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCustomer}
                    className="w-full justify-between"
                  >
                    <span className={cn(!formData.customer_id && "text-muted-foreground")}>
                      {formData.customer_id
                        ? customers.find((c) => c.id === formData.customer_id)?.name
                        : "Select owner..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[600px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by customer name or reference..." />
                    <CommandList>
                      <CommandEmpty>No customers found.</CommandEmpty>
                      <CommandGroup>
                        {customers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={`${customer.name} ${customer.reference_id}`}
                            onSelect={() => {
                              setFormData({ ...formData, customer_id: customer.id });
                              setOpenCustomer(false);
                            }}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.customer_id === customer.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {customer.reference_id}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

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
                disabled={!formData.district_id || subDistricts.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !formData.district_id 
                      ? "Select district first" 
                      : subDistricts.length === 0 
                        ? "No sub-districts available" 
                        : "Select sub-district"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {subDistricts.map(subDistrict => (
                    <SelectItem key={subDistrict.id} value={subDistrict.id}>
                      {subDistrict.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.district_id && subDistricts.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  No sub-districts found for selected district
                </p>
              )}
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
              <Label>Has Built Area *</Label>
              <RadioGroup value={formData.has_built_area.toString()} onValueChange={(value) => setFormData({ ...formData, has_built_area: value === 'true' })}>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="built-yes" />
                    <Label htmlFor="built-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="built-no" />
                    <Label htmlFor="built-no">No</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>Number of Floors</Label>
              <Input
                type="number"
                min="1"
                max="14"
                value={formData.number_of_floors}
                onChange={(e) => setFormData({ ...formData, number_of_floors: e.target.value })}
                placeholder="1-14"
              />
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
              <Label>Parcel Area (m²)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.parcel_area}
                onChange={(e) => setFormData({ ...formData, parcel_area: e.target.value })}
                placeholder="Enter parcel area"
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

            <div>
              <Label>Property Wall *</Label>
              <RadioGroup value={formData.has_property_wall.toString()} onValueChange={(value) => setFormData({ ...formData, has_property_wall: value === 'true' })}>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="wall-yes" />
                    <Label htmlFor="wall-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="wall-no" />
                    <Label htmlFor="wall-no">No</Label>
                  </div>
                </div>
              </RadioGroup>
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

            <div>
              <Label>Postal/Zip Code</Label>
              <Input
                value={formData.postal_zip_code}
                onChange={(e) => setFormData({ ...formData, postal_zip_code: e.target.value })}
                placeholder="Enter postal code"
              />
            </div>

            <div>
              <Label>Section</Label>
              <Input
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                placeholder="Enter section"
              />
            </div>

            <div>
              <Label>Block</Label>
              <Input
                value={formData.block}
                onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                placeholder="Enter block"
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

        {/* Property Images */}
        <Card>
          <CardHeader>
            <CardTitle>Property Images (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="photos">Upload Images</Label>
                <Input
                  id="photos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      const newFiles = Array.from(e.target.files);
                      setSelectedImages(prev => [...prev, ...newFiles]);
                    }
                  }}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  You can select multiple images at once
                </p>
              </div>
              {selectedImages.length > 0 && (
                <div className="grid gap-2 md:grid-cols-3">
                  {selectedImages.map((file, index) => (
                    <div key={index} className="relative rounded-lg border p-2">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-32 object-cover rounded"
                      />
                      <p className="text-xs mt-1 truncate">{file.name}</p>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => {
                          setSelectedImages(selectedImages.filter((_, i) => i !== index));
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/properties')}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Property'}
          </Button>
        </div>
      </form>
    </div>
  );
}

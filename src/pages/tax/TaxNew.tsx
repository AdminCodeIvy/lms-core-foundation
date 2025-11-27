import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, CalendarIcon, Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function TaxNew() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<any | null>(null);

  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState({
    property_id: '',
    tax_year: currentYear,
    occupancy_type: 'OWNER_OCCUPIED',
    // Renter details
    renter_name: '',
    renter_contact: '',
    renter_national_id: '',
    monthly_rent_amount: '',
    rental_start_date: undefined as Date | undefined,
    has_rental_agreement: false,
    // Property details
    property_type: '',
    land_size: '',
    built_up_area: '',
    number_of_units: '',
    number_of_floors: '',
    // Utilities
    has_water: false,
    has_electricity: false,
    has_sewer: false,
    has_waste_collection: false,
    // Construction & Legal
    construction_status: 'COMPLETED',
    property_registered: false,
    title_deed_number: '',
    // Tax calculation
    base_assessment: '',
    exemption_amount: '0',
    // Dates
    assessment_date: new Date() as Date,
    due_date: new Date(new Date().setDate(new Date().getDate() + 30)) as Date,
  });

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchProperties();
    }
  }, [searchTerm]);

  const searchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          district:districts!properties_district_id_fkey(id, name),
          customer:customers!properties_customer_id_fkey(id, name)
        `)
        .or(`reference_id.ilike.%${searchTerm}%,parcel_number.ilike.%${searchTerm}%`)
        .in('status', ['APPROVED', 'SUBMITTED'])
        .limit(10);

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error searching properties:', error);
    }
  };

  const selectProperty = async (property: any) => {
    setSelectedProperty(property);
    setFormData(prev => ({
      ...prev,
      property_id: property.id,
      property_type: property.property_type?.name || '',
      land_size: property.land_size?.toString() || '',
      built_up_area: property.built_up_area?.toString() || '',
      number_of_units: property.number_of_units?.toString() || '',
      number_of_floors: property.number_of_floors?.toString() || '',
    }));
    setSearchTerm('');
    setProperties([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.property_id) {
        toast({
          title: 'Error',
          description: 'Please select a property',
          variant: 'destructive'
        });
        return;
      }

      if (!formData.base_assessment || parseFloat(formData.base_assessment) <= 0) {
        toast({
          title: 'Error',
          description: 'Base assessment must be greater than 0',
          variant: 'destructive'
        });
        return;
      }

      if (formData.occupancy_type === 'RENTED') {
        if (!formData.renter_name || !formData.renter_contact || !formData.renter_national_id) {
          toast({
            title: 'Error',
            description: 'Renter details are required when occupancy type is RENTED',
            variant: 'destructive'
          });
          return;
        }
      }

      const payload = {
        property_id: formData.property_id,
        tax_year: formData.tax_year,
        occupancy_type: formData.occupancy_type,
        renter_name: formData.occupancy_type === 'RENTED' ? formData.renter_name : null,
        renter_contact: formData.occupancy_type === 'RENTED' ? formData.renter_contact : null,
        renter_national_id: formData.occupancy_type === 'RENTED' ? formData.renter_national_id : null,
        monthly_rent_amount: formData.occupancy_type === 'RENTED' && formData.monthly_rent_amount 
          ? parseFloat(formData.monthly_rent_amount) 
          : null,
        rental_start_date: formData.occupancy_type === 'RENTED' && formData.rental_start_date
          ? format(formData.rental_start_date, 'yyyy-MM-dd')
          : null,
        has_rental_agreement: formData.occupancy_type === 'RENTED' ? formData.has_rental_agreement : false,
        property_type: formData.property_type,
        land_size: parseFloat(formData.land_size),
        built_up_area: formData.built_up_area ? parseFloat(formData.built_up_area) : null,
        number_of_units: formData.number_of_units ? parseInt(formData.number_of_units) : null,
        number_of_floors: formData.number_of_floors ? parseInt(formData.number_of_floors) : null,
        has_water: formData.has_water,
        has_electricity: formData.has_electricity,
        has_sewer: formData.has_sewer,
        has_waste_collection: formData.has_waste_collection,
        construction_status: formData.construction_status,
        property_registered: formData.property_registered,
        title_deed_number: formData.property_registered ? formData.title_deed_number : null,
        base_assessment: parseFloat(formData.base_assessment),
        exemption_amount: formData.exemption_amount ? parseFloat(formData.exemption_amount) : 0,
        assessment_date: format(formData.assessment_date, 'yyyy-MM-dd'),
        due_date: format(formData.due_date, 'yyyy-MM-dd'),
      };

      const { data, error } = await supabase.functions.invoke('create-tax-assessment', {
        body: payload
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Tax assessment created successfully'
      });

      navigate(`/tax/${data.assessment.id}`);
    } catch (error: any) {
      console.error('Error creating tax assessment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create tax assessment',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const assessedAmount = formData.base_assessment && formData.exemption_amount
    ? parseFloat(formData.base_assessment) - parseFloat(formData.exemption_amount)
    : 0;

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/tax')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tax List
        </Button>
        <h1 className="text-3xl font-bold mt-2">New Tax Assessment</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Property Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Property Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedProperty ? (
              <div className="space-y-2">
                <Label>Search Property</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by Reference ID or Parcel Number"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (searchTerm.length >= 2) {
                          searchProperties();
                        }
                      }
                    }}
                    className="pl-9"
                  />
                </div>
                {properties.length > 0 && (
                  <div className="border rounded-md">
                    {properties.map(property => (
                      <button
                        key={property.id}
                        type="button"
                        onClick={() => selectProperty(property)}
                        className="w-full p-3 text-left hover:bg-accent border-b last:border-b-0"
                      >
                        <div className="font-medium">{property.reference_id}</div>
                        <div className="text-sm text-muted-foreground">
                          {property.parcel_number} • {property.district?.name} • {property.customer?.name}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Selected Property</Label>
                <div className="p-4 border rounded-md bg-accent">
                  <div className="font-medium">{selectedProperty.reference_id}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedProperty.parcel_number} • {selectedProperty.district?.name} • {selectedProperty.customer?.name}
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setSelectedProperty(null);
                      setFormData(prev => ({ ...prev, property_id: '' }));
                    }}
                    className="mt-2 p-0 h-auto"
                  >
                    Change Property
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tax_year">Tax Year *</Label>
              <Select
                value={formData.tax_year.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, tax_year: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 11 }, (_, i) => 2020 + i).map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Occupancy Details */}
        <Card>
          <CardHeader>
            <CardTitle>Occupancy Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="occupancy_type">Occupancy Type *</Label>
              <Select
                value={formData.occupancy_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, occupancy_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER_OCCUPIED">Owner Occupied</SelectItem>
                  <SelectItem value="RENTED">Rented</SelectItem>
                  <SelectItem value="VACANT">Vacant</SelectItem>
                  <SelectItem value="MIXED_USE">Mixed Use</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.occupancy_type === 'RENTED' && (
              <div className="space-y-4 p-4 border rounded-md bg-accent/50">
                <h4 className="font-medium">Renter Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="renter_name">Renter Name *</Label>
                    <Input
                      id="renter_name"
                      value={formData.renter_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, renter_name: e.target.value }))}
                      required={formData.occupancy_type === 'RENTED'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="renter_contact">Contact Number *</Label>
                    <Input
                      id="renter_contact"
                      value={formData.renter_contact}
                      onChange={(e) => setFormData(prev => ({ ...prev, renter_contact: e.target.value }))}
                      required={formData.occupancy_type === 'RENTED'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="renter_national_id">National ID *</Label>
                    <Input
                      id="renter_national_id"
                      value={formData.renter_national_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, renter_national_id: e.target.value }))}
                      required={formData.occupancy_type === 'RENTED'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthly_rent_amount">Monthly Rent Amount</Label>
                    <Input
                      id="monthly_rent_amount"
                      type="number"
                      step="0.01"
                      value={formData.monthly_rent_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, monthly_rent_amount: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rental Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.rental_start_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.rental_start_date ? format(formData.rental_start_date, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.rental_start_date}
                          onSelect={(date) => setFormData(prev => ({ ...prev, rental_start_date: date }))}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_rental_agreement"
                      checked={formData.has_rental_agreement}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_rental_agreement: checked as boolean }))}
                    />
                    <Label htmlFor="has_rental_agreement">Has Rental Agreement</Label>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="property_type">Property Type *</Label>
                <Input
                  id="property_type"
                  value={formData.property_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, property_type: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="land_size">Land Size (m²) *</Label>
                <Input
                  id="land_size"
                  type="number"
                  step="0.01"
                  value={formData.land_size}
                  onChange={(e) => setFormData(prev => ({ ...prev, land_size: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="built_up_area">Built-Up Area (m²)</Label>
                <Input
                  id="built_up_area"
                  type="number"
                  step="0.01"
                  value={formData.built_up_area}
                  onChange={(e) => setFormData(prev => ({ ...prev, built_up_area: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number_of_units">Number of Units</Label>
                <Input
                  id="number_of_units"
                  type="number"
                  value={formData.number_of_units}
                  onChange={(e) => setFormData(prev => ({ ...prev, number_of_units: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number_of_floors">Number of Floors</Label>
                <Input
                  id="number_of_floors"
                  type="number"
                  value={formData.number_of_floors}
                  onChange={(e) => setFormData(prev => ({ ...prev, number_of_floors: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Utilities & Services */}
        <Card>
          <CardHeader>
            <CardTitle>Utilities & Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has_water"
                checked={formData.has_water}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_water: checked as boolean }))}
              />
              <Label htmlFor="has_water">Has Water</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has_electricity"
                checked={formData.has_electricity}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_electricity: checked as boolean }))}
              />
              <Label htmlFor="has_electricity">Has Electricity</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has_sewer"
                checked={formData.has_sewer}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_sewer: checked as boolean }))}
              />
              <Label htmlFor="has_sewer">Has Sewer</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has_waste_collection"
                checked={formData.has_waste_collection}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_waste_collection: checked as boolean }))}
              />
              <Label htmlFor="has_waste_collection">Has Waste Collection</Label>
            </div>
          </CardContent>
        </Card>

        {/* Construction & Legal Status */}
        <Card>
          <CardHeader>
            <CardTitle>Construction & Legal Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="construction_status">Construction Status *</Label>
              <Select
                value={formData.construction_status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, construction_status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="UNDER_CONSTRUCTION">Under Construction</SelectItem>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="property_registered"
                checked={formData.property_registered}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, property_registered: checked as boolean }))}
              />
              <Label htmlFor="property_registered">Property Registered</Label>
            </div>

            {formData.property_registered && (
              <div className="space-y-2">
                <Label htmlFor="title_deed_number">Title Deed Number *</Label>
                <Input
                  id="title_deed_number"
                  value={formData.title_deed_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, title_deed_number: e.target.value }))}
                  required={formData.property_registered}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tax Calculation */}
        <Card>
          <CardHeader>
            <CardTitle>Tax Calculation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="base_assessment">Base Assessment *</Label>
              <Input
                id="base_assessment"
                type="number"
                step="0.01"
                value={formData.base_assessment}
                onChange={(e) => setFormData(prev => ({ ...prev, base_assessment: e.target.value }))}
                required
              />
              <p className="text-sm text-muted-foreground">Enter the base tax assessment amount</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exemption_amount">Exemption Amount</Label>
              <Input
                id="exemption_amount"
                type="number"
                step="0.01"
                value={formData.exemption_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, exemption_amount: e.target.value }))}
              />
              <p className="text-sm text-muted-foreground">Enter any exemption amount (if applicable)</p>
            </div>

            {formData.base_assessment && (
              <div className="p-4 border rounded-md bg-accent">
                <div className="text-lg font-bold">
                  Assessed Amount: {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(assessedAmount)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Base Assessment - Exemption Amount
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle>Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assessment Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.assessment_date, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.assessment_date}
                      onSelect={(date) => date && setFormData(prev => ({ ...prev, assessment_date: date }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.due_date, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.due_date}
                      onSelect={(date) => date && setFormData(prev => ({ ...prev, due_date: date }))}
                      initialFocus
                      className="pointer-events-auto"
                      disabled={(date) => date < formData.assessment_date}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/tax')}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Assessment'}
          </Button>
        </div>
      </form>
    </div>
  );
}

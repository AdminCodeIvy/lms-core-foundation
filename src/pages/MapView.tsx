import { useState, useEffect } from "react";
import { Map as MapIcon, Layers, Filter, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface PropertyParcel {
  id: string;
  reference_id: string;
  parcel_number: string;
  tax_status: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'NOT_ASSESSED' | 'ASSESSED';
  status: string;
  district: string;
  property_type: string;
  owner_name?: string;
}

// Mock parcel data for demonstration
const generateMockParcels = (): PropertyParcel[] => {
  const parcels: PropertyParcel[] = [];
  const taxStatuses: PropertyParcel['tax_status'][] = ['PAID', 'PARTIAL', 'OVERDUE', 'NOT_ASSESSED', 'ASSESSED'];
  
  for (let i = 0; i < 50; i++) {
    parcels.push({
      id: `property-${i}`,
      reference_id: `PROP-2024-${String(i + 1).padStart(4, '0')}`,
      parcel_number: `PN-${String(i + 1).padStart(6, '0')}`,
      tax_status: taxStatuses[Math.floor(Math.random() * taxStatuses.length)],
      status: Math.random() > 0.3 ? 'APPROVED' : 'DRAFT',
      district: ['Khartoum', 'Omdurman', 'Bahri'][Math.floor(Math.random() * 3)],
      property_type: ['Residential', 'Commercial', 'Industrial', 'Agricultural'][Math.floor(Math.random() * 4)],
      owner_name: Math.random() > 0.5 ? `Owner ${i + 1}` : undefined,
    });
  }
  
  return parcels;
};

export default function MapView() {
  const [parcels, setParcels] = useState<PropertyParcel[]>([]);
  const [filteredParcels, setFilteredParcels] = useState<PropertyParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    taxStatus: [] as string[],
    status: [] as string[],
    district: [] as string[],
    propertyType: [] as string[],
  });

  useEffect(() => {
    loadParcels();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [parcels, filters]);

  const loadParcels = async () => {
    try {
      setLoading(false);
      // In production, this would fetch from the database
      // For now, using mock data
      const mockParcels = generateMockParcels();
      setParcels(mockParcels);
    } catch (error: any) {
      console.error('Error loading parcels:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...parcels];

    if (filters.taxStatus.length > 0) {
      filtered = filtered.filter(p => filters.taxStatus.includes(p.tax_status));
    }

    if (filters.status.length > 0) {
      filtered = filtered.filter(p => filters.status.includes(p.status));
    }

    if (filters.district.length > 0) {
      filtered = filtered.filter(p => filters.district.includes(p.district));
    }

    if (filters.propertyType.length > 0) {
      filtered = filtered.filter(p => filters.propertyType.includes(p.property_type));
    }

    setFilteredParcels(filtered);
  };

  const toggleFilter = (category: keyof typeof filters, value: string) => {
    setFilters(prev => {
      const current = prev[category];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const clearFilters = () => {
    setFilters({
      taxStatus: [],
      status: [],
      district: [],
      propertyType: [],
    });
  };

  const getParcelColor = (taxStatus: string) => {
    switch (taxStatus) {
      case 'PAID': return '#22c55e'; // green
      case 'PARTIAL': return '#f97316'; // orange
      case 'OVERDUE': return '#ef4444'; // red
      case 'ASSESSED': return '#eab308'; // yellow
      case 'NOT_ASSESSED': return '#94a3b8'; // gray
      default: return '#64748b';
    }
  };

  const getTaxStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      PAID: 'default',
      PARTIAL: 'secondary',
      OVERDUE: 'destructive',
      ASSESSED: 'secondary',
      NOT_ASSESSED: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="bg-background border-b p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MapIcon className="h-6 w-6" />
              Property Map
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Showing {filteredParcels.length} of {parcels.length} parcels
            </p>
          </div>

          <div className="flex gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {(filters.taxStatus.length + filters.status.length + filters.district.length + filters.propertyType.length) > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {filters.taxStatus.length + filters.status.length + filters.district.length + filters.propertyType.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Map Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  {/* Tax Status Filter */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Tax Status</Label>
                    {['PAID', 'PARTIAL', 'OVERDUE', 'ASSESSED', 'NOT_ASSESSED'].map(status => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tax-${status}`}
                          checked={filters.taxStatus.includes(status)}
                          onCheckedChange={() => toggleFilter('taxStatus', status)}
                        />
                        <label htmlFor={`tax-${status}`} className="text-sm cursor-pointer flex-1">
                          {status.replace('_', ' ')}
                        </label>
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: getParcelColor(status) }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Property Status Filter */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Property Status</Label>
                    {['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].map(status => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status}`}
                          checked={filters.status.includes(status)}
                          onCheckedChange={() => toggleFilter('status', status)}
                        />
                        <label htmlFor={`status-${status}`} className="text-sm cursor-pointer">
                          {status}
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* District Filter */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">District</Label>
                    {['Khartoum', 'Omdurman', 'Bahri'].map(district => (
                      <div key={district} className="flex items-center space-x-2">
                        <Checkbox
                          id={`district-${district}`}
                          checked={filters.district.includes(district)}
                          onCheckedChange={() => toggleFilter('district', district)}
                        />
                        <label htmlFor={`district-${district}`} className="text-sm cursor-pointer">
                          {district}
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* Property Type Filter */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Property Type</Label>
                    {['Residential', 'Commercial', 'Industrial', 'Agricultural'].map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${type}`}
                          checked={filters.propertyType.includes(type)}
                          onCheckedChange={() => toggleFilter('propertyType', type)}
                        />
                        <label htmlFor={`type-${type}`} className="text-sm cursor-pointer">
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>

                  <Button variant="outline" onClick={clearFilters} className="w-full">
                    <X className="mr-2 h-4 w-4" />
                    Clear All Filters
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">
                  <Layers className="mr-2 h-4 w-4" />
                  Legend
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Map Legend</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Tax Status Colors</Label>
                    <div className="space-y-2">
                      {[
                        { status: 'PAID', label: 'Paid', color: '#22c55e' },
                        { status: 'PARTIAL', label: 'Partial Payment', color: '#f97316' },
                        { status: 'OVERDUE', label: 'Overdue', color: '#ef4444' },
                        { status: 'ASSESSED', label: 'Assessed', color: '#eab308' },
                        { status: 'NOT_ASSESSED', label: 'Not Assessed', color: '#94a3b8' },
                      ].map(({ status, label, color }) => (
                        <div key={status} className="flex items-center gap-3">
                          <div
                            className="w-8 h-6 rounded border"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-sm">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-semibold mb-3 block">How to Use</Label>
                    <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
                      <li>Full interactive map coming soon</li>
                      <li>Use filters to show specific parcels</li>
                      <li>View parcels in list format below</li>
                    </ul>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Map Placeholder with Parcel List */}
      <div className="flex-1 relative p-6 overflow-auto bg-muted/20">
        <div className="container mx-auto">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Map View:</strong> Interactive map with Leaflet will be available after configuring the map tiles.
              For now, view parcels in list format below.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredParcels.map((parcel) => (
              <Card key={parcel.id} className="p-4 hover:shadow-lg transition-shadow">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{parcel.parcel_number}</h3>
                    <div
                      className="w-4 h-4 rounded-full border-2"
                      style={{ borderColor: getParcelColor(parcel.tax_status), backgroundColor: getParcelColor(parcel.tax_status) + '40' }}
                    />
                  </div>
                  <div className="text-sm space-y-1">
                    <div><strong>Ref:</strong> {parcel.reference_id}</div>
                    <div><strong>District:</strong> {parcel.district}</div>
                    <div><strong>Type:</strong> {parcel.property_type}</div>
                    {parcel.owner_name && (
                      <div><strong>Owner:</strong> {parcel.owner_name}</div>
                    )}
                  </div>
                  <div className="pt-2">
                    {getTaxStatusBadge(parcel.tax_status)}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredParcels.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No parcels match your filters</p>
              <Button onClick={clearFilters} variant="outline" className="mt-4">
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

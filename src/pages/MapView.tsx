import { useState, useEffect, useRef } from "react";
import L from 'leaflet';
import { Map as MapIcon, Layers, Filter, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import 'leaflet/dist/leaflet.css';

interface PropertyParcel {
  id: string;
  reference_id: string;
  parcel_number: string;
  tax_status: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'NOT_ASSESSED' | 'ASSESSED';
  status: string;
  district: string;
  property_type: string;
  owner_name?: string;
  coordinates?: [number, number];
}

// Mock parcel data with random coordinates in Addis Ababa area
const generateMockParcels = (): PropertyParcel[] => {
  const parcels: PropertyParcel[] = [];
  const taxStatuses: PropertyParcel['tax_status'][] = ['PAID', 'PARTIAL', 'OVERDUE', 'NOT_ASSESSED', 'ASSESSED'];
  
  // Addis Ababa approximate bounds
  const centerLat = 9.03;
  const centerLng = 38.74;
  const spread = 0.1;
  
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
      coordinates: [
        centerLat + (Math.random() - 0.5) * spread,
        centerLng + (Math.random() - 0.5) * spread
      ]
    });
  }
  
  return parcels;
};

export default function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  
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

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([9.03, 38.74], 13);

    // Use CartoDB Positron tiles with English labels
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    mapInstanceRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!markersLayerRef.current) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    // Add markers for filtered parcels
    filteredParcels.forEach((parcel) => {
      if (!parcel.coordinates) return;

      const color = getParcelColor(parcel.tax_status);
      const circle = L.circleMarker(parcel.coordinates, {
        fillColor: color,
        fillOpacity: 0.7,
        color: color,
        weight: 2,
        radius: 10
      });

      const popupContent = `
        <div class="space-y-1 min-w-[200px]">
          <div class="font-semibold text-base border-b pb-1 mb-2">
            ${parcel.parcel_number}
          </div>
          <div class="text-sm space-y-1">
            <div><strong>Reference:</strong> ${parcel.reference_id}</div>
            <div><strong>District:</strong> ${parcel.district}</div>
            <div><strong>Type:</strong> ${parcel.property_type}</div>
            ${parcel.owner_name ? `<div><strong>Owner:</strong> ${parcel.owner_name}</div>` : ''}
            <div class="pt-2">
              <span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset" style="background-color: ${color}20; color: ${color}">
                ${parcel.tax_status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      `;

      circle.bindPopup(popupContent);
      circle.addTo(markersLayerRef.current!);
    });
  }, [filteredParcels]);

  const loadParcels = async () => {
    try {
      setLoading(false);
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
      case 'PAID': return '#22c55e';
      case 'PARTIAL': return '#f97316';
      case 'OVERDUE': return '#ef4444';
      case 'ASSESSED': return '#eab308';
      case 'NOT_ASSESSED': return '#94a3b8';
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
                      <li>Click markers to view property details</li>
                      <li>Use filters to show specific parcels</li>
                      <li>Zoom and pan to explore the map</li>
                    </ul>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapRef} className="flex-1 relative" />
    </div>
  );
}

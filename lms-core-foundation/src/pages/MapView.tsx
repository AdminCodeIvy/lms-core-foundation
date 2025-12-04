import { useState, useEffect, useRef } from "react";
import { supabase } from '@/lib/supabase';
import L from 'leaflet';
import { Map as MapIcon, Layers, Filter, X } from "lucide-react";
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

      const popup = L.popup({ closeButton: false, autoClose: false, closeOnClick: false })
        .setContent(popupContent);

      circle.bindPopup(popup);

      // Show popup on hover, hide on mouseout
      circle.on('mouseover', function() {
        this.openPopup();
      });

      circle.on('mouseout', function() {
        this.closePopup();
      });

      circle.addTo(markersLayerRef.current!);
    });
  }, [filteredParcels]);

  const loadParcels = async () => {
    try {
      setLoading(true);
      
      // Generate dummy data for demonstration
      const taxStatuses: PropertyParcel['tax_status'][] = ['PAID', 'PARTIAL', 'OVERDUE', 'ASSESSED', 'NOT_ASSESSED'];
      const districts = ['Addis Ababa', 'Dire Dawa', 'Hargeisa', 'Jigjiga'];
      const propertyTypes = ['Residential', 'Commercial', 'Industrial', 'Agricultural', 'Apartment', 'Villa'];
      const ownerNames = ['John Doe', 'Jane Smith', 'Mohamed Ali', 'Sarah Johnson', 'Ahmed Hassan', 'Maria Garcia'];
      
      const dummyParcels: PropertyParcel[] = [];
      
      // Generate 50 dummy properties around Addis Ababa area
      const baseLatAddis = 9.03;
      const baseLngAddis = 38.74;
      
      for (let i = 0; i < 15; i++) {
        // Random offset within ~5km radius
        const latOffset = (Math.random() - 0.5) * 0.08;
        const lngOffset = (Math.random() - 0.5) * 0.08;
        
        dummyParcels.push({
          id: `dummy-${i}`,
          reference_id: `ADD-2025-${String(i + 1).padStart(5, '0')}`,
          parcel_number: `PARCEL-AA-${String(i + 1).padStart(4, '0')}`,
          tax_status: taxStatuses[i % taxStatuses.length],
          status: 'APPROVED',
          district: districts[0],
          property_type: propertyTypes[i % propertyTypes.length],
          owner_name: ownerNames[i % ownerNames.length],
          coordinates: [baseLatAddis + latOffset, baseLngAddis + lngOffset]
        });
      }
      
      // Generate 15 properties around Hargeisa area
      const baseLatHargeisa = 9.56;
      const baseLngHargeisa = 44.065;
      
      for (let i = 0; i < 15; i++) {
        const latOffset = (Math.random() - 0.5) * 0.08;
        const lngOffset = (Math.random() - 0.5) * 0.08;
        
        dummyParcels.push({
          id: `dummy-h-${i}`,
          reference_id: `HRG-2025-${String(i + 15 + 1).padStart(5, '0')}`,
          parcel_number: `PARCEL-HG-${String(i + 1).padStart(4, '0')}`,
          tax_status: taxStatuses[(i + 1) % taxStatuses.length],
          status: 'APPROVED',
          district: districts[2],
          property_type: propertyTypes[(i + 2) % propertyTypes.length],
          owner_name: ownerNames[(i + 3) % ownerNames.length],
          coordinates: [baseLatHargeisa + latOffset, baseLngHargeisa + lngOffset]
        });
      }
      
      // Generate 10 properties around Dire Dawa area
      const baseLatDire = 9.59;
      const baseLngDire = 41.87;
      
      for (let i = 0; i < 10; i++) {
        const latOffset = (Math.random() - 0.5) * 0.06;
        const lngOffset = (Math.random() - 0.5) * 0.06;
        
        dummyParcels.push({
          id: `dummy-d-${i}`,
          reference_id: `DRD-2025-${String(i + 30 + 1).padStart(5, '0')}`,
          parcel_number: `PARCEL-DD-${String(i + 1).padStart(4, '0')}`,
          tax_status: taxStatuses[(i + 2) % taxStatuses.length],
          status: 'APPROVED',
          district: districts[1],
          property_type: propertyTypes[(i + 1) % propertyTypes.length],
          owner_name: ownerNames[(i + 2) % ownerNames.length],
          coordinates: [baseLatDire + latOffset, baseLngDire + lngOffset]
        });
      }
      
      // Generate 10 properties around Jigjiga area
      const baseLatJigjiga = 9.35;
      const baseLngJigjiga = 42.80;
      
      for (let i = 0; i < 10; i++) {
        const latOffset = (Math.random() - 0.5) * 0.06;
        const lngOffset = (Math.random() - 0.5) * 0.06;
        
        dummyParcels.push({
          id: `dummy-j-${i}`,
          reference_id: `JJG-2025-${String(i + 40 + 1).padStart(5, '0')}`,
          parcel_number: `PARCEL-JJ-${String(i + 1).padStart(4, '0')}`,
          tax_status: taxStatuses[(i + 3) % taxStatuses.length],
          status: 'APPROVED',
          district: districts[3],
          property_type: propertyTypes[(i + 3) % propertyTypes.length],
          owner_name: ownerNames[(i + 4) % ownerNames.length],
          coordinates: [baseLatJigjiga + latOffset, baseLngJigjiga + lngOffset]
        });
      }
      
      console.log(`Generated ${dummyParcels.length} dummy properties`);
      
      setParcels(dummyParcels);
      setLoading(false);
    } catch (error: any) {
      console.error('Error loading parcels:', error);
      setLoading(false);
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
            <div className="text-sm text-muted-foreground mt-1 space-y-1">
              <p>Showing {filteredParcels.length} of {parcels.length} parcels with coordinates</p>
              {parcels.length === 0 && !loading && (
                <p className="text-warning font-medium">
                  ⚠️ No approved properties have coordinates set. Add coordinates to properties to see them on the map.
                </p>
              )}
            </div>
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
                    {['Addis Ababa', 'Dire Dawa', 'Hargeisa', 'Jigjiga'].map(district => (
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
                      <li>Hover over markers to view property details</li>
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

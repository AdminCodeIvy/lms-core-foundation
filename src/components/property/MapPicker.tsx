import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import 'leaflet/dist/leaflet.css';

interface MapPickerProps {
  coordinates?: string | null;
  onCoordinatesChange: (coordinates: string | null) => void;
  defaultCenter?: [number, number];
  defaultZoom?: number;
  districtId?: string;
  subDistrictId?: string;
}

// District center coordinates
const DISTRICT_CENTERS: Record<string, { center: [number, number]; zoom: number }> = {
  // Ethiopian cities
  'addis-ababa': { center: [9.03, 38.74], zoom: 12 },
  'dire-dawa': { center: [9.593, 41.856], zoom: 12 },
  'hargeisa': { center: [9.56, 44.065], zoom: 12 },
  'jigjiga': { center: [9.35, 42.797], zoom: 12 },
};

export const MapPicker = ({ 
  coordinates, 
  onCoordinatesChange,
  defaultCenter = [9.03, 38.74], // Addis Ababa
  defaultZoom = 13,
  districtId,
  subDistrictId
}: MapPickerProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number; lng: number} | null>(null);
  const [districts, setDistricts] = useState<any[]>([]);

  // Fetch districts on mount
  useEffect(() => {
    const fetchDistricts = async () => {
      const { data } = await supabase.from('districts').select('*').eq('is_active', true);
      if (data) setDistricts(data);
    };
    fetchDistricts();
  }, []);

  // Parse coordinates on mount
  useEffect(() => {
    if (coordinates) {
      try {
        // Parse PostGIS format: POINT(lng lat) or GeoJSON format
        const coords = parseCoordinates(coordinates);
        if (coords) {
          setSelectedLocation(coords);
        }
      } catch (e) {
        console.error('Error parsing coordinates:', e);
      }
    }
  }, []);

  // Pan to district when selected
  useEffect(() => {
    if (!mapInstanceRef.current || !districtId) return;

    // Find the district
    const district = districts.find(d => d.id === districtId);
    if (!district) return;

    // Get district center from code
    const districtCode = district.code.toLowerCase();
    const districtKey = district.name.toLowerCase().replace(/\s+/g, '-');
    
    const location = DISTRICT_CENTERS[districtKey] || DISTRICT_CENTERS[districtCode];
    
    if (location) {
      mapInstanceRef.current.flyTo(location.center, location.zoom, {
        duration: 1.5
      });
    }
  }, [districtId, districts]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView(defaultCenter, defaultZoom);

    // Use CartoDB Positron tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    mapInstanceRef.current = map;

    // Add click handler to set marker
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setSelectedLocation({ lat, lng });
      
      // Format as PostGIS POINT (lng lat) - note the order!
      const postgisPoint = `POINT(${lng} ${lat})`;
      onCoordinatesChange(postgisPoint);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [defaultCenter, defaultZoom, onCoordinatesChange]);

  // Update marker when location changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove existing marker
    if (markerRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    // Add new marker if location is set
    if (selectedLocation) {
      const icon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="color: hsl(var(--primary)); font-size: 32px; margin-left: -16px; margin-top: -32px;">📍</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const marker = L.marker([selectedLocation.lat, selectedLocation.lng], { icon });
      marker.addTo(mapInstanceRef.current);
      markerRef.current = marker;

      // Pan to marker
      mapInstanceRef.current.setView([selectedLocation.lat, selectedLocation.lng], mapInstanceRef.current.getZoom());
    }
  }, [selectedLocation]);

  const handleClearLocation = () => {
    setSelectedLocation(null);
    onCoordinatesChange(null);
    
    if (markerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
  };

  const parseCoordinates = (coords: string): {lat: number; lng: number} | null => {
    try {
      // Try PostGIS format: POINT(lng lat)
      const postgisMatch = coords.match(/POINT\(([+-]?\d+\.?\d*)\s+([+-]?\d+\.?\d*)\)/);
      if (postgisMatch) {
        return {
          lng: parseFloat(postgisMatch[1]),
          lat: parseFloat(postgisMatch[2])
        };
      }

      // Try GeoJSON format
      const geoJsonMatch = coords.match(/\{.*coordinates.*\[([+-]?\d+\.?\d*),\s*([+-]?\d+\.?\d*)\]/);
      if (geoJsonMatch) {
        return {
          lng: parseFloat(geoJsonMatch[1]),
          lat: parseFloat(geoJsonMatch[2])
        };
      }

      return null;
    } catch (e) {
      return null;
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <div>
              <Label className="text-base font-semibold">Property Location</Label>
              <p className="text-sm text-muted-foreground">
                {selectedLocation 
                  ? `Selected: ${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`
                  : 'Click on the map to set location'
                }
              </p>
            </div>
          </div>
          {selectedLocation && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearLocation}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>
      <div 
        ref={mapRef} 
        className="h-[400px] w-full"
        style={{ cursor: 'crosshair' }}
      />
    </Card>
  );
};

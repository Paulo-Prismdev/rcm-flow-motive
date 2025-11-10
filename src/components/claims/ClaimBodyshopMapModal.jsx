
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { X, MapPin, CheckCircle, Phone, Mail, MapPinned, AlertCircle, Loader } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for bodyshops (blue)
const bodyshopIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom icon for selected bodyshop (green)
const bodyshopSelectedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom icon for client (red)
const clientIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to center map on selected bodyshop
function MapCenterUpdater({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);
  
  return null;
}

export default function ClaimBodyshopMapModal({ claim, isOpen, onClose, onSelectBodyshop }) {
  const [selectedBodyshop, setSelectedBodyshop] = useState(null);
  const [clientLocation, setClientLocation] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeMessage, setGeocodeMessage] = useState(null);
  const [mapCenter, setMapCenter] = useState([54.5, -2.0]); // UK center default
  const [mapZoom, setMapZoom] = useState(7);
  
  // Track if we've attempted geocoding for this modal opening
  const hasAttemptedGeocode = useRef(false);

  const { data: bodyshops = [] } = useQuery({
    queryKey: ['bodyshops'],
    queryFn: () => base44.entities.Bodyshop.list(),
  });

  // Filter bodyshops with valid coordinates
  const validBodyshops = useMemo(() => 
    bodyshops.filter(b => 
      b.latitude && b.longitude && 
      !isNaN(parseFloat(b.latitude)) && !isNaN(parseFloat(b.longitude))
    ),
    [bodyshops]
  );

  // Build client address string - memoized to prevent recreating on every render
  const clientAddress = useMemo(() => 
    [
      claim.client_address_line_1,
      claim.client_address_line_2,
      claim.client_town,
      claim.client_county,
      claim.client_postcode
    ].filter(Boolean).join(', '),
    [claim.client_address_line_1, claim.client_address_line_2, claim.client_town, claim.client_county, claim.client_postcode]
  );

  // More robust address validation - memoized
  const hasValidAddress = useMemo(() => {
    // Must have at least postcode OR (street + town)
    const hasPostcode = claim.client_postcode && claim.client_postcode.trim().length >= 5;
    const hasStreetAndTown = claim.client_address_line_1 && claim.client_address_line_1.trim().length > 3 && 
                             claim.client_town && claim.client_town.trim().length > 2;
    
    return hasPostcode || hasStreetAndTown;
  }, [claim.client_postcode, claim.client_address_line_1, claim.client_town]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      hasAttemptedGeocode.current = false;
      setSelectedBodyshop(null);
      setClientLocation(null);
      setGeocodeMessage(null);
      
      // Center on bodyshops by default
      if (validBodyshops.length > 0) {
        const avgLat = validBodyshops.reduce((sum, b) => sum + parseFloat(b.latitude), 0) / validBodyshops.length;
        const avgLng = validBodyshops.reduce((sum, b) => sum + parseFloat(b.longitude), 0) / validBodyshops.length;
        setMapCenter([avgLat, avgLng]);
        setMapZoom(7);
      }
    } else {
      // Reset when closing
      hasAttemptedGeocode.current = false;
    }
  }, [isOpen, validBodyshops]); 

  // Separate effect for geocoding - only runs once per modal open
  useEffect(() => {
    if (!isOpen || hasAttemptedGeocode.current || isGeocoding) {
      return; // Don't geocode if modal closed, already attempted, or currently geocoding
    }

    // Check if we have a valid address
    if (!hasValidAddress || !clientAddress.trim()) {
      setGeocodeMessage({
        type: 'info',
        text: 'No client address available. Showing all bodyshops on the map.'
      });
      hasAttemptedGeocode.current = true;
      return;
    }

    // Mark that we're attempting geocoding
    hasAttemptedGeocode.current = true;

    // Attempt to geocode
    const geocodeClientAddress = async () => {
      setIsGeocoding(true);
      setGeocodeMessage(null);
      
      console.log(`Attempting to geocode address: "${clientAddress}"`);
      
      try {
        // Call the backend function
        const result = await base44.functions.invoke('geocodeAddress', {
          address: clientAddress
        });

        console.log('Geocode function raw response:', result);
        console.log('Response type:', typeof result);
        console.log('Response keys:', result ? Object.keys(result) : 'null');
        console.log('Latitude field:', result?.latitude);
        console.log('Longitude field:', result?.longitude);

        // Check different possible response structures
        let coordinates = null;
        
        // Try direct access
        if (result && result.latitude && result.longitude) {
          coordinates = {
            lat: result.latitude,
            lng: result.longitude,
            display_name: result.display_name || clientAddress
          };
        }
        // Try data property
        else if (result?.data && result.data.latitude && result.data.longitude) {
          coordinates = {
            lat: result.data.latitude,
            lng: result.data.longitude,
            display_name: result.data.display_name || clientAddress
          };
        }
        // Try nested response
        else if (result?.response && result.response.latitude && result.response.longitude) {
          coordinates = {
            lat: result.response.latitude,
            lng: result.response.longitude,
            display_name: result.response.display_name || clientAddress
          };
        }

        if (coordinates) {
          console.log('✓ Client location found:', coordinates);
          
          setClientLocation(coordinates);
          setMapCenter([coordinates.lat, coordinates.lng]);
          setMapZoom(10);
          setGeocodeMessage({
            type: 'success',
            text: `Client location found: ${coordinates.display_name}`
          });
        } else {
          console.log('✗ No coordinates in response structure');
          setGeocodeMessage({
            type: 'warning',
            text: 'Could not find client location. Showing all bodyshops.'
          });
        }
      } catch (error) {
        console.log("Geocoding error:", error);
        
        // Handle different error types with user-friendly messages
        let message = 'Unable to locate client address. Showing all bodyshops.';
        
        if (error.response?.status === 429 || error.message?.includes('429')) {
          message = 'Too many location searches. Showing all bodyshops.';
        } else if (error.response?.status === 503 || error.message?.includes('503')) {
          message = 'Location service temporarily unavailable. Showing all bodyshops.';
        } else if (error.response?.status === 404 || error.message?.includes('404')) {
          message = `Address not found. Showing all bodyshops.`;
        } else if (error.message?.includes('Network')) {
          message = 'Network error while locating address. Showing all bodyshops.';
        }
        
        setGeocodeMessage({
          type: 'warning',
          text: message
        });
      } finally {
        setIsGeocoding(false);
      }
    };

    geocodeClientAddress();
  }, [isOpen, hasValidAddress, clientAddress, isGeocoding]); // Minimal dependencies

  const handleBodyshopClick = (bodyshop) => {
    setSelectedBodyshop(bodyshop);
    setMapCenter([parseFloat(bodyshop.latitude), parseFloat(bodyshop.longitude)]);
    setMapZoom(11);
  };

  const handleSelectBodyshop = () => {
    if (selectedBodyshop) {
      onSelectBodyshop(selectedBodyshop);
      onClose();
    }
  };

  // 30 miles in meters
  const radiusInMeters = 30 * 1609.34;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-accent" />
            Select Bodyshop for {claim.reg}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 pt-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Loading state */}
          {isGeocoding && (
            <div className="mb-4 glass-inset p-4 rounded-lg border border-blue-500 border-opacity-30">
              <div className="flex items-center gap-3">
                <Loader className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
                <p className="text-sm">Locating client address on map...</p>
              </div>
            </div>
          )}

          {/* Status messages */}
          {!isGeocoding && geocodeMessage && (
            <div className={`mb-4 glass-inset p-4 rounded-lg border ${
              geocodeMessage.type === 'success' ? 'border-green-500 border-opacity-30' : 
              geocodeMessage.type === 'warning' ? 'border-orange-500 border-opacity-30' : 
              'border-blue-500 border-opacity-30'
            }`}>
              <div className="flex items-start gap-3">
                {geocodeMessage.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : geocodeMessage.type === 'warning' ? (
                  <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                )}
                <p className="text-sm">{geocodeMessage.text}</p>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-4 text-sm">
            {clientLocation && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Client: {claim.client_name || 'Client Location'}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Bodyshops ({validBodyshops.length})</span>
            </div>
            {selectedBodyshop && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Selected (30 Mile Radius)</span>
              </div>
            )}
          </div>

          {/* Map */}
          <div className="glass-inset rounded-xl overflow-hidden" style={{ height: '500px' }}>
            <MapContainer 
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                subdomains="abcd"
                maxZoom={20}
              />
              
              <MapCenterUpdater center={mapCenter} zoom={mapZoom} />
              
              {/* Client Location Marker */}
              {clientLocation && (
                <Marker 
                  position={[clientLocation.lat, clientLocation.lng]} 
                  icon={clientIcon}
                />
              )}

              {/* Bodyshop Markers */}
              {validBodyshops.map((bodyshop) => {
                const lat = parseFloat(bodyshop.latitude);
                const lng = parseFloat(bodyshop.longitude);
                if (isNaN(lat) || isNaN(lng)) return null;
                
                return (
                  <Marker 
                    key={bodyshop.id}
                    position={[lat, lng]}
                    icon={selectedBodyshop?.id === bodyshop.id ? bodyshopSelectedIcon : bodyshopIcon}
                    eventHandlers={{
                      click: () => handleBodyshopClick(bodyshop),
                    }}
                  />
                );
              })}

              {/* 30 Mile Radius Circle */}
              {selectedBodyshop && (
                <Circle
                  center={[parseFloat(selectedBodyshop.latitude), parseFloat(selectedBodyshop.longitude)]}
                  radius={radiusInMeters}
                  pathOptions={{
                    color: '#10b981',
                    fillColor: '#10b981',
                    fillOpacity: 0.1,
                    weight: 2,
                  }}
                />
              )}
            </MapContainer>
          </div>

          {/* Instruction text */}
          {!selectedBodyshop && !isGeocoding && (
            <div className="mt-4 text-center text-sm text-foreground-muted glass-inset p-3 rounded-lg">
              Click on any blue bodyshop marker to select it and view details
            </div>
          )}

          {/* Selected Bodyshop Info */}
          {selectedBodyshop && (
            <div className="mt-4 glass-elevated p-5 rounded-xl border-2 border-accent">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-bold text-lg flex items-center gap-2 text-accent mb-4">
                    <CheckCircle className="w-5 h-5" />
                    Selected Bodyshop
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-foreground-muted mb-1">Company Name</p>
                        <p className="font-semibold text-base">{selectedBodyshop.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-foreground-muted mb-1">Contact Person</p>
                        <p className="font-medium">{selectedBodyshop.contact_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-foreground-muted mb-1 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          Phone
                        </p>
                        <p className="font-medium">{selectedBodyshop.phone}</p>
                      </div>
                      <div>
                        <p className="text-xs text-foreground-muted mb-1 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          Email
                        </p>
                        <p className="font-medium text-sm">{selectedBodyshop.email}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-foreground-muted mb-1 flex items-center gap-1">
                          <MapPinned className="w-3 h-3" />
                          Address
                        </p>
                        <div className="font-medium text-sm">
                          {selectedBodyshop.address_line_1 && <p>{selectedBodyshop.address_line_1}</p>}
                          {selectedBodyshop.address_line_2 && <p>{selectedBodyshop.address_line_2}</p>}
                          {selectedBodyshop.town && <p>{selectedBodyshop.town}</p>}
                          {selectedBodyshop.county && <p>{selectedBodyshop.county}</p>}
                          {selectedBodyshop.postcode && <p className="font-semibold">{selectedBodyshop.postcode}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => setSelectedBodyshop(null)}
                  variant="ghost"
                  size="icon"
                  className="ml-4 -mt-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-4">
            <Button
              onClick={onClose}
              className="glass-button px-6 py-3"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSelectBodyshop}
              disabled={!selectedBodyshop}
              className="glass-button px-6 py-3 text-accent font-medium disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirm Selection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

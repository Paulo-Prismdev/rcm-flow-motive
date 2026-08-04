import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Circle, Polyline, Tooltip, useMap } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  X, MapPin, CheckCircle, Phone, Mail, MapPinned, AlertCircle, Loader,
  Clock, Navigation
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { geocodeAddress } from '@/functions/geocodeAddress';
import { haversineDistance, formatHaversineDistance } from '@/components/shared/haversine';

// ── Leaflet icon setup ──
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const bodyshopIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const bodyshopSelectedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const clientIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

function MapCenterUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

// Decode Google encoded polyline into [lat, lng] pairs
function decodePolyline(encoded) {
  if (!encoded) return [];
  const coords = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

function getTimeBadgeClass(seconds) {
  if (!seconds) return 'bg-gray-100 text-gray-600';
  const mins = seconds / 60;
  if (mins < 15) return 'bg-green-100 text-green-700';
  if (mins < 30) return 'bg-blue-100 text-blue-700';
  if (mins < 45) return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-600';
}

function TravelBadge({ log }) {
  if (!log || !log.duration_text) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${getTimeBadgeClass(log.duration_seconds)}`}>
      <Clock className="w-3 h-3" />
      {log.duration_text}
      <span className="opacity-50">•</span>
      {log.distance_text}
    </span>
  );
}

export default function ClaimBodyshopMapModal({ claim, isOpen, onClose, onSelectBodyshop }) {
  const [selectedBodyshop, setSelectedBodyshop] = useState(null);
  const [clientLocation, setClientLocation] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeMessage, setGeocodeMessage] = useState(null);
  const [mapCenter, setMapCenter] = useState([54.5, -2.0]);
  const [mapZoom, setMapZoom] = useState(7);
  const [logistics, setLogistics] = useState({});
  const [isLoadingDistance, setIsLoadingDistance] = useState(false);
  const [routePoints, setRoutePoints] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('distance');

  const hasAttemptedGeocode = useRef(false);

  const { data: bodyshops = [] } = useQuery({
    queryKey: ['bodyshops'],
    queryFn: () => base44.entities.Bodyshop.list(),
  });

  const validBodyshops = useMemo(() =>
    bodyshops.filter(b =>
      b.latitude && b.longitude &&
      !isNaN(parseFloat(b.latitude)) && !isNaN(parseFloat(b.longitude))
    ).map(b => ({
      ...b,
      latitude: parseFloat(b.latitude),
      longitude: parseFloat(b.longitude)
    })), [bodyshops]);

  const vehicleLocation = useMemo(() => claim?.vehicle_location?.trim(), [claim]);

  const hasValidAddress = useMemo(() => {
    if (!claim) return false;
    return !!vehicleLocation && vehicleLocation.length >= 3;
  }, [claim, vehicleLocation]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      hasAttemptedGeocode.current = false;
      setSelectedBodyshop(null);
      setClientLocation(null);
      setGeocodeMessage(null);
      setLogistics({});
      setRoutePoints([]);
      setSearchQuery('');

      if (validBodyshops.length > 0) {
        const avgLat = validBodyshops.reduce((sum, b) => sum + b.latitude, 0) / validBodyshops.length;
        const avgLng = validBodyshops.reduce((sum, b) => sum + b.longitude, 0) / validBodyshops.length;
        setMapCenter([avgLat, avgLng]);
        setMapZoom(7);
      }
    }
  }, [isOpen, validBodyshops]);

  // Geocode vehicle location
  useEffect(() => {
    if (!isOpen || hasAttemptedGeocode.current || isGeocoding) return;

    if (!hasValidAddress || !vehicleLocation) {
      setGeocodeMessage({ type: 'info', text: 'No vehicle location available. Showing all repairers on the map.' });
      hasAttemptedGeocode.current = true;
      return;
    }

    hasAttemptedGeocode.current = true;

    const geocodeVehicleLocation = async () => {
      setIsGeocoding(true);
      try {
        const result = await geocodeAddress({ address: vehicleLocation });
        const data = result?.data || result;

        let coordinates = null;
        if (data && data.latitude && data.longitude) {
          coordinates = { lat: data.latitude, lng: data.longitude, display_name: data.display_name || vehicleLocation };
        }

        if (coordinates) {
          setClientLocation(coordinates);
          setMapCenter([coordinates.lat, coordinates.lng]);
          setMapZoom(10);
          setGeocodeMessage({ type: 'success', text: `Vehicle location found: ${coordinates.display_name}` });
        } else {
          setGeocodeMessage({ type: 'warning', text: 'Could not find vehicle location. Showing all repairers.' });
        }
      } catch (error) {
        setGeocodeMessage({ type: 'warning', text: 'Unable to locate vehicle location. Showing all repairers.' });
      } finally {
        setIsGeocoding(false);
      }
    };

    geocodeVehicleLocation();
  }, [isOpen, hasValidAddress, vehicleLocation, isGeocoding]);

  // ── Fetch distance for a single bodyshop on demand ──
  const fetchDistanceForBodyshop = async (bodyshop) => {
    if (!clientLocation || !bodyshop) return;
    if (logistics[bodyshop.id]) return; // already fetched

    setIsLoadingDistance(true);
    try {
      const response = await geocodeAddress({
        action: 'distance_matrix',
        origin: clientLocation,
        destinations: [{ lat: bodyshop.latitude, lng: bodyshop.longitude }]
      });
      const data = response?.data || response;
      if (data?.results?.[0]) {
        setLogistics(prev => ({ ...prev, [bodyshop.id]: data.results[0] }));
      }
    } catch (err) {
      console.error('Distance fetch failed:', err);
    } finally {
      setIsLoadingDistance(false);
    }
  };

  // Fetch driving route polyline + distance when a bodyshop is selected
  useEffect(() => {
    if (!clientLocation || !selectedBodyshop) {
      setRoutePoints([]);
      return;
    }
    let cancelled = false;

    // Fetch distance on demand
    fetchDistanceForBodyshop(selectedBodyshop);

    const fetchRoute = async () => {
      try {
        const response = await geocodeAddress({
          action: 'directions',
          origin: clientLocation,
          destination: { lat: selectedBodyshop.latitude, lng: selectedBodyshop.longitude }
        });
        const data = response?.data || response;
        if (cancelled) return;
        if (data?.points) {
          setRoutePoints(decodePolyline(data.points));
        }
      } catch (err) {
        console.error('Route fetch failed:', err);
      }
    };

    fetchRoute();
    return () => { cancelled = true; };
  }, [clientLocation, selectedBodyshop]);

  const handleBodyshopClick = (bodyshop) => {
    setSelectedBodyshop(bodyshop);
    setMapCenter([bodyshop.latitude, bodyshop.longitude]);
    setMapZoom(11);
  };

  const handleSelectBodyshop = () => {
    if (selectedBodyshop) {
      onSelectBodyshop(selectedBodyshop);
    }
  };

  const sortedBodyshops = useMemo(() => {
    let list = [...validBodyshops];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(b =>
        b.name?.toLowerCase().includes(q) ||
        b.postcode?.toLowerCase().includes(q) ||
        b.town?.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'distance' && clientLocation) {
      list.sort((a, b) => {
        const aDist = haversineDistance(clientLocation.lat, clientLocation.lng, a.latitude, a.longitude);
        const bDist = haversineDistance(clientLocation.lat, clientLocation.lng, b.latitude, b.longitude);
        return aDist - bDist;
      });
    } else {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return list;
  }, [validBodyshops, sortBy, searchQuery, clientLocation]);

  const radiusInMeters = 30 * 1609.34;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-5 h-5 text-accent" />
            Find Repairer on Map — {claim.reg}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Status messages */}
          {isGeocoding && (
            <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-50/50 flex items-center gap-2">
              <Loader className="w-4 h-4 text-blue-500 animate-spin" />
              <p className="text-xs">Locating vehicle location...</p>
            </div>
          )}
          {!isGeocoding && geocodeMessage && (
            <div className={`p-3 rounded-lg border ${
              geocodeMessage.type === 'success' ? 'border-green-500/30 bg-green-50/50' :
              geocodeMessage.type === 'warning' ? 'border-orange-500/30 bg-orange-50/50' :
              'border-blue-500/30 bg-blue-50/50'
            }`}>
              <div className="flex items-start gap-2">
                {geocodeMessage.type === 'success' ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                <p className="text-xs">{geocodeMessage.text}</p>
              </div>
            </div>
          )}
          {isLoadingDistance && (
            <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-50/50 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-500 animate-pulse" />
              <p className="text-xs">Calculating driving distance...</p>
            </div>
          )}

          {/* Search + Sort controls */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, town, or postcode..." />
            </div>
            <div className="flex gap-2">
              <Button variant={sortBy === 'distance' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('distance')} disabled={!clientLocation} className="h-9">
                <Navigation className="w-3.5 h-3.5 mr-1" /> Distance
              </Button>
              <Button variant={sortBy === 'name' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('name')} className="h-9">
                Name
              </Button>
            </div>
          </div>

          {/* Main content: List + Map */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            {/* Bodyshop list */}
            <div className="lg:col-span-2 space-y-2 max-h-[400px] lg:max-h-[500px] overflow-y-auto pr-1">
              {sortedBodyshops.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground p-4">No repairers match your filters.</div>
              ) : (
                sortedBodyshops.map((bodyshop) => {
                  const isSelected = selectedBodyshop?.id === bodyshop.id;
                  const log = logistics[bodyshop.id];
                  const haversineMiles = clientLocation
                    ? haversineDistance(clientLocation.lat, clientLocation.lng, bodyshop.latitude, bodyshop.longitude)
                    : null;
                  return (
                    <div key={bodyshop.id} onClick={() => handleBodyshopClick(bodyshop)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold text-sm truncate flex-1">{bodyshop.name}</p>
                        {log ? (
                          <TravelBadge log={log} />
                        ) : haversineMiles != null ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 bg-gray-100 text-gray-500">
                            <Navigation className="w-3 h-3" />
                            ≈{formatHaversineDistance(haversineMiles)}
                          </span>
                        ) : null}
                      </div>
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        {bodyshop.contact_name && <p className="truncate">{bodyshop.contact_name}</p>}
                        {bodyshop.phone && <p className="flex items-center gap-1 truncate"><Phone className="w-3 h-3 flex-shrink-0" />{bodyshop.phone}</p>}
                        {bodyshop.town && <p className="flex items-center gap-1 truncate"><MapPinned className="w-3 h-3 flex-shrink-0" />{bodyshop.town} {bodyshop.postcode}</p>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Map */}
            <div className="lg:col-span-3">
              <div className="rounded-xl overflow-hidden border" style={{ height: '400px', minHeight: '300px' }}>
                <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                  <TileLayer
                    attribution='&copy; Google Maps'
                    url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                    subdomains={['mt0','mt1','mt2','mt3']}
                    maxZoom={20}
                  />
                  <MapCenterUpdater center={mapCenter} zoom={mapZoom} />

                  {clientLocation && (
                    <Marker position={[clientLocation.lat, clientLocation.lng]} icon={clientIcon}>
                      <Tooltip sticky>
                        <div className="text-xs">
                          <p className="font-semibold">Vehicle Location: {claim?.vehicle_location || claim?.client_name || 'Location'}</p>
                        </div>
                      </Tooltip>
                    </Marker>
                  )}

                  {routePoints.length > 0 && (
                    <Polyline positions={routePoints} pathOptions={{ color: '#10b981', weight: 4, opacity: 0.7 }} />
                  )}

                  {sortedBodyshops.map((bodyshop) => {
                    const log = logistics[bodyshop.id];
                    return (
                      <Marker key={bodyshop.id} position={[bodyshop.latitude, bodyshop.longitude]}
                        icon={selectedBodyshop?.id === bodyshop.id ? bodyshopSelectedIcon : bodyshopIcon}
                        eventHandlers={{ click: () => handleBodyshopClick(bodyshop) }}>
                        <Tooltip sticky>
                          <div className="text-xs">
                            <p className="font-semibold">{bodyshop.name}</p>
                            {log?.duration_text && <p className="text-green-600">{log.duration_text} • {log.distance_text}</p>}
                          </div>
                        </Tooltip>
                      </Marker>
                    );
                  })}

                  {selectedBodyshop && (
                    <Circle
                      center={[selectedBodyshop.latitude, selectedBodyshop.longitude]}
                      radius={radiusInMeters}
                      pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.05, weight: 1 }}
                    />
                  )}
                </MapContainer>
              </div>
            </div>
          </div>

        </div>

        {/* Selected repairer confirmation strip — fixed, always visible (outside scroll area) */}
        {selectedBodyshop ? (
          <div className="p-3 border-t border-primary/40 bg-primary/5 flex-shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate text-primary">{selectedBodyshop.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                    {selectedBodyshop.town && <span className="truncate">{selectedBodyshop.town}</span>}
                    {selectedBodyshop.postcode && <span className="font-semibold truncate">{selectedBodyshop.postcode}</span>}
                    {selectedBodyshop.phone && <span className="hidden sm:flex items-center gap-1 truncate"><Phone className="w-3 h-3 flex-shrink-0" />{selectedBodyshop.phone}</span>}
                    {logistics[selectedBodyshop.id] && <TravelBadge log={logistics[selectedBodyshop.id]} />}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8" onClick={() => setSelectedBodyshop(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-2.5 border-t flex-shrink-0 text-center text-xs text-muted-foreground bg-muted/30">
            Click a repairer from the list or map to select
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 p-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="h-10">
            Cancel
          </Button>
          <Button onClick={handleSelectBodyshop} disabled={!selectedBodyshop} className="h-10">
            <CheckCircle className="w-4 h-4 mr-2" />
            Confirm & Start Allocation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
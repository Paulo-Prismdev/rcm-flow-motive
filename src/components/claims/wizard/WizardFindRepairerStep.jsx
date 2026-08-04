import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, Circle, Polyline, Tooltip, useMap } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CheckCircle, Phone, Mail, MapPinned, AlertCircle, Loader,
  Clock, Navigation, X
} from 'lucide-react';
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

export default function WizardFindRepairerStep({
  claim, bodyshops, clientLocation, isGeocoding, geocodeMessage,
  mapCenter, mapZoom, selectedBodyshop, onSelectBodyshop, onClearSelection
}) {
  const [logistics, setLogistics] = useState({});
  const [isLoadingDistance, setIsLoadingDistance] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('distance');
  const [routePoints, setRoutePoints] = useState([]);
  const [geocodedCoords, setGeocodedCoords] = useState({});
  const [isGeocodingBodyshops, setIsGeocodingBodyshops] = useState(false);

  // ── Geocode bodyshops that lack stored coordinates ──
  useEffect(() => {
    const needingGeocode = bodyshops.filter(b =>
      !(b.latitude && b.longitude) &&
      (b.address_line_1 || b.postcode || b.town)
    );
    if (needingGeocode.length === 0) return;
    let cancelled = false;

    const geocodeMissing = async () => {
      setIsGeocodingBodyshops(true);
      const resolved = {};
      for (const b of needingGeocode) {
        if (cancelled) return;
        const fullAddress = [b.address_line_1, b.address_line_2, b.town, b.county, b.postcode]
          .filter(Boolean).join(', ');
        try {
          const result = await geocodeAddress({ address: fullAddress });
          const data = result?.data || result;
          if (data && data.latitude && data.longitude) {
            resolved[b.id] = { latitude: data.latitude, longitude: data.longitude };
            // Persist coordinates back to database
            base44.entities.Bodyshop.update(b.id, {
              latitude: data.latitude,
              longitude: data.longitude
            }).catch(err => console.warn('Failed to save coords for', b.name, err));
          }
        } catch (err) {
          console.error('Geocode failed for', b.name, err);
        }
      }
      if (!cancelled && Object.keys(resolved).length > 0) {
        setGeocodedCoords(prev => ({ ...prev, ...resolved }));
      }
      setIsGeocodingBodyshops(false);
    };

    geocodeMissing();
    return () => { cancelled = true; };
  }, [bodyshops]);

  const validBodyshops = useMemo(() =>
    bodyshops.filter(b => {
      const lat = b.latitude || geocodedCoords[b.id]?.latitude;
      const lng = b.longitude || geocodedCoords[b.id]?.longitude;
      return lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));
    }).map(b => ({
      ...b,
      latitude: b.latitude || geocodedCoords[b.id]?.latitude,
      longitude: b.longitude || geocodedCoords[b.id]?.longitude
    })), [bodyshops, geocodedCoords]);

  // ── Fetch distance for a single bodyshop on demand (when user selects one) ──
  const fetchDistanceForBodyshop = async (bodyshop) => {
    if (!clientLocation || !bodyshop) return;
    if (logistics[bodyshop.id]) return; // already fetched

    const lat = parseFloat(bodyshop.latitude);
    const lng = parseFloat(bodyshop.longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    setIsLoadingDistance(true);
    try {
      const response = await geocodeAddress({
        action: 'distance_matrix',
        origin: clientLocation,
        destinations: [{ lat, lng }]
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

  // ── Fetch driving route + distance when a bodyshop is selected ──
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
          destination: {
            lat: parseFloat(selectedBodyshop.latitude),
            lng: parseFloat(selectedBodyshop.longitude)
          }
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

  // ── Sorted + filtered bodyshops ──
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
        const aDist = haversineDistance(clientLocation.lat, clientLocation.lng, parseFloat(a.latitude), parseFloat(a.longitude));
        const bDist = haversineDistance(clientLocation.lat, clientLocation.lng, parseFloat(b.latitude), parseFloat(b.longitude));
        return aDist - bDist;
      });
    } else {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return list;
  }, [validBodyshops, sortBy, searchQuery, clientLocation]);

  const radiusInMeters = 30 * 1609.34;

  return (
    <div className="space-y-3">
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
      {isGeocodingBodyshops && (
        <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-50/50 flex items-center gap-2">
          <MapPinned className="w-4 h-4 text-blue-500 animate-pulse" />
          <p className="text-xs">Locating repairers without coordinates...</p>
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
        <div className="lg:col-span-2 space-y-1.5 max-h-[350px] lg:max-h-[450px] overflow-y-auto pr-1">
          {sortedBodyshops.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground p-4">No repairers match your filters.</div>
          ) : (
            sortedBodyshops.map((bodyshop) => {
              const isSelected = selectedBodyshop?.id === bodyshop.id;
              const log = logistics[bodyshop.id];
              const haversineMiles = clientLocation
                ? haversineDistance(clientLocation.lat, clientLocation.lng, parseFloat(bodyshop.latitude), parseFloat(bodyshop.longitude))
                : null;
              return (
                <div key={bodyshop.id} onClick={() => onSelectBodyshop(bodyshop)}
                  className={`p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}>
                  <div className="flex items-start justify-between gap-2 mb-0.5">
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
          <div className="rounded-xl overflow-hidden border" style={{ height: '350px', minHeight: '250px' }}>
            <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
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
                const lat = parseFloat(bodyshop.latitude);
                const lng = parseFloat(bodyshop.longitude);
                if (isNaN(lat) || isNaN(lng)) return null;
                const log = logistics[bodyshop.id];
                return (
                  <Marker key={bodyshop.id} position={[lat, lng]}
                    icon={selectedBodyshop?.id === bodyshop.id ? bodyshopSelectedIcon : bodyshopIcon}
                    eventHandlers={{ click: () => onSelectBodyshop(bodyshop) }}>
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
                  center={[parseFloat(selectedBodyshop.latitude), parseFloat(selectedBodyshop.longitude)]}
                  radius={radiusInMeters}
                  pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.05, weight: 1 }}
                />
              )}
            </MapContainer>
          </div>
        </div>
      </div>

      {/* Selected bodyshop detail card */}
      {selectedBodyshop ? (
        <div className="p-2.5 rounded-xl border-2 border-primary bg-primary/5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm flex items-center gap-1.5 text-primary mb-1.5">
                <CheckCircle className="w-4 h-4" /> Selected Repairer
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <p className="font-semibold text-sm truncate">{selectedBodyshop.name}</p>
                  {selectedBodyshop.contact_name && <p className="text-muted-foreground truncate">{selectedBodyshop.contact_name}</p>}
                  {selectedBodyshop.phone && <p className="flex items-center gap-1 truncate"><Phone className="w-3 h-3 flex-shrink-0" /><span className="truncate">{selectedBodyshop.phone}</span></p>}
                  {selectedBodyshop.email && <p className="flex items-center gap-1 truncate"><Mail className="w-3 h-3 flex-shrink-0" /><span className="truncate">{selectedBodyshop.email}</span></p>}
                </div>
                <div className="space-y-1">
                  {logistics[selectedBodyshop.id] && (
                    <div className="mb-1"><TravelBadge log={logistics[selectedBodyshop.id]} /></div>
                  )}
                  <p className="text-muted-foreground flex items-center gap-1"><MapPinned className="w-3 h-3" /> Address</p>
                  <div className="text-muted-foreground">
                    {selectedBodyshop.address_line_1 && <p className="truncate">{selectedBodyshop.address_line_1}</p>}
                    {selectedBodyshop.town && <p className="truncate">{selectedBodyshop.town}</p>}
                    {selectedBodyshop.postcode && <p className="font-semibold">{selectedBodyshop.postcode}</p>}
                  </div>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={onClearSelection}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
          Click a repairer from the list or map to select
        </div>
      )}
    </div>
  );
}
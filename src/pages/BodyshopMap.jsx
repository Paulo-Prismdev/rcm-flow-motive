import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Phone, Mail, MapPinned, Loader, Clock, Navigation,
  CheckCircle, X, ArrowLeft
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import AddressLookupInput from '@/components/shared/AddressLookupInput';

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

const customerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

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

function MapCenterUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

export default function BodyshopMap() {
  const [customerLocation, setCustomerLocation] = useState(null);
  const [selectedBodyshop, setSelectedBodyshop] = useState(null);
  const [logistics, setLogistics] = useState({});
  const [isLoadingLogistics, setIsLoadingLogistics] = useState(false);
  const [routePoints, setRoutePoints] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('time');
  const [maxTimeFilter, setMaxTimeFilter] = useState(null);
  const [mapCenter, setMapCenter] = useState([54.5, -2.0]);
  const [mapZoom, setMapZoom] = useState(7);

  const { data: bodyshops = [], isLoading } = useQuery({
    queryKey: ['bodyshops'],
    queryFn: () => base44.entities.Bodyshop.list(),
  });

  const validBodyshops = useMemo(() =>
    bodyshops.filter(b =>
      b.latitude && b.longitude &&
      !isNaN(parseFloat(b.latitude)) && !isNaN(parseFloat(b.longitude))
    ), [bodyshops]);

  // ── Fetch distance matrix when customer location is available ──
  useEffect(() => {
    if (!customerLocation || validBodyshops.length === 0) return;
    let cancelled = false;

    const fetchLogistics = async () => {
      setIsLoadingLogistics(true);
      try {
        const destinations = validBodyshops.map(b => ({
          lat: parseFloat(b.latitude),
          lng: parseFloat(b.longitude)
        }));
        const response = await base44.functions.invoke('geocodeAddress', {
          action: 'distance_matrix', origin: customerLocation, destinations
        });
        const data = response?.data || response;
        if (cancelled) return;

        const logMap = {};
        if (data?.results) {
          data.results.forEach((r, idx) => {
            if (idx < validBodyshops.length) {
              logMap[validBodyshops[idx].id] = r;
            }
          });
        }
        setLogistics(logMap);
      } catch (err) {
        console.error('Logistics fetch failed:', err);
      } finally {
        if (!cancelled) setIsLoadingLogistics(false);
      }
    };

    fetchLogistics();
    return () => { cancelled = true; };
  }, [customerLocation, validBodyshops]);

  // ── Fetch driving route polyline when a bodyshop is selected ──
  useEffect(() => {
    if (!customerLocation || !selectedBodyshop) {
      setRoutePoints([]);
      return;
    }
    let cancelled = false;

    const fetchRoute = async () => {
      try {
        const response = await base44.functions.invoke('geocodeAddress', {
          action: 'directions',
          origin: customerLocation,
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
  }, [customerLocation, selectedBodyshop]);

  // ── Update map center when customer location changes ──
  useEffect(() => {
    if (customerLocation) {
      setMapCenter([customerLocation.lat, customerLocation.lng]);
      setMapZoom(12);
    } else if (validBodyshops.length > 0) {
      const avgLat = validBodyshops.reduce((sum, b) => sum + parseFloat(b.latitude), 0) / validBodyshops.length;
      const avgLng = validBodyshops.reduce((sum, b) => sum + parseFloat(b.longitude), 0) / validBodyshops.length;
      setMapCenter([avgLat, avgLng]);
      setMapZoom(7);
    }
  }, [customerLocation, validBodyshops]);

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

    if (maxTimeFilter) {
      list = list.filter(b => {
        const log = logistics[b.id];
        return log && log.duration_seconds && log.duration_seconds <= maxTimeFilter * 60;
      });
    }

    if (sortBy === 'time') {
      list.sort((a, b) => {
        const aTime = logistics[a.id]?.duration_seconds ?? Infinity;
        const bTime = logistics[b.id]?.duration_seconds ?? Infinity;
        return aTime - bTime;
      });
    } else {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return list;
  }, [validBodyshops, logistics, sortBy, searchQuery, maxTimeFilter]);

  const hasLogistics = Object.keys(logistics).length > 0;

  const handleAddressSelect = (addressData) => {
    if (addressData && addressData.latitude && addressData.longitude) {
      setCustomerLocation({
        lat: addressData.latitude,
        lng: addressData.longitude,
        address: addressData.address || addressData.display_name || ''
      });
      setSelectedBodyshop(null);
      setRoutePoints([]);
    } else {
      setCustomerLocation(null);
    }
  };

  const handleSelectBodyshop = (bodyshop) => {
    setSelectedBodyshop(prev => prev?.id === bodyshop.id ? null : bodyshop);
  };

  const handleClearLocation = () => {
    setCustomerLocation(null);
    setSelectedBodyshop(null);
    setRoutePoints([]);
    setLogistics({});
  };

  return (
    <div className="h-full flex flex-col gap-3" style={{ position: 'relative', zIndex: 1 }}>
      <div className="bg-white dark:bg-gray-900 lg:border lg:border-gray-200 dark:lg:border-gray-800 lg:rounded-xl p-3 lg:p-4 flex-shrink-0">
        <div className="mb-3 flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bodyshop Locator</h1>
            <p className="text-xs text-gray-400 mt-0.5">Find the nearest bodyshop with driving distance and route</p>
          </div>
        </div>

        <AddressLookupInput
          placeholder="Start typing postcode or address (e.g., SW1A 1AA or 10 Downing Street)"
          onChange={handleAddressSelect}
          showSearchButton={true}
        />

        {customerLocation && (
          <div className="mt-3 p-2 glass-inset rounded-lg border border-green-500 border-opacity-30 text-green-600 text-xs flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <span>✓</span>
              <div>
                <p className="font-medium">Location found</p>
                <p className="text-xs mt-0.5">{customerLocation.address}</p>
              </div>
            </div>
            <button onClick={handleClearLocation} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {isLoadingLogistics && (
          <div className="mt-3 p-2 rounded-lg border border-blue-500/30 bg-blue-50/50 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-500 animate-pulse" />
            <p className="text-xs">Calculating driving distances to all bodyshops...</p>
          </div>
        )}

        <div className="mt-3 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
            <span className="text-foreground-muted">Bodyshops ({validBodyshops.length})</span>
          </div>
          {customerLocation && (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
              <span className="text-foreground-muted">Your Location</span>
            </div>
          )}
          {selectedBodyshop && (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
              <span className="text-foreground-muted">Selected</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 lg:border lg:border-gray-200 dark:lg:border-gray-800 lg:rounded-xl p-0 lg:p-3 flex-1 min-h-0" style={{ isolation: 'isolate' }}>
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : validBodyshops.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full text-foreground-muted">
            <MapPinned className="w-12 h-12 mb-4 opacity-50" />
            <p>No bodyshops with location data found.</p>
            <p className="text-sm mt-2">Add bodyshops with addresses to see them on the map.</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-3 h-full">
            {/* Bodyshop list */}
            <div className="lg:w-2/5 lg:max-h-full lg:overflow-y-auto space-y-2 lg:pr-1 order-2 lg:order-1">
              {/* Search + Sort controls */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, town, or postcode..." />
                </div>
                <div className="flex gap-2">
                  <Button variant={sortBy === 'time' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('time')} disabled={!customerLocation || !hasLogistics} className="h-9">
                    <Clock className="w-3.5 h-3.5 mr-1" /> Travel Time
                  </Button>
                  <Button variant={sortBy === 'name' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('name')} className="h-9">
                    Name
                  </Button>
                </div>
              </div>

              {/* Time filter chips */}
              {customerLocation && hasLogistics && (
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: '15 min', value: 15 },
                    { label: '30 min', value: 30 },
                    { label: '45 min', value: 45 },
                    { label: 'No limit', value: null },
                  ].map(chip => (
                    <button key={chip.label} onClick={() => setMaxTimeFilter(chip.value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        maxTimeFilter === chip.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}>
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-2 max-h-[300px] lg:max-h-none overflow-y-auto lg:overflow-visible pr-1">
                {sortedBodyshops.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground p-4">No bodyshops match your filters.</div>
                ) : (
                  sortedBodyshops.map((bodyshop) => {
                    const isSelected = selectedBodyshop?.id === bodyshop.id;
                    const log = logistics[bodyshop.id];
                    return (
                      <div key={bodyshop.id} onClick={() => handleSelectBodyshop(bodyshop)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-semibold text-sm truncate flex-1">{bodyshop.name}</p>
                          <TravelBadge log={log} />
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
            </div>

            {/* Map */}
            <div className="lg:w-3/5 order-1 lg:order-2" style={{ minHeight: '300px', height: '300px', flex: 1 }}>
              <div className="rounded-xl overflow-hidden border h-full">
                <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    subdomains="abcd" maxZoom={20}
                  />
                  <MapCenterUpdater center={mapCenter} zoom={mapZoom} />

                  {customerLocation && (
                    <Marker position={[customerLocation.lat, customerLocation.lng]} icon={customerIcon}>
                      <Tooltip sticky>
                        <div className="text-xs">
                          <p className="font-semibold">Your Location</p>
                          <p className="text-muted-foreground truncate max-w-[200px]">{customerLocation.address}</p>
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
                        eventHandlers={{ click: () => handleSelectBodyshop(bodyshop) }}>
                        <Tooltip sticky>
                          <div className="text-xs">
                            <p className="font-semibold">{bodyshop.name}</p>
                            {log?.duration_text && <p className="text-green-600">{log.duration_text} • {log.distance_text}</p>}
                          </div>
                        </Tooltip>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected bodyshop detail card */}
      {selectedBodyshop && (
        <div className="bg-white dark:bg-gray-900 lg:border lg:border-gray-200 dark:lg:border-gray-800 lg:rounded-xl p-3 flex-shrink-0 border-2 border-primary bg-primary/5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm flex items-center gap-1.5 text-primary mb-2">
                <CheckCircle className="w-4 h-4" /> Selected Bodyshop
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
            <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => setSelectedBodyshop(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
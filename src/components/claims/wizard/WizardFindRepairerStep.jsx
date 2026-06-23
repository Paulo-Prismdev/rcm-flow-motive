import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, Circle, Polyline, Tooltip, useMap } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CheckCircle, Phone, Mail, MapPinned, AlertCircle, Loader,
  Clock, Navigation, Search, X
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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
  const [isLoadingLogistics, setIsLoadingLogistics] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('time');
  const [maxTimeFilter, setMaxTimeFilter] = useState(null);
  const [routePoints, setRoutePoints] = useState([]);

  const validBodyshops = useMemo(() =>
    bodyshops.filter(b =>
      b.latitude && b.longitude &&
      !isNaN(parseFloat(b.latitude)) && !isNaN(parseFloat(b.longitude))
    ), [bodyshops]);

  // ── Fetch distance matrix when client location is available ──
  useEffect(() => {
    if (!clientLocation || validBodyshops.length === 0) return;
    let cancelled = false;

    const fetchLogistics = async () => {
      setIsLoadingLogistics(true);
      try {
        const destinations = validBodyshops.map(b => ({
          lat: parseFloat(b.latitude),
          lng: parseFloat(b.longitude)
        }));
        const response = await base44.functions.invoke('geocodeAddress', {
          action: 'distance_matrix', origin: clientLocation, destinations
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
  }, [clientLocation, validBodyshops]);

  // ── Fetch driving route polyline when a bodyshop is selected ──
  useEffect(() => {
    if (!clientLocation || !selectedBodyshop) {
      setRoutePoints([]);
      return;
    }
    let cancelled = false;

    const fetchRoute = async () => {
      try {
        const response = await base44.functions.invoke('geocodeAddress', {
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

  const radiusInMeters = 30 * 1609.34;
  const hasLogistics = Object.keys(logistics).length > 0;

  return (
    <div className="space-y-3">
      {/* Status messages */}
      {isGeocoding && (
        <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-50/50 flex items-center gap-2">
          <Loader className="w-4 h-4 text-blue-500 animate-spin" />
          <p className="text-xs">Locating client address...</p>
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
      {isLoadingLogistics && (
        <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-50/50 flex items-center gap-2">
          <Navigation className="w-4 h-4 text-blue-500 animate-pulse" />
          <p className="text-xs">Calculating driving distances to all repairers...</p>
        </div>
      )}

      {/* Search + Sort controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, town, or postcode..." className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Button variant={sortBy === 'time' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('time')} disabled={!clientLocation || !hasLogistics} className="h-9">
            <Clock className="w-3.5 h-3.5 mr-1" /> Travel Time
          </Button>
          <Button variant={sortBy === 'name' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('name')} className="h-9">
            Name
          </Button>
        </div>
      </div>

      {/* Time filter chips */}
      {clientLocation && hasLogistics && (
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
              return (
                <div key={bodyshop.id} onClick={() => onSelectBodyshop(bodyshop)}
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

        {/* Map */}
        <div className="lg:col-span-3">
          <div className="rounded-xl overflow-hidden border" style={{ height: '400px', minHeight: '300px' }}>
            <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
              <TileLayer
                attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                subdomains="abcd" maxZoom={20}
              />
              <MapCenterUpdater center={mapCenter} zoom={mapZoom} />

              {clientLocation && (
                <Marker position={[clientLocation.lat, clientLocation.lng]} icon={clientIcon}>
                  <Tooltip sticky>
                    <div className="text-xs">
                      <p className="font-semibold">Client: {claim?.client_name || 'Location'}</p>
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
        <div className="p-3 rounded-xl border-2 border-primary bg-primary/5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm flex items-center gap-1.5 text-primary mb-2">
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
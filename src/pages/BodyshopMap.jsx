import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap, ZoomControl } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Phone, Mail, MapPinned, Loader, Clock, Navigation,
  CheckCircle, X, ArrowLeft, List, Map as MapIcon,
  Settings, Sliders, ChevronUp, ExternalLink
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import AddressLookupInput from '@/components/shared/AddressLookupInput';
import { geocodeAddress } from '@/functions/geocodeAddress';

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
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const tier1Icon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const tier2Icon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const prevNetworkIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const greyIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

function getTierIcon(tier) {
  if (tier === 'TIER 1') return tier1Icon;
  if (tier === 'TIER 2') return tier2Icon;
  if (tier === 'Previously on Network') return prevNetworkIcon;
  return greyIcon;
}

function getTierKey(tier) {
  if (tier === 'TIER 1') return 'TIER 1';
  if (tier === 'TIER 2') return 'TIER 2';
  if (tier === 'Previously on Network') return 'Previously on Network';
  return 'None';
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

function MapCenterUpdater({ center, zoom, mobileView }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);

  // Invalidate size when the map becomes visible (mobile tab switch)
  useEffect(() => {
    if (mobileView === 'map') {
      const t = setTimeout(() => map.invalidateSize(), 100);
      return () => clearTimeout(t);
    }
  }, [mobileView, map]);

  return null;
}

export default function BodyshopMap() {
  const [customerLocation, setCustomerLocation] = useState(null);
  const [selectedBodyshop, setSelectedBodyshop] = useState(null);
  const [logistics, setLogistics] = useState({});
  const [isLoadingLogistics, setIsLoadingLogistics] = useState(false);
  const [routePoints, setRoutePoints] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [maxTimeFilter, setMaxTimeFilter] = useState(null);
  const [mobileView, setMobileView] = useState('map');
  const [showSettings, setShowSettings] = useState(false);
  const [visibleTiers, setVisibleTiers] = useState({
    'TIER 1': true,
    'TIER 2': true,
    'Previously on Network': true,
    'None': true,
  });
  const [mapCenter, setMapCenter] = useState([54.5, -2.0]);
  const [mapZoom, setMapZoom] = useState(7);
  const [geocodedCoords, setGeocodedCoords] = useState({});
  const [isGeocoding, setIsGeocoding] = useState(false);

  const { data: bodyshops = [], isLoading } = useQuery({
    queryKey: ['bodyshops'],
    queryFn: () => base44.entities.Bodyshop.list('-created_date', 500),
  });

  // Resolve coordinates: use stored lat/lng if present, otherwise geocoded address
  const getCoords = (b) => {
    if (!b) return null;
    if (b.latitude && b.longitude &&
      !isNaN(parseFloat(b.latitude)) && !isNaN(parseFloat(b.longitude))) {
      return { lat: parseFloat(b.latitude), lng: parseFloat(b.longitude) };
    }
    return geocodedCoords[b.id] || null;
  };

  // ── Geocode bodyshops that have an address but no stored coordinates ──
  useEffect(() => {
    if (!bodyshops.length) return;
    let cancelled = false;

    const hasStoredCoords = (b) =>
      b.latitude && b.longitude &&
      !isNaN(parseFloat(b.latitude)) && !isNaN(parseFloat(b.longitude));

    const toGeocode = bodyshops.filter(b =>
      !hasStoredCoords(b) && (b.full_address || b.address_line_1 || b.postcode || b.town)
    );

    if (toGeocode.length === 0) return;

    setIsGeocoding(true);

    const run = async () => {
      const results = await Promise.all(
        toGeocode.map(async (b) => {
          const fullAddress = b.full_address ||
            [b.address_line_1, b.address_line_2, b.town, b.county, b.postcode].filter(Boolean).join(', ');
          try {
            const response = await geocodeAddress({ address: fullAddress });
            const data = response?.data || response;
            if (data?.latitude && data?.longitude) {
              return { id: b.id, lat: data.latitude, lng: data.longitude };
            }
          } catch (err) {
            console.error('Geocode failed for bodyshop', b.name, err);
          }
          return null;
        })
      );

      if (cancelled) return;
      const coordsMap = {};
      results.forEach(r => {
        if (r) coordsMap[r.id] = { lat: r.lat, lng: r.lng };
      });
      setGeocodedCoords(coordsMap);
      setIsGeocoding(false);
    };

    run();
    return () => { cancelled = true; };
  }, [bodyshops]);

  const resolvedBodyshops = useMemo(() =>
    bodyshops.filter(b => getCoords(b) !== null),
    [bodyshops, geocodedCoords]);

  // ── Fetch distance matrix when customer location is available ──
  useEffect(() => {
    if (!customerLocation || resolvedBodyshops.length === 0) return;
    let cancelled = false;

    const fetchLogistics = async () => {
      setIsLoadingLogistics(true);
      try {
        const destinations = resolvedBodyshops.map(b => {
          const c = getCoords(b);
          return { lat: c.lat, lng: c.lng };
        });
        const response = await geocodeAddress({
          action: 'distance_matrix', origin: customerLocation, destinations
        });
        const data = response?.data || response;
        if (cancelled) return;

        const logMap = {};
        if (data?.results) {
          data.results.forEach((r, idx) => {
            if (idx < resolvedBodyshops.length) {
              logMap[resolvedBodyshops[idx].id] = r;
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
  }, [customerLocation, resolvedBodyshops, geocodedCoords]);

  // ── Fetch driving route polyline when a bodyshop is selected ──
  useEffect(() => {
    if (!customerLocation || !selectedBodyshop) {
      setRoutePoints([]);
      return;
    }
    let cancelled = false;

    const fetchRoute = async () => {
      try {
        const response = await geocodeAddress({
          action: 'directions',
          origin: customerLocation,
          destination: getCoords(selectedBodyshop)
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
    } else if (resolvedBodyshops.length > 0) {
      const coords = resolvedBodyshops.map(b => getCoords(b));
      const avgLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
      const avgLng = coords.reduce((sum, c) => sum + c.lng, 0) / coords.length;
      setMapCenter([avgLat, avgLng]);
      setMapZoom(7);
    }
  }, [customerLocation, resolvedBodyshops, geocodedCoords]);

  // ── Sorted + filtered bodyshops ──
  const sortedBodyshops = useMemo(() => {
    let list = [...resolvedBodyshops];

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
  }, [resolvedBodyshops, logistics, sortBy, searchQuery, maxTimeFilter, geocodedCoords]);

  const hasLogistics = Object.keys(logistics).length > 0;

  const tierFilteredBodyshops = useMemo(() =>
    sortedBodyshops.filter(b => visibleTiers[getTierKey(b.tier)]),
    [sortedBodyshops, visibleTiers]);

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
    const coords = getCoords(bodyshop);
    if (coords) {
      setMapCenter([coords.lat, coords.lng]);
      setMapZoom(14);
      setMobileView('map');
    }
  };

  const handleClearLocation = () => {
    setCustomerLocation(null);
    setSelectedBodyshop(null);
    setRoutePoints([]);
    setLogistics({});
  };

  const selectedLog = selectedBodyshop ? logistics[selectedBodyshop.id] : null;
  const selectedCoords = selectedBodyshop ? getCoords(selectedBodyshop) : null;

  const directionsUrl = selectedCoords
    ? customerLocation
      ? `https://www.google.com/maps/dir/?api=1&origin=${customerLocation.lat},${customerLocation.lng}&destination=${selectedCoords.lat},${selectedCoords.lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${selectedCoords.lat},${selectedCoords.lng}`
    : '#';

  const tierDots = [
    { key: 'TIER 1', label: 'Tier 1', color: 'bg-green-500', ring: 'ring-green-500' },
    { key: 'TIER 2', label: 'Tier 2', color: 'bg-orange-400', ring: 'ring-orange-400' },
    { key: 'Previously on Network', label: 'Prev. Network', color: 'bg-red-500', ring: 'ring-red-500' },
  ];

  return (
    <div className="h-full relative overflow-hidden" style={{ zIndex: 1 }}>
      {/* ── FULL-SCREEN MAP ── */}
      <div className="absolute inset-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : resolvedBodyshops.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full text-foreground-muted p-6 text-center">
            <MapPinned className="w-12 h-12 mb-4 opacity-50" />
            <p>No bodyshops with address data found.</p>
            <p className="text-sm mt-2">Add bodyshops with an address to see them on the map.</p>
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; Google Maps'
              url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              subdomains={['mt0','mt1','mt2','mt3']}
              maxZoom={20}
            />
            <ZoomControl position="bottomright" />
            <MapCenterUpdater center={mapCenter} zoom={mapZoom} mobileView={mobileView} />

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

            {tierFilteredBodyshops.map((bodyshop) => {
              const coords = getCoords(bodyshop);
              if (!coords) return null;
              const log = logistics[bodyshop.id];
              return (
                <Marker
                  key={bodyshop.id}
                  position={[coords.lat, coords.lng]}
                  icon={selectedBodyshop?.id === bodyshop.id ? bodyshopSelectedIcon : getTierIcon(bodyshop.tier)}
                  eventHandlers={{ click: () => handleSelectBodyshop(bodyshop) }}
                >
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
        )}
      </div>

      {/* ── FLOATING SEARCH PILL (top) ── */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center gap-2">
        <button
          onClick={() => window.history.back()}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-border flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 shadow-lg rounded-full border border-border overflow-hidden">
          <AddressLookupInput
            placeholder="Search postcode or address..."
            onChange={handleAddressSelect}
            showSearchButton={false}
          />
        </div>
        <button
          onClick={() => setShowSettings(s => !s)}
          className={`flex-shrink-0 w-10 h-10 rounded-full shadow-lg border flex items-center justify-center transition-colors ${
            showSettings
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-border hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>

      {/* ── SETTINGS PANEL (collapsible) ── */}
      {showSettings && (
        <div className="absolute top-16 left-3 right-3 z-[999] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-border p-3 space-y-3">
          {/* List/Map toggle */}
          <div className="flex rounded-lg bg-muted p-1">
            <button
              onClick={() => setMobileView('list')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                mobileView === 'list' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button
              onClick={() => setMobileView('map')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                mobileView === 'map' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" /> Map
            </button>
          </div>

          {/* Text search */}
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, town, or postcode..."
            className="h-9"
          />

          {/* Sort + Time filters */}
          <div className="flex items-center gap-2">
            <Button
              variant={sortBy === 'time' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('time')}
              disabled={!customerLocation || !hasLogistics}
              className="h-8 flex-1"
            >
              <Clock className="w-3 h-3" /> Travel
            </Button>
            <Button
              variant={sortBy === 'name' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('name')}
              className="h-8 flex-1"
            >
              Name
            </Button>
          </div>

          {customerLocation && hasLogistics && (
            <div className="flex gap-1.5 flex-wrap">
              {[
                { label: '15m', value: 15 },
                { label: '30m', value: 30 },
                { label: '45m', value: 45 },
                { label: 'All', value: null },
              ].map(chip => (
                <button
                  key={chip.label}
                  onClick={() => setMaxTimeFilter(chip.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    maxTimeFilter === chip.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* "No tier" toggle for desktop parity */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground">
            <Switch
              checked={visibleTiers['None']}
              onCheckedChange={(checked) => setVisibleTiers(prev => ({ ...prev, 'None': checked }))}
              className="scale-75 origin-left"
            />
            Show un-tiered bodyshops
          </label>

          {customerLocation && (
            <button
              onClick={handleClearLocation}
              className="w-full text-xs text-red-500 font-medium py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              Clear location
            </button>
          )}
        </div>
      )}

      {/* ── STATUS INDICATORS (below search pill) ── */}
      {(isLoadingLogistics || isGeocoding) && (
        <div className={`absolute z-[998] left-3 ${showSettings ? 'top-[280px]' : 'top-16'}`}>
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-full shadow-md px-3 py-1.5 flex items-center gap-2">
            {isLoadingLogistics ? (
              <>
                <Navigation className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                <span className="text-xs">Calculating distances...</span>
              </>
            ) : (
              <>
                <MapPinned className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span className="text-xs">Resolving addresses...</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TIER TOGGLE DOTS (floating on map) ── */}
      <div className={`absolute z-[998] right-3 transition-all ${selectedBodyshop ? 'bottom-[340px]' : 'bottom-3'}`}>
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-full shadow-lg p-1.5 flex flex-col gap-2">
          {tierDots.map(t => (
            <button
              key={t.key}
              onClick={() => setVisibleTiers(prev => ({ ...prev, [t.key]: !prev[t.key] }))}
              title={t.label}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                visibleTiers[t.key] ? 'opacity-100' : 'opacity-30'
              }`}
            >
              <div className={`w-5 h-5 rounded-full ${t.color} ring-2 ${visibleTiers[t.key] ? t.ring : 'ring-transparent'} ring-offset-1 ring-offset-white dark:ring-offset-gray-800`}></div>
            </button>
          ))}
        </div>
      </div>

      {/* ── MOBILE LIST VIEW (when mobileView='list') ── */}
      {mobileView === 'list' && !isLoading && resolvedBodyshops.length > 0 && (
        <div className="absolute inset-0 z-[997] bg-white dark:bg-gray-900 pt-16 pb-4 px-3 overflow-y-auto">
          <div className="space-y-2">
            {tierFilteredBodyshops.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground p-4">
                No bodyshops match your filters. Try enabling more tiers.
              </div>
            ) : (
              tierFilteredBodyshops.map((bodyshop) => {
                const isSelected = selectedBodyshop?.id === bodyshop.id;
                const log = logistics[bodyshop.id];
                return (
                  <div
                    key={bodyshop.id}
                    onClick={() => {
                      handleSelectBodyshop(bodyshop);
                      setMobileView('map');
                    }}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
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
      )}

      {/* ── BOTTOM SHEET: Selected bodyshop details ── */}
      {selectedBodyshop && (
        <div className="absolute inset-0 z-[1100] flex items-end" onClick={() => setSelectedBodyshop(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl max-h-[60vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 pt-2 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-700"></div>
            </div>
            {/* Close button */}
            <button
              onClick={() => setSelectedBodyshop(null)}
              className="absolute top-2 right-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="px-4 pb-6 space-y-3">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    selectedBodyshop.tier === 'TIER 1' ? 'bg-green-100 text-green-700' :
                    selectedBodyshop.tier === 'TIER 2' ? 'bg-orange-100 text-orange-700' :
                    selectedBodyshop.tier === 'Previously on Network' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {selectedBodyshop.tier || 'No Tier'}
                  </span>
                  {selectedLog && <TravelBadge log={selectedLog} />}
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedBodyshop.name}</h3>
                {selectedBodyshop.group_name && (
                  <p className="text-xs text-muted-foreground">{selectedBodyshop.group_name}</p>
                )}
              </div>

              {/* Address */}
              <div className="flex items-start gap-2 text-sm">
                <MapPinned className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="text-gray-700 dark:text-gray-300">
                  {selectedBodyshop.address_line_1 && <p>{selectedBodyshop.address_line_1}</p>}
                  {selectedBodyshop.address_line_2 && <p>{selectedBodyshop.address_line_2}</p>}
                  {(selectedBodyshop.town || selectedBodyshop.county) && (
                    <p>{[selectedBodyshop.town, selectedBodyshop.county].filter(Boolean).join(', ')}</p>
                  )}
                  {selectedBodyshop.postcode && <p className="font-medium">{selectedBodyshop.postcode}</p>}
                </div>
              </div>

              {/* Distance */}
              {selectedLog && (
                <div className="flex items-center gap-2 text-sm">
                  <Navigation className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {selectedLog.duration_text} drive • {selectedLog.distance_text}
                  </span>
                </div>
              )}

              {/* Phone */}
              {selectedBodyshop.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <a href={`tel:${selectedBodyshop.phone}`} className="text-gray-700 dark:text-gray-300 hover:text-primary">
                    {selectedBodyshop.phone}
                  </a>
                </div>
              )}

              {/* Certifications */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedBodyshop.acg_signed_up === 'Yes' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700">
                    <CheckCircle className="w-3 h-3 mr-1" /> ACG
                  </span>
                )}
                {selectedBodyshop.bs10125_certified === 'Yes' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700">
                    <CheckCircle className="w-3 h-3 mr-1" /> BS10125
                  </span>
                )}
                {selectedBodyshop.audatex_code && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                    Audatex
                  </span>
                )}
                {selectedBodyshop.ico_number && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                    ICO Reg
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {selectedBodyshop.phone ? (
                  <a
                    href={`tel:${selectedBodyshop.phone}`}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </a>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs font-medium">
                    <Phone className="w-4 h-4" />
                    Call
                  </div>
                )}
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  Directions
                </a>
                <a
                  href={selectedBodyshop.web_address || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    selectedBodyshop.web_address
                      ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                  Onboard
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
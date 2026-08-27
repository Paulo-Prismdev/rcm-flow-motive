import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Polyline, Circle, GeoJSON, Polygon, Tooltip, useMap, ZoomControl } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Phone, Mail, MapPinned, Loader, Clock, Navigation,
  CheckCircle, X, ArrowLeft, List, Map as MapIcon,
  Settings, Sliders, ChevronUp, ExternalLink, Package
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import AddressLookupInput from '@/components/shared/AddressLookupInput';
import { geocodeAddress } from '@/functions/geocodeAddress';
import { SUPPLIER_COVERAGE_AREAS, milesToMeters } from '@/components/map/supplierCoverageData';
import { GREAT_BRITAIN_GEOJSON } from '@/components/map/greatBritainOutline';
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

const customerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

// ── Custom SVG pin icons (per-tier colours) ──
function makePinIcon(color, selected = false) {
  const w = 25, h = 41;
  const strokeAttr = selected ? 'stroke="white" stroke-width="3"' : '';
  const filter = selected ? 'filter:drop-shadow(0 0 6px rgba(0,0,0,0.45));' : '';
  const html = `<svg width="${w}" height="${h}" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg" style="${filter}">
    <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.75 12.5 28.5 12.5 28.5S25 21.25 25 12.5C25 5.6 19.4 0 12.5 0z" fill="${color}" ${strokeAttr}/>
    <circle cx="12.5" cy="12.5" r="5" fill="white"/>
  </svg>`;
  return L.divIcon({
    className: 'tier-pin-marker',
    html,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [1, -34],
  });
}

const TIER_COLORS = {
  'TIER 1': '#141d48',
  'TIER 2': '#00ff01',
  'Solution': '#ce7725',
  'QAC': '#303ebb',
};
const NO_TIER_COLOR = '#9ca3af';

function getTierIcon(bodyshop, selected = false) {
  if (bodyshop.map_group === 'Solution') return makePinIcon(TIER_COLORS.Solution, selected);
  if (bodyshop.map_group === 'QAC') return makePinIcon(TIER_COLORS.QAC, selected);
  if (bodyshop.tier === 'TIER 1') return makePinIcon(TIER_COLORS['TIER 1'], selected);
  if (bodyshop.tier === 'TIER 2') return makePinIcon(TIER_COLORS['TIER 2'], selected);
  return makePinIcon(NO_TIER_COLOR, selected);
}

function getTierKey(tier) {
  if (tier === 'TIER 1') return 'TIER 1';
  if (tier === 'TIER 2') return 'TIER 2';
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
  const [isLoadingDistance, setIsLoadingDistance] = useState(false);
  const [routePoints, setRoutePoints] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [showSettings, setShowSettings] = useState(false);
  const [listExpanded, setListExpanded] = useState(false);
  const [visibleTiers, setVisibleTiers] = useState({
    'TIER 1': true,
    'TIER 2': true,
    'None': true,
    'Solution': true,
    'QAC': true,
  });
  const [mapCenter, setMapCenter] = useState([54.5, -2.0]);
  const [mapZoom, setMapZoom] = useState(7);
  const [geocodedCoords, setGeocodedCoords] = useState({});
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showSupplierPanel, setShowSupplierPanel] = useState(false);
  const [enabledSuppliers, setEnabledSuppliers] = useState(
    () => Object.fromEntries(SUPPLIER_COVERAGE_AREAS.map(s => [s.supplier_name, false]))
  );

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

  // ── Pre-select bodyshop from URL param (?bodyshop_id=...) ──
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetId = urlParams.get('bodyshop_id');
    if (!targetId || !bodyshops.length) return;
    const target = bodyshops.find(b => b.id === targetId);
    if (!target) return;
    setSelectedBodyshop(target);
    const coords = getCoords(target);
    if (coords) {
      setMapCenter([coords.lat, coords.lng]);
      setMapZoom(14);
    }
    if (window.history.replaceState) {
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [bodyshops, geocodedCoords]);

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

  // ── Fetch distance for a single bodyshop on demand (when user clicks a pin) ──
  const fetchDistanceForBodyshop = async (bodyshop) => {
    if (!customerLocation || !bodyshop) return;
    const coords = getCoords(bodyshop);
    if (!coords) return;
    if (logistics[bodyshop.id]) return; // already fetched

    setIsLoadingDistance(true);
    try {
      const response = await geocodeAddress({
        action: 'distance_matrix',
        origin: customerLocation,
        destinations: [{ lat: coords.lat, lng: coords.lng }]
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

    if (sortBy === 'distance' && customerLocation) {
      list.sort((a, b) => {
        const aCoords = getCoords(a);
        const bCoords = getCoords(b);
        if (!aCoords || !bCoords) return 0;
        const aDist = haversineDistance(customerLocation.lat, customerLocation.lng, aCoords.lat, aCoords.lng);
        const bDist = haversineDistance(customerLocation.lat, customerLocation.lng, bCoords.lat, bCoords.lng);
        return aDist - bDist;
      });
    } else {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return list;
  }, [resolvedBodyshops, sortBy, searchQuery, customerLocation, geocodedCoords]);

  const hasLogistics = Object.keys(logistics).length > 0;

  const tierFilteredBodyshops = useMemo(() =>
    sortedBodyshops.filter(b => {
      // A bodyshop assigned to a map group (Solution/QAC) is controlled by its
      // group toggle alone — independent of the tier toggles. Bodyshops without
      // a group are controlled by their tier toggle.
      if (b.map_group) return visibleTiers[b.map_group] !== false;
      return visibleTiers[getTierKey(b.tier)] !== false;
    }),
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
    fetchDistanceForBodyshop(bodyshop);
  };

  const handleSelectBodyshopFromList = (bodyshop) => {
    setSelectedBodyshop(prev => prev?.id === bodyshop.id ? null : bodyshop);
    fetchDistanceForBodyshop(bodyshop);
    const coords = getCoords(bodyshop);
    if (coords) {
      setMapCenter([coords.lat, coords.lng]);
      setMapZoom(14);
      setListExpanded(false);
    }
  };

  const handleClearLocation = () => {
    setCustomerLocation(null);
    setSelectedBodyshop(null);
    setRoutePoints([]);
    setLogistics({});
  };

  const handleSetGroup = async (bodyshop, group) => {
    const newGroup = bodyshop.map_group === group ? '' : group;
    try {
      await base44.entities.Bodyshop.update(bodyshop.id, { map_group: newGroup });
      // Update local state so the map reflects the change immediately
      const updated = { ...bodyshop, map_group: newGroup };
      setSelectedBodyshop(updated);
    } catch (err) {
      console.error('Failed to update group:', err);
    }
  };

  const selectedLog = selectedBodyshop ? logistics[selectedBodyshop.id] : null;
  const selectedCoords = selectedBodyshop ? getCoords(selectedBodyshop) : null;

  const directionsUrl = selectedCoords
    ? customerLocation
      ? `https://www.google.com/maps/dir/?api=1&origin=${customerLocation.lat},${customerLocation.lng}&destination=${selectedCoords.lat},${selectedCoords.lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${selectedCoords.lat},${selectedCoords.lng}`
    : '#';

  const tierDots = [
    { key: 'TIER 1', label: 'Tier 1', color: '#141d48' },
    { key: 'TIER 2', label: 'Tier 2', color: '#00ff01' },
    { key: 'Solution', label: 'Solution', color: '#ce7725' },
    { key: 'QAC', label: 'QAC', color: '#303ebb' },
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
            attributionControl={false}
          >
            <TileLayer
              attribution='&copy; Google Maps'
              url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              subdomains={['mt0','mt1','mt2','mt3']}
              maxZoom={20}
            />

            <MapCenterUpdater center={mapCenter} zoom={mapZoom} />

            {/* ── Supplier coverage: nationwide = GB landmass; coverage_polygon = single area; else = circles ── */}
            {SUPPLIER_COVERAGE_AREAS.filter(s => enabledSuppliers[s.supplier_name] && s.nationwide).map((supplier) => (
              <GeoJSON
                key={`gb-${supplier.supplier_name}`}
                data={GREAT_BRITAIN_GEOJSON}
                style={{
                  color: supplier.color,
                  fillColor: supplier.color,
                  fillOpacity: 0.18,
                  weight: 1.5,
                  opacity: 0.6,
                }}
              />
            ))}
            {SUPPLIER_COVERAGE_AREAS.filter(s => enabledSuppliers[s.supplier_name] && s.coverage_polygon).map((supplier) => (
              <Polygon
                key={`poly-${supplier.supplier_name}`}
                positions={supplier.coverage_polygon}
                pathOptions={{
                  color: supplier.color,
                  fillColor: supplier.color,
                  fillOpacity: 0.12,
                  weight: 2,
                  opacity: 0.6,
                }}
              />
            ))}
            {SUPPLIER_COVERAGE_AREAS.filter(s => enabledSuppliers[s.supplier_name] && !s.nationwide && !s.coverage_polygon).map((supplier) =>
              supplier.sites.map((site, idx) => (
                <Circle
                  key={`${supplier.supplier_name}-${idx}`}
                  center={[site.lat, site.lng]}
                  radius={milesToMeters(supplier.radius_miles)}
                  pathOptions={{
                    color: supplier.color,
                    fillColor: supplier.color,
                    fillOpacity: 0.08,
                    weight: 2,
                    opacity: 0.5,
                  }}
                >
                  <Tooltip sticky>
                    <div className="text-xs">
                      <p className="font-semibold">{supplier.supplier_name} — {site.location}</p>
                      <p className="text-muted-foreground">{site.site_name}</p>
                      <p className="text-muted-foreground">{supplier.radius_miles} mile coverage</p>
                    </div>
                  </Tooltip>
                </Circle>
              ))
            )}

            {/* ── Supplier site markers (skip for nationwide) ── */}
            {SUPPLIER_COVERAGE_AREAS.filter(s => enabledSuppliers[s.supplier_name] && !s.nationwide).map((supplier) =>
              supplier.sites.map((site, idx) => (
                <Marker
                  key={`supplier-marker-${supplier.supplier_name}-${idx}`}
                  position={[site.lat, site.lng]}
                  icon={new L.divIcon({
                    className: 'supplier-marker',
                    html: `<div style="background-color:${supplier.color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
                    iconSize: [14, 14],
                    iconAnchor: [7, 7],
                  })}
                >
                  <Tooltip sticky>
                    <div className="text-xs">
                      <p className="font-semibold">{site.site_name}</p>
                      <p className="text-muted-foreground">{site.location}</p>
                      <p className="text-muted-foreground truncate max-w-[180px]">{site.address}</p>
                    </div>
                  </Tooltip>
                </Marker>
              ))
            )}

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
                  icon={getTierIcon(bodyshop, selectedBodyshop?.id === bodyshop.id)}
                  eventHandlers={{ click: () => handleSelectBodyshop(bodyshop) }}
                >
                  <Tooltip sticky>
                    <div className="text-xs">
                      <p className="font-semibold">{bodyshop.name}{[bodyshop.tier, bodyshop.map_group].filter(Boolean).join(', ') ? ` (${[bodyshop.tier, bodyshop.map_group].filter(Boolean).join(', ')})` : ''}</p>
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
        <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 shadow-lg rounded-full border border-border overflow-visible">
          <AddressLookupInput
            placeholder="Search postcode or address..."
            onChange={handleAddressSelect}
            showSearchButton={false}
          />
        </div>
        <button
          onClick={() => setShowSupplierPanel(s => !s)}
          className={`relative z-[1001] flex-shrink-0 w-10 h-10 rounded-full shadow-lg border flex items-center justify-center transition-colors ${
            showSupplierPanel || Object.values(enabledSuppliers).some(Boolean)
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-border hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
          title="Supplier coverage areas"
        >
          <Package className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowSettings(s => !s)}
          className={`relative z-[1001] flex-shrink-0 w-10 h-10 rounded-full shadow-lg border flex items-center justify-center transition-colors ${
            showSettings
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-border hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>

      {/* ── SUPPLIER COVERAGE PANEL ── */}
      {showSupplierPanel && (
        <div className="absolute top-16 right-3 z-[999] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-border p-2.5 space-y-2 w-[210px]">
          <p className="text-xs font-semibold text-muted-foreground">Supplier Coverage</p>
          {SUPPLIER_COVERAGE_AREAS.map(supplier => (
            <div key={supplier.supplier_name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-white shadow flex-shrink-0" style={{ backgroundColor: supplier.color }} />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-200 flex-1">{supplier.supplier_name}</span>
              <span className="text-[10px] text-muted-foreground">{supplier.nationwide ? 'Nationwide' : `${supplier.radius_miles}mi`}</span>
              <Switch
                checked={!!enabledSuppliers[supplier.supplier_name]}
                onCheckedChange={(checked) =>
                  setEnabledSuppliers(prev => ({ ...prev, [supplier.supplier_name]: checked }))
                }
              />
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">
            Toggle suppliers on/off to show their coverage areas on the map.
          </p>
        </div>
      )}

      {/* ── SETTINGS PANEL (tier filters) ── */}
      {showSettings && (
        <div className="absolute top-16 left-3 z-[999] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-border p-3 space-y-2 w-[220px]">
          <p className="text-xs font-medium text-muted-foreground">Filter by tier</p>
          <div className="flex flex-col gap-1.5">
            {[...tierDots.filter(t => t.key !== 'Solution' && t.key !== 'QAC'), { key: 'None', label: 'No Tier', color: '#9ca3af' }].map(t => (
              <button
                key={t.key}
                onClick={() => setVisibleTiers(prev => ({ ...prev, [t.key]: !prev[t.key] }))}
                className={`flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-full bg-muted/50 border border-border transition-all ${
                  visibleTiers[t.key] ? 'opacity-100' : 'opacity-40'
                }`}
              >
                <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: t.color }}></div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{t.label}</span>
              </button>
            ))}
          </div>
          <div className="pt-1 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground pb-1.5">Groups</p>
            <div className="flex flex-col gap-1.5">
              {tierDots.filter(t => t.key === 'Solution' || t.key === 'QAC').map(t => (
                <button
                  key={t.key}
                  onClick={() => setVisibleTiers(prev => ({ ...prev, [t.key]: !prev[t.key] }))}
                  className={`flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-full bg-muted/50 border border-border transition-all ${
                    visibleTiers[t.key] ? 'opacity-100' : 'opacity-40'
                  }`}
                >
                  <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: t.color }}></div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── STATUS INDICATORS (below search pill) ── */}
      {(isLoadingDistance || isGeocoding) && (
        <div className="absolute z-[998] left-3 top-16">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-full shadow-md px-3 py-1.5 flex items-center gap-2">
            {isLoadingDistance ? (
              <>
                <Navigation className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                <span className="text-xs">Calculating distance...</span>
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



      {/* ── BOTTOM LIST SHEET (drag up to expand) ── */}
      {!isLoading && resolvedBodyshops.length > 0 && (
        <div className={`absolute left-0 right-0 bottom-0 z-[997] bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl border-t border-border transition-all duration-300 overflow-hidden ${
          listExpanded ? 'h-[50vh]' : 'h-[52px]'
        }`}>
          <button
            onClick={() => setListExpanded(!listExpanded)}
            className="w-full flex items-center justify-center gap-2 pt-2 pb-1.5 touch-manipulation"
          >
            <ChevronUp className={`w-5 h-5 text-gray-400 transition-transform ${listExpanded ? '' : 'rotate-180'}`} />
            <span className="text-xs font-medium text-muted-foreground">
              {listExpanded ? 'Hide list' : `${tierFilteredBodyshops.length} bodyshops`}
            </span>
            <span className="text-[8px] text-gray-300 dark:text-gray-500">© Google Maps</span>
          </button>
          {listExpanded && (
            <div className="overflow-y-auto px-3 pb-4" style={{ height: 'calc(50vh - 52px)' }}>
              <div className="space-y-2">
                {tierFilteredBodyshops.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground p-4">
                    No bodyshops match your filters.
                  </div>
                ) : (
                  tierFilteredBodyshops.map((bodyshop) => {
                    const isSelected = selectedBodyshop?.id === bodyshop.id;
                    const log = logistics[bodyshop.id];
                    const coords = getCoords(bodyshop);
                    const haversineMiles = (customerLocation && coords)
                      ? haversineDistance(customerLocation.lat, customerLocation.lng, coords.lat, coords.lng)
                      : null;
                    return (
                      <div
                        key={bodyshop.id}
                        onClick={() => handleSelectBodyshopFromList(bodyshop)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
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
            </div>
          )}
        </div>
      )}

      {/* ── BOTTOM SHEET: Selected bodyshop details ── */}
      {selectedBodyshop && (
        <div className="absolute inset-0 z-[1100] flex items-end" onClick={() => setSelectedBodyshop(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl max-h-[30vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="bg-white dark:bg-gray-900 pt-1.5 pb-0.5 flex justify-center">
              <div className="w-8 h-1 rounded-full bg-gray-300 dark:bg-gray-700"></div>
            </div>
            {/* Close button */}
            <button
              onClick={() => setSelectedBodyshop(null)}
              className="absolute top-1.5 right-2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-3 pb-2 space-y-1">
              {/* Header */}
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                    selectedBodyshop.tier === 'TIER 1' ? 'bg-green-100 text-green-700' :
                    selectedBodyshop.tier === 'TIER 2' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {selectedBodyshop.tier || 'No Tier'}
                  </span>
                  {selectedLog && <TravelBadge log={selectedLog} />}
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{selectedBodyshop.name}</h3>
                {selectedBodyshop.group_name && (
                  <p className="text-[10px] text-muted-foreground truncate">{selectedBodyshop.group_name}</p>
                )}
              </div>

              {/* Address */}
              <div className="flex items-start gap-1.5 text-xs">
                <MapPinned className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="text-gray-700 dark:text-gray-300 truncate">
                  {selectedBodyshop.address_line_1 && <span>{selectedBodyshop.address_line_1}, </span>}
                  {selectedBodyshop.town && <span>{selectedBodyshop.town} </span>}
                  {selectedBodyshop.postcode && <span className="font-medium">{selectedBodyshop.postcode}</span>}
                </div>
              </div>

              {/* Distance */}
              {selectedLog && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Navigation className="w-3 h-3 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {selectedLog.duration_text} • {selectedLog.distance_text}
                  </span>
                </div>
              )}

              {/* Certifications + Group badge */}
              <div className="flex flex-wrap gap-1">
                {selectedBodyshop.acg_signed_up === 'Yes' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
                    <CheckCircle className="w-2.5 h-2.5 mr-0.5" /> ACG
                  </span>
                )}
                {selectedBodyshop.bs10125_certified === 'Yes' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
                    <CheckCircle className="w-2.5 h-2.5 mr-0.5" /> BS10125
                  </span>
                )}
                {selectedBodyshop.audatex_code && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                    Audatex
                  </span>
                )}
                {selectedBodyshop.map_group && (
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    selectedBodyshop.map_group === 'Solution' ? 'bg-violet-100 text-violet-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {selectedBodyshop.map_group}
                  </span>
                )}
              </div>

              {/* Group assignment */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] font-medium text-muted-foreground">Group:</span>
                {['Solution', 'QAC'].map(g => (
                  <button
                    key={g}
                    onClick={() => handleSetGroup(selectedBodyshop, g)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                      selectedBodyshop.map_group === g
                        ? g === 'Solution'
                          ? 'bg-violet-500 text-white border-violet-500'
                          : 'bg-yellow-400 text-white border-yellow-400'
                        : 'bg-transparent text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {g}
                  </button>
                ))}
                {selectedBodyshop.map_group && (
                  <button
                    onClick={() => handleSetGroup(selectedBodyshop, selectedBodyshop.map_group)}
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-border text-muted-foreground hover:bg-muted transition-all"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Action button */}
              {selectedBodyshop.phone && (
                <a
                  href={`tel:${selectedBodyshop.phone}`}
                  className="flex w-full items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call {selectedBodyshop.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Loader, Search, X } from 'lucide-react';
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

// Custom icon for customer (red)
const customerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function BodyshopMap() {
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerLocation, setCustomerLocation] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const suggestionsTimeout = useRef(null);
  const inputRef = useRef(null);

  const { data: bodyshops = [], isLoading } = useQuery({
    queryKey: ['bodyshops'],
    queryFn: () => base44.entities.Bodyshop.list(),
  });

  // Filter bodyshops that have valid coordinates
  const validBodyshops = bodyshops.filter(b => 
    b.latitude && b.longitude && 
    !isNaN(b.latitude) && !isNaN(b.longitude)
  );

  // Fetch address suggestions as user types
  const fetchSuggestions = async (searchText) => {
    if (!searchText || searchText.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoadingSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchText)}&format=json&addressdetails=1&limit=5&countrycodes=gb`,
        {
          headers: {
            'User-Agent': 'ART-TEC-One-App/1.0'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } else {
        console.error('Suggestions API error:', response.status, response.statusText);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.log('Suggestions fetch failed:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Debounced search for suggestions
  const handleAddressChange = (value) => {
    setCustomerAddress(value);
    setError(null);
    setShowSuggestions(true);

    if (suggestionsTimeout.current) {
      clearTimeout(suggestionsTimeout.current);
    }

    suggestionsTimeout.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  // Select a suggestion
  const handleSelectSuggestion = (suggestion) => {
    setCustomerAddress(suggestion.display_name);
    setShowSuggestions(false);
    setSuggestions([]);
    
    setCustomerLocation({
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon),
      address: suggestion.display_name,
      display_name: suggestion.display_name
    });
    setError(null);
  };

  const handleGeocodeCustomer = async () => {
    if (!customerAddress || customerAddress.trim().length < 3) {
      setError("Please enter a valid address or postcode");
      return;
    }

    setIsGeocoding(true);
    setError(null);
    setShowSuggestions(false);

    console.log(`Manual geocoding: "${customerAddress}"`);
    
    try {
      const result = await base44.functions.invoke('geocodeAddress', {
        address: customerAddress
      });

      console.log('Geocode result:', result);

      if (result && result.latitude && result.longitude) {
        setCustomerLocation({
          latitude: result.latitude,
          longitude: result.longitude,
          address: customerAddress,
          display_name: result.display_name || customerAddress
        });
        setError(null);
        console.log('✓ Location found');
      } else {
        console.log('✗ No coordinates in response');
        setError("Address not found. Please try a different format or check the spelling.");
        setCustomerLocation(null);
      }
    } catch (error) {
      console.log("Geocoding error:", error);
      
      let errorMessage = "Unable to locate address. ";
      
      if (error.response?.status === 429 || error.message?.includes('429')) {
        errorMessage = "Too many searches. Please wait a moment and try again.";
      } else if (error.response?.status === 503 || error.message?.includes('503')) {
        errorMessage = "Geocoding service is temporarily unavailable. Please try again in a moment.";
      } else if (error.response?.status === 404 || error.message?.includes('404')) {
        errorMessage = "Address not found. Please check the address and try again.";
      } else if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
        errorMessage = "Request timed out. Please check your internet connection and try again.";
      } else if (error.message?.includes('Network')) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else {
        errorMessage = "An error occurred while searching. Please try again.";
      }
      
      setError(errorMessage);
      setCustomerLocation(null);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Close suggestions when clicking outside the input area
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate center of map based on available markers
  const getMapCenter = () => {
    if (customerLocation) {
      return [customerLocation.latitude, customerLocation.longitude];
    }
    if (validBodyshops.length > 0) {
      const avgLat = validBodyshops.reduce((sum, b) => sum + b.latitude, 0) / validBodyshops.length;
      const avgLng = validBodyshops.reduce((sum, b) => sum + b.longitude, 0) / validBodyshops.length;
      return [avgLat, avgLng];
    }
    return [54.5, -2.0];
  };

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="glass p-4 flex-shrink-0">
        <div className="mb-3">
          <h1 className="text-xl font-bold">Bodyshop Locator</h1>
          <p className="text-xs text-foreground-muted mt-1">Find the nearest bodyshop using postcode or address</p>
        </div>

        <div className="flex gap-2 relative" ref={inputRef}>
          <div className="flex-1 relative" style={{ zIndex: 1000 }}>
            <Input
              placeholder="Start typing postcode or address (e.g., SW1A 1AA or 10 Downing Street)"
              value={customerAddress}
              onChange={(e) => handleAddressChange(e.target.value)}
              className="glass-inset text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !showSuggestions) {
                  handleGeocodeCustomer();
                } else if (e.key === 'Escape') {
                  setShowSuggestions(false);
                }
              }}
              disabled={isGeocoding}
            />
            
            {customerAddress && (
              <button
                onClick={() => {
                  setCustomerAddress('');
                  setSuggestions([]);
                  setShowSuggestions(false);
                  setCustomerLocation(null);
                  setError(null);
                  setIsLoadingSuggestions(false);
                  if (suggestionsTimeout.current) {
                    clearTimeout(suggestionsTimeout.current);
                  }
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                style={{ zIndex: 10 }}
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {showSuggestions && suggestions.length > 0 && (
              <div 
                className="absolute w-full mt-2 glass-elevated rounded-lg shadow-lg max-h-60 overflow-y-auto"
                style={{ zIndex: 9999 }}
              >
                {isLoadingSuggestions && (
                  <div className="p-3 text-center text-xs text-foreground-muted">
                    <Loader className="w-4 h-4 animate-spin inline mr-2" />
                    Searching...
                  </div>
                )}
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full text-left px-3 py-2 hover:bg-surface-hover transition-colors border-b border-border last:border-b-0 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{suggestion.display_name}</p>
                        {suggestion.address && (
                          <p className="text-xs text-foreground-muted mt-0.5">
                            {suggestion.address.postcode || suggestion.address.town || ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <Button
            onClick={handleGeocodeCustomer}
            disabled={isGeocoding || !customerAddress || customerAddress.trim().length < 3}
            className="glass-button px-4 py-2 flex items-center gap-2 text-accent text-sm"
          >
            {isGeocoding ? (
              <><Loader className="w-4 h-4 animate-spin" /> Locating...</>
            ) : (
              <><Search className="w-4 h-4" /> Find</>
            )}
          </Button>
        </div>

        {error && (
          <div className="mt-3 p-2 glass-inset rounded-lg border border-orange-500 border-opacity-30 text-orange-600 text-xs flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {customerLocation && (
          <div className="mt-3 p-2 glass-inset rounded-lg border border-green-500 border-opacity-30 text-green-600 text-xs flex items-start gap-2">
            <span>✓</span>
            <div>
              <p className="font-medium">Location found</p>
              <p className="text-xs mt-0.5">{customerLocation.display_name}</p>
            </div>
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
              <span className="text-foreground-muted">Customer Location</span>
            </div>
          )}
        </div>
      </div>

      <div className="glass p-3 flex-1 min-h-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : validBodyshops.length === 0 && !customerLocation ? (
          <div className="flex flex-col justify-center items-center h-full text-foreground-muted">
            <MapPin className="w-12 h-12 mb-4 opacity-50" />
            <p>No bodyshops with location data found.</p>
            <p className="text-sm mt-2">Add bodyshops with addresses to see them on the map.</p>
          </div>
        ) : (
          <MapContainer 
            center={getMapCenter()} 
            zoom={customerLocation ? 12 : 7} 
            style={{ height: '100%', width: '100%', borderRadius: '12px' }}
            className="glass-inset"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              maxZoom={20}
            />
            
            {validBodyshops.map((bodyshop) => (
              <Marker 
                key={bodyshop.id} 
                position={[bodyshop.latitude, bodyshop.longitude]}
                icon={bodyshopIcon}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-blue-600">{bodyshop.name}</h3>
                    <p className="text-sm mt-2"><strong>Contact:</strong> {bodyshop.contact_name}</p>
                    <p className="text-sm"><strong>Phone:</strong> {bodyshop.phone}</p>
                    <p className="text-sm"><strong>Email:</strong> {bodyshop.email}</p>
                    {bodyshop.address_line_1 && (
                      <p className="text-sm mt-2">{bodyshop.address_line_1}, {bodyshop.town}, {bodyshop.postcode}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {customerLocation && (
              <Marker 
                position={[customerLocation.latitude, customerLocation.longitude]}
                icon={customerIcon}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-red-600">Customer Location</h3>
                    <p className="text-sm mt-2">{customerLocation.address}</p>
                    <p className="text-xs text-foreground-muted mt-1">{customerLocation.display_name}</p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
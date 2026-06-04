import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Loader, Search, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * AddressLookupInput - A reusable component for address lookup with autocomplete
 * 
 * @param {Object} props
 * @param {string} props.value - Current address value
 * @param {function} props.onChange - Callback with full address data: { address, latitude, longitude, display_name, address_line_1, town, county, postcode }
 * @param {string} props.placeholder - Input placeholder text
 * @param {boolean} props.disabled - Whether input is disabled
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showSearchButton - Whether to show the search button (default: false)
 */
export default function AddressLookupInput({ 
  value = '', 
  onChange, 
  placeholder = 'Start typing address or postcode...', 
  disabled = false,
  className = '',
  showSearchButton = false
}) {
  const [searchText, setSearchText] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState(null);
  const suggestionsTimeout = useRef(null);
  const inputRef = useRef(null);

  // Update internal state when external value changes
  useEffect(() => {
    setSearchText(value);
  }, [value]);

  // Fetch address suggestions from Nominatim
  const fetchSuggestions = async (text) => {
    if (!text || text.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoadingSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=5&countrycodes=gb`,
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
        console.error('Suggestions API error:', response.status);
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

  // Debounced search handler
  const handleSearchChange = (text) => {
    setSearchText(text);
    setError(null);
    setShowSuggestions(true);

    if (suggestionsTimeout.current) {
      clearTimeout(suggestionsTimeout.current);
    }

    suggestionsTimeout.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 300);
  };

  // Parse address components from Nominatim result
  const parseAddressComponents = (suggestion) => {
    const addr = suggestion.address || {};
    
    return {
      address: suggestion.display_name,
      display_name: suggestion.display_name,
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon),
      address_line_1: addr.road || addr.suburb || addr.village || '',
      address_line_2: addr.neighbourhood || '',
      town: addr.town || addr.city || addr.village || '',
      county: addr.county || addr.state || '',
      postcode: addr.postcode || ''
    };
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion) => {
    const addressData = parseAddressComponents(suggestion);
    setSearchText(addressData.display_name);
    setShowSuggestions(false);
    setSuggestions([]);
    setError(null);
    
    if (onChange) {
      onChange(addressData);
    }
  };

  // Manual geocode using backend function
  const handleManualGeocode = async () => {
    if (!searchText || searchText.trim().length < 3) {
      setError("Please enter a valid address or postcode");
      return;
    }

    setIsGeocoding(true);
    setError(null);
    setShowSuggestions(false);

    try {
      const result = await base44.functions.invoke('geocodeAddress', {
        address: searchText
      });

      if (result && result.latitude && result.longitude) {
        const addressData = {
          address: searchText,
          display_name: result.display_name || searchText,
          latitude: result.latitude,
          longitude: result.longitude,
          address_line_1: result.address_line_1 || '',
          address_line_2: result.address_line_2 || '',
          town: result.town || '',
          county: result.county || '',
          postcode: result.postcode || ''
        };
        
        setSearchText(addressData.display_name);
        setError(null);
        
        if (onChange) {
          onChange(addressData);
        }
      } else {
        setError("Address not found. Please try a different format.");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      setError("Unable to locate address. Please try again.");
    } finally {
      setIsGeocoding(false);
    }
  };

  // Handle clear
  const handleClear = () => {
    setSearchText('');
    setSuggestions([]);
    setShowSuggestions(false);
    setError(null);
    setIsLoadingSuggestions(false);
    
    if (suggestionsTimeout.current) {
      clearTimeout(suggestionsTimeout.current);
    }
    
    if (onChange) {
      onChange({
        address: '',
        display_name: '',
        latitude: null,
        longitude: null,
        address_line_1: '',
        address_line_2: '',
        town: '',
        county: '',
        postcode: ''
      });
    }
  };

  // Close suggestions when clicking outside
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

  return (
    <div className="relative" ref={inputRef}>
      <div className={`flex gap-2 ${className}`}>
        <div className="flex-1 relative" style={{ zIndex: 1000 }}>
          <Input
            value={searchText}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || isGeocoding}
            className="pr-8"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !showSuggestions && showSearchButton) {
                e.preventDefault();
                handleManualGeocode();
              } else if (e.key === 'Escape') {
                setShowSuggestions(false);
              }
            }}
          />
          
          {searchText && !disabled && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
              style={{ zIndex: 10 }}
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div 
              className="absolute w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
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
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 first:rounded-t-lg last:rounded-b-lg"
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

        {showSearchButton && (
          <Button
            type="button"
            onClick={handleManualGeocode}
            disabled={isGeocoding || !searchText || searchText.trim().length < 3}
            className="glass-button px-4 py-2 flex items-center gap-2 text-accent text-sm"
          >
            {isGeocoding ? (
              <><Loader className="w-4 h-4 animate-spin" /> Locating...</>
            ) : (
              <><Search className="w-4 h-4" /> Find</>
            )}
          </Button>
        )}
      </div>

      {error && (
        <div className="mt-2 p-2 glass-inset rounded-lg border border-orange-500 border-opacity-30 text-orange-600 text-xs flex items-start gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}